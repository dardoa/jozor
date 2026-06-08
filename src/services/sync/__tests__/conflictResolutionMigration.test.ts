import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('conflict resolution migration SQL', () => {
    it('extracts UPDATE_PROP scalar values directly instead of treating them as arrays', () => {
        const migrationPath = path.resolve(
            process.cwd(),
            'supabase/migrations/20260609000100_conflict_resolution.sql',
        );
        const sql = readFileSync(migrationPath, 'utf8');

        expect(sql).not.toContain('v_val->>0');
        expect(sql).toContain("v_val #>> '{}'");
    });
});
