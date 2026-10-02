import { describe, expect, it, vi } from 'vitest';
import { planAccountBillingReconciliation } from '../accountBillingReconciliation.mjs';
import { inspectAccountBillingReadiness } from '../accountBillingReadiness.mjs';

const id = (prefix: string, suffix = 'a') => `${prefix}_${suffix.repeat(26)}`;
const prices = { pro: id('pri'), family: id('pri', 'b') };
const user = 'private-user-sentinel';
const subscription = (suffix = 'a') => ({ id: id('sub', suffix), status: 'active', customer_id: id('ctm'),
  custom_data: { userId: user }, updated_at: '2026-09-08T10:00:00.000001Z',
  current_billing_period: { starts_at: '2026-09-01T00:00:00Z', ends_at: '2026-10-01T00:00:00Z' },
  items: [{ price: { id: prices.pro }, quantity: 1 }] });
const fixture = () => ({ subscriptions: [subscription(), subscription('b')],
  transactions: [{ id: id('txn'), status: 'completed', subscription_id: id('sub', 'b'), customer_id: id('ctm'),
    custom_data: { userId: user }, items: [{ price: { id: prices.pro } }] }],
  local: [{ id: id('sub'), user_id: user, status: 'active', paddle_customer_id: id('ctm'), plan_id: prices.pro,
    current_period_end: '2026-10-01T00:00:00+00:00', last_event_occurred_at: '2026-09-08T10:00:00.000002Z',
    updated_at: '2026-09-08T10:00:01Z' }],
  profiles: [{ id: user, tier: 'pro', updated_at: '2026-09-08T10:00:01Z' }],
});

describe('billing reconciliation proposal (no writer)', () => {
  it('proposes the missing subscription, preserves the matching row and reports the covered transaction reference', () => {
    const input = fixture(); const before = structuredClone(input);
    const { operations, report } = planAccountBillingReconciliation(input, prices);
    expect(operations).toHaveLength(1);
    expect(operations[0]).toMatchObject({ action: 'insert', before: null, after: {
      id: id('sub', 'b'), user_id: user, paddle_customer_id: id('ctm'), entitlement_tier: 'pro',
    } });
    expect(report).toMatchObject({ applyAllowed: false, mutationsPerformed: false, releaseApproved: false, atomicSnapshot: false,
      counts: { proposedInserts: 1, proposedUpdates: 0, unchangedSubscriptions: 1, heldSubscriptions: 0 },
      projectedTiers: { unchanged: 1, changed: 0 },
      transactions: { completedMissingLocalSubscription: 1, completedReferencesCoveredByProposedInserts: 1 } });
    expect(input).toEqual(before);
    expect(report.snapshotFingerprint).toMatch(/^[a-f0-9]{64}$/);
    for (const secret of [user, id('sub'), id('sub', 'b'), id('ctm'), prices.pro, id('txn')]) {
      expect(JSON.stringify(report)).not.toContain(secret);
    }
  });
  it('is idempotent after proposed rows are present, without replaying events', () => {
    const input = fixture(); const first = planAccountBillingReconciliation(input, prices);
    const projected = { ...input, local: [...input.local, ...first.operations.map(operation => operation.after)] };
    expect(planAccountBillingReconciliation(projected, prices).operations).toEqual([]);
  });
  it('ignores row ordering and unrelated private payload fields in the comparison digest', () => {
    const input = fixture();
    const result = planAccountBillingReconciliation(input, prices);
    const other = planAccountBillingReconciliation({ ...input, subscriptions: [...input.subscriptions].reverse()
      .map(row => ({ ...row, secret: 'auth-token-sentinel', email: 'private@example.test' })) }, prices);
    expect(other.report).toEqual(result.report);
    expect(JSON.stringify(other.report)).not.toContain('sentinel');
  });
  it('projects the strongest tier after an additional family subscription', () => {
    const input = fixture(); input.subscriptions[1].items[0].price.id = prices.family;
    const { report } = planAccountBillingReconciliation(input, prices);
    expect(report.projectedTiers).toMatchObject({ changed: 1, unchanged: 0 });
    expect(report.subscriptions[1]).toMatchObject({ action: 'insert', tier: 'family' });
  });
  it('does not treat a scheduled cancellation as an already canceled subscription', () => {
    const input = fixture();
    const subscriptions = input.subscriptions.map(row => ({ ...row, scheduled_change: { action: 'cancel', effective_at: '2026-10-01T00:00:00Z' } }));
    const { operations } = planAccountBillingReconciliation({ ...input, subscriptions }, prices);
    expect(operations[0].after).toMatchObject({ status: 'active', entitlement_tier: 'pro' });
  });
  it.each(['paused', 'canceled', 'past_due'])('does not grant an entitlement for a %s snapshot', status => {
    const input = fixture(); input.subscriptions[1].status = status;
    const { operations, report } = planAccountBillingReconciliation(input, prices);
    expect(operations[0].after.entitlement_tier).toBe('free');
    expect(report.projectedTiers.unchanged).toBe(1);
  });
  it('requires an existing profile rather than inventing onboarding data', () => {
    const { operations, report } = planAccountBillingReconciliation({ ...fixture(), profiles: [] }, prices);
    expect(operations).toEqual([]);
    expect(report.holds).toEqual({ 'missing-or-invalid-existing-profile': 2 });
  });
  it('does not trust custom_data alone to create a new customer/account association', () => {
    const { operations, report } = planAccountBillingReconciliation({ ...fixture(), local: [] }, prices);
    expect(operations).toEqual([]);
    expect(report.holds).toEqual({ 'no-corroborating-customer-link': 2 });
  });
  it.each(['local-owner', 'provider-customer'])('refuses conflicting or ambiguous ownership: %s', kind => {
    const input = fixture();
    if (kind === 'local-owner') input.local[0].user_id = 'other-owner';
    else input.subscriptions[1].customer_id = id('ctm', 'b');
    const { operations, report } = planAccountBillingReconciliation(input, prices);
    expect(operations).toEqual([]);
    expect(report.holds).toEqual({ 'ambiguous-customer-ownership': 2 });
  });
  it.each(['unknown-price', 'multiple-items', 'quantity'])('holds unsupported product shapes: %s', kind => {
    const input = fixture();
    if (kind === 'unknown-price') input.subscriptions[1].items[0].price.id = id('pri', 'z');
    if (kind === 'multiple-items') input.subscriptions[1].items.push(input.subscriptions[1].items[0]);
    if (kind === 'quantity') input.subscriptions[1].items[0].quantity = 2;
    const { operations, report } = planAccountBillingReconciliation(input, prices);
    expect(operations).toEqual([]);
    expect(report.holds).toEqual({ 'unsupported-price-or-items': 1 });
  });
  it.each(['invalid', '', '2026-09-08', '2026-02-30T00:00:00Z', '2026-09-08T24:00:00Z'])('holds missing or malformed provider freshness evidence: %s', time => {
    const input = fixture(); input.subscriptions[1].updated_at = time;
    const { operations, report } = planAccountBillingReconciliation(input, prices);
    expect(operations).toEqual([]);
    expect(report.holds).toEqual({ 'invalid-provider-timestamps': 1 });
  });
  it.each(['2026-09-08T10:00:00.000001Z', '2026-09-08T10:00:00.000002Z'])('does not overwrite newer/equal local event timestamps: %s', time => {
    const input = fixture(); input.subscriptions[0].updated_at = time; input.subscriptions[0].status = 'canceled';
    const { report } = planAccountBillingReconciliation(input, prices);
    expect(report.subscriptions[0]).toMatchObject({ action: 'review', reason: 'local-watermark-not-older' });
    expect(report.projectedTiers.heldForUnresolvedRows).toBe(1);
  });
  it('preserves microsecond ordering when a changed provider snapshot is strictly newer', () => {
    const input = fixture(); input.subscriptions[0].updated_at = '2026-09-08T10:00:00.000003Z'; input.subscriptions[0].status = 'canceled';
    const { operations, report } = planAccountBillingReconciliation(input, prices);
    expect(operations[0]).toMatchObject({ action: 'update', before: input.local[0], after: { status: 'canceled', entitlement_tier: 'free' } });
    expect(report.counts).toMatchObject({ proposedUpdates: 1, proposedInserts: 1 });
    expect(report.projectedTiers.unchanged).toBe(1);
  });
  it('retains unmatched synthetic rows and refuses to project that account tier as settled', () => {
    const input = fixture(); input.local.push({ ...input.local[0], id: 'sub_11111111-1111-4111-8111-111111111111',
      paddle_customer_id: 'cust_11111111-1111-4111-8111-111111111111', plan_id: 'pro_monthly_price_id' });
    const { report, operations } = planAccountBillingReconciliation(input, prices);
    expect(operations.every(operation => operation.action === 'insert')).toBe(true);
    expect(report.retainedLocalRows).toMatchObject({ total: 1, repositoryFixtureSignature: 1, automaticDeletes: 0 });
    expect(report.projectedTiers.heldForUnresolvedRows).toBe(1);
  });
  it('keeps legacy open checkouts unresolved instead of manufacturing attempt IDs or cancellations', () => {
    const input = fixture(); input.transactions[0].status = 'ready';
    const { report } = planAccountBillingReconciliation(input, prices);
    expect(report.transactions).toMatchObject({ open: 1, legacyOpenWithoutAttempt: 1, automaticCancellations: 0 });
  });
  it('requires transaction customer/user matches before claiming an insert covers a missing reference', () => {
    const input = fixture(); input.transactions[0].customer_id = id('ctm', 'b');
    expect(planAccountBillingReconciliation(input, prices).report.transactions.completedReferencesCoveredByProposedInserts).toBe(0);
  });
  it('refuses duplicate local inventory and invalid configured prices', () => {
    const input = fixture();
    expect(() => planAccountBillingReconciliation({ ...input, local: [...input.local, input.local[0]] }, prices)).toThrow('Invalid reconciliation inventory');
    expect(() => planAccountBillingReconciliation(input, { pro: prices.pro, family: prices.pro })).toThrow('Invalid reconciliation price mapping');
  });
});

const ref = 'abcdefghijklmnopqrst';
const env = { PADDLE_ENVIRONMENT: 'sandbox', VITE_PADDLE_ENVIRONMENT: 'sandbox', VITE_PADDLE_CLIENT_TOKEN: 'test_private',
  PADDLE_API_KEY: 'provider-secret', PADDLE_WEBHOOK_SECRET: 'webhook-secret', PADDLE_PRO_PRICE_ID: prices.pro,
  PADDLE_FAMILY_PRICE_ID: prices.family, VITE_SUPABASE_URL: `https://${ref}.supabase.co`, SUPABASE_SERVICE_ROLE_KEY: 'database-secret' };
const page = (data: unknown) => new Response(JSON.stringify({ data, meta: { pagination: { has_more: false } } }));
const localPage = (data: unknown[], total = data.length) => new Response(JSON.stringify(data), { headers: { 'content-range': `0-${Math.max(0, data.length - 1)}/${total}` } });
const missingColumn = () => new Response(JSON.stringify({ code: '42703', message: 'column subscriptions.entitlement_tier does not exist' }), { status: 400 });
const cycle = (request: ReturnType<typeof vi.fn<typeof fetch>>, input = fixture()) => request
  .mockResolvedValueOnce(missingColumn())
  .mockResolvedValueOnce(page(input.subscriptions)).mockResolvedValueOnce(page(input.transactions))
  .mockResolvedValueOnce(localPage(input.local)).mockResolvedValueOnce(localPage(input.profiles));

describe('read-only reconciliation preview transport', () => {
  it('requires two matching inventories and emits only a redacted proposal, never executable rows', async () => {
    const request = vi.fn<typeof fetch>(); cycle(request); cycle(request);
    const result = await inspectAccountBillingReadiness(env, ref, request, { reconciliationPreview: true });
    expect(result).toMatchObject({ inventoryComplete: true, status: 'reconciliation-preview-review-required',
      reconciliation: { stableAcrossTwoReads: true, applyAllowed: false, counts: { proposedInserts: 1 } } });
    expect(request).toHaveBeenCalledTimes(10);
    for (const [url, options] of request.mock.calls) {
      expect(options).toMatchObject({ method: 'GET', redirect: 'error' });
      expect(options?.body).toBeUndefined();
      expect(String(url)).not.toContain('/rpc/');
    }
    for (const secret of [user, id('sub'), id('ctm'), id('txn'), env.PADDLE_API_KEY, env.SUPABASE_SERVICE_ROLE_KEY]) {
      expect(JSON.stringify(result)).not.toContain(secret);
    }
    expect(result.reconciliation).not.toHaveProperty('operations');
    const profilesUrl = new URL(String(request.mock.calls[4][0]));
    expect(profilesUrl.searchParams.get('select')).toBe('id,tier,updated_at');
    expect(profilesUrl.searchParams.get('id')).toBe(`in.("${user}")`);
  });
  it('blocks when provider or database rows drift between the two observations', async () => {
    for (const changed of ['provider', 'database']) {
      const request = vi.fn<typeof fetch>(); cycle(request);
      const second = fixture();
      if (changed === 'provider') second.subscriptions[1].status = 'paused';
      else second.profiles[0].tier = 'free';
      cycle(request, second);
      const result = await inspectAccountBillingReadiness(env, ref, request, { reconciliationPreview: true });
      expect(result).toMatchObject({ inventoryComplete: false, status: 'blocked', reconciliation: { stableAcrossTwoReads: false } });
      expect(result.checks).toContain('reconciliation-inventory-changed');
    }
  });
  it('does not leave inventoryComplete=true when a second read fails after the first succeeds', async () => {
    const request = vi.fn<typeof fetch>(); cycle(request);
    request.mockRejectedValueOnce(new Error('secret-network-details'));
    const result = await inspectAccountBillingReadiness(env, ref, request, { reconciliationPreview: true });
    expect(result).toMatchObject({ inventoryComplete: false, status: 'blocked' });
    expect(result).not.toHaveProperty('reconciliation');
    expect(JSON.stringify(result)).not.toContain('secret-network-details');
  });
  it('refuses profile count truncation and never reads unrelated profile fields', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(missingColumn()).mockResolvedValueOnce(page(fixture().subscriptions))
      .mockResolvedValueOnce(page([])).mockResolvedValueOnce(localPage(fixture().local))
      .mockResolvedValueOnce(localPage([], 1));
    const result = await inspectAccountBillingReadiness(env, ref, request, { reconciliationPreview: true });
    expect(result.inventoryComplete).toBe(false);
    expect(result.checks).toContain('local-profiles-incomplete-or-invalid');
    expect(request).toHaveBeenCalledTimes(5);
  });
  it('uses actual per-subscription entitlement columns after migration rather than copying the profile tier', async () => {
    const request = vi.fn<typeof fetch>();
    const input = fixture();
    for (let round = 0; round < 2; round++) {
      request.mockResolvedValueOnce(localPage([])).mockResolvedValueOnce(page(input.subscriptions))
        .mockResolvedValueOnce(page(input.transactions)).mockResolvedValueOnce(localPage(input.local.map(row => ({ ...row, entitlement_tier: 'pro' }))))
        .mockResolvedValueOnce(localPage(input.profiles.map(row => ({ ...row, tier: 'family' }))));
    }
    const result = await inspectAccountBillingReadiness(env, ref, request, { reconciliationPreview: true });
    expect(result.reconciliation).toMatchObject({ stableAcrossTwoReads: true, entitlementBasis: 'ledger-column',
      schemaFullyVerified: false, counts: { unchangedSubscriptions: 1, proposedInserts: 1 } });
    expect(new URL(String(request.mock.calls[3][0])).searchParams.get('select')).toContain('entitlement_tier');
  });
  it('does not misclassify a permission failure as a legacy schema', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('{}', { status: 403 }));
    const result = await inspectAccountBillingReadiness(env, ref, request, { reconciliationPreview: true });
    expect(result.inventoryComplete).toBe(false);
    expect(result.checks).toContain('ledger-column-probe-http-403');
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('refuses a schema migration occurring between the two reads', async () => {
    const request = vi.fn<typeof fetch>(); cycle(request); request.mockResolvedValueOnce(localPage([]));
    const result = await inspectAccountBillingReadiness(env, ref, request, { reconciliationPreview: true });
    expect(result.inventoryComplete).toBe(false);
    expect(result.checks).toContain('ledger-schema-changed-during-preview');
  });
  it('does not permit a provider-only reconciliation proposal', async () => {
    const request = vi.fn<typeof fetch>();
    const result = await inspectAccountBillingReadiness(env, ref, request, { reconciliationPreview: true, providerOnly: true });
    expect(result.inventoryComplete).toBe(false);
    expect(request).not.toHaveBeenCalled();
  });
});
