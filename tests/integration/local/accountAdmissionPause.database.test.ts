import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const pause = readFileSync(path.resolve('scripts/maintenance/pauseLegacyAccountDeletionRpc.sql'), 'utf8');
const legacy = readFileSync(path.resolve('supabase/migrations/20260531195055_billing_fixes.sql'), 'utf8')
  .replace(/\r\n/g, '\n').split('-- 12. Atomic profile and trees DB deletion')[1].split('-- 13.')[0];

describe('legacy account deletion admission pause (local database only)', () => {
  let db: PGlite;
  beforeEach(async () => {
    db = new PGlite();
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role; CREATE ROLE legacy_access;
      CREATE SCHEMA private; CREATE SCHEMA supabase_migrations;
      CREATE TABLE supabase_migrations.schema_migrations(version text);
      INSERT INTO supabase_migrations.schema_migrations VALUES ('20260907000100');
      CREATE TABLE public.user_profiles(id text PRIMARY KEY);
      CREATE TABLE public.trees(id text PRIMARY KEY, owner_id text);
      INSERT INTO public.user_profiles VALUES ('synthetic-owner');
      INSERT INTO public.trees VALUES ('synthetic-tree', 'synthetic-owner');
      CREATE FUNCTION private.current_user_id_text() RETURNS text LANGUAGE sql
        AS $$ SELECT 'synthetic-owner'::text $$;
      GRANT USAGE ON SCHEMA private TO authenticated;
    `);
    await db.exec(legacy);
    await db.exec(`
      ALTER FUNCTION public.delete_my_profile_data() SET search_path = public, private, pg_temp;
      GRANT EXECUTE ON FUNCTION public.delete_my_profile_data() TO service_role;
    `);
  });
  afterEach(async () => { await db?.close(); });

  const snapshot = async () => (await db.query(`
    SELECT n.nspname AS schema, pg_get_functiondef(p.oid) AS definition, p.proacl::text AS acl,
      has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated,
      has_function_privilege('anon', p.oid, 'EXECUTE') AS anon,
      has_function_privilege('service_role', p.oid, 'EXECUTE') AS service
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname IN ('public', 'private') AND p.proname = 'delete_my_profile_data'
    ORDER BY n.nspname
  `)).rows;

  const assertDataUntouched = async () => {
    expect((await db.query('SELECT * FROM public.user_profiles')).rows).toEqual([{ id: 'synthetic-owner' }]);
    expect((await db.query('SELECT * FROM public.trees')).rows)
      .toEqual([{ id: 'synthetic-tree', owner_id: 'synthetic-owner' }]);
  };

  it('uses the actual legacy function bodies, removes only authenticated access, and preserves all data', async () => {
    const before = await snapshot();
    await db.exec(pause);
    const after = await snapshot();
    expect(after.map(row => ({ ...row, acl: undefined, authenticated: true })))
      .toEqual(before.map(row => ({ ...row, acl: undefined })));
    expect(after.map(row => row.authenticated)).toEqual([false, false]);
    expect(after.map(row => row.service)).toEqual([false, true]);
    expect(after.map(row => row.anon)).toEqual([false, false]);
    await assertDataUntouched();
    expect((await db.query('SELECT version FROM supabase_migrations.schema_migrations')).rows)
      .toEqual([{ version: '20260907000100' }]);
  });

  it.each(['public', 'private'])('rejects an authenticated call to %s at the privilege boundary', async schema => {
    await db.exec(pause);
    await db.exec('SET ROLE authenticated');
    await expect(db.query(`SELECT ${schema}.delete_my_profile_data()`)).rejects.toThrow(/permission denied/);
    await db.exec('RESET ROLE');
    await assertDataUntouched();
  });

  it('can restore the exact original grants locally while the legacy schema is unchanged', async () => {
    const before = await snapshot();
    await db.exec(pause);
    // Synthetic rollback demonstration only, not an approved hosted recovery script.
    await db.exec(`
      GRANT EXECUTE ON FUNCTION private.delete_my_profile_data() TO authenticated;
      GRANT EXECUTE ON FUNCTION public.delete_my_profile_data() TO authenticated;
    `);
    // ACL array ordering is not semantically significant.
    const normalized = (rows: Awaited<ReturnType<typeof snapshot>>) => rows.map(row => ({
      ...row, acl: String(row.acl).slice(1, -1).split(',').sort(),
    }));
    expect(normalized(await snapshot())).toEqual(normalized(before));
    await assertDataUntouched();
  });

  it.each([
    ['migration changed', "INSERT INTO supabase_migrations.schema_migrations VALUES ('20260907000200')", /schema changed/],
    ['queue already installed', 'CREATE TABLE private.account_deletion_jobs(id text)', /schema changed/],
    ['private body changed', "CREATE OR REPLACE FUNCTION private.delete_my_profile_data() RETURNS void LANGUAGE plpgsql AS $$ BEGIN RETURN; END $$", /definition changed/],
    ['public body changed', "CREATE OR REPLACE FUNCTION public.delete_my_profile_data() RETURNS void LANGUAGE plpgsql AS $$ BEGIN RETURN; END $$", /definition changed/],
    ['public function missing', 'DROP FUNCTION public.delete_my_profile_data()', /surface changed/],
    ['new overload added', 'CREATE FUNCTION public.delete_my_profile_data(text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN RETURN; END $$', /surface changed/],
    ['anonymous grant added', 'GRANT EXECUTE ON FUNCTION public.delete_my_profile_data() TO anon', /grants changed/],
    ['delegation enabled', 'GRANT EXECUTE ON FUNCTION public.delete_my_profile_data() TO authenticated WITH GRANT OPTION', /grants changed/],
    ['inherited access', 'GRANT legacy_access TO authenticated; GRANT EXECUTE ON FUNCTION private.delete_my_profile_data() TO legacy_access', /inherited execution path/],
  ])('fails closed and rolls back both grants when %s', async (_name, mutation, error) => {
    await db.exec(mutation);
    const before = await snapshot();
    await expect(db.exec(pause)).rejects.toThrow(error);
    await db.exec('ROLLBACK');
    expect(await snapshot()).toEqual(before);
    await assertDataUntouched();
  });

  it('refuses a repeated pause instead of mistaking it for an approved original state', async () => {
    await db.exec(pause);
    const before = await snapshot();
    await expect(db.exec(pause)).rejects.toThrow(/grants changed/);
    await db.exec('ROLLBACK');
    expect(await snapshot()).toEqual(before);
  });
});
