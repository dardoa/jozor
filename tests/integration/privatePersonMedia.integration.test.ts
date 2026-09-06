import { randomUUID } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadSupabaseIntegrationEnvironment, resolvePersonMediaIntegrationHttpOrigin } from '../../scripts/testing/supabaseIntegrationEnvironment.mjs';
import { createPersonMediaAssetRef, PERSON_MEDIA_STORAGE_CACHE_CONTROL, type PersonMediaAssetRef } from '../../src/types/personMedia';
import mediaHandler from '../../src/api/person-media';
import { resolvedSupabaseKey, resolvedSupabaseUrl } from '../../src/services/supabaseConfig';

const verified = loadSupabaseIntegrationEnvironment({ suite: 'private-person-media' });
const mediaHttpOrigin = resolvePersonMediaIntegrationHttpOrigin(verified);
const { supabaseUrl, anonKey, serviceRoleKey } = verified;
if (resolvedSupabaseUrl !== supabaseUrl || resolvedSupabaseKey !== anonKey
  || process.env.SUPABASE_SERVICE_ROLE_KEY !== serviceRoleKey) {
  throw new Error('Integration safety guard: API runtime credentials differ from the verified test target.');
}
const authOptions = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };
const admin = createClient(supabaseUrl, serviceRoleKey, { auth: authOptions });
const anonymous = createClient(supabaseUrl, anonKey, { auth: authOptions });
const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');

describe(`private person media: ${mediaHttpOrigin ? 'deployed Vercel HTTP' : 'in-process gateway'} with synthetic Supabase resources`, () => {
  const treeId = randomUUID();
  const users: { id: string; email: string; token: string; client: SupabaseClient }[] = [];
  const objects: string[] = [];
  const avatarObjects: string[] = [];
  const storageResponses: { actor: string; status: number; cache: string | null; cacheControl: string | null }[] = [];
  let treeCreated = false;
  let owner: typeof users[number];
  let editor: typeof users[number];
  let viewer: typeof users[number];
  let outsider: typeof users[number];
  let accountAvatar: string;
  const legacyAvatar = `${treeId}/legacy-avatar.png`;
  let photo: PersonMediaAssetRef;
  let gallery: PersonMediaAssetRef;
  const personIds = { deceased: randomUUID(), living: randomUUID(), private: randomUUID() };

  const deliver = async (token: string | undefined, personId: string | undefined, asset = photo) => {
    const query = { treeId, assetId: asset.assetId, kind: asset.kind,
      ...(personId === undefined ? { mimeType: asset.mimeType, byteLength: String(asset.byteLength) } : { personId }) };
    if (mediaHttpOrigin) {
      const url = new URL('/api/person-media', mediaHttpOrigin);
      for (const [key, value] of Object.entries(query)) if (value !== undefined) url.searchParams.set(key, value);
      const result = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        redirect: 'error', signal: AbortSignal.timeout(30000),
      });
      return {
        status: result.status,
        body: result.headers.get('content-type')?.startsWith('image/')
          ? Buffer.from(await result.arrayBuffer()) : await result.json(),
        headers: { 'Cache-Control': result.headers.get('cache-control'), 'Content-Type': result.headers.get('content-type') },
      };
    }
    const headers: Record<string, unknown> = {};
    let status = 200;
    let body: unknown;
    const response = {
      setHeader: (name: string, value: unknown) => { headers[name] = value; },
      status: (value: number) => { status = value; return response; },
      json: (value: unknown) => { body = value; return response; },
      send: (value: unknown) => { body = value; return response; },
    };
    const request: Pick<VercelRequest, 'method' | 'headers' | 'query'> = {
      method: 'GET', headers: { authorization: token ? `Bearer ${token}` : undefined },
      query,
    };
    await mediaHandler(request as VercelRequest, response as unknown as VercelResponse);
    return { status, body, headers };
  };

  beforeAll(async () => {
    const bucket = await admin.storage.getBucket('person-media');
    expect(bucket.error, 'private media migrations must be installed first').toBeNull();
    expect(bucket.data?.public).toBe(false);
    for (const role of ['owner', 'editor', 'viewer', 'outsider']) {
      const email = `media-${role}-${randomUUID()}@example.test`;
      const password = `Local-${randomUUID()}!`;
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      if (created.error || !created.data.user) throw new Error('Could not create a synthetic media test account.');
      const user = { id: created.data.user.id, email, token: '', client: createClient(supabaseUrl, anonKey, {
        auth: authOptions,
        global: { fetch: async (input, init) => {
          const response = await fetch(input, init);
          const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
          if (url.includes('/storage/v1/object/') && (!init?.method || init.method === 'GET')) {
            storageResponses.push({ actor: role, status: response.status,
              cache: response.headers.get('cf-cache-status'), cacheControl: response.headers.get('cache-control') });
          }
          return response;
        } },
      }) };
      users.push(user);
      const signedIn = await user.client.auth.signInWithPassword({ email, password });
      if (signedIn.error || !signedIn.data.session) throw new Error('Synthetic media test sign-in failed.');
      user.token = signedIn.data.session.access_token;
    }
    [owner, editor, viewer, outsider] = users;
    expect((await admin.from('user_profiles').upsert({ id: owner.id, tier: 'family', display_name: 'Synthetic media owner' })).error).toBeNull();
    const tree = await admin.from('trees').insert({ id: treeId, owner_id: owner.id, name: 'Synthetic private media test' });
    expect(tree.error).toBeNull();
    treeCreated = true;
    const collaborators = await admin.from('tree_collaborators').insert([
      { tree_id: treeId, email: editor.email, collaborator_uid: editor.id, role: 'editor', invited_by: owner.id },
      { tree_id: treeId, email: viewer.email, collaborator_uid: viewer.id, role: 'viewer', invited_by: owner.id },
    ]);
    expect(collaborators.error).toBeNull();
    const makeAsset = (kind: 'profile-photo' | 'gallery-photo') => createPersonMediaAssetRef({
      treeId, assetId: randomUUID(), kind, mimeType: 'image/png', byteLength: bytes.length,
      version: 1, createdAt: new Date().toISOString(),
    });
    photo = makeAsset('profile-photo');
    gallery = makeAsset('gallery-photo');
    for (const [asset, client] of [[photo, owner.client], [gallery, editor.client]] as const) {
      objects.push(asset.objectPath);
      const uploaded = await client.storage.from('person-media').upload(asset.objectPath, bytes, {
        contentType: 'image/png', cacheControl: PERSON_MEDIA_STORAGE_CACHE_CONTROL,
      });
      expect(uploaded.error).toBeNull();
    }
    const people = await admin.from('people').insert(Object.entries(personIds).map(([kind, id]) => ({
      id, tree_id: treeId, first_name: `Synthetic ${kind}`,
      custom_fields: { isDeceased: kind !== 'living', isPrivate: kind === 'private', photoAsset: photo, gallery: [{ asset: gallery }] },
    })));
    expect(people.error).toBeNull();
    accountAvatar = `users/${owner.id}/profile.png`;
    for (const path of [accountAvatar, legacyAvatar]) {
      avatarObjects.push(path);
      expect((await admin.storage.from('avatars').upload(path, bytes, { contentType: 'image/png' })).error).toBeNull();
    }
  });

  afterAll(async () => {
    const failures: string[] = [];
    if (avatarObjects.length) {
      if ((await admin.storage.from('avatars').remove(avatarObjects)).error) failures.push('avatar cleanup');
      // All prefixes belong only to this run's tree/accounts, never the owner's data.
      for (const prefix of [treeId, ...users.map(user => `users/${user.id}`)]) {
        const remaining = await admin.storage.from('avatars').list(prefix);
        if (remaining.error || remaining.data?.length !== 0) failures.push('avatar cleanup verification');
      }
    }
    if (objects.length) {
      const removed = await admin.storage.from('person-media').remove(objects);
      if (removed.error) failures.push('storage cleanup');
      for (const kind of ['profile-photo', 'gallery-photo']) {
        const remaining = await admin.storage.from('person-media').list(`${treeId}/${kind}`);
        if (remaining.error || remaining.data?.length !== 0) failures.push('storage cleanup verification');
      }
    }
    if (treeCreated) {
      const removed = await admin.from('trees').delete().eq('id', treeId);
      if (removed.error) failures.push('tree cleanup');
      const remaining = await admin.from('trees').select('id').eq('id', treeId);
      if (remaining.error || remaining.data?.length !== 0) failures.push('tree cleanup verification');
    }
    for (const user of users) {
      await user.client.auth.signOut();
      if ((await admin.from('user_profiles').delete().eq('id', user.id)).error) failures.push('profile cleanup');
      const removed = await admin.auth.admin.deleteUser(user.id);
      if (removed.error) failures.push('account cleanup');
      const remaining = await admin.auth.admin.getUserById(user.id);
      if (remaining.data.user || remaining.error?.status !== 404) failures.push('account cleanup verification');
    }
    expect(failures).toEqual([]);
  });

  it('delivers exact owner/editor bytes only through the gateway, denying direct or signed Storage reads', async () => {
    for (const user of [owner, editor]) {
      const result = await deliver(user.token, personIds.deceased);
      expect(result.status).toBe(200);
      expect(result.body).toEqual(bytes);
      const archive = await deliver(user.token, undefined);
      expect(archive.status).toBe(200);
      expect(archive.body).toEqual(bytes);
    }
    for (const user of [owner, editor, viewer]) {
      const denied = await user.client.storage.from('person-media').download(photo.objectPath);
      expect(denied.data, JSON.stringify(storageResponses)).toBeNull();
      expect(denied.error).not.toBeNull();
      const signed = await user.client.storage.from('person-media').createSignedUrl(photo.objectPath, 60);
      expect(signed.error).not.toBeNull();
      expect(signed.data).toBeNull();
    }
    expect((await deliver(viewer.token, undefined)).status).toBe(404);
    const { data } = admin.storage.from('person-media').getPublicUrl(photo.objectPath);
    expect((await fetch(data.publicUrl)).ok).toBe(false);
  });

  it('preserves owner/editor list and delete operations without direct byte access', async () => {
    for (const user of [owner, editor]) {
      const path = `${treeId}/gallery-photo/${randomUUID()}.png`;
      objects.push(path);
      expect((await user.client.storage.from('person-media').upload(path, bytes, {
        contentType: 'image/png', cacheControl: PERSON_MEDIA_STORAGE_CACHE_CONTROL,
      })).error).toBeNull();
      const listed = await user.client.storage.from('person-media').list(`${treeId}/gallery-photo`);
      expect(listed.error).toBeNull();
      expect(listed.data?.some(item => item.name === path.split('/').at(-1))).toBe(true);
      const removed = await user.client.storage.from('person-media').remove([path]);
      expect(removed.error).toBeNull();
      expect(removed.data).toHaveLength(1);
    }
  });

  it('uses real auth, secure view and storage for gateway delivery while masking living/private people', async () => {
    for (const asset of [photo, gallery]) {
      const visible = await deliver(viewer.token, personIds.deceased, asset);
      expect(visible.status).toBe(200);
      expect(visible.body).toEqual(bytes);
      expect(visible.headers['Cache-Control']).toBe('private, no-store, max-age=0');
      expect(visible.headers['Content-Type']).toBe('image/png');
      expect((await deliver(viewer.token, personIds.living, asset)).status).toBe(404);
      expect((await deliver(viewer.token, personIds.private, asset)).status).toBe(404);
      expect((await deliver(owner.token, personIds.living, asset)).status).toBe(200);
    }
    expect((await deliver(undefined, personIds.deceased)).status).toBe(401);
    expect((await deliver(outsider.token, personIds.deceased)).status).toBe(404);
    expect((await deliver(outsider.token, undefined)).status).toBe(404);
    expect((await deliver(viewer.token, personIds.deceased, { ...photo, assetId: randomUUID() })).status).toBe(404);
  });

  it('persists and removes private photo references through the actual sync RPC', async () => {
    const sync = async (asset: PersonMediaAssetRef | null, version: number) => owner.client.rpc('sync_tree_batch', {
      p_ops: [{ tree_id: treeId, type: 'UPDATE_PROP', created_at: new Date().toISOString(), payload: {
        id: personIds.living, updates: { photoAsset: asset, photoUrl: '', photoPath: '', photoVersion: version },
        client_id: 'local-media-integration', client_version: version,
      } }],
    });
    const replacement = { ...photo, version: 2 };
    expect((await sync(replacement, 10)).error).toBeNull();
    const saved = await owner.client.from('people_secure').select('custom_fields, photo_url').eq('id', personIds.living).single();
    expect(saved.error).toBeNull();
    expect(saved.data?.custom_fields.photoAsset).toEqual(replacement);
    expect(saved.data?.photo_url).toBeNull();
    expect((await deliver(owner.token, personIds.living)).status).toBe(200);
    expect((await sync(null, 11)).error).toBeNull();
    const deleted = await owner.client.from('people_secure').select('custom_fields').eq('id', personIds.living).single();
    expect(deleted.error).toBeNull();
    expect(deleted.data?.custom_fields).not.toHaveProperty('photoAsset');
    expect((await deliver(owner.token, personIds.living)).status).toBe(404);
    expect((await sync(photo, 12)).error).toBeNull();
  });

  const uploadAvatar = (client: SupabaseClient, path: string, upsert = false) =>
    client.storage.from('avatars').upload(path, bytes, { contentType: 'image/png', upsert });

  it('preserves own-account avatar upsert and authorized legacy tree image management', async () => {
    for (const user of [owner, editor, viewer, outsider]) {
      const path = `users/${user.id}/managed.png`;
      avatarObjects.push(path);
      expect((await uploadAvatar(user.client, path)).error).toBeNull();
      expect((await uploadAvatar(user.client, path, true)).error).toBeNull();
      expect((await user.client.storage.from('avatars').update(path, bytes, { contentType: 'image/png' })).error).toBeNull();
      expect((await user.client.storage.from('avatars').remove([path])).data).toHaveLength(1);
    }
    for (const user of [owner, editor]) {
      const path = `${treeId}/${randomUUID()}.png`;
      avatarObjects.push(path);
      expect((await uploadAvatar(user.client, path)).error).toBeNull();
      expect((await uploadAvatar(user.client, path, true)).error).toBeNull();
      const listed = await user.client.storage.from('avatars').list(treeId);
      expect(listed.error).toBeNull();
      expect(listed.data?.some(item => item.name === path.split('/').at(-1))).toBe(true);
      expect((await user.client.storage.from('avatars').remove([path])).data).toHaveLength(1);
    }
    const { data } = admin.storage.from('avatars').getPublicUrl(legacyAvatar);
    const publicRead = await fetch(data.publicUrl);
    expect(publicRead.ok).toBe(true);
    expect(Buffer.from(await publicRead.arrayBuffer())).toEqual(bytes);
  });

  it.each(['viewer', 'outsider', 'anonymous'] as const)('denies %s legacy tree uploads, replacement and removal', async role => {
    const client = role === 'anonymous' ? anonymous : role === 'viewer' ? viewer.client : outsider.client;
    const attempted = `${treeId}/${randomUUID()}.png`;
    avatarObjects.push(attempted);
    expect((await uploadAvatar(client, attempted)).error).not.toBeNull();
    expect((await uploadAvatar(client, legacyAvatar, true)).error).not.toBeNull();
    expect((await client.storage.from('avatars').update(legacyAvatar, bytes, { contentType: 'image/png' })).error).not.toBeNull();
    const removed = await client.storage.from('avatars').remove([legacyAvatar]);
    expect(removed.data ?? []).toEqual([]);
    const listed = await client.storage.from('avatars').list(treeId);
    expect(listed.data ?? []).toEqual([]);
    const original = await admin.storage.from('avatars').list(treeId);
    expect(original.error).toBeNull();
    expect(original.data?.map(item => item.name)).toEqual(['legacy-avatar.png']);
  });

  it.each(['editor', 'viewer', 'outsider'] as const)('denies %s changes to another account avatar, including move and copy', async role => {
    const user = role === 'editor' ? editor : role === 'viewer' ? viewer : outsider;
    const target = `users/${user.id}/copied.png`;
    avatarObjects.push(target);
    expect((await uploadAvatar(user.client, accountAvatar, true)).error).not.toBeNull();
    expect((await user.client.storage.from('avatars').update(accountAvatar, bytes, { contentType: 'image/png' })).error).not.toBeNull();
    expect((await user.client.storage.from('avatars').move(accountAvatar, target)).error).not.toBeNull();
    expect((await user.client.storage.from('avatars').copy(accountAvatar, target)).error).not.toBeNull();
    expect((await user.client.storage.from('avatars').remove([accountAvatar])).data ?? []).toEqual([]);
    const original = await admin.storage.from('avatars').list(`users/${owner.id}`);
    expect(original.error).toBeNull();
    expect(original.data?.map(item => item.name)).toEqual(['profile.png']);
  });

  it('revokes access immediately after role downgrade and collaborator removal', async () => {
    expect((await deliver(editor.token, personIds.living)).status).toBe(200);
    expect((await deliver(editor.token, undefined)).status).toBe(200);
    expect((await deliver(viewer.token, personIds.deceased)).status).toBe(200);
    const changed = await admin.from('tree_collaborators').update({ role: 'viewer' }).eq('tree_id', treeId)
      .eq('collaborator_uid', editor.id).select('role').single();
    expect(changed.error).toBeNull();
    expect(changed.data?.role).toBe('viewer');
    const permission = await editor.client.rpc('is_tree_collaborator', { p_tree_id: treeId, p_required_role: 'editor' });
    expect(permission.error).toBeNull();
    expect(permission.data).toBe(false);
    const deniedAvatar = `${treeId}/${randomUUID()}.png`;
    avatarObjects.push(deniedAvatar);
    expect((await uploadAvatar(editor.client, deniedAvatar)).error).not.toBeNull();
    expect((await editor.client.storage.from('avatars').remove([legacyAvatar])).data ?? []).toEqual([]);
    const direct = await editor.client.storage.from('person-media').download(photo.objectPath);
    const evidence = JSON.stringify({ responses: storageResponses });
    console.info('Private media revocation cache evidence:', evidence);
    expect(direct.data, evidence).toBeNull();
    expect((await deliver(editor.token, personIds.living)).status).toBe(404);
    expect((await deliver(editor.token, undefined)).status).toBe(404);
    expect((await deliver(editor.token, personIds.deceased)).status).toBe(200);
    expect((await admin.from('tree_collaborators').delete().eq('tree_id', treeId).eq('collaborator_uid', viewer.id)).error).toBeNull();
    expect((await deliver(viewer.token, personIds.deceased)).status).toBe(404);
  });

  it('keeps canonical media in import checkpoints while denying viewer checkpoint reads', async () => {
    const imported = await owner.client.rpc('import_tree_content', {
      p_tree_id: treeId, p_people: [], p_relationships: [],
    });
    expect(imported.error).toBeNull();
    const checkpoint = await owner.client.from('tree_checkpoints').select('people')
      .eq('tree_id', treeId).order('version_seq', { ascending: false }).limit(1).single();
    expect(checkpoint.error).toBeNull();
    expect(checkpoint.data?.people[personIds.deceased]).toMatchObject({
      photoAsset: photo, isDeceased: true, gallery: [expect.objectContaining({ asset: gallery })],
    });
    // The downgraded editor is still a member, so this verifies the viewer role,
    // not merely the absence of a collaborator after the revocation test.
    const denied = await editor.client.from('tree_checkpoints').select('people').eq('tree_id', treeId);
    expect(denied.error).toBeNull();
    expect(denied.data).toEqual([]);
  });
});
