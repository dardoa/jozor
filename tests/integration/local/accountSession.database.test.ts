import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const read = (name: string) => readFileSync(path.resolve('supabase/migrations', name), 'utf8');
const sessions = read('20260907000300_revoke_deleted_account_sessions.sql');
const deletion = read('20260907000200_remove_deleted_account_memberships.sql');
const tree = '11111111-1111-4111-8111-111111111111';

describe('durable account session revocation on PostgreSQL', () => {
  let db: PGlite;
  const claims = async (extra: Record<string, unknown> = {}, role = 'authenticated') => {
    await db.exec('RESET ROLE');
    await db.query("SELECT set_config('request.jwt.claims', $1, true)", [JSON.stringify({
      sub: 'departing', email: 'shared@example.test', role, ...extra,
    })]);
    await db.exec(`SET LOCAL ROLE ${role}`);
  };
  const active = async () => (await db.query<{ active: boolean }>('SELECT public.is_my_account_session_active() AS active')).rows[0].active;
  const issue = async (uid = 'departing') => {
    await db.exec('RESET ROLE; SET LOCAL ROLE service_role');
    const result = await db.query<{ generation: string }>('SELECT public.issue_account_session($1) AS generation', [uid]);
    return result.rows[0].generation;
  };
  const remove = () => db.exec('SELECT private.delete_my_profile_data()');
  const rejected = async (query: string, message: RegExp) => {
    await db.exec('SAVEPOINT rejected');
    await expect(db.exec(query)).rejects.toThrow(message);
    await db.exec('ROLLBACK TO SAVEPOINT rejected');
  };
  const states = async () => {
    await db.exec('RESET ROLE');
    return (await db.query('SELECT * FROM private.account_session_generations ORDER BY user_id')).rows;
  };

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE ROLE authenticator;
      CREATE SCHEMA auth; CREATE SCHEMA storage;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS
        $$ SELECT coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
      CREATE TABLE user_profiles (id text PRIMARY KEY);
      CREATE TABLE trees (id uuid PRIMARY KEY, owner_id text);
      CREATE TABLE tree_collaborators (tree_id uuid REFERENCES trees ON DELETE CASCADE, collaborator_uid text, email text, role text);
      CREATE TABLE tree_invitations (tree_id uuid REFERENCES trees ON DELETE CASCADE, invited_uid text, accepted_by text, invited_email text);
      CREATE TABLE user_keys (user_id text);
      CREATE TABLE subscriptions (id text PRIMARY KEY, user_id text REFERENCES user_profiles ON DELETE CASCADE, status text NOT NULL);
      CREATE TABLE raw_email_data (id integer PRIMARY KEY, email text);
      CREATE TABLE storage.objects (name text PRIMARY KEY, owner_id text);
      ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE raw_email_data ENABLE ROW LEVEL SECURITY;
      ALTER TABLE trees ENABLE ROW LEVEL SECURITY;
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      GRANT USAGE ON SCHEMA public, auth, storage TO authenticated, anon, service_role;
      GRANT SELECT ON user_profiles TO authenticated;
      GRANT SELECT, INSERT, UPDATE, DELETE ON raw_email_data, trees, storage.objects TO authenticated;
      CREATE POLICY raw_profile_owner ON user_profiles TO authenticated USING (id = auth.jwt()->>'sub');
      CREATE POLICY raw_email_access ON raw_email_data TO authenticated USING (email = auth.jwt()->>'email') WITH CHECK (email = auth.jwt()->>'email');
      CREATE POLICY raw_owner_access ON storage.objects TO authenticated USING (owner_id = auth.jwt()->>'sub') WITH CHECK (owner_id = auth.jwt()->>'sub');
      CREATE POLICY raw_tree_owner ON trees TO authenticated USING (owner_id = auth.jwt()->>'sub') WITH CHECK (owner_id = auth.jwt()->>'sub');
      CREATE FUNCTION public.definer_email_read() RETURNS SETOF raw_email_data LANGUAGE sql SECURITY DEFINER AS
        $$ SELECT * FROM public.raw_email_data WHERE email = auth.jwt()->>'email' $$;
    `);
    await db.exec(read('20260523230000_isolate_db_helpers_to_private_schema.sql'));
    await db.exec(read('20260531195055_billing_fixes.sql')
      .split('-- 12. Atomic profile and trees DB deletion')[1].split('-- 13.')[0]);
    await db.exec(deletion);
    await db.exec(sessions);
  });
  afterAll(async () => { await db?.close(); });
  beforeEach(async () => {
    await db.exec(`BEGIN;
      INSERT INTO user_profiles VALUES ('departing'), ('keeper');
      INSERT INTO trees VALUES ('${tree}', 'keeper');
      INSERT INTO tree_collaborators VALUES ('${tree}', null, 'shared@example.test', 'editor');
      INSERT INTO raw_email_data VALUES (1, 'shared@example.test');
      INSERT INTO storage.objects VALUES ('private-object', 'departing');
    `);
    await claims();
  });
  afterEach(async () => { await db.exec('ROLLBACK; RESET ROLE'); });

  it('preserves existing account sessions and fails closed for missing identities or profiles', async () => {
    expect(await active()).toBe(true);
    for (const sub of ['', 'missing-profile']) {
      await claims({ sub });
      expect(await active()).toBe(false);
    }
  });

  it('checks profile existence behind profile RLS without recursion or exposing other accounts', async () => {
    expect((await db.query('SELECT id FROM user_profiles')).rows).toEqual([{ id: 'departing' }]);
    await remove();
    expect((await db.query('SELECT id FROM user_profiles')).rows).toEqual([]);
    await claims({ sub: 'keeper' });
    expect((await db.query('SELECT id FROM user_profiles')).rows).toEqual([{ id: 'keeper' }]);
  });

  it('issues a stable generation for concurrent logins without ejecting pre-deletion legacy sessions', async () => {
    const generation = await issue();
    expect(await issue()).toBe(generation);
    await claims();
    expect(await active()).toBe(true);
    await claims({ account_session: generation });
    expect(await active()).toBe(true);
  });

  it.each([null, '', 'bad-generation', 123, '11111111-1111-4111-8111-111111111111'])(
    'rejects a malformed or mismatched supplied generation %j', async account_session => {
      await issue();
      await claims({ account_session });
      expect(await active()).toBe(false);
    }
  );

  it('rejects a generation before it is registered and refuses issuance without a profile', async () => {
    await claims({ account_session: '11111111-1111-4111-8111-111111111111' });
    expect(await active()).toBe(false);
    await db.exec('RESET ROLE; SET LOCAL ROLE service_role');
    await rejected("SELECT public.issue_account_session('missing-profile')", /ACCOUNT_PROFILE_REQUIRED/);
  });

  it('keeps both versioned and legacy tokens revoked after same-subject recreation and re-login', async () => {
    const old = await issue();
    await claims({ account_session: old });
    await remove();
    expect(await active()).toBe(false);
    await db.exec("RESET ROLE; INSERT INTO user_profiles VALUES ('departing')");
    await claims({ account_session: old });
    expect(await active()).toBe(false);
    await claims();
    expect(await active()).toBe(false);
    const fresh = await issue();
    expect(fresh).not.toBe(old);
    for (const token of [{}, { account_session: old }, { account_session: fresh }]) {
      await claims(token);
      expect(await active()).toBe('account_session' in token && token.account_session === fresh);
    }
    const state = await states();
    expect(state[0]).toMatchObject({ user_id: 'departing', accept_legacy: false, active: true });
  });

  it('does not revive legacy sessions on later deletions or migration reapplication', async () => {
    await remove();
    const revoked = await states();
    // DDL is exercised transactionally, without migration COMMIT ending the fixture.
    await db.exec(sessions.replace(/^BEGIN;\s*/, '').replace(/COMMIT;/, ''));
    expect(await states()).toEqual(revoked);
    await db.exec("INSERT INTO user_profiles VALUES ('departing')");
    const fresh = await issue();
    await claims({ account_session: fresh });
    await remove();
    await claims({ account_session: fresh });
    expect(await active()).toBe(false);
  });

  it('revokes native UUID sessions too while allowing a newly registered native identity', async () => {
    await db.exec("RESET ROLE; INSERT INTO user_profiles VALUES ('22222222-2222-4222-8222-222222222222')");
    await claims({ sub: '22222222-2222-4222-8222-222222222222', session_id: 'native-session' });
    expect(await active()).toBe(true);
    await remove();
    expect(await active()).toBe(false);
    await db.exec("RESET ROLE; INSERT INTO user_profiles VALUES ('33333333-3333-4333-8333-333333333333')");
    await claims({ sub: '33333333-3333-4333-8333-333333333333', session_id: 'new-native-session' });
    expect(await active()).toBe(true);
  });

  it('blocks raw JWT email/UID RLS and Storage reads and writes after deletion', async () => {
    expect((await db.query('SELECT * FROM raw_email_data')).rows).toHaveLength(1);
    expect((await db.query('SELECT * FROM storage.objects')).rows).toHaveLength(1);
    await remove();
    for (const table of ['raw_email_data', 'storage.objects', 'trees']) {
      expect((await db.query(`SELECT * FROM ${table}`)).rows).toHaveLength(0);
      expect((await db.query(`DELETE FROM ${table} RETURNING *`)).rows).toHaveLength(0);
    }
    await rejected("INSERT INTO raw_email_data VALUES (2, 'shared@example.test')", /row-level security/);
    await rejected("INSERT INTO storage.objects VALUES ('new-object', 'departing')", /row-level security/);
    await rejected("INSERT INTO trees VALUES ('44444444-4444-4444-8444-444444444444', 'departing')", /row-level security/);
    expect((await db.query("UPDATE storage.objects SET name = 'changed' RETURNING *")).rows).toHaveLength(0);
    expect((await db.query("UPDATE raw_email_data SET id = 2 RETURNING *")).rows).toHaveLength(0);
  });

  it('guards email-only collaborator helpers even after fresh invitation to the old email', async () => {
    const query = `SELECT private.is_tree_collaborator('${tree}', 'editor') AS allowed`;
    expect((await db.query(query)).rows).toEqual([{ allowed: true }]);
    await remove();
    await db.exec(`RESET ROLE; INSERT INTO tree_collaborators VALUES ('${tree}', null, 'shared@example.test', 'editor')`);
    await claims();
    expect((await db.query(query)).rows).toEqual([{ allowed: false }]);
    expect((await db.query('SELECT private.current_user_id_text() AS uid')).rows).toEqual([{ uid: null }]);
  });

  it('enforces the pre-request boundary before SECURITY DEFINER reads and allows anonymous/service requests', async () => {
    await db.exec('SELECT public.check_account_session_request(); SELECT * FROM public.definer_email_read()');
    await remove();
    await rejected('SELECT public.check_account_session_request(); SELECT * FROM public.definer_email_read()', /no longer active/);
    await claims({}, 'anon');
    await db.exec('SELECT public.check_account_session_request()');
    await claims({}, 'service_role');
    await db.exec('SELECT public.check_account_session_request()');
  });

  it('cannot mint, revive, inspect or rewrite session state from a user or anonymous session', async () => {
    for (const role of ['authenticated', 'anon']) {
      await claims({}, role);
      await rejected("SELECT public.issue_account_session('departing')", /permission denied/);
      await rejected('SELECT * FROM private.account_session_generations', /permission denied/);
      await rejected("UPDATE private.account_session_generations SET active = true", /permission denied/);
    }
  });

  it('rolls revocation back with a failed deletion and leaves billing-blocked accounts active', async () => {
    const generation = await issue();
    await db.exec(`RESET ROLE;
      CREATE FUNCTION reject_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Synthetic late failure'; END $$;
      CREATE TRIGGER reject_late AFTER DELETE ON user_profiles FOR EACH ROW EXECUTE FUNCTION reject_delete();`);
    await claims({ account_session: generation });
    await rejected('SELECT private.delete_my_profile_data()', /Synthetic late failure/);
    expect(await active()).toBe(true);
    await db.exec("RESET ROLE; INSERT INTO subscriptions VALUES ('open', 'departing', 'active')");
    await claims({ account_session: generation });
    await rejected('SELECT private.delete_my_profile_data()', /ACCOUNT_HAS_OPEN_SUBSCRIPTION/);
    expect(await active()).toBe(true);
  });

  it('preserves existing policies and installs the global pre-request hook', async () => {
    await db.exec('RESET ROLE');
    const policies = await db.query<{ policyname: string; permissive: string }>('SELECT policyname, permissive FROM pg_policies WHERE tablename = $1', ['raw_email_data']);
    expect(policies.rows).toEqual(expect.arrayContaining([
      { policyname: 'raw_email_access', permissive: 'PERMISSIVE' },
      { policyname: 'account_session_boundary', permissive: 'RESTRICTIVE' },
    ]));
    expect((await db.query("SELECT rolconfig FROM pg_roles WHERE rolname = 'authenticator'")).rows)
      .toEqual([{ rolconfig: ['pgrst.db_pre_request=public.check_account_session_request'] }]);
  });

  it('refuses to overwrite an existing platform pre-request hook', async () => {
    await db.exec("RESET ROLE; ALTER ROLE authenticator SET pgrst.db_pre_request = 'public.existing_security_check'; SAVEPOINT migration_attempt");
    await expect(db.exec(sessions.replace(/^BEGIN;\s*/, '').replace(/COMMIT;/, '')))
      .rejects.toThrow('Existing PostgREST pre-request hook requires explicit composition');
    await db.exec('ROLLBACK TO SAVEPOINT migration_attempt');
    expect((await db.query("SELECT rolconfig FROM pg_roles WHERE rolname = 'authenticator'")).rows)
      .toEqual([{ rolconfig: ['pgrst.db_pre_request=public.existing_security_check'] }]);
  });

  it('replaces an empty database override that would shadow the role-wide security hook', async () => {
    await db.exec(`RESET ROLE;
      DO $$ BEGIN EXECUTE format('ALTER ROLE authenticator IN DATABASE %I SET pgrst.db_pre_request = %L', current_database(), ''); END $$;`);
    await db.exec(sessions.replace(/^BEGIN;\s*/, '').replace(/COMMIT;/, ''));
    expect((await db.query(`SELECT settings.setconfig FROM pg_db_role_setting settings
      JOIN pg_database database ON database.oid = settings.setdatabase
      JOIN pg_roles roles ON roles.oid = settings.setrole
      WHERE roles.rolname = 'authenticator' AND database.datname = current_database()`)).rows)
      .toEqual([{ setconfig: ['pgrst.db_pre_request=public.check_account_session_request'] }]);
  });

  it('refuses to overwrite a database-specific security hook', async () => {
    await db.exec(`RESET ROLE;
      DO $$ BEGIN EXECUTE format('ALTER ROLE authenticator IN DATABASE %I SET pgrst.db_pre_request = %L', current_database(), 'public.existing_database_check'); END $$;
      SAVEPOINT migration_attempt`);
    await expect(db.exec(sessions.replace(/^BEGIN;\s*/, '').replace(/COMMIT;/, '')))
      .rejects.toThrow('Existing PostgREST pre-request hook requires explicit composition');
    await db.exec('ROLLBACK TO SAVEPOINT migration_attempt');
    expect((await db.query(`SELECT settings.setconfig FROM pg_db_role_setting settings
      JOIN pg_database database ON database.oid = settings.setdatabase
      JOIN pg_roles roles ON roles.oid = settings.setrole
      WHERE roles.rolname = 'authenticator' AND database.datname = current_database()`)).rows)
      .toEqual([{ setconfig: ['pgrst.db_pre_request=public.existing_database_check'] }]);
  });
});
