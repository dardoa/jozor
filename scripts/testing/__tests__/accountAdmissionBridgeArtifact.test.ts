import { describe, expect, it } from 'vitest';
import { assertSafeBridgeEntry } from '../../maintenance/prepareAccountAdmissionBridge.mjs';

describe('git archive bridge extraction boundary', () => {
  it.each(['../escape', '/absolute', 'dir/../../escape', 'D:/escape', 'dir\\escape', './file', '.git/config', '.git', 'dir//file', 'dir/./file', 'bad\u0000file'])('refuses unsafe entry %j', name => {
    expect(() => assertSafeBridgeEntry(name, new Set())).toThrow('Unsafe archive entry');
  });
  it('rejects case-insensitive collisions on Windows', () => {
    const seen = new Set(); assertSafeBridgeEntry('src/File.ts', seen);
    expect(() => assertSafeBridgeEntry('src/file.ts', seen)).toThrow('Unsafe archive entry');
  });
  it.each(['src/NUL.ts', 'con', 'aux/file', 'COM1.txt', 'file.', 'dir /file'])('refuses Windows device names and normalized paths %j', name => {
    expect(() => assertSafeBridgeEntry(name, new Set())).toThrow('Unsafe archive entry');
  });
  it('allows ordinary tracked paths and git metadata filenames, not git internals', () => {
    const seen = new Set();
    for (const name of ['api/auth/delete-account.ts', '.gitignore', '.github/workflows/ci.yml']) assertSafeBridgeEntry(name, seen);
    expect(seen.size).toBe(3);
  });
});
