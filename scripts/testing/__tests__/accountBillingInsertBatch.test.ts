import { describe, expect, it } from 'vitest';
import { prepareAccountBillingInsertBatch } from '../accountBillingInsertBatch.mjs';

const id = (prefix: string, suffix = 'a') => `${prefix}_${suffix.repeat(26)}`;
const prices = { pro: id('pri'), family: id('pri', 'b') };
const time = '2026-09-08T10:00:00.000001Z';
const fixture = () => {
  const family = { id: id('sub'), user_id: 'owner-private', paddle_customer_id: id('ctm'), status: 'active',
    plan_id: prices.family, entitlement_tier: 'family', current_period_end: '2026-10-01T00:00:00Z',
    last_event_occurred_at: time, updated_at: time };
  return { local: [family], profiles: [{ id: family.user_id, tier: 'family', updated_at: time }], transactions: [],
    subscriptions: [family, { ...family, id: id('sub', 'b'), plan_id: prices.pro }].map(row => ({ id: row.id,
      customer_id: row.paddle_customer_id, custom_data: { userId: row.user_id }, status: row.status,
      updated_at: time, current_billing_period: { ends_at: row.current_period_end }, items: [{ price: { id: row.plan_id }, quantity: 1 }] })) };
};
const options = () => ({ previousSnapshot: fixture(), snapshot: fixture(), priceIds: prices,
  requestId: '11111111-1111-4111-8111-111111111111', observedAt: '2026-09-08T10:00:01Z', now: Date.parse('2026-09-08T10:00:02Z') });

describe('private insert-only billing batch preparation', () => {
  it('prepares exact before-images from two matching post-migration observations without mutating inputs', () => {
    const input = options(); const before = structuredClone(input);
    const { payload, report } = prepareAccountBillingInsertBatch(input);
    expect(input).toEqual(before);
    expect(payload.accounts).toHaveLength(1);
    expect(payload.accounts[0]).toEqual({ user_id: 'owner-private', tier: 'family', updated_at: time,
      before: input.snapshot.local, inserts: [{ id: id('sub', 'b'), user_id: 'owner-private', paddle_customer_id: id('ctm'),
        status: 'active', plan_id: prices.pro, entitlement_tier: 'pro', current_period_end: '2026-10-01T00:00:00Z', last_event_occurred_at: time }] });
    expect(report).toMatchObject({ mode: 'prepared-only', applyAllowed: false, mutationsPerformed: false, accountCount: 1, insertCount: 1, tierChanges: 0 });
    for (const secret of ['owner-private', id('sub'), id('ctm'), prices.pro]) expect(JSON.stringify(report)).not.toContain(secret);
  });
  it('whitelists payload fields and keeps unrelated legacy accounts out of the write batch', () => {
    const input = options();
    input.snapshot = { ...input.snapshot, local: [...input.snapshot.local, { ...input.snapshot.local[0], user_id: 'unrelated', id: 'legacy-id', paddle_customer_id: 'legacy-customer' }] };
    input.previousSnapshot = structuredClone(input.snapshot);
    const enhanced = { ...input, snapshot: { ...input.snapshot, profiles: input.snapshot.profiles.map(row => ({ ...row, email: 'private@example.test' })),
      local: input.snapshot.local.map(row => ({ ...row, privateField: 'secret' })) } };
    const result = prepareAccountBillingInsertBatch(enhanced);
    expect(result.payload.accounts).toHaveLength(1);
    for (const secret of ['legacy-id', 'private@example.test', 'privateField']) expect(JSON.stringify(result.payload)).not.toContain(secret);
  });
  it.each(['expired', 'future', 'invalid-request', 'malformed-time'])('rejects invalid batch metadata: %s', kind => {
    const input = options();
    if (kind === 'expired') input.now += 301_000;
    if (kind === 'future') input.now -= 32_000;
    if (kind === 'invalid-request') input.requestId = 'bad';
    if (kind === 'malformed-time') input.observedAt = '2026-02-30T00:00:00Z';
    expect(() => prepareAccountBillingInsertBatch(input)).toThrow('requires fresh, stable, insert-only');
  });
  it.each(['provider', 'local', 'profile'])('rejects changed observations: %s', kind => {
    const input = options();
    if (kind === 'provider') input.snapshot.subscriptions[1].status = 'paused';
    if (kind === 'local') input.snapshot.local[0].updated_at = '2026-09-08T10:00:00.000002Z';
    if (kind === 'profile') input.snapshot.profiles[0].tier = 'pro';
    expect(() => prepareAccountBillingInsertBatch(input)).toThrow();
  });
  it('requires explicit ledger entitlement columns, not legacy tier inference', () => {
    const input = options();
    const { entitlement_tier: tier, ...legacy } = input.snapshot.local[0];
    expect(tier).toBe('family');
    const snapshot = { ...input.snapshot, local: [legacy] };
    expect(() => prepareAccountBillingInsertBatch({ ...input, snapshot, previousSnapshot: snapshot })).toThrow();
  });
  it.each(['update', 'changed-tier', 'unmatched-row', 'held', 'empty', 'future-event'])('refuses an unreviewed plan shape: %s', kind => {
    const input = options();
    if (kind === 'update') { input.snapshot.subscriptions[0].status = 'paused'; input.snapshot.subscriptions[0].updated_at = '2026-09-08T10:00:01Z'; }
    if (kind === 'changed-tier') input.snapshot.profiles[0].tier = 'pro';
    if (kind === 'unmatched-row') input.snapshot.local.push({ ...input.snapshot.local[0], id: 'legacy' });
    if (kind === 'held') input.snapshot.subscriptions[1].customer_id = id('ctm', 'b');
    if (kind === 'empty') input.snapshot.subscriptions.pop();
    if (kind === 'future-event') input.snapshot.subscriptions[1].updated_at = '2026-09-08T11:00:00Z';
    input.previousSnapshot = structuredClone(input.snapshot);
    expect(() => prepareAccountBillingInsertBatch(input)).toThrow();
  });
});
