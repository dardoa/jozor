import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadSupabaseIntegrationEnvironment } from '../../scripts/testing/supabaseIntegrationEnvironment.mjs';

const { supabaseUrl, anonKey, serviceRoleKey } = loadSupabaseIntegrationEnvironment();
const options = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(supabaseUrl, serviceRoleKey, options);
type TestUser = { id: string; email: string; token: string; client: SupabaseClient };
const users: TestUser[] = [];
const treeId = randomUUID();
const personId = randomUUID();
let treeCreated = false;

const resolve = (token: string | undefined, body: unknown = { personId }, method = 'POST') =>
  fetch(`${supabaseUrl}/functions/v1/resolve-tree-context`, {
    method,
    headers: { apikey: anonKey, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(method === 'POST' ? { body: JSON.stringify(body) } : {}),
  });

describe('real person route context Edge Function', () => {
  beforeAll(async () => {
    for (const role of ['owner', 'editor', 'viewer', 'outsider']) {
      const email = `route-${role}-${randomUUID()}@example.test`;
      const password = `Local-${randomUUID()}!`;
      const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      expect(created.error).toBeNull();
      const client = createClient(supabaseUrl, anonKey, options);
      const user = { id: created.data.user!.id, email, token: '', client };
      users.push(user);
      const signedIn = await client.auth.signInWithPassword({ email, password });
      expect(signedIn.error).toBeNull();
      user.token = signedIn.data.session!.access_token;
    }
    const [owner, editor, viewer] = users;
    expect((await admin.from('user_profiles').upsert({ id: owner.id, tier: 'family' })).error).toBeNull();
    expect((await admin.from('trees').insert({ id: treeId, owner_id: owner.id, name: 'Synthetic route review' })).error).toBeNull();
    treeCreated = true;
    expect((await admin.from('tree_collaborators').insert([
      { tree_id: treeId, collaborator_uid: editor.id, email: editor.email, role: 'editor', invited_by: owner.id },
      { tree_id: treeId, collaborator_uid: viewer.id, email: viewer.email, role: 'viewer', invited_by: owner.id },
    ])).error).toBeNull();
    expect((await admin.from('people').insert({ id: personId, tree_id: treeId, first_name: 'PRIVATE_ROUTE_NAME_SENTINEL', custom_fields: { isPrivate: true, isDeceased: false } })).error).toBeNull();
  }, 60000);

  afterAll(async () => {
    if (treeCreated) {
      expect((await admin.from('trees').delete().eq('id', treeId)).error).toBeNull();
      expect((await admin.from('trees').select('id').eq('id', treeId)).data).toEqual([]);
    }
    for (const user of users) {
      await user.client.auth.signOut();
      expect((await admin.from('user_profiles').delete().eq('id', user.id)).error).toBeNull();
      expect((await admin.auth.admin.deleteUser(user.id)).error).toBeNull();
      expect((await admin.auth.admin.getUserById(user.id)).data.user).toBeNull();
    }
  }, 60000);

  it.each(['owner', 'editor', 'viewer'] as const)('resolves %s without exposing private person fields', async role => {
    const user = users[['owner', 'editor', 'viewer'].indexOf(role)];
    const response = await resolve(user.token);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(await response.json()).toEqual({ treeId, ownerId: users[0].id, role, accessType: role === 'owner' ? 'owner' : 'collaborator' });
    if (role === 'viewer') {
      expect((await user.client.from('people').select('id').eq('id', personId)).data).toEqual([]);
    }
  });

  it('denies unknown and inaccessible people without revealing tree context', async () => {
    for (const body of [{ personId }, { personId: randomUUID() }]) {
      const response = await resolve(users[3].token, body);
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: 'Person not found.' });
    }
    expect((await resolve(undefined)).status).toBe(401);
  });

  it.each([null, [], {}, { personId: 123 }, { personId: 'invalid' }])('rejects malformed input %j without a handler crash', async body => {
    expect((await resolve(users[0].token, body)).status).toBe(400);
  });

  it('observes role downgrade and revocation with the original access token', async () => {
    const editor = users[1];
    expect((await admin.from('tree_collaborators').update({ role: 'viewer' }).eq('tree_id', treeId).eq('collaborator_uid', editor.id)).error).toBeNull();
    expect(await (await resolve(editor.token)).json()).toMatchObject({ role: 'viewer' });
    expect((await admin.from('tree_collaborators').delete().eq('tree_id', treeId).eq('collaborator_uid', editor.id)).error).toBeNull();
    expect((await resolve(editor.token)).status).toBe(404);
  });
});
