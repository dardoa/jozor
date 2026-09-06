import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { loadSupabaseIntegrationEnvironment } from '../../scripts/testing/supabaseIntegrationEnvironment.mjs';

const { supabaseUrl, anonKey, serviceRoleKey } = loadSupabaseIntegrationEnvironment({ suite: 'person-route-context' });
const options = {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (input: RequestInfo | URL, init?: RequestInit) =>
    fetch(input, { ...init, redirect: 'error', signal: AbortSignal.timeout(20000) }) },
};
const admin = createClient(supabaseUrl, serviceRoleKey, options);
type TestUser = { id: string; email: string; token: string; client: SupabaseClient };
const users: TestUser[] = [];
const treeId = randomUUID();
const personId = randomUUID();
let treeCreated = false;

const resolve = (token: string | undefined, body: unknown = { personId }, method = 'POST') =>
  fetch(`${supabaseUrl}/functions/v1/resolve-tree-context`, {
    method,
    redirect: 'error',
    signal: AbortSignal.timeout(20000),
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
  }, 90000);

  afterAll(async () => {
    const failures: string[] = [];
    const attempt = async (label: string, action: () => Promise<void>) => {
      try { await action(); } catch { failures.push(label); }
    };
    if (treeCreated) {
      await attempt('synthetic tree deletion', async () => {
        expect((await admin.from('trees').delete().eq('id', treeId)).error).toBeNull();
      });
    }
    for (const [index, user] of users.entries()) {
      await attempt(`session ${index}`, async () => {
        expect((await user.client.auth.signOut()).error).toBeNull();
      });
      await attempt(`profile ${index}`, async () => {
        expect((await admin.from('user_profiles').delete().eq('id', user.id)).error).toBeNull();
      });
      await attempt(`account ${index}`, async () => {
        expect((await admin.auth.admin.deleteUser(user.id)).error).toBeNull();
        const result = await admin.auth.admin.getUserById(user.id);
        expect(result.data.user).toBeNull();
        expect(result.error?.status).toBe(404);
        const profile = await admin.from('user_profiles').select('id').eq('id', user.id);
        expect(profile.error).toBeNull();
        expect(profile.data).toEqual([]);
      });
    }
    for (const [table, key, id] of [
      ['trees', 'id', treeId], ['people', 'id', personId], ['tree_collaborators', 'tree_id', treeId],
    ]) {
      await attempt(`${table} absence`, async () => {
        const result = await admin.from(table).select('id').eq(key, id);
        expect(result.error).toBeNull();
        expect(result.data).toEqual([]);
      });
    }
    expect(failures, 'Synthetic resource cleanup must complete even after a test failure').toEqual([]);
  }, 180000);

  it.each(['owner', 'editor', 'viewer'] as const)('resolves %s without exposing private person fields', async role => {
    const user = users[['owner', 'editor', 'viewer'].indexOf(role)];
    const response = await resolve(user.token);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(await response.json()).toEqual({ treeId, ownerId: users[0].id, role, accessType: role === 'owner' ? 'owner' : 'collaborator' });
    if (role === 'viewer') {
      const direct = await user.client.from('people').select('id').eq('id', personId);
      expect(direct.error).toBeNull();
      expect(direct.data).toEqual([]);
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

  it.each([
    { label: 'null', body: null }, { label: 'array', body: [] }, { label: 'empty object', body: {} },
    { label: 'numeric personId', body: { personId: 123 } }, { label: 'invalid personId', body: { personId: 'invalid' } },
  ])('rejects malformed input $label without a handler crash', async ({ body }) => {
    expect((await resolve(users[0].token, body)).status).toBe(400);
  });

  it('rejects invalid credentials and unsupported methods, while allowing preflight', async () => {
    expect((await resolve('invalid-access-token')).status).toBe(401);
    const get = await resolve(users[0].token, undefined, 'GET');
    expect(get.status).toBe(405);
    expect(get.headers.get('cache-control')).toContain('no-store');
    const preflight = await resolve(undefined, undefined, 'OPTIONS');
    expect(preflight.status).toBe(200);
    expect(preflight.headers.get('access-control-allow-methods')).toContain('POST');
  });

  it('rejects malformed JSON without exposing an internal exception', async () => {
    const response = await fetch(`${supabaseUrl}/functions/v1/resolve-tree-context`, {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20000),
      headers: { apikey: anonKey, Authorization: `Bearer ${users[0].token}`, 'Content-Type': 'application/json' },
      body: '{',
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Invalid JSON payload.' });
  });

  it('observes role downgrade and revocation with the original access token', async () => {
    const editor = users[1];
    expect((await admin.from('tree_collaborators').update({ role: 'viewer' }).eq('tree_id', treeId).eq('collaborator_uid', editor.id)).error).toBeNull();
    const downgraded = await resolve(editor.token);
    expect(downgraded.status).toBe(200);
    expect(downgraded.headers.get('cache-control')).toContain('no-store');
    expect(await downgraded.json()).toEqual({ treeId, ownerId: users[0].id, role: 'viewer', accessType: 'collaborator' });
    expect((await admin.from('tree_collaborators').delete().eq('tree_id', treeId).eq('collaborator_uid', editor.id)).error).toBeNull();
    const revoked = await resolve(editor.token);
    expect(revoked.status).toBe(404);
    expect(revoked.headers.get('cache-control')).toContain('no-store');
    expect(await revoked.json()).toEqual({ error: 'Person not found.' });
  });
});
