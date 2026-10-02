import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const owner = '11111111-1111-4111-8111-111111111111';
const oldPath = `users/${owner}/profile-11111111-1111-4111-8111-111111111111.webp`;
const newPath = `users/${owner}/profile-22222222-2222-4222-8222-222222222222.webp`;
const url = (name: string) => `https://example.test/storage/v1/object/public/avatars/${name}`;
const read = (name: string) => readFileSync(path.resolve('supabase/migrations', name), 'utf8');

describe('account deletion and avatar lock ordering', () => {
  let db: PGlite;
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE SCHEMA storage; CREATE SCHEMA private;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claims')::jsonb $$;
      CREATE FUNCTION private.current_user_id_text() RETURNS text LANGUAGE sql STABLE AS $$ SELECT auth.jwt()->>'sub' $$;
      CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE TABLE user_profiles(id text PRIMARY KEY, photo_path text, photo_url text, photo_version integer, updated_at timestamptz);
      CREATE TABLE subscriptions(id text, user_id text, status text);
      CREATE TABLE trees(id uuid, owner_id text);
      CREATE TABLE tree_collaborators(tree_id uuid, collaborator_uid text, email text);
      CREATE TABLE tree_invitations(tree_id uuid, invited_uid text, accepted_by text, invited_email text);
      CREATE TABLE user_keys(user_id text);
      CREATE TABLE storage.objects(bucket_id text, name text, PRIMARY KEY(bucket_id,name));
      CREATE FUNCTION private.delete_my_profile_data() RETURNS void LANGUAGE sql AS $$ SELECT $$;
      CREATE FUNCTION public.delete_my_profile_data() RETURNS void LANGUAGE sql AS $$ SELECT private.delete_my_profile_data() $$;
      REVOKE ALL ON FUNCTION private.delete_my_profile_data(), public.delete_my_profile_data() FROM PUBLIC;
      GRANT EXECUTE ON FUNCTION private.delete_my_profile_data(), public.delete_my_profile_data() TO authenticated;
      GRANT USAGE ON SCHEMA public,private,auth TO authenticated,service_role;
    `);
    await db.exec(read('20260908000100_queue_account_deletion_cleanup.sql'));
    await db.exec(read('20261002000100_retire_replaced_user_avatars.sql'));
    // Observe the shared gate, not PGlite's special-cased advisory built-in.
    await db.exec(`
      CREATE OR REPLACE FUNCTION private.lock_user_avatar_retirement() RETURNS void LANGUAGE plpgsql AS $$
      BEGIN
        IF current_setting('test.avatar_lock_seen',true) IS DISTINCT FROM 'yes' THEN
          PERFORM set_config('test.avatar_lock_modes',coalesce((SELECT string_agg(mode,',') FROM pg_locks WHERE relation='public.user_profiles'::regclass),''),true);
          IF EXISTS(SELECT 1 FROM pg_locks WHERE relation='public.user_profiles'::regclass AND mode='RowShareLock') THEN
            RAISE EXCEPTION 'Avatar lock acquired after profile lock';
          END IF;
          PERFORM set_config('test.avatar_lock_seen','yes',true);
        END IF;
      END;
      $$;
    `);
  });
  beforeEach(async () => {
    await db.exec('RESET ROLE; TRUNCATE user_profiles,storage.objects,private.user_avatar_cleanup,private.account_deletion_objects,private.account_deletion_jobs,private.account_checkout_attempts,auth.users');
    await db.query('INSERT INTO user_profiles(id,photo_path,photo_url,photo_version) VALUES($1,$2,$3,1)', [owner, oldPath, url(oldPath)]);
    await db.query('INSERT INTO auth.users VALUES($1)', [owner]);
    await db.query("SELECT set_config('request.jwt.claims',$1,false)", [JSON.stringify({ sub: owner, role: 'authenticated' })]);
  });
  afterAll(async () => { await db?.close(); });

  const observeFirstLock = () => db.exec(`
    BEGIN;
    -- Single-connection observation checks ordering, not concurrent scheduling.
    SET LOCAL ROLE authenticated;
  `);

  it('locks avatar references before the deletion profile lock', async () => {
    await observeFirstLock();
    try {
      await expect(db.query('SELECT public.request_account_deletion() AS job')).resolves.toMatchObject({ rows: [{ job: expect.any(String) }] });
      expect((await db.query("SELECT current_setting('test.avatar_lock_seen',true) AS seen, current_setting('test.avatar_lock_modes',true) AS modes")).rows).toEqual([{ seen: 'yes', modes: expect.not.stringContaining('RowShareLock') }]);
    } finally { await db.exec('ROLLBACK'); }
  });
  it('uses the same ordering for avatar replacement', async () => {
    await observeFirstLock();
    try {
      await expect(db.query('SELECT public.replace_user_avatar($1,$2,$3,1) AS photo', [url(newPath), newPath, oldPath])).resolves.toMatchObject({ rows: [{ photo: { photoPath: newPath, photoVersion: 2 } }] });
      expect((await db.query("SELECT current_setting('test.avatar_lock_seen',true) AS seen")).rows).toEqual([{ seen: 'yes' }]);
    } finally { await db.exec('ROLLBACK'); }
  });
  it('preserves a paused deletion grant when the avatar migration replaces its body', async () => {
    await db.exec('BEGIN; REVOKE EXECUTE ON FUNCTION private.request_account_deletion(text) FROM authenticated');
    try {
      // Reapply just the forward replacement after a pause, without recreating the queue.
      const migration = read('20261002000100_retire_replaced_user_avatars.sql');
      const replacement = migration.match(/CREATE OR REPLACE FUNCTION private\.request_account_deletion[\s\S]*?\$\$;/)?.[0];
      if (!replacement) throw new Error('Deletion replacement fixture missing');
      await db.exec(replacement);
      await db.exec('SET LOCAL ROLE authenticated');
      await expect(db.query('SELECT public.request_account_deletion()')).rejects.toThrow(/permission denied/i);
    } finally { await db.exec('ROLLBACK'); }
  });
});
