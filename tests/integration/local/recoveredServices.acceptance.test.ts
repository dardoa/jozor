import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomBytes, randomUUID } from 'node:crypto';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { validateSupabaseIntegrationEnvironment } from '../../../scripts/testing/supabaseIntegrationEnvironment.mjs';

const target = validateSupabaseIntegrationEnvironment(process.env);
if (target.mode !== 'local' || process.env.JOZOR_RECOVERY_ACCEPTANCE !== 'isolated-source-snapshot') {
  throw new Error('This suite requires the isolated recovery harness.');
}
const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const admin = createClient(target.supabaseUrl, target.serviceRoleKey, options);
const receipt = randomBytes(32).toString('hex');
let userId = '', treeId = '', avatarPath = '', token = '', refreshToken = '';
let user: SupabaseClient;
let deleted = false;

async function callHandler(body: Record<string, string>) {
  const { default: handler } = await import('../../../api/auth/delete-account');
  let status = 0;
  let payload: Record<string, unknown> = {};
  const headers: Record<string, string | number | readonly string[]> = {};
  const req = { method: 'POST', headers: { origin: 'http://127.0.0.1:3000', authorization: `Bearer ${token}` }, body } as VercelRequest;
  const res = {
    setHeader(name: string, value: string | number | readonly string[]) { headers[name] = value; return this; },
    status(value: number) { status = value; return this; },
    json(value: Record<string, unknown>) { payload = value; return this; },
    end() { return this; },
  } as unknown as VercelResponse;
  await handler(req, res);
  return { status, payload, headers };
}

describe.sequential('Recovered local services', () => {
  beforeAll(async () => {
    const realFetch = globalThis.fetch;
    vi.stubGlobal('fetch', (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
      if (url.origin !== target.supabaseUrl) throw new Error('Recovery acceptance forbids external requests.');
      return realFetch(input, init);
    });
    const email = `recovery-${randomUUID()}@example.com`;
    const password = randomBytes(32).toString('hex');
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    console.info('RECOVERY_SETUP', JSON.stringify({ stage: 'auth-create', code: created.error?.code ?? null, status: created.error?.status ?? null }));
    expect(created.error?.code ?? null).toBeNull();
    userId = created.data.user!.id;
    const profile = await admin.from('user_profiles').upsert({ id: userId, display_name: 'Recovery synthetic account', tier: 'free' });
    console.info('RECOVERY_SETUP', JSON.stringify({ stage: 'profile-create', code: profile.error?.code ?? null }));
    expect(profile.error?.code ?? null).toBeNull();
    treeId = randomUUID();
    const tree = await admin.from('trees').insert({ id: treeId, owner_id: userId, name: 'Recovery synthetic tree' });
    console.info('RECOVERY_SETUP', JSON.stringify({ stage: 'tree-create', code: tree.error?.code ?? null }));
    expect(tree.error?.code ?? null).toBeNull();
    const login = await createClient(target.supabaseUrl, target.anonKey, options).auth.signInWithPassword({ email, password });
    console.info('RECOVERY_SETUP', JSON.stringify({ stage: 'auth-signin', code: login.error?.code ?? null, status: login.error?.status ?? null }));
    expect(login.error?.code ?? null).toBeNull();
    token = login.data.session!.access_token;
    refreshToken = login.data.session!.refresh_token;
    user = createClient(target.supabaseUrl, target.anonKey, { ...options, global: { headers: { Authorization: `Bearer ${token}` } } });
    avatarPath = `users/${userId}/recovery.webp`;
  });

  afterAll(async () => {
    if (avatarPath) await admin.storage.from('avatars').remove([avatarPath]);
    if (treeId) await admin.from('trees').delete().eq('id', treeId);
    if (userId && !deleted) {
      await admin.from('user_profiles').delete().eq('id', userId);
      await admin.auth.admin.deleteUser(userId);
    }
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('signs in through Auth and enforces real Storage ownership', async () => {
    const identity = await user.auth.getUser(token);
    expect(identity.error?.code ?? null).toBeNull();
    expect(identity.data.user?.id === userId).toBe(true);
    const profile = await user.from('user_profiles').select('id').eq('id', userId).single();
    expect(profile.error?.code ?? null).toBeNull();
    const bytes = Buffer.from('RIFF-recovery-synthetic-file-WEBP');
    const upload = await user.storage.from('avatars').upload(avatarPath, bytes, { contentType: 'image/webp' });
    expect(upload.error?.name ?? null).toBeNull();
    const downloaded = await user.storage.from('avatars').download(avatarPath);
    expect(downloaded.error?.name ?? null).toBeNull();
    expect(Buffer.from(await downloaded.data!.arrayBuffer()).equals(bytes)).toBe(true);
    const forbidden = await user.storage.from('avatars').upload(`users/${randomUUID()}/recovery.webp`, bytes, { contentType: 'image/webp' });
    expect(forbidden.error !== null).toBe(true);
  });

  it('keeps the application admission pause fail-closed', async () => {
    vi.stubEnv('ACCOUNT_ADMISSION_PAUSED', 'true');
    const response = await callHandler({ receipt });
    expect(response.status).toBe(503);
    expect(response.payload.code).toBe('ACCOUNT_ADMISSION_PAUSED');
    expect(response.headers['Retry-After']).toBe('300');
    const profile = await admin.from('user_profiles').select('id').eq('id', userId).single();
    expect(profile.error?.code ?? null).toBeNull();
  });

  it('deletes the synthetic account and object, reports completion, and rejects stale sessions', async () => {
    vi.stubEnv('ACCOUNT_ADMISSION_PAUSED', 'false');
    const response = await callHandler({ receipt });
    expect(response.status).toBe(200);
    expect(response.payload).toEqual({ success: true, status: 'complete' });
    deleted = true;
    const status = await callHandler({ action: 'status', receipt });
    expect(status.status).toBe(200);
    expect(status.payload.status).toBe('complete');
    const profile = await admin.from('user_profiles').select('id').eq('id', userId).maybeSingle();
    expect(profile.error?.code ?? null).toBeNull();
    expect(profile.data).toBeNull();
    const tree = await admin.from('trees').select('id').eq('id', treeId).maybeSingle();
    expect(tree.error?.code ?? null).toBeNull();
    expect(tree.data).toBeNull();
    const files = await admin.storage.from('avatars').list(`users/${userId}`);
    expect(files.error?.name ?? null).toBeNull();
    expect(files.data?.length).toBe(0);
    const authUser = await admin.auth.admin.getUserById(userId);
    expect(authUser.error?.status).toBe(404);
    const staleRead = await user.from('trees').select('id').eq('id', treeId);
    expect(staleRead.error !== null).toBe(true);
    const staleUpload = await user.storage.from('avatars').upload(avatarPath, Buffer.from('stale'), { contentType: 'image/webp' });
    expect(staleUpload.error !== null).toBe(true);
    const refresh = await createClient(target.supabaseUrl, target.anonKey, options).auth.refreshSession({ refresh_token: refreshToken });
    expect(refresh.error !== null).toBe(true);
  });
});
