import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const inspection = readFileSync(path.resolve('scripts/testing/accountAdmissionCoverage.sql'), 'utf8');

describe('read-only account admission coverage inspection', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
      CREATE SCHEMA private; CREATE SCHEMA supabase_migrations;
      CREATE TABLE supabase_migrations.schema_migrations(version text);
      INSERT INTO supabase_migrations.schema_migrations VALUES ('20260907000100');
      CREATE TABLE public.user_profiles(id text PRIMARY KEY);
      INSERT INTO public.user_profiles VALUES ('private-profile-sentinel');
      ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
      GRANT DELETE ON public.user_profiles TO authenticated;
      CREATE POLICY synthetic_owner_delete ON public.user_profiles FOR DELETE TO authenticated USING (false);
      CREATE TABLE private.checkout_rate_limits(last_requested_at timestamptz);
      CREATE TABLE private.processed_paddle_webhook_events(processed_at timestamptz);
      CREATE FUNCTION public.delete_my_profile_data() RETURNS void LANGUAGE plpgsql SECURITY DEFINER
        AS $$ BEGIN RAISE EXCEPTION 'inspection must never execute this function'; END $$;
      REVOKE ALL ON FUNCTION public.delete_my_profile_data() FROM PUBLIC, anon;
      GRANT EXECUTE ON FUNCTION public.delete_my_profile_data() TO authenticated;
    `);
  });
  afterAll(async () => { await db?.close(); });

  it('detects direct entry points without invoking functions or exposing profile rows', async () => {
    const results = await db.exec(inspection);
    const result = results.flatMap(entry => entry.rows).find(row => 'admission_coverage' in row)?.admission_coverage;
    expect(result).toMatchObject({ readOnly: true, latestMigration: '20260907000100',
      queuePresent: false, checkoutIntentsPresent: false, sessionFencePresent: false,
      functions: [{ name: 'delete_my_profile_data', anonExecute: false, authenticatedExecute: true }],
      profileDeleteSurface: { authenticatedTableDelete: true, anonTableDelete: false, rlsEnabled: true,
        deletePolicies: [{ name: 'synthetic_owner_delete', command: 'DELETE', using: 'false' }] },
    });
    expect(JSON.stringify(result)).not.toContain('private-profile-sentinel');
    expect((await db.query('SELECT count(*)::int AS count FROM public.user_profiles')).rows).toEqual([{ count: 1 }]);
  });

  it('reflects actual privileges after revocation and leaves no transaction open', async () => {
    await db.exec('REVOKE EXECUTE ON FUNCTION public.delete_my_profile_data() FROM authenticated');
    const results = await db.exec(inspection);
    const result = results.flatMap(entry => entry.rows).find(row => 'admission_coverage' in row)?.admission_coverage;
    expect(result).toMatchObject({ functions: [{ authenticatedExecute: false }] });
    expect((await db.query("SELECT current_setting('transaction_read_only') AS value")).rows).toEqual([{ value: 'off' }]);
    await db.exec('GRANT EXECUTE ON FUNCTION public.delete_my_profile_data() TO authenticated');
  });
});
