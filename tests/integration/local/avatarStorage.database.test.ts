import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const migration = (file: string) => readFileSync(path.resolve('supabase/migrations', file), 'utf8');
const hardening = migration('20260906000800_harden_legacy_avatar_management.sql');
const treeId = '11111111-1111-4111-8111-111111111111';
const otherTreeId = '22222222-2222-4222-8222-222222222222';
const treePhoto = `${treeId}/legacy.png`;
const accountPhoto = 'users/owner/profile.png';

describe('legacy avatar storage authorization on PostgreSQL', () => {
  let db: PGlite;
  const actAs = async (user: string, anonymous = false) => {
    await db.exec('RESET ROLE');
    await db.query("SELECT set_config('request.jwt.claims', $1, false)", [JSON.stringify(
      anonymous ? {} : { sub: user, email: `${user}@example.test` }
    )]);
    await db.exec(anonymous ? 'SET ROLE anon' : 'SET ROLE authenticated');
  };

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      CREATE ROLE authenticated; CREATE ROLE anon; CREATE ROLE service_role;
      CREATE SCHEMA auth; CREATE SCHEMA storage;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
        SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
      $$;
      CREATE TABLE trees(id uuid PRIMARY KEY, owner_id text, name text);
      CREATE TABLE tree_collaborators(tree_id uuid, collaborator_uid text, email text, role text);
      CREATE TABLE storage.objects(bucket_id text, name text, metadata jsonb DEFAULT '{}', PRIMARY KEY(bucket_id, name));
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      GRANT USAGE ON SCHEMA auth, storage, public TO authenticated, anon;
      GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated, anon;
      -- Reproduce the hosted permissive policies; a narrower policy alone cannot fix them.
      CREATE POLICY "Allow Auth Uploads" ON storage.objects FOR INSERT TO authenticated, anon
        WITH CHECK (bucket_id = 'avatars');
      CREATE POLICY "Tree Owner Avatar Management" ON storage.objects TO authenticated
        USING (bucket_id = 'avatars') WITH CHECK (bucket_id = 'avatars');
    `);
    await db.exec(migration('20260523230000_isolate_db_helpers_to_private_schema.sql'));
    const uuidHelper = migration('20260531195055_billing_fixes.sql')
      .match(/CREATE OR REPLACE FUNCTION private\.is_valid_uuid[\s\S]*?\$\$;/)?.[0];
    if (!uuidHelper) throw new Error('UUID helper prerequisite missing');
    await db.exec(uuidHelper);
    await db.exec(hardening);
    // Defense-in-depth proof against an unknown permissive policy, not just known names.
    await db.exec(`CREATE POLICY "Synthetic permissive regression" ON storage.objects
      TO authenticated, anon USING (true) WITH CHECK (true);`);
  });
  beforeEach(async () => {
    await db.exec('RESET ROLE; TRUNCATE trees, tree_collaborators, storage.objects');
    await db.query('INSERT INTO trees VALUES ($1::uuid, $2, $1::text), ($3::uuid, $4, $3::text)', [treeId, 'owner', otherTreeId, 'outsider']);
    await db.query("INSERT INTO tree_collaborators VALUES ($1, 'editor', 'editor@example.test', 'editor'), ($1, 'viewer', 'viewer@example.test', 'viewer')", [treeId]);
    await db.query("INSERT INTO storage.objects(bucket_id, name) VALUES ('avatars', $1), ('avatars', $2)", [treePhoto, accountPhoto]);
  });
  afterAll(async () => { await db?.close(); });

  it('removes known unsafe policies and reapplies without changing objects', async () => {
    await db.exec(hardening);
    expect((await db.query(`SELECT policyname FROM pg_policies WHERE schemaname = 'storage'
      AND policyname IN ('Allow Auth Uploads', 'Tree Owner Avatar Management')`)).rows).toEqual([]);
    expect((await db.query('SELECT name FROM storage.objects')).rows).toHaveLength(2);
  });

  it.each(['owner', 'editor'])('preserves %s tree upload, update and deletion', async user => {
    await actAs(user);
    const name = `${treeId}/gallery/new.png`;
    await db.query("INSERT INTO storage.objects(bucket_id, name) VALUES ('avatars', $1)", [name]);
    expect((await db.query("UPDATE storage.objects SET metadata = '{\"updated\":true}' WHERE name = $1 RETURNING name", [name])).rows).toHaveLength(1);
    expect((await db.query('DELETE FROM storage.objects WHERE name = $1 RETURNING name', [name])).rows).toHaveLength(1);
  });

  it.each(['owner', 'editor', 'viewer', 'outsider'])('preserves %s own-account upsert without granting another user access', async user => {
    await actAs(user);
    const name = `users/${user}/profile.png`;
    for (let i = 0; i < 2; i++) await db.query(`INSERT INTO storage.objects(bucket_id, name)
      VALUES ('avatars', $1) ON CONFLICT (bucket_id, name) DO UPDATE SET metadata = '{"updated":true}'`, [name]);
    expect((await db.query('DELETE FROM storage.objects WHERE name = $1 RETURNING name', [name])).rows).toHaveLength(1);
  });

  it.each(['viewer', 'outsider', 'anonymous'])('denies %s tree listing and every mutation even with a permissive policy', async user => {
    await actAs(user, user === 'anonymous');
    expect((await db.query('SELECT name FROM storage.objects')).rows).toEqual([]);
    expect((await db.query('UPDATE storage.objects SET metadata = $1 RETURNING name', [{ hacked: true }])).rows).toEqual([]);
    expect((await db.query('DELETE FROM storage.objects RETURNING name')).rows).toEqual([]);
    await expect(db.query("INSERT INTO storage.objects(bucket_id, name) VALUES ('avatars', $1)", [`${treeId}/attack.png`]))
      .rejects.toThrow(/row-level security/);
  });

  it.each(['editor', 'viewer', 'outsider'])('denies %s updates, upserts and deletion of another account image', async user => {
    await actAs(user);
    expect((await db.query('UPDATE storage.objects SET metadata = $1 WHERE name = $2 RETURNING name', [{ hacked: true }, accountPhoto])).rows).toEqual([]);
    expect((await db.query('DELETE FROM storage.objects WHERE name = $1 RETURNING name', [accountPhoto])).rows).toEqual([]);
    await expect(db.query(`INSERT INTO storage.objects(bucket_id, name) VALUES ('avatars', $1)
      ON CONFLICT (bucket_id, name) DO UPDATE SET metadata = '{"hacked":true}'`, [accountPhoto])).rejects.toThrow(/row-level security/);
  });

  it.each([`${otherTreeId}/moved.png`, 'users/outsider/moved.png'])('rejects moving an owned object into %s', async target => {
    await actAs('owner');
    await expect(db.query('UPDATE storage.objects SET name = $1 WHERE name = $2', [target, treePhoto])).rejects.toThrow(/row-level security/);
  });

  it.each(['', 'users', 'users/owner', 'users/owner/../outsider/profile.png', 'users//profile.png',
    'users/owner/./profile.png', 'users/owner/a\\b.png', 'not-a-uuid/image.png', '/users/owner/profile.png',
    `users/owner/${'x'.repeat(1025)}`, 'users/owner/a\n.png'])('fails closed on malformed path %j without UUID cast errors', async name => {
    await actAs('owner');
    expect((await db.query('SELECT private.can_manage_avatar_object($1) AS allowed', [name])).rows).toEqual([{ allowed: false }]);
  });

  it('uses current membership after downgrade and leaves other bucket policies unchanged', async () => {
    await db.exec("UPDATE tree_collaborators SET role = 'viewer' WHERE collaborator_uid = 'editor'");
    await actAs('editor');
    expect((await db.query('SELECT name FROM storage.objects')).rows).toEqual([]);
    await db.exec("INSERT INTO storage.objects(bucket_id, name) VALUES ('unrelated-test-bucket', 'file')");
    expect((await db.query('SELECT name FROM storage.objects')).rows).toEqual([{ name: 'file' }]);
  });
});
