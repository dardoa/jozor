import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const read = (name: string) => readFileSync(path.resolve('supabase/migrations', name), 'utf8');
const migrationPath = path.resolve('supabase/migrations/20261002000100_retire_replaced_user_avatars.sql');
const owner = '108123456789012345678';
const oldPath = `users/${owner}/profile.png`;
const fresh = (id = '11111111-1111-4111-8111-111111111111', user = owner) => `users/${user}/profile-${id}.webp`;
const url = (name: string) => `https://example.test/storage/v1/object/public/avatars/${name}`;

describe('durable user avatar retirement on PostgreSQL', () => {
  let db: PGlite;
  const role = async (actor = owner, name = 'authenticated') => {
    await db.exec('RESET ROLE');
    await db.query("SELECT set_config('request.jwt.claims', $1, false)", [JSON.stringify({ sub: actor, role: name })]);
    await db.exec(`SET ROLE ${name}`);
  };
  const scalar = async <T,>(sql: string, values: unknown[] = []) => (await db.query<{ value: T }>(sql, values)).rows[0].value;
  const replace = (name = fresh(), expected: string | null = oldPath, version: number | null = 3, publicUrl = url(name)) =>
    scalar<{ photoPath: string; photoVersion: number }>('SELECT public.replace_user_avatar($1,$2,$3,$4) AS value', [publicUrl, name, expected, version]);
  const rpc = (name: string, target = oldPath) => scalar<boolean>(`SELECT public.${name}($1) AS value`, [target]);
  const queue = async () => { await db.exec('RESET ROLE'); return (await db.query('SELECT * FROM private.user_avatar_cleanup ORDER BY object_path')).rows; };
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth; CREATE SCHEMA storage;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claims')::jsonb $$;
      CREATE TABLE trees(id uuid, owner_id text); CREATE TABLE tree_collaborators(tree_id uuid, collaborator_uid text, email text, role text);
      CREATE TABLE user_profiles(id text PRIMARY KEY, photo_path text, photo_url text, photo_version integer, updated_at timestamptz, display_name text);
      CREATE TABLE storage.objects(bucket_id text, name text, metadata jsonb, PRIMARY KEY(bucket_id,name));
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      GRANT USAGE ON SCHEMA auth, public, storage TO anon, authenticated, service_role;
      GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated, service_role;
      GRANT SELECT, UPDATE ON user_profiles TO authenticated;
      CREATE POLICY permissive_fixture ON storage.objects TO authenticated USING(true) WITH CHECK(true);
    `);
    await db.exec(read('20260523230000_isolate_db_helpers_to_private_schema.sql'));
    const billing = read('20260531195055_billing_fixes.sql');
    await db.exec(billing.match(/CREATE OR REPLACE FUNCTION private\.is_valid_uuid[\s\S]*?\$\$;/)![0]);
    await db.exec(billing.slice(billing.indexOf('CREATE OR REPLACE FUNCTION private.update_user_avatar('), billing.indexOf('-- 15.')));
    await db.exec(read('20260906000800_harden_legacy_avatar_management.sql'));
    if (existsSync(migrationPath)) await db.exec(readFileSync(migrationPath, 'utf8'));
  });
  beforeEach(async () => {
    await db.exec('RESET ROLE; ALTER TABLE user_profiles DISABLE TRIGGER USER; TRUNCATE user_profiles, storage.objects');
    if (await scalar("SELECT to_regclass('private.user_avatar_cleanup') IS NOT NULL AS value")) await db.exec('TRUNCATE private.user_avatar_cleanup');
    await db.query('INSERT INTO user_profiles(id,photo_path,photo_url,photo_version) VALUES($1,$2,$3,3),($4,NULL,NULL,NULL)', [owner, oldPath, url(oldPath), 'other']);
    await db.exec('ALTER TABLE user_profiles ENABLE TRIGGER USER');
    await db.query("INSERT INTO storage.objects VALUES ('avatars',$1,'{}'),('avatars',$2,'{}')", [oldPath, fresh()]);
    await role();
  });
  afterAll(async () => { await db?.close(); });

  it('retires old-RPC replacements rather than leaking the previous object', async () => {
    await db.query('SELECT public.update_user_avatar($1,$2,4)', [url(fresh()), fresh()]);
    expect(await scalar("SELECT to_regclass('private.user_avatar_cleanup') IS NOT NULL AS value")).toBe(true);
    expect(await queue()).toEqual([expect.objectContaining({ object_path: oldPath, user_id: owner, completed_at: null })]);
    expect(await scalar('SELECT count(*)::int AS value FROM storage.objects')).toBe(2);
  });
  it('atomically advances database version and rejects stale replacement without extra retirement', async () => {
    expect(await replace()).toEqual({ photoPath: fresh(), photoVersion: 4 });
    await expect(replace(fresh('22222222-2222-4222-8222-222222222222'))).rejects.toThrow(/changed|conflict/i);
    expect(await queue()).toHaveLength(1);
    expect(await scalar('SELECT photo_path AS value FROM user_profiles WHERE id=$1', [owner])).toBe(fresh());
  });
  it('matches null path and version independently of a caller version hint', async () => {
    await role('other');
    expect(await replace(fresh(undefined, 'other'), null, null)).toEqual({ photoPath: fresh(undefined, 'other'), photoVersion: 1 });
  });
  it('queues clearing and profile deletion while retaining tombstones and avoiding unrelated profile changes', async () => {
    await db.query('UPDATE user_profiles SET display_name=$1 WHERE id=$2', ['OAuth name', owner]);
    expect(await queue()).toHaveLength(0);
    await db.query('UPDATE user_profiles SET photo_path=NULL,photo_url=NULL WHERE id=$1', [owner]);
    expect(await queue()).toHaveLength(1);
    await db.query('DELETE FROM user_profiles WHERE id=$1', [owner]);
    expect(await queue()).toHaveLength(1);
    await role('', 'service_role');
    expect(await rpc('claim_user_avatar_cleanup')).toBe(true);
  });
  it('lists only own pending rows and service candidates, not the bucket inventory', async () => {
    await replace();
    expect((await db.query('SELECT * FROM public.list_my_user_avatar_cleanup()')).rows).toEqual([{ object_path: oldPath }]);
    await role('other');
    expect((await db.query('SELECT * FROM public.list_my_user_avatar_cleanup()')).rows).toEqual([]);
    expect(await rpc('claim_user_avatar_cleanup')).toBe(false);
    expect(await rpc('complete_user_avatar_cleanup')).toBe(false);
    expect(await rpc('request_user_avatar_cleanup')).toBe(false);
    await expect(db.query('SELECT * FROM private.user_avatar_cleanup')).rejects.toThrow(/permission denied/);
    await expect(db.query('SELECT * FROM public.list_user_avatar_cleanup_candidates()')).rejects.toThrow(/permission denied/);
    await role('', 'service_role');
    expect((await db.query('SELECT * FROM public.list_user_avatar_cleanup_candidates()')).rows).toEqual([{ object_path: oldPath }]);
    await role('', 'anon');
    await expect(rpc('claim_user_avatar_cleanup')).rejects.toThrow(/permission denied/);
  });
  it('keeps cleanup safe across profile deletion and recreation before object removal', async () => {
    await replace();
    await db.exec('RESET ROLE');
    await db.query('DELETE FROM user_profiles WHERE id=$1', [owner]);
    expect(await queue()).toHaveLength(2);
    await role('', 'service_role');
    expect(await rpc('claim_user_avatar_cleanup', fresh())).toBe(true);
    await db.exec('RESET ROLE');
    await expect(db.query('INSERT INTO user_profiles(id,photo_path,photo_url) VALUES($1,$2,$3)', [owner, fresh(), url(fresh())])).rejects.toThrow(/retired/i);
    await db.query('INSERT INTO user_profiles(id) VALUES($1)', [owner]);
    await role();
    await db.query('DELETE FROM storage.objects WHERE name=$1', [fresh()]);
    expect(await rpc('complete_user_avatar_cleanup', fresh())).toBe(true);
    await expect(replace(fresh(), null, null)).rejects.toThrow(/retired/i);
  });
  it('accepts native UUID owners and limits both queue lists to twenty recorded targets', async () => {
    const uuid = '33333333-3333-4333-8333-333333333333';
    await db.exec('RESET ROLE'); await db.query('INSERT INTO user_profiles(id) VALUES($1)', [uuid]);
    await role(uuid);
    expect(await replace(fresh(undefined, uuid), null, null)).toEqual({ photoPath: fresh(undefined, uuid), photoVersion: 1 });
    for (let i = 1; i <= 21; i++) {
      expect(await rpc('request_user_avatar_cleanup', fresh(`${String(i).padStart(8, '0')}-1111-4111-8111-111111111111`, uuid))).toBe(true);
    }
    expect((await db.query('SELECT * FROM public.list_my_user_avatar_cleanup()')).rows).toHaveLength(20);
    await role('', 'service_role');
    expect((await db.query('SELECT * FROM public.list_user_avatar_cleanup_candidates()')).rows).toHaveLength(20);
  });
  it('does not derive a Storage deletion target from an external URL-only profile image', async () => {
    await db.exec('RESET ROLE; ALTER TABLE user_profiles DISABLE TRIGGER USER');
    await db.query('UPDATE user_profiles SET photo_path=NULL,photo_url=$1 WHERE id=$2',
      [url(oldPath).replace('example.test', 'external.test'), owner]);
    await db.exec('ALTER TABLE user_profiles ENABLE TRIGGER USER'); await role();
    await replace(fresh(), null);
    expect(await queue()).toHaveLength(0);
    expect((await db.query('SELECT name FROM storage.objects WHERE name=$1', [oldPath])).rows).toHaveLength(1);
  });
  it('preserves ordinary profile updates with unchanged photo columns on a grandfathered live reference', async () => {
    await db.exec('RESET ROLE');
    await db.query('UPDATE user_profiles SET photo_url=$1 WHERE id=$2', [url(oldPath), 'other']);
    await role(); await replace();
    expect(await rpc('claim_user_avatar_cleanup')).toBe(false);
    await role('other');
    // update_my_profile includes these columns in SET even for metadata/name-only updates.
    await expect(db.query('UPDATE user_profiles SET display_name=$1,photo_path=photo_path,photo_url=photo_url WHERE id=$2 RETURNING display_name',
      ['new name', 'other'])).resolves.toMatchObject({ rows: [{ display_name: 'new name' }] });
    await db.query('UPDATE user_profiles SET photo_url=NULL WHERE id=$1', ['other']);
    await expect(db.query('UPDATE user_profiles SET photo_url=$1 WHERE id=$2', [url(oldPath), 'other'])).rejects.toThrow(/retired/i);
    await role(); expect(await rpc('claim_user_avatar_cleanup')).toBe(true);
  });
  it('claims only retired unreferenced objects and completes only after confirmed absence', async () => {
    expect(await rpc('claim_user_avatar_cleanup')).toBe(false);
    expect(await rpc('request_user_avatar_cleanup')).toBe(false);
    await replace();
    expect(await rpc('complete_user_avatar_cleanup')).toBe(false);
    expect(await rpc('claim_user_avatar_cleanup')).toBe(true);
    expect(await rpc('complete_user_avatar_cleanup')).toBe(false);
    await db.query('DELETE FROM storage.objects WHERE name=$1', [oldPath]);
    expect(await rpc('complete_user_avatar_cleanup')).toBe(true);
    expect(await rpc('complete_user_avatar_cleanup')).toBe(true);
    expect((await db.query('SELECT * FROM public.list_my_user_avatar_cleanup()')).rows).toEqual([]);
  });
  it('retains a matching legacy URL in any profile, then rejects later reattachment', async () => {
    await db.exec('RESET ROLE');
    await db.query('UPDATE user_profiles SET photo_url=$1 WHERE id=$2', [url(oldPath), 'other']);
    await role(); await replace();
    expect(await rpc('claim_user_avatar_cleanup')).toBe(false);
    await db.exec('RESET ROLE');
    await db.query('UPDATE user_profiles SET photo_url=NULL WHERE id=$1', ['other']);
    await role(); expect(await rpc('claim_user_avatar_cleanup')).toBe(true);
    await expect(db.query('UPDATE user_profiles SET photo_url=$1 WHERE id=$2', [url(oldPath), 'other'])).rejects.toThrow(/retired/i);
    await expect(db.query('SELECT public.update_user_avatar($1,$2,9)', [url(oldPath), oldPath])).rejects.toThrow(/retired/i);
    await db.query('UPDATE user_profiles SET display_name=$1 WHERE id=$2', ['changed', owner]);
  });
  it('fences late Storage INSERT and UPDATE but permits SELECT and DELETE', async () => {
    await replace();
    await expect(db.query('UPDATE storage.objects SET metadata=$1 WHERE name=$2', [{ late: true }, oldPath])).rejects.toThrow(/retired/i);
    await expect(db.query('UPDATE storage.objects SET name=$1 WHERE name=$2', [fresh('22222222-2222-4222-8222-222222222222'), oldPath])).rejects.toThrow(/retired/i);
    expect((await db.query('SELECT name FROM storage.objects WHERE name=$1', [oldPath])).rows).toHaveLength(1);
    await db.query('DELETE FROM storage.objects WHERE name=$1', [oldPath]);
    await expect(db.query("INSERT INTO storage.objects VALUES ('avatars',$1,'{}')", [oldPath])).rejects.toThrow(/retired/i);
    await db.exec("INSERT INTO storage.objects VALUES ('other-bucket','unchanged','{}')");
  });
  it('queues uncertain own fresh uploads but never arbitrary legacy names', async () => {
    expect(await rpc('request_user_avatar_cleanup', fresh())).toBe(true);
    expect(await rpc('request_user_avatar_cleanup', `users/${owner}/profile.jpg`)).toBe(false);
    expect(await rpc('claim_user_avatar_cleanup', fresh())).toBe(true);
    await expect(replace()).rejects.toThrow(/retired/i);
  });
  it('does not let the legacy RPC attach a newly invented fixed-name avatar', async () => {
    const target = `users/${owner}/profile.jpg`;
    await expect(db.query('SELECT public.update_user_avatar($1,$2,4)', [url(target), target])).rejects.toThrow(/invalid/i);
  });
  it.each(['profile.webp', 'profile.png', 'profile.jpg', 'profile.jpeg'])('retires actually referenced legacy %s only', async filename => {
    await db.exec('RESET ROLE');
    await db.exec('ALTER TABLE user_profiles DISABLE TRIGGER USER');
    await db.query('UPDATE user_profiles SET photo_path=$1,photo_url=$2 WHERE id=$3', [`users/${owner}/${filename}`, url(`users/${owner}/${filename}`), owner]);
    await db.exec('ALTER TABLE user_profiles ENABLE TRIGGER USER');
    await db.exec('TRUNCATE private.user_avatar_cleanup'); await role();
    await replace(fresh(), `users/${owner}/${filename}`);
    expect(await queue()).toHaveLength(1);
  });
  it.each(['users/other/profile-11111111-1111-4111-8111-111111111111.webp', `users/${owner}/../profile.webp`,
    `users/${owner}/profile.png`, `users/${owner}/nested/profile.webp`, `users/${owner}/a\\b.webp`,
    `users/${owner}/profile-%2f.webp`, `users/${owner}/profile-abc.webp`, `users/${owner}/profile-\n.webp`])('rejects invalid replacement %j', async target => {
    await expect(replace(target)).rejects.toThrow(/invalid|owned/i);
  });
  it.each([url(fresh()) + '?v=4', url(fresh()) + '#fragment', url(oldPath), 'https://external.test/photo.webp'])('rejects mismatched or ambiguous URL %j', async publicUrl => {
    await expect(replace(fresh(), oldPath, 3, publicUrl)).rejects.toThrow(/invalid|match/i);
  });
});
