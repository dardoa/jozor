import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { expect, it } from 'vitest';

it('loads the emitted media function graph in native Node ESM without bundler resolution or network access', () => {
  const root = process.cwd();
  const output = path.resolve(root, 'output');
  mkdirSync(output, { recursive: true });
  const directory = mkdtempSync(path.join(output, 'media-native-runtime-'));
  const cleanupRelative = path.relative(output, directory);
  if (!cleanupRelative || cleanupRelative.startsWith('..') || path.isAbsolute(cleanupRelative)) {
    throw new Error('Unsafe runtime test cleanup path');
  }
  const compilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
  };
  const emitted = new Set<string>();

  function emit(file: string) {
    if (emitted.has(file)) return;
    const relative = path.relative(root, file);
    expect(relative.startsWith('..') || path.isAbsolute(relative)).toBe(false);
    emitted.add(file);
    const js = ts.transpileModule(readFileSync(file, 'utf8'), { compilerOptions, fileName: file }).outputText;
    const destination = path.join(directory, relative.replace(/\.ts$/, '.js'));
    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(destination, js);
    // Traverse emitted imports, so type-only dependencies cannot hide an ESM failure.
    const parsed = ts.createSourceFile(destination, js, ts.ScriptTarget.ES2022, true, ts.ScriptKind.JS);
    for (const statement of parsed.statements) {
      if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) continue;
      const specifier = statement.moduleSpecifier;
      if (!specifier || !ts.isStringLiteral(specifier) || !specifier.text.startsWith('.')) continue;
      expect(specifier.text, `${relative} must use a native ESM file specifier`).toMatch(/\.js$/);
      const resolved = ts.resolveModuleName(specifier.text, file, compilerOptions, ts.sys).resolvedModule;
      expect(resolved, `${relative} -> ${specifier.text}`).toBeDefined();
      if (!resolved) throw new Error('Unresolved media runtime module');
      emit(resolved.resolvedFileName);
    }
  }

  try {
    emit(path.join(root, 'api/person-media/[action].ts'));
    writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ type: 'module' }));
    const entry = pathToFileURL(path.join(directory, 'api/person-media/[action].js')).href;
    const script = `
      globalThis.fetch = () => { throw new Error('Native smoke must not access the network'); };
      const { default: handler } = await import(${JSON.stringify(entry)});
      const statuses = {};
      for (const action of ['read', 'migrate', 'cleanup', 'unknown']) {
        const req = { method: action === 'migrate' ? 'POST' : 'GET', query: { action }, headers: {} };
        const res = { setHeader() {}, status(code) { statuses[action] = code; return this; }, json() { return this; } };
        await handler(req, res);
      }
      process.stdout.write(JSON.stringify(statuses));
    `;
    const result = execFileSync(process.execPath, ['--input-type=module', '-e', script], {
      encoding: 'utf8', timeout: 10000,
      env: { ...process.env, NODE_ENV: 'production', VERCEL_ENV: 'production',
        APP_ORIGIN: 'https://jozor.test', VITE_APP_ORIGIN: 'https://jozor.test',
        SUPABASE_URL: 'http://127.0.0.1:1', VITE_SUPABASE_URL: 'http://127.0.0.1:1',
        SUPABASE_ANON_KEY: 'native-test-key', VITE_SUPABASE_ANON_KEY: 'native-test-key',
        SUPABASE_SERVICE_ROLE_KEY: 'native-test-key', SUPABASE_JWT_SECRET: 'native-test-secret-not-used-by-anonymous-requests',
        CRON_SECRET: 'native-test-cron-secret', PERSON_MEDIA_CLEANUP_ENABLED: 'false' },
    });
    expect(JSON.parse(result)).toEqual({ read: 401, migrate: 401, cleanup: 401, unknown: 404 });
    expect(emitted.size).toBeGreaterThan(6);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}, 20000);
