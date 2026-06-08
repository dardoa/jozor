import { describe, expect, it } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const apiRoot = path.resolve(process.cwd(), 'api');
const srcRoot = path.resolve(process.cwd(), 'src');
const allowedSrcImports = new Set([
  'api/ai-proxy.ts -> ../src/api/ai-proxy',
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
});
