import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createPersonMediaAssetRef } from '../../../src/types/personMedia';

const treeId = '11111111-1111-4111-8111-111111111111';
const otherTreeId = '22222222-2222-4222-8222-222222222222';
const assetId = '33333333-3333-4333-8333-333333333333';
const timestamp = '2026-09-05T12:00:00.000Z';
const readMigration = (file: string) => readFileSync(path.resolve('supabase/migrations', file), 'utf8');
const mediaMigration = readMigration('20260905000100_add_private_person_media_bucket.sql');
const legacyMigration = readMigration('20260905000200_add_legacy_person_media_migration_rpcs.sql');

const photo = createPersonMediaAssetRef({
  treeId, assetId, kind: 'profile-photo', mimeType: 'image/png',
  byteLength: 16, version: 1, createdAt: timestamp,
});
const galleryPhoto = createPersonMediaAssetRef({
  treeId, assetId, kind: 'gallery-photo', mimeType: 'image/png',
  byteLength: 16, version: 1, createdAt: timestamp,
});

// Only platform tables/auth claims are simulated. Authorization helpers, the
// privacy view, sync LWW projection and the new migration execute their real SQL.
const platformSchema = `
  CREATE ROLE anon;
  CREATE ROLE authenticated;
  CREATE ROLE service_role;
  CREATE SCHEMA auth;
  CREATE SCHEMA storage;
  CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
    SELECT COALESCE(NULLIF(current_setting('request.jwt.claims', true), ''), '{}')::jsonb;
  $$;
  CREATE TABLE trees (id uuid PRIMARY KEY, owner_id text, name text, focus_id text,
    settings jsonb DEFAULT '{}', updated_at timestamptz);
  CREATE TABLE tree_collaborators (tree_id uuid, collaborator_uid text, email text, role text);
  CREATE TABLE user_profiles (id text PRIMARY KEY, tier text);
  CREATE TABLE people (
    id text PRIMARY KEY, tree_id uuid, first_name text, last_name text, middle_name text,
    birth_name text, nick_name text, suffix text, gender text, birth_date date, death_date date,
    birth_place text, death_place text, bio text, profession text, company text, interests text,
    photo_url text, photo_path text, photo_version integer, email text, website text,
    blog text, address text, custom_fields jsonb DEFAULT '{}', metadata jsonb DEFAULT '{}',
    created_at timestamptz, updated_at timestamptz
  );
  CREATE TABLE tree_operations (tree_id uuid, user_id text, type text, payload jsonb,
    version_seq bigint, created_at timestamptz);
  CREATE TABLE tree_checkpoints (tree_id uuid, version_seq bigint);
  CREATE TABLE activity_logs (tree_id uuid, user_id text, user_email text, action_type text, details jsonb);
  CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean,
    file_size_limit bigint, allowed_mime_types text[]);
  CREATE TABLE storage.objects (bucket_id text, name text, PRIMARY KEY (bucket_id, name));
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  GRANT USAGE ON SCHEMA public, auth, storage TO authenticated, anon;
  GRANT SELECT ON trees, tree_collaborators TO authenticated;
  GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated, anon;
`;

describe('private person media on isolated PostgreSQL', () => {
  let db: PGlite;

  const actAs = async (user: string, role = 'authenticated') => {
    await db.exec('RESET ROLE');
    await db.query("SELECT set_config('request.jwt.claims', $1, false)", [JSON.stringify({
      sub: user, email: `${user}@example.test`,
    })]);
    // Role names are test-owned constants, never application input.
    await db.exec(role === 'anon' ? 'SET ROLE anon' : 'SET ROLE authenticated');
  };

  const sync = (updates: Record<string, unknown>, options: {
    client?: string; version?: number; at?: string;
  } = {}) => db.query('SELECT private.sync_tree_batch($1::jsonb)', [JSON.stringify([{
    tree_id: treeId, type: 'UPDATE_PROP', created_at: options.at ?? timestamp,
    payload: { id: 'person-1', updates, client_id: options.client ?? 'client-b',
      client_version: options.version ?? 1 },
  }])]);

  const stored = async () => {
    await db.exec('RESET ROLE');
    const result = await db.query<{ custom_fields: Record<string, unknown>; metadata: Record<string, unknown> }>(
      "SELECT custom_fields, metadata FROM people WHERE id = 'person-1'"
    );
    return result.rows[0];
  };

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(platformSchema);
    await db.exec(readMigration('20260523230000_isolate_db_helpers_to_private_schema.sql'));
    const uuidHelper = readMigration('20260531195055_billing_fixes.sql')
      .match(/CREATE OR REPLACE FUNCTION private\.is_valid_uuid[\s\S]*?\$\$;/)?.[0];
    if (!uuidHelper) throw new Error('UUID prerequisite not found');
    await db.exec(uuidHelper);
    await db.exec(readMigration('20260623165619_living_person_privacy_v2.sql'));
    await db.exec(mediaMigration);
    await db.exec(legacyMigration);
    await db.exec('GRANT SELECT ON people_secure TO authenticated');
  });

  beforeEach(async () => {
    await db.exec('RESET ROLE');
    await db.exec('TRUNCATE people, trees, tree_collaborators, user_profiles, tree_operations, storage.objects');
    await db.query('INSERT INTO trees(id, owner_id) VALUES ($1, $2), ($3, $4)', [treeId, 'owner', otherTreeId, 'outsider']);
    await db.query("INSERT INTO tree_collaborators VALUES ($1, 'editor', 'editor@example.test', 'editor'), ($1, 'viewer', 'viewer@example.test', 'viewer')", [treeId]);
    await db.query("INSERT INTO people(id, tree_id, first_name) VALUES ('person-1', $1, 'Private Test')", [treeId]);
    await db.query("INSERT INTO storage.objects VALUES ('person-media', $1)", [photo.objectPath]);
  });

  afterAll(async () => { await db?.close(); });

  it('creates a private, size-limited image bucket and can be reapplied', async () => {
    await db.exec(mediaMigration);
    const result = await db.query('SELECT public, file_size_limit, allowed_mime_types FROM storage.buckets');
    expect(result.rows).toEqual([{ public: false, file_size_limit: 5242880,
      allowed_mime_types: ['image/jpeg', 'image/png', 'image/webp'] }]);
  });

  it.each(['owner', 'editor'])('allows %s to read, upload and remove same-tree images', async (user) => {
    await actAs(user);
    expect((await db.query('SELECT name FROM storage.objects')).rows).toEqual([{ name: photo.objectPath }]);
    await db.query("INSERT INTO storage.objects VALUES ('person-media', $1)", [galleryPhoto.objectPath]);
    expect((await db.query('DELETE FROM storage.objects RETURNING name')).rows).toHaveLength(2);
  });

  it.each(['viewer', 'outsider', 'anonymous'])('denies direct object access to %s', async (user) => {
    await actAs(user, user === 'anonymous' ? 'anon' : 'authenticated');
    expect((await db.query('SELECT name FROM storage.objects')).rows).toHaveLength(0);
    expect((await db.query('DELETE FROM storage.objects RETURNING name')).rows).toHaveLength(0);
    await expect(db.query("INSERT INTO storage.objects VALUES ('person-media', $1)", [galleryPhoto.objectPath]))
      .rejects.toThrow(/row-level security/);
  });

  it('forbids cross-tree moves and malformed object names', async () => {
    await actAs('owner');
    await expect(db.query('UPDATE storage.objects SET name = $1', [photo.objectPath.replace(treeId, otherTreeId)]))
      .rejects.toThrow(/row-level security/);
    await expect(db.query("INSERT INTO storage.objects VALUES ('person-media', $1)", [`${treeId}/profile-photo/person-1.png`]))
      .rejects.toThrow(/row-level security/);
  });

  it('removes editor storage access as soon as the collaboration is revoked', async () => {
    await db.exec("DELETE FROM tree_collaborators WHERE collaborator_uid = 'editor'");
    await actAs('editor');
    expect((await db.query('SELECT name FROM storage.objects')).rows).toEqual([]);
  });

  it('persists profile/gallery assets through the real sync function and supports removal', async () => {
    await actAs('owner');
    await sync({ photoAsset: photo, gallery: [{ asset: galleryPhoto, caption: 'Family' }] });
    expect((await stored()).custom_fields).toEqual({ photoAsset: photo, gallery: [{ asset: galleryPhoto, caption: 'Family' }] });
    await actAs('owner');
    await sync({ photoAsset: null, gallery: [] }, { version: 2 });
    expect((await stored()).custom_fields).toEqual({ gallery: [] });
  });

  it('ignores older and losing same-timestamp operations', async () => {
    await actAs('owner');
    await sync({ photoAsset: photo });
    await sync({ photoAsset: null }, { at: '2026-09-04T12:00:00Z', version: 9 });
    await sync({ photoAsset: null }, { client: 'client-a', version: 9 });
    expect((await stored()).custom_fields.photoAsset).toEqual(photo);
  });

  it.each([
    ['other tree', { ...photo, objectPath: photo.objectPath.replace(treeId, otherTreeId) }],
    ['extra key', { ...photo, publicUrl: 'https://example.test/leak' }],
    ['oversized', { ...photo, byteLength: 5242881 }],
    ['wrong kind', galleryPhoto],
    ['null kind', { ...photo, kind: null }],
    ['invalid creation date', { ...photo, createdAt: 'not-a-date' }],
    ['noncanonical UUID', { ...photo, assetId: '00000000-0000-0000-0000-000000000000', objectPath: `${treeId}/profile-photo/00000000-0000-0000-0000-000000000000.png` }],
  ])('rolls back an invalid %s attachment including its sync stamp/log', async (_label, invalid) => {
    await actAs('owner');
    await expect(sync({ photoAsset: invalid })).rejects.toThrow(/Validation Error/);
    expect((await stored()).custom_fields).toEqual({});
    expect((await stored()).metadata).toEqual({});
    expect((await db.query('SELECT * FROM tree_operations')).rows).toHaveLength(0);
  });

  it('denies viewer sync writes', async () => {
    await actAs('viewer');
    await expect(sync({ photoAsset: photo })).rejects.toThrow(/not authorized/);
  });

  it.each(['photoAsset', 'gallery'])('rejects invalid %s even through direct custom_fields writes', async (field) => {
    const invalid = { ...photo, kind: null };
    const customFields = field === 'photoAsset' ? { photoAsset: invalid } : { gallery: [{ asset: invalid }] };
    await expect(db.query("UPDATE people SET custom_fields = $1 WHERE id = 'person-1'", [customFields]))
      .rejects.toThrow(/Validation Error/);
    await expect(db.query('INSERT INTO people(id, tree_id, custom_fields) VALUES ($1, $2, $3)', ['import-person', treeId, customFields]))
      .rejects.toThrow(/Validation Error/);
  });

  it('rolls back both media fields when a gallery attachment fails', async () => {
    await actAs('owner');
    await expect(sync({ photoAsset: photo, gallery: [{ asset: { ...galleryPhoto, createdAt: 'invalid' } }] }))
      .rejects.toThrow(/Validation Error/);
    expect((await stored()).custom_fields).toEqual({});
    expect((await db.query('SELECT * FROM tree_operations')).rows).toHaveLength(0);
  });

  it('permits valid import references and retains legacy gallery records', async () => {
    const fields = { photoAsset: photo, gallery: ['legacy.jpg', { asset: galleryPhoto }] };
    await db.query("UPDATE people SET custom_fields = $1 WHERE id = 'person-1'", [fields]);
    expect((await stored()).custom_fields).toEqual(fields);
    await actAs('editor');
    const result = await db.query<{ custom_fields: unknown }>('SELECT custom_fields FROM people_secure');
    expect(result.rows[0].custom_fields).toEqual(fields);
  });

  it('backfills historical metadata duplicates when the migration is applied', async () => {
    await db.exec('ALTER TABLE people DISABLE TRIGGER trg_strip_person_media_metadata');
    await db.query("UPDATE people SET metadata = $1 WHERE id = 'person-1'", [{ photoAsset: photo, gallery: [], safe: 'retained' }]);
    await db.exec('ALTER TABLE people ENABLE TRIGGER trg_strip_person_media_metadata');
    await db.exec(mediaMigration);
    expect((await stored()).metadata).toEqual({ safe: 'retained' });
  });

  it('masks living/private media in the real secure view but retains deceased media', async () => {
    await db.query("UPDATE people SET custom_fields = $1 WHERE id = 'person-1'", [{ photoAsset: photo, gallery: [{ asset: galleryPhoto }] }]);
    await actAs('viewer');
    let result = await db.query<{ custom_fields: Record<string, unknown> }>('SELECT custom_fields FROM people_secure');
    expect(result.rows[0].custom_fields).not.toHaveProperty('photoAsset');
    expect(result.rows[0].custom_fields.gallery).toEqual([]);
    await db.exec('RESET ROLE');
    await db.exec("UPDATE people SET death_date = '2000-01-01'");
    await actAs('viewer');
    result = await db.query('SELECT custom_fields FROM people_secure');
    expect(result.rows[0].custom_fields.photoAsset).toEqual(photo);
    await db.exec('RESET ROLE');
    await db.exec("UPDATE people SET custom_fields = custom_fields || '{\"isPrivate\": true}'");
    await actAs('viewer');
    result = await db.query('SELECT custom_fields FROM people_secure');
    expect(result.rows[0].custom_fields).not.toHaveProperty('photoAsset');
  });

  it('strips media metadata on writes without deleting sync winner stamps', async () => {
    await db.query("UPDATE people SET metadata = $1 WHERE id = 'person-1'", [{
      photoAsset: photo, gallery: [{ asset: galleryPhoto }], photoPath: photo.objectPath,
      lastUpdated: { photoAsset: timestamp },
    }]);
    expect((await stored()).metadata).toEqual({ lastUpdated: { photoAsset: timestamp } });
  });

  it('attaches and finalizes a legacy profile image with exact compare-and-set semantics', async () => {
    const sourcePath = `${treeId}/person-1.webp`;
    await db.query(
      "UPDATE people SET photo_path = $1, photo_url = $2, photo_version = 4 WHERE id = 'person-1'",
      [sourcePath, `https://project.supabase.co/storage/v1/object/public/avatars/${sourcePath}`]
    );

    const attached = await db.query<{ attached: boolean }>(
      'SELECT public.attach_legacy_profile_person_media($1, $2, $3, $4, $5, $6) AS attached',
      [treeId, 'person-1', sourcePath, sourcePath,
        `https://project.supabase.co/storage/v1/object/public/avatars/${sourcePath}`, photo]
    );
    expect(attached.rows[0].attached).toBe(true);
    let row = await db.query<{ photo_path: string | null; custom_fields: Record<string, unknown> }>(
      "SELECT photo_path, custom_fields FROM people WHERE id = 'person-1'"
    );
    expect(row.rows[0].photo_path).toBe(sourcePath);
    expect(row.rows[0].custom_fields.photoAsset).toEqual(photo);

    const staleAttach = await db.query<{ attached: boolean }>(
      'SELECT public.attach_legacy_profile_person_media($1, $2, $3, $4, $5, $6) AS attached',
      [treeId, 'person-1', sourcePath, 'stale.webp', null, photo]
    );
    expect(staleAttach.rows[0].attached).toBe(false);

    const finalized = await db.query<{ finalized: boolean }>(
      'SELECT public.finalize_legacy_profile_person_media($1, $2, $3, $4, $5, $6) AS finalized',
      [treeId, 'person-1', sourcePath, sourcePath,
        `https://project.supabase.co/storage/v1/object/public/avatars/${sourcePath}`, photo.assetId]
    );
    expect(finalized.rows[0].finalized).toBe(true);
    row = await db.query("SELECT photo_path, custom_fields FROM people WHERE id = 'person-1'");
    expect(row.rows[0].photo_path).toBeNull();
    expect(row.rows[0].custom_fields.photoAsset).toEqual(photo);
  });

  it('atomically replaces and finalizes the exact legacy gallery item', async () => {
    const sourcePath = `${treeId}/person-1/gallery.webp`;
    const originalItem = { id: 'legacy-gallery', path: sourcePath, version: 2 };
    const replacementItem = {
      ...originalItem,
      asset: galleryPhoto,
      createdAt: timestamp,
    };
    await db.query("UPDATE people SET custom_fields = $1 WHERE id = 'person-1'", [{
      gallery: [originalItem, { id: 'other', url: 'https://external.example/image.webp' }],
    }]);

    const stale = await db.query<{ attached: boolean }>(
      'SELECT public.attach_legacy_gallery_person_media($1, $2, $3, $4, $5, $6) AS attached',
      [treeId, 'person-1', sourcePath, 0, { ...originalItem, version: 9 }, replacementItem]
    );
    expect(stale.rows[0].attached).toBe(false);

    const attached = await db.query<{ attached: boolean }>(
      'SELECT public.attach_legacy_gallery_person_media($1, $2, $3, $4, $5, $6) AS attached',
      [treeId, 'person-1', sourcePath, 0, originalItem, replacementItem]
    );
    expect(attached.rows[0].attached).toBe(true);

    const finalized = await db.query<{ finalized: boolean }>(
      'SELECT public.finalize_legacy_gallery_person_media($1, $2, $3, $4) AS finalized',
      [treeId, 'person-1', sourcePath, galleryPhoto.assetId]
    );
    expect(finalized.rows[0].finalized).toBe(true);
    const row = await stored();
    expect(row.custom_fields.gallery).toEqual([
      { id: 'legacy-gallery', version: 2, asset: galleryPhoto, createdAt: timestamp },
      { id: 'other', url: 'https://external.example/image.webp' },
    ]);
  });

  it('does not expose migration RPC execution to authenticated clients', async () => {
    await actAs('owner');
    await expect(db.query(
      'SELECT public.attach_legacy_profile_person_media($1, $2, $3, $4, $5, $6)',
      [treeId, 'person-1', `${treeId}/person.webp`, `${treeId}/person.webp`, null, photo]
    )).rejects.toThrow(/permission denied/);
  });

  it.each([
    [`${treeId}/../private.webp`],
    [`${treeId}//private.webp`],
    [`${treeId}/folder\\private.webp`],
    [`${otherTreeId}/private.webp`],
  ])('rejects an unsafe legacy object path: %s', async (unsafePath) => {
    const result = await db.query<{ safe: boolean }>(
      'SELECT private.is_safe_legacy_avatar_object_name($1, $2) AS safe',
      [treeId, unsafePath]
    );
    expect(result.rows[0].safe).toBe(false);
  });
});
