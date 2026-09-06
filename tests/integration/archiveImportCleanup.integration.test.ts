import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadSupabaseIntegrationEnvironment } from '../../scripts/testing/supabaseIntegrationEnvironment.mjs';

const env = loadSupabaseIntegrationEnvironment();
const config = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(env.supabaseUrl, env.serviceRoleKey, config);
const trees: string[] = [];
const objects: string[] = [];
const users: Array<{ id: string; client: SupabaseClient }> = [];
const check = <T>(result: { data: T; error: unknown }) => { expect(result.error).toBeNull(); return result.data; };

describe('real failed-import cleanup guard', () => {
  beforeAll(async () => {
    for (const role of ['owner', 'outsider']) {
      const email = `cleanup-${role}-${randomUUID()}@example.test`;
      const password = `Local-${randomUUID()}!`;
      const user = check(await admin.auth.admin.createUser({ email, password, email_confirm: true })).user!;
      const client = createClient(env.supabaseUrl, env.anonKey, config);
      users.push({ id: user.id, client });
      check(await client.auth.signInWithPassword({ email, password }));
    }
    check(await admin.from('user_profiles').upsert({ id: users[0].id, tier: 'family' }));
  }, 60000);
  afterAll(async () => {
    if (objects.length) check(await admin.storage.from('person-media').remove(objects));
    for (const treeId of trees) check(await admin.from('trees').delete().eq('id', treeId));
    for (const user of users) {
      check(await admin.from('user_profiles').delete().eq('id', user.id));
      check(await admin.auth.admin.deleteUser(user.id));
      expect((await admin.auth.admin.getUserById(user.id)).data.user).toBeNull();
    }
  }, 60000);
  const createTree = async () => {
    const id = randomUUID();
    check(await admin.from('trees').insert({ id, owner_id: users[0].id, name: 'Synthetic incomplete import' }));
    trees.push(id);
    return id;
  };
  const call = (id: string, finalize = false, client = users[0].client) => client.rpc('cleanup_failed_import_tree', { p_tree_id: id, p_finalize: finalize });

  it('removes only an empty owned tree, after its private objects are removed', async () => {
    const id = await createTree();
    const objectPath = `${id}/profile-photo/${randomUUID()}.png`;
    objects.push(objectPath);
    check(await users[0].client.storage.from('person-media').upload(objectPath, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=', 'base64'), { contentType: 'image/png' }));
    expect(check(await call(id))).toBe('ready');
    expect(check(await call(id, true))).toBe('review-required');
    check(await users[0].client.storage.from('person-media').remove([objectPath]));
    expect(check(await call(id, true))).toBe('removed');
    expect(check(await admin.from('trees').select('id').eq('id', id))).toEqual([]);
  });
  it('does not let another account delete an empty tree', async () => {
    const id = await createTree();
    expect(check(await call(id, true, users[1].client))).toBe('review-required');
    expect(check(await call(randomUUID(), true, users[1].client))).toBe('review-required');
    expect(check(await admin.from('trees').select('id').eq('id', id))).toHaveLength(1);
  });
  it('preserves saved content, including content added between preflight and finalization', async () => {
    const id = await createTree();
    expect(check(await call(id))).toBe('ready');
    check(await admin.from('people').insert({ id: randomUUID(), tree_id: id, first_name: 'Keep this saved person' }));
    expect(check(await call(id, true))).toBe('review-required');
    expect(check(await call(id))).toBe('review-required');
    expect(check(await admin.from('people').select('id').eq('tree_id', id))).toHaveLength(1);
  });
  it('preserves a tree that was shared before cleanup resumed', async () => {
    const id = await createTree();
    check(await admin.from('tree_collaborators').insert({ tree_id: id, collaborator_uid: users[1].id, email: 'cleanup-collaborator@example.test', role: 'viewer', invited_by: users[0].id }));
    expect(check(await call(id, true))).toBe('review-required');
  });
  it('denies anonymous RPC execution', async () => {
    const client = createClient(env.supabaseUrl, env.anonKey, config);
    expect((await call(await createTree(), true, client)).error).not.toBeNull();
  });
});
