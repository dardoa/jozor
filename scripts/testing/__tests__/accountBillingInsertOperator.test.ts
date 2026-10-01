import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { executeReviewedBillingInsert, prepareBillingOperatorReview, verifyBillingInsertSchema } from '../accountBillingInsertOperator.mjs';

const payload = () => ({ version: 1, request_id: '11111111-1111-4111-8111-111111111111', snapshot_fingerprint: 'a'.repeat(64),
  accounts: [{ user_id: 'private-owner', inserts: [{ id: 'private-subscription' }] }] });
const approval = () => ({ admissionShutdownConfirmed: true, requestId: payload().request_id,
  snapshotFingerprint: payload().snapshot_fingerprint, accountCount: 1, insertCount: 1 });

describe('operator approval and safe error boundary', () => {
  it('reports a missing installed function as unverified', async () => {
    expect(await verifyBillingInsertSchema({ query: vi.fn().mockResolvedValue({ rows: [] }) })).toBe(false);
  });
  it.each(['absent', 'admission-open', 'request', 'fingerprint', 'accounts', 'inserts'])('does not query any database without matching approval: %s', async kind => {
    const client = { query: vi.fn() }; const reviewed = approval();
    if (kind === 'admission-open') reviewed.admissionShutdownConfirmed = false;
    if (kind === 'request') reviewed.requestId = 'other';
    if (kind === 'fingerprint') reviewed.snapshotFingerprint = 'b'.repeat(64);
    if (kind === 'accounts') reviewed.accountCount = 2;
    if (kind === 'inserts') reviewed.insertCount = 2;
    const result = await executeReviewedBillingInsert(client, payload(), kind === 'absent' ? undefined : reviewed);
    expect(result.status).toBe('rejected'); expect(result.mutationsPerformed).toBe(false);
    expect(client.query).not.toHaveBeenCalled();
  });
  it('does not expose connection errors, credentials or raw provider IDs', async () => {
    const client = { query: vi.fn().mockRejectedValue(new Error('postgres://secret@example.test/private-subscription')) };
    const result = await executeReviewedBillingInsert(client, payload(), approval());
    expect(result).toEqual({ status: 'rejected', code: 'execution-failed', mutationsPerformed: false, discardConnection: true });
    for (const secret of ['secret', 'example.test', 'private-subscription']) expect(JSON.stringify(result)).not.toContain(secret);
    expect(client.query).toHaveBeenCalledTimes(1);
  });
  it('rolls back schema rejection and does not invoke the insert function', async () => {
    const client = { query: vi.fn().mockResolvedValue({ rows: [] }) };
    const result = await executeReviewedBillingInsert(client, payload(), approval());
    expect(result).toMatchObject({ status: 'rejected', code: 'schema-unverified', discardConnection: false });
    expect(client.query.mock.calls.at(-1)?.[0]).toBe('ROLLBACK');
    expect(client.query.mock.calls.some(([sql]) => String(sql).startsWith('SELECT private.apply_'))).toBe(false);
  });
  it('marks a connection for disposal if rollback fails without leaking the driver error', async () => {
    const client = { query: vi.fn().mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] })
      .mockRejectedValueOnce(new Error('private connection failed')) };
    const result = await executeReviewedBillingInsert(client, payload(), approval());
    expect(result).toMatchObject({ status: 'rejected', code: 'schema-unverified', discardConnection: true });
    expect(JSON.stringify(result)).not.toContain('private connection');
  });
  it.each([null, {}, { version: 2 }, { ...payload(), accounts: [null] }])('rejects malformed inputs before SQL: %j', async value => {
    const client = { query: vi.fn() };
    expect((await executeReviewedBillingInsert(client, value, approval())).status).toBe('rejected');
    expect(client.query).not.toHaveBeenCalled();
  });
});

const id = (prefix: string, letter = 'a') => `${prefix}_${letter.repeat(26)}`;
const project = 'abcdefghijklmnopqrst';
const env = { PADDLE_ENVIRONMENT: 'sandbox', VITE_PADDLE_ENVIRONMENT: 'sandbox', VITE_PADDLE_CLIENT_TOKEN: 'test_private',
  PADDLE_API_KEY: 'provider-secret', PADDLE_WEBHOOK_SECRET: 'webhook-secret', PADDLE_PRO_PRICE_ID: id('pri'),
  PADDLE_FAMILY_PRICE_ID: id('pri', 'b'), VITE_SUPABASE_URL: `https://${project}.supabase.co`, SUPABASE_SERVICE_ROLE_KEY: 'database-secret' };
const local = { id: id('sub'), user_id: 'private-user', paddle_customer_id: id('ctm'), status: 'active', plan_id: env.PADDLE_FAMILY_PRICE_ID,
  entitlement_tier: 'family', current_period_end: '2026-10-01T00:00:00Z', last_event_occurred_at: '2026-09-08T10:00:00Z', updated_at: '2026-09-08T10:00:00Z' };
const provider = [local, { ...local, id: id('sub', 'b'), plan_id: env.PADDLE_PRO_PRICE_ID }].map(row => ({ id: row.id,
  customer_id: row.paddle_customer_id, status: row.status, custom_data: { userId: row.user_id }, updated_at: row.updated_at,
  current_billing_period: { ends_at: row.current_period_end }, items: [{ price: { id: row.plan_id }, quantity: 1 }] }));
const page = (data: unknown[]) => new Response(JSON.stringify({ data, meta: { pagination: { has_more: false } } }));
const rest = (data: unknown[]) => new Response(JSON.stringify(data), { headers: { 'content-range': `0-${Math.max(0, data.length - 1)}/${data.length}` } });
const cycle = (request: ReturnType<typeof vi.fn<typeof fetch>>, { legacy = false, drift = false } = {}) => request
  .mockResolvedValueOnce(legacy ? new Response(JSON.stringify({ code: '42703', message: 'column subscriptions.entitlement_tier does not exist' }), { status: 400 }) : rest([]))
  .mockResolvedValueOnce(page(provider)).mockResolvedValueOnce(page([])).mockResolvedValueOnce(rest([local]))
  .mockResolvedValueOnce(rest([{ id: local.user_id, tier: drift ? 'pro' : 'family', updated_at: local.updated_at }]));

describe('trusted bounded GET reader to private operator payload', () => {
  beforeEach(() => { vi.setSystemTime(new Date('2026-09-08T12:00:00Z')); });
  afterEach(() => { vi.useRealTimers(); });
  it('prepares a real whitelisted insert batch without printing private inputs or performing writes', async () => {
    const request = vi.fn<typeof fetch>(); cycle(request); cycle(request);
    const result = await prepareBillingOperatorReview(env, project, request);
    expect(result.payload.accounts[0].inserts[0].id).toBe(id('sub', 'b'));
    expect(result.review).toMatchObject({ applyAllowed: false, mutationsPerformed: false, admissionShutdownConfirmed: false,
      schemaVerified: false, databaseConnectionBound: false, insertCount: 1, accountCount: 1, expectedProjectRef: project });
    expect(result.review.requestId).toBe(result.payload.request_id);
    expect(request).toHaveBeenCalledTimes(10);
    for (const [url, options] of request.mock.calls) {
      expect(options?.method).toBe('GET'); expect(options?.body).toBeUndefined(); expect(String(url)).not.toContain('/rpc/');
    }
    for (const secret of ['private-user', id('sub'), id('ctm'), 'provider-secret', 'database-secret']) expect(JSON.stringify(result.review)).not.toContain(secret);
    expect(JSON.stringify(result.payload)).not.toContain('provider-secret');
  });
  it.each(['legacy', 'changed', 'second-failure'])('refuses incomplete or changed evidence: %s', async kind => {
    const request = vi.fn<typeof fetch>(); cycle(request, { legacy: kind === 'legacy' });
    if (kind === 'second-failure') request.mockRejectedValueOnce(new Error('secret network error'));
    else cycle(request, { legacy: kind === 'legacy', drift: kind === 'changed' });
    await expect(prepareBillingOperatorReview(env, project, request)).rejects.toThrow('Billing insert evidence unavailable');
  });
  it('refuses a mismatched linked project before any network request', async () => {
    const request = vi.fn<typeof fetch>();
    await expect(prepareBillingOperatorReview(env, 'z'.repeat(20), request)).rejects.toThrow('Billing insert evidence unavailable');
    expect(request).not.toHaveBeenCalled();
  });
});
