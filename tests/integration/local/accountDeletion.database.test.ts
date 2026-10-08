import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const migration = readFileSync(path.resolve('supabase/migrations/20260907000200_remove_deleted_account_memberships.sql'), 'utf8');
const previous = readFileSync(path.resolve('supabase/migrations/20260531195055_billing_fixes.sql'), 'utf8')
  .split('-- 12. Atomic profile and trees DB deletion')[1].split('-- 13.')[0];

describe('account deletion database ownership boundary', () => {
  let db: PGlite;
  const claims = (value: Record<string, string>) => db.query(
    "SELECT set_config('request.jwt.claims', $1, true)", [JSON.stringify(value)]);
  const remove = () => db.query('SELECT public.delete_my_profile_data()');
  const rows = async (table: string) => (await db.query(`SELECT * FROM ${table} ORDER BY 1`)).rows;

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated;
      CREATE SCHEMA auth; CREATE SCHEMA private;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS
        $$ SELECT nullif(current_setting('request.jwt.claims', true), '')::jsonb $$;
      CREATE FUNCTION private.current_user_id_text() RETURNS text LANGUAGE sql AS
        $$ SELECT auth.jwt()->>'sub' $$;
      CREATE TABLE user_profiles (id text PRIMARY KEY);
      CREATE TABLE subscriptions (id text PRIMARY KEY, user_id text REFERENCES user_profiles ON DELETE CASCADE,
        status text NOT NULL);
      CREATE TABLE trees (id text PRIMARY KEY, owner_id text);
      CREATE TABLE people (id text PRIMARY KEY, tree_id text REFERENCES trees ON DELETE CASCADE, name text);
      CREATE TABLE user_keys (user_id text PRIMARY KEY, google_refresh_token text);
      CREATE TABLE tree_collaborators (id text PRIMARY KEY, tree_id text REFERENCES trees ON DELETE CASCADE,
        collaborator_uid text, email text);
      CREATE TABLE tree_invitations (id text PRIMARY KEY, tree_id text REFERENCES trees ON DELETE CASCADE,
        invited_uid text, invited_email text, accepted_by text);
      GRANT USAGE ON SCHEMA public, private, auth TO authenticated, anon;
    `);
    await db.exec(previous);
    await db.exec(migration);
  });
  afterAll(async () => { await db?.close(); });
  beforeEach(async () => {
    await db.exec(`BEGIN;
      INSERT INTO user_profiles VALUES ('departing'), ('keeper');
      INSERT INTO trees VALUES ('owned', 'departing'), ('shared', 'keeper');
      INSERT INTO people VALUES ('owned-person', 'owned', 'Synthetic owner'), ('shared-person', 'shared', 'Synthetic keeper');
      INSERT INTO user_keys VALUES ('departing', 'synthetic-key'), ('keeper', 'keeper-key');
      INSERT INTO tree_collaborators VALUES
        ('own', 'owned', 'keeper', 'keeper@example.test'),
        ('uid', 'shared', 'departing', 'old@example.test'),
        ('email', 'shared', null, 'DEPARTING@example.test'),
        ('keeper', 'shared', 'keeper', 'keeper@example.test'),
        ('blank', 'shared', null, '');
      INSERT INTO tree_invitations VALUES
        ('uid', 'shared', 'departing', 'old@example.test', null),
        ('email', 'shared', null, 'DEPARTING@example.test', null),
        ('accepted', 'shared', null, 'old-address@example.test', 'departing'),
        ('keeper', 'shared', 'keeper', 'keeper@example.test', null);
    `);
    await claims({ sub: 'departing', email: 'departing@example.test' });
  });
  afterEach(async () => { await db.exec('ROLLBACK'); });

  it('reproduces the old orphan memberships and Google key before the fix', async () => {
    await db.exec(previous);
    await remove();
    expect((await rows('tree_collaborators')).map(row => row.id)).toContain('email');
    expect((await rows('user_keys')).map(row => row.user_id)).toContain('departing');
    expect(await rows('tree_invitations')).toHaveLength(4);
  });

  it('removes UID/email memberships, invitations and keys without altering another owner tree', async () => {
    await db.exec('SET LOCAL ROLE authenticated');
    await remove();
    await db.exec('RESET ROLE');
    expect(await rows('user_profiles')).toEqual([{ id: 'keeper' }]);
    expect(await rows('trees')).toEqual([{ id: 'shared', owner_id: 'keeper' }]);
    expect(await rows('people')).toEqual([{ id: 'shared-person', tree_id: 'shared', name: 'Synthetic keeper' }]);
    expect((await rows('tree_collaborators')).map(row => row.id)).toEqual(['blank', 'keeper']);
    expect((await rows('tree_invitations')).map(row => row.id)).toEqual(['keeper']);
    expect(await rows('user_keys')).toEqual([{ user_id: 'keeper', google_refresh_token: 'keeper-key' }]);
    await remove();
    expect(await rows('trees')).toHaveLength(1);
  });

  it.each([{}, { sub: '' }])('rejects missing authentication %j before deleting anything', async value => {
    await claims(value);
    await expect(remove()).rejects.toThrow('Missing authenticated user');
  });

  it.each([undefined, ''])('never matches blank recipient emails when JWT email is %s', async email => {
    await claims({ sub: 'departing', ...(email === undefined ? {} : { email }) });
    await remove();
    expect((await rows('tree_collaborators')).map(row => row.id)).toEqual(['blank', 'email', 'keeper']);
    expect((await rows('tree_invitations')).map(row => row.id)).toEqual(['email', 'keeper']);
  });

  it('rolls back all database cleanup if a later delete fails', async () => {
    await db.exec(`CREATE FUNCTION reject_profile_delete() RETURNS trigger LANGUAGE plpgsql AS
      $$ BEGIN RAISE EXCEPTION 'Synthetic profile deletion failure'; END $$;
      CREATE TRIGGER reject_delete BEFORE DELETE ON user_profiles FOR EACH ROW EXECUTE FUNCTION reject_profile_delete();
      SAVEPOINT attempt;`);
    await expect(remove()).rejects.toThrow('Synthetic profile deletion failure');
    await db.exec('ROLLBACK TO SAVEPOINT attempt');
    expect(await rows('trees')).toHaveLength(2);
    expect(await rows('user_keys')).toHaveLength(2);
    expect(await rows('tree_collaborators')).toHaveLength(5);
    expect(await rows('tree_invitations')).toHaveLength(4);
  });

  it('does not grant either deletion function to anonymous callers', async () => {
    for (const schema of ['private', 'public']) {
      const result = await db.query<{ allowed: boolean }>(
        "SELECT has_function_privilege('anon', $1, 'EXECUTE') AS allowed", [`${schema}.delete_my_profile_data()`]);
      expect(result.rows[0].allowed).toBe(false);
    }
  });

  it.each(['active', 'trialing', 'past_due', 'paused', 'unexpected-status'])(
    'blocks direct authenticated RPC for %s without any database cleanup', async status => {
      await db.query('INSERT INTO subscriptions VALUES ($1, $2, $3)', ['subscription', 'departing', status]);
      const tables = ['subscriptions', 'user_profiles', 'trees', 'people', 'user_keys', 'tree_collaborators', 'tree_invitations'];
      const before = [];
      for (const table of tables) before.push(await rows(table));
      await db.exec('SET LOCAL ROLE authenticated; SAVEPOINT deletion_attempt');
      await expect(remove()).rejects.toThrow('ACCOUNT_HAS_OPEN_SUBSCRIPTION');
      await db.exec('ROLLBACK TO SAVEPOINT deletion_attempt; RESET ROLE');
      for (const [index, table] of tables.entries()) expect(await rows(table)).toEqual(before[index]);
    }
  );

  it('allows a canceled subscription and preserves another account active subscription', async () => {
    await db.exec("INSERT INTO subscriptions VALUES ('ended', 'departing', 'canceled'), ('ongoing', 'keeper', 'active')");
    await db.exec('SET LOCAL ROLE authenticated');
    await remove();
    await db.exec('RESET ROLE');
    expect(await rows('subscriptions')).toEqual([{ id: 'ongoing', user_id: 'keeper', status: 'active' }]);
    expect(await rows('user_profiles')).toEqual([{ id: 'keeper' }]);
  });
});
