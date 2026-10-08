import crypto from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../../api/auth/delete-account';
import { reconcileAccountCheckouts } from '../../../shared/server/accountCheckoutFence';

const { createClientMock, cleanup, session } = vi.hoisted(() => ({ createClientMock: vi.fn(), cleanup: vi.fn(), session: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: createClientMock }));
vi.mock('../../../shared/auth/accountSession.js', () => ({ isAccountSessionActive: session }));
vi.mock('../../../shared/server/accountDeletionCleanup.js', () => ({ runAccountDeletionCleanup: cleanup }));
vi.mock('../../../shared/server/accountCheckoutFence.js', () => ({ reconcileAccountCheckouts: vi.fn(async () => true) }));
const uid = '11111111-1111-4111-8111-111111111111';
const jobId = '22222222-2222-4222-8222-222222222222';
const secret = 'test-jwt-secret-with-at-least-32-chars';
const token = () => {
  const header = Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url');
  const body = Buffer.from(JSON.stringify({ sub: uid, email: 'user@example.test', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
  return `${header}.${body}.${crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url')}`;
};
const response = () => ({
  statusCode: 200, body: undefined as unknown, headers: {} as Record<string, unknown>,
  setHeader(key: string, value: unknown) { this.headers[key] = value; },
  status(code: number) { this.statusCode = code; return this; },
  json(body: unknown) { this.body = body; return this; },
  end() { return this; },
});
const request = (method = 'POST', authorization = `Bearer ${token()}`) => ({
  method, headers: { authorization, origin: 'http://localhost:5173' },
  body: { uid: 'someone-else', jobId: 'spoofed-job', paths: ['foreign/path'], subscriptionStatus: 'canceled' } as Record<string, unknown>,
});

describe('durable account deletion API', () => {
  beforeEach(() => {
    vi.stubEnv('ACCOUNT_ADMISSION_PAUSED', undefined);
    vi.mocked(reconcileAccountCheckouts).mockReset().mockResolvedValue(true);
    createClientMock.mockReset(); cleanup.mockReset().mockResolvedValue({ completedJobs: 1 }); session.mockReset().mockResolvedValue(true);
    for (const [key, value] of Object.entries({
      SUPABASE_JWT_SECRET: secret, SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'service-key',
      VITE_SUPABASE_ANON_KEY: 'anon-key', APP_ORIGIN: 'http://localhost:5173', ACCOUNT_DELETION_CLEANUP_ENABLED: 'true', CRON_SECRET: 'scheduled-secret',
    })) vi.stubEnv(key, value);
  });
  afterEach(() => vi.unstubAllEnvs());
  const fixture = (billing: { data: unknown; error: unknown } = { data: [], error: null }) => {
    const query = { select: vi.fn(() => query), eq: vi.fn(() => query), neq: vi.fn(() => query), limit: vi.fn(async () => billing) };
    const admin = { from: vi.fn(() => query), storage: { from: vi.fn() }, auth: { admin: { deleteUser: vi.fn() } } };
    const rpc = vi.fn().mockResolvedValue({ data: jobId, error: null });
    createClientMock.mockReturnValueOnce(admin).mockReturnValueOnce({ rpc });
    return { query, admin, rpc };
  };
  const invoke = async (req = request()) => { const res = response(); await handler(req as never, res as never); return res; };

  it.each(['true', '', 'invalid'])('pauses new deletion before authentication, reconciliation, SQL and cleanup: %s', async value => {
    vi.stubEnv('ACCOUNT_ADMISSION_PAUSED', value);
    const res = await invoke();
    expect(res.statusCode).toBe(503); expect(res.body).toMatchObject({ code: 'ACCOUNT_ADMISSION_PAUSED' });
    expect(res.headers).toMatchObject({ 'Cache-Control': 'no-store', 'Retry-After': '300' });
    expect(session).not.toHaveBeenCalled(); expect(createClientMock).not.toHaveBeenCalled();
    expect(reconcileAccountCheckouts).not.toHaveBeenCalled(); expect(cleanup).not.toHaveBeenCalled();
  });

  it('keeps existing receipt recovery read-only and reachable during admission pause', async () => {
    vi.stubEnv('ACCOUNT_ADMISSION_PAUSED', 'true');
    const rpc = vi.fn().mockResolvedValue({ data: 'pending', error: null }); createClientMock.mockReturnValue({ rpc });
    const req = request(); req.body = { action: 'status', receipt: 'ab'.repeat(32) };
    expect((await invoke(req)).body).toEqual({ status: 'pending' });
    expect(rpc).toHaveBeenCalledExactlyOnceWith('get_account_deletion_status', { p_receipt_hash: crypto.createHash('sha256').update('ab'.repeat(32)).digest('hex') });
    expect(cleanup).not.toHaveBeenCalled(); expect(session).not.toHaveBeenCalled();
  });

  it('does not let the admission pause strand previously accepted cleanup jobs', async () => {
    vi.stubEnv('ACCOUNT_ADMISSION_PAUSED', 'true');
    const { admin } = fixture();
    expect((await invoke(request('GET', 'Bearer scheduled-secret'))).statusCode).toBe(200);
    expect(cleanup).toHaveBeenCalledExactlyOnceWith(admin);
  });

  it('queues from caller claims before cleanup, ignoring body identity and paths', async () => {
    const { admin, rpc, query } = fixture();
    const res = await invoke();
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ success: true, status: 'complete' });
    expect(query.eq).toHaveBeenCalledWith('user_id', uid);
    expect(query.neq).toHaveBeenCalledWith('status', 'canceled');
    expect(rpc).toHaveBeenCalledExactlyOnceWith('request_account_deletion');
    expect(cleanup).toHaveBeenCalledExactlyOnceWith(admin, jobId);
    expect(rpc.mock.invocationCallOrder[0]).toBeLessThan(cleanup.mock.invocationCallOrder[0]);
    expect(admin.storage.from).not.toHaveBeenCalled();
    expect(admin.auth.admin.deleteUser).not.toHaveBeenCalled();
    expect(JSON.stringify(res.body)).not.toMatch(/someone-else|spoofed|foreign|11111111/);
    expect(res.headers['Cache-Control']).toBe('no-store');
  });

  it('keeps billing preflight ahead of queuing and every destructive operation', async () => {
    const { rpc, query } = fixture({ data: [{ id: 'private-subscription' }], error: null });
    const res = await invoke();
    expect(res.statusCode).toBe(409);
    expect(res.body).toMatchObject({ code: 'ACCOUNT_HAS_OPEN_SUBSCRIPTION' });
    expect(query.select).toHaveBeenCalledWith('id');
    expect(query.limit).toHaveBeenCalledWith(1);
    expect(rpc).not.toHaveBeenCalled();
    expect(cleanup).not.toHaveBeenCalled();
  });
  it.each([{ data: null, error: null }, { data: [], error: { message: 'private detail' } }])('fails closed on uncertain billing %j', async billing => {
    const { rpc } = fixture(billing);
    const res = await invoke();
    expect(res.statusCode).toBe(503);
    expect(rpc).not.toHaveBeenCalled(); expect(cleanup).not.toHaveBeenCalled();
  });
  it('preserves the billing conflict from the atomic SQL recheck without touching Storage', async () => {
    fixture().rpc.mockResolvedValue({ data: null, error: { message: 'ACCOUNT_HAS_OPEN_SUBSCRIPTION' } });
    const res = await invoke();
    expect(res.statusCode).toBe(409);
    expect(res.body).toMatchObject({ code: 'ACCOUNT_HAS_OPEN_SUBSCRIPTION' });
    expect(cleanup).not.toHaveBeenCalled();
  });
  it.each(['ACCOUNT_HAS_PENDING_CHECKOUT', 'ACCOUNT_HAS_RETAINED_UPLOADS'])('preserves the atomic %s rejection without cleanup', async code => {
    fixture().rpc.mockResolvedValue({ data: null, error: { message: code } });
    const res = await invoke();
    expect(res.statusCode).toBe(409); expect(res.body).toMatchObject({ code });
    expect(cleanup).not.toHaveBeenCalled();
  });
  it.each(['unresolved', 'unavailable'])('never enqueues deletion when checkout reconciliation is %s', async mode => {
    const { rpc } = fixture();
    if (mode === 'unresolved') vi.mocked(reconcileAccountCheckouts).mockResolvedValue(false);
    else vi.mocked(reconcileAccountCheckouts).mockRejectedValue(new Error('provider offline'));
    const res = await invoke();
    expect(res.statusCode).toBe(mode === 'unresolved' ? 409 : 503);
    expect(rpc).not.toHaveBeenCalled(); expect(cleanup).not.toHaveBeenCalled();
    expect(JSON.stringify(res.body)).not.toContain('provider offline');
  });
  it.each([{ data: null, error: null }, { data: 'not-a-job', error: null }, { data: null, error: { message: 'private SQL error' } }])(
    'does not perform cleanup without proof that SQL queued the request %j', async result => {
      fixture().rpc.mockResolvedValue(result);
      const res = await invoke();
      expect(res.statusCode).toBe(503); expect(cleanup).not.toHaveBeenCalled();
      expect(JSON.stringify(res.body)).not.toContain('private SQL');
    }
  );
  it('does not falsely confirm a request whose commit response was lost', async () => {
    fixture().rpc.mockRejectedValue(new Error('network response lost'));
    const res = await invoke();
    expect(res.statusCode).toBe(503); expect(cleanup).not.toHaveBeenCalled();
  });
  it.each(['deferred', 'unavailable'])('acknowledges committed work when immediate cleanup is %s', async reason => {
    fixture();
    if (reason === 'deferred') cleanup.mockResolvedValue({ completedJobs: 0, deferred: true });
    else cleanup.mockRejectedValue(new Error('private cleanup failure'));
    const res = await invoke();
    expect(res.statusCode).toBe(202); expect(res.body).toEqual({ success: true, status: 'pending' });
  });
  it('rejects revoked sessions before privileged clients, including retry attempts', async () => {
    session.mockResolvedValue(false);
    expect((await invoke()).statusCode).toBe(401);
    expect(createClientMock).not.toHaveBeenCalled(); expect(cleanup).not.toHaveBeenCalled();
  });
  it.each(['disabled', 'missing-scheduler'])('does not admit deletion when staged release is %s', async mode => {
    vi.stubEnv(mode === 'disabled' ? 'ACCOUNT_DELETION_CLEANUP_ENABLED' : 'CRON_SECRET', '');
    expect((await invoke()).statusCode).toBe(503); expect(createClientMock).not.toHaveBeenCalled();
  });
  it('keeps scheduled cleanup service-only without requiring a deleted user bearer', async () => {
    const { admin } = fixture();
    const res = await invoke(request('GET', 'Bearer scheduled-secret'));
    expect(res.statusCode).toBe(200);
    expect(cleanup).toHaveBeenCalledExactlyOnceWith(admin);
    expect(session).not.toHaveBeenCalled();
  });
  it('rejects a user bearer on the scheduled route', async () => {
    expect((await invoke(request('GET'))).statusCode).toBe(401);
    expect(createClientMock).not.toHaveBeenCalled(); expect(cleanup).not.toHaveBeenCalled();
  });
  it('leaves scheduled processing disabled until deliberate activation', async () => {
    vi.stubEnv('ACCOUNT_DELETION_CLEANUP_ENABLED', 'false');
    const res = await invoke(request('GET', 'Bearer scheduled-secret'));
    expect(res.body).toEqual({ enabled: false }); expect(cleanup).not.toHaveBeenCalled();
  });
  it('rejects a foreign origin and supports preflight without authentication', async () => {
    const req = request(); req.headers.origin = 'https://attacker.test';
    expect((await invoke(req)).statusCode).toBe(400);
    expect((await invoke(request('OPTIONS'))).statusCode).toBe(204);
    expect(session).not.toHaveBeenCalled(); expect(createClientMock).not.toHaveBeenCalled();
  });

  it('hashes the receipt before storing it with the atomic request', async () => {
    const { rpc } = fixture(); const req = request(); req.body.receipt = 'ab'.repeat(32);
    expect((await invoke(req)).statusCode).toBe(200);
    expect(rpc).toHaveBeenCalledWith('request_account_deletion', { p_receipt_hash: crypto.createHash('sha256').update(req.body.receipt as string).digest('hex') });
  });
  it('allows only read-only status recovery, even when the account session is revoked', async () => {
    session.mockResolvedValue(false);
    const rpc = vi.fn().mockResolvedValue({ data: 'pending', error: null });
    createClientMock.mockReturnValue({ rpc });
    const req = request(); req.body = { action: 'status', receipt: 'ab'.repeat(32) };
    const res = await invoke(req);
    expect(res.statusCode).toBe(200); expect(res.body).toEqual({ status: 'pending' });
    expect(session).not.toHaveBeenCalled(); expect(cleanup).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledExactlyOnceWith('get_account_deletion_status', { p_receipt_hash: crypto.createHash('sha256').update('ab'.repeat(32)).digest('hex') });
  });
  it.each([undefined, 'guess', 'x'.repeat(64)])('rejects malformed status receipts without a privileged client', async receipt => {
    const req = request(); req.body = { action: 'status', receipt };
    expect((await invoke(req)).statusCode).toBe(400); expect(createClientMock).not.toHaveBeenCalled();
  });
  it('does not reveal account existence for an unknown receipt', async () => {
    createClientMock.mockReturnValue({ rpc: vi.fn().mockResolvedValue({ data: null, error: null }) });
    const req = request(); req.body = { action: 'status', receipt: 'ab'.repeat(32) };
    const res = await invoke(req);
    expect(res.statusCode).toBe(404); expect(res.body).toEqual({ status: 'unconfirmed' });
  });
});
