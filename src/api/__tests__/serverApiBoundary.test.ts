import { describe, expect, it } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const apiRoot = path.resolve(process.cwd(), 'api');
const srcRoot = path.resolve(process.cwd(), 'src');
const allowedSrcImports = new Set([
  'api/ai-proxy.ts -> ../src/api/ai-proxy',
  'api/proxy.ts -> ../src/api/proxy',
  'api/person-media/[action].ts -> ../../src/api/person-media.js',
  'api/person-media/[action].ts -> ../../src/api/person-media-migration.js',
  'api/person-media/[action].ts -> ../../src/api/person-media-cleanup-cron.js',
  'api/push-reminder-cron.ts -> ../src/services/pushSubscriptionService',
  'api/push-reminder-cron.ts -> ../src/services/reminders/reminderProcessor',
]);
async function listApiFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listApiFiles(fullPath);
    return entry.isFile() && entry.name.endsWith('.ts') ? [fullPath] : [];
  }));
  return files.flat();
}

function extractImportSources(source: string): string[] {
  const imports: string[] = [];
  const importPattern = /(?:import|export)\s+(?:[^'"]+\s+from\s+)?['"]([^'"]+)['"]/g;
  const dynamicImportPattern = /import\(\s*['"]([^'"]+)['"]\s*\)/g;

  for (const match of source.matchAll(importPattern)) imports.push(match[1]);
  for (const match of source.matchAll(dynamicImportPattern)) imports.push(match[1]);

  return imports;
}

function resolveLocalImport(filePath: string, importSource: string): string | null {
  if (importSource.startsWith('@/')) {
    return path.resolve(srcRoot, importSource.slice(2));
  }

  if (importSource.startsWith('.')) {
    return path.resolve(path.dirname(filePath), importSource);
  }

  return null;
}

describe('Vercel server API boundaries', () => {
  it('keeps API entrypoints within the current deployment function budget', async () => {
    expect((await listApiFiles(apiRoot)).length).toBeLessThanOrEqual(12);
  });

  it('uses explicit .js extensions for shared modules imported by root API handlers', async () => {
    const violations: string[] = [];
    const apiFiles = await listApiFiles(apiRoot);
    const sharedRoot = path.resolve(process.cwd(), 'shared');

    for (const filePath of apiFiles) {
      const source = await readFile(filePath, 'utf8');

      for (const importSource of extractImportSources(source)) {
        const resolved = resolveLocalImport(filePath, importSource);
        if (!resolved) continue;

        const resolvedWithoutExtension = resolved.replace(/\.[cm]?[jt]s$/, '');
        const isSharedImport = resolvedWithoutExtension.startsWith(sharedRoot)
          || resolvedWithoutExtension.includes(`${path.sep}api${path.sep}shared${path.sep}`);

        if (isSharedImport && !importSource.endsWith('.js')) {
          const relativeFilePath = path.relative(process.cwd(), filePath).split(path.sep).join('/');
          violations.push(`${relativeFilePath} -> ${importSource}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('keeps root API functions server-only and self-contained', async () => {
    const violations: string[] = [];
    const apiFiles = await listApiFiles(apiRoot);

    for (const filePath of apiFiles) {
      const source = await readFile(filePath, 'utf8');
      const importSources = extractImportSources(source);

      for (const importSource of importSources) {
        const resolved = resolveLocalImport(filePath, importSource);
        if (!resolved || !resolved.startsWith(srcRoot)) continue;

        const relativeFilePath = path.relative(process.cwd(), filePath).split(path.sep).join('/');
        const violation = `${relativeFilePath} -> ${importSource}`;
        if (!allowedSrcImports.has(violation)) {
          violations.push(violation);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('enforces that shared/auth/internalJwt.ts has zero node:* or Node-specific dependencies', async () => {
    const filePath = path.resolve(process.cwd(), 'shared/auth/internalJwt.ts');
    const source = await readFile(filePath, 'utf8');
    const importSources = extractImportSources(source);

    const nodeImports = importSources.filter((src) => src.startsWith('node:') || src === 'crypto' || src === 'buffer');
    expect(nodeImports).toEqual([]);

    // Also verify that Buffer is not referenced in the source code
    const hasBufferUsage = /\bBuffer\b/.test(source);
    expect(hasBufferUsage).toBe(false);
  });

  it('enforces that root API handlers and authUtils.ts do not contain local verifyInternalToken declarations', async () => {
    const apiFiles = await listApiFiles(apiRoot);
    const authUtilsPath = path.resolve(process.cwd(), 'src/utils/authUtils.ts');
    const filesToTest = [...apiFiles, authUtilsPath];

    const violations: string[] = [];

    for (const filePath of filesToTest) {
      const source = await readFile(filePath, 'utf8');
      const relativeFilePath = path.relative(process.cwd(), filePath).split(path.sep).join('/');

      // Check if verifyInternalToken is declared locally as function or const (excluding comments or imports)
      const hasLocalDeclaration = /function\s+verifyInternalToken\b/.test(source) || /const\s+verifyInternalToken\s*=/.test(source);
      if (hasLocalDeclaration) {
        violations.push(`${relativeFilePath} contains a local declaration of verifyInternalToken`);
      }
    }

    expect(violations).toEqual([]);
  });
});
