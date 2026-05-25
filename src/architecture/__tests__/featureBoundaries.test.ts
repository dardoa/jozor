import { describe, expect, it } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const srcRoot = path.resolve(process.cwd(), 'src');
const featureRoot = path.join(srcRoot, 'features');
const legacyServiceImports = [
  'services/activityService',
  'services/treeInvitationService',
  'services/importTreeService',
  'services/supabaseGalleryService',
];

async function listSourceFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(fullPath);
    if (!entry.isFile()) return [];
    if (!/\.(ts|tsx)$/.test(entry.name)) return [];
    if (fullPath.includes(`${path.sep}__tests__${path.sep}`)) return [];
    return [fullPath];
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

function getFeatureName(filePath: string): string | null {
  const relative = path.relative(featureRoot, filePath);
  if (relative.startsWith('..')) return null;
  return relative.split(path.sep)[0] || null;
}

describe('feature boundaries', () => {
  it('does not import migrated services from legacy global service paths', async () => {
    const violations: string[] = [];
    const files = await listSourceFiles(srcRoot);

    for (const filePath of files) {
      const source = await readFile(filePath, 'utf8');
      for (const importSource of extractImportSources(source)) {
        const resolved = resolveLocalImport(filePath, importSource);
        const resolvedFromLegacyServices = resolved
          ? path.normalize(resolved).startsWith(path.join(srcRoot, 'services') + path.sep)
          : false;

        if (
          resolvedFromLegacyServices &&
          legacyServiceImports.some((legacyPath) => importSource.includes(legacyPath))
        ) {
          violations.push(`${path.relative(process.cwd(), filePath)} -> ${importSource}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('uses feature public APIs instead of cross-feature service internals', async () => {
    const violations: string[] = [];
    const files = await listSourceFiles(srcRoot);

    for (const filePath of files) {
      const source = await readFile(filePath, 'utf8');
      const importingFeature = getFeatureName(filePath);

      for (const importSource of extractImportSources(source)) {
        const resolved = resolveLocalImport(filePath, importSource);
        if (!resolved || !resolved.startsWith(featureRoot)) continue;
        if (!resolved.includes(`${path.sep}services${path.sep}`)) continue;

        const importedFeature = getFeatureName(resolved);
        if (importedFeature && importedFeature !== importingFeature) {
          violations.push(`${path.relative(process.cwd(), filePath)} -> ${importSource}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
