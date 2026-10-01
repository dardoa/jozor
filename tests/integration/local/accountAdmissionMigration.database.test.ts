import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { installLegacyAccountBillingFixture, readBillingMigration } from '../../../scripts/testing/fixtures/accountBillingPostgresFixture.mjs';

const migrations = [
  '20260907000200_remove_deleted_account_memberships.sql',
  '20260907000300_revoke_deleted_account_sessions.sql',
  '20260908000100_queue_account_deletion_cleanup.sql',
  '20260908000200_fence_account_billing_events.sql',
  '20260908000300_track_all_account_subscriptions.sql',
  '20260908000400_guard_billing_reconciliation_inserts.sql',
];
const uid = '11111111-1111-4111-8111-111111111111';
const tree = '22222222-2222-4222-8222-222222222222';

describe('account admission across each pending migration (local only)', () => {
  let db: PGlite;
  beforeEach(async () => {
    db = new PGlite();
    await installLegacyAccountBillingFixture({ query: (sql: string) => db.exec(sql) });
    await db.exec(`
      CREATE SCHEMA supabase_migrations;
      CREATE TABLE supabase_migrations.schema_migrations(version text);
      INSERT INTO supabase_migrations.schema_migrations VALUES ('20260907000100');
      ALTER FUNCTION public.delete_my_profile_data() SET search_path = public, private, pg_temp;
      GRANT EXECUTE ON FUNCTION public.delete_my_profile_data() TO service_role;
      GRANT USAGE ON SCHEMA public, private, auth TO anon, authenticated, service_role;
      INSERT INTO auth.users VALUES ('${uid}');
      INSERT INTO user_profiles(id) VALUES ('${uid}'), ('keeper');
      INSERT INTO trees VALUES ('${tree}', '${uid}');
      INSERT INTO people VALUES ('synthetic-person', '${tree}');
      INSERT INTO tree_collaborators VALUES ('${tree}', '${uid}', 'synthetic@example.test', 'editor');
      INSERT INTO tree_invitations VALUES ('${tree}', '${uid}', 'synthetic@example.test', null);
      INSERT INTO user_keys VALUES ('${uid}');
      INSERT INTO storage.objects VALUES ('person-media', '${tree}/photo.webp', '${uid}');
    `);
    await db.query("SELECT set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: uid, role: 'authenticated' })]);
  });
  afterEach(async () => { await db?.close(); });

  const allowed = async (role: string, fn: string) => (await db.query<{ allowed: boolean | null }>(
    "SELECT has_function_privilege($1, to_regprocedure($2), 'EXECUTE') AS allowed", [role, fn])).rows[0].allowed;
  const snapshot = async () => {
    const result = [];
    for (const table of ['auth.users', 'user_profiles', 'trees', 'people', 'tree_collaborators', 'tree_invitations', 'user_keys', 'storage.objects']) {
      result.push((await db.query(`SELECT * FROM ${table} ORDER BY 1`)).rows);
    }
    return result;
  };
  const denied = async (fn: string, role: 'authenticated' | 'service_role' = 'authenticated') => {
    await db.exec(`BEGIN; SET LOCAL ROLE ${role}`);
    try { await expect(db.query(`SELECT ${fn}`)).rejects.toThrow(/permission denied/); }
    finally { await db.exec('ROLLBACK'); }
  };

  it.each(['both', 'public', 'private', 'neither', 'missing-public', 'authenticated-defaults', 'service-public-defaults'] as const)(
    'preserves %s legacy revocation and never opens a replacement path', async pause => {
      if (pause === 'both' || pause === 'authenticated-defaults' || pause === 'service-public-defaults') {
        await db.exec(readFileSync('scripts/maintenance/pauseLegacyAccountDeletionRpc.sql', 'utf8'));
        if (pause === 'authenticated-defaults') await db.exec('ALTER DEFAULT PRIVILEGES GRANT EXECUTE ON FUNCTIONS TO authenticated');
        if (pause === 'service-public-defaults') await db.exec('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role');
      }
      else if (pause === 'missing-public') await db.exec('DROP FUNCTION public.delete_my_profile_data()');
      else if (pause !== 'neither') await db.exec(`REVOKE EXECUTE ON FUNCTION ${pause}.delete_my_profile_data() FROM authenticated`);
      const before = await snapshot();
      const legacy = { public: await allowed('authenticated', 'public.delete_my_profile_data()'), private: await allowed('authenticated', 'private.delete_my_profile_data()') };
      for (const migration of migrations) {
        await db.exec(await readBillingMigration(migration));
        for (const schema of ['public', 'private'] as const) {
          const fn = `${schema}.delete_my_profile_data()`;
          expect(await allowed('authenticated', fn), `${migration}: ${fn}`).toBe(legacy[schema]);
          expect(await allowed('anon', fn)).toBe(legacy[schema] === null ? null : false);
          if (legacy[schema] === false) await denied(fn);
        }
        expect(await allowed('service_role', 'public.delete_my_profile_data()')).toBe(pause === 'missing-public' ? null : true);
        expect(await allowed('service_role', 'private.delete_my_profile_data()')).toBe(false);
        if (migration >= migrations[2]) {
          for (const schema of ['public', 'private']) {
            const fn = `${schema}.request_account_deletion(text)`;
            expect(await allowed('authenticated', fn), `${migration}: ${fn}`).toBe(pause === 'neither');
            expect(await allowed('anon', fn)).toBe(false);
            expect(await allowed('service_role', fn)).toBe(schema === 'public' && pause === 'service-public-defaults');
            await denied(`${schema}.request_account_deletion()`, 'service_role');
            await denied(`${schema}.request_account_deletion('${'ab'.repeat(32)}')`, 'service_role');
            if (pause !== 'neither') {
              await denied(`${schema}.request_account_deletion()`);
              await denied(`${schema}.request_account_deletion('${'ab'.repeat(32)}')`);
            }
          }
          expect((await db.query('SELECT * FROM private.account_deletion_jobs')).rows).toEqual([]);
          expect(await allowed('service_role', 'public.begin_account_checkout(text)')).toBe(true);
        }
        expect(await snapshot()).toEqual(before);
      }
      if (pause === 'neither') {
        await db.exec('BEGIN; SET LOCAL ROLE authenticated');
        await db.query('SELECT public.request_account_deletion()');
        await db.exec('RESET ROLE');
        expect((await db.query('SELECT * FROM private.account_deletion_jobs')).rows).toHaveLength(1);
        await db.exec('ROLLBACK');
        expect(await snapshot()).toEqual(before);
      }
    });
});
