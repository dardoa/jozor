import { describe, expect, it, vi } from 'vitest';
import { inspectAccountBillingReadiness } from '../accountBillingReadiness.mjs';

const ref = 'abcdefghijklmnopqrst';
const id = (prefix: string, suffix = 'a') => `${prefix}_${suffix.repeat(26)}`;
const env = {
  PADDLE_ENVIRONMENT: 'sandbox', VITE_PADDLE_ENVIRONMENT: 'sandbox',
  VITE_PADDLE_CLIENT_TOKEN: 'test_browser-secret', PADDLE_API_KEY: 'provider-secret',
  PADDLE_WEBHOOK_SECRET: 'webhook-secret', PADDLE_PRO_PRICE_ID: id('pri'), PADDLE_FAMILY_PRICE_ID: id('pri', 'b'),
  VITE_SUPABASE_URL: `https://${ref}.supabase.co`, SUPABASE_SERVICE_ROLE_KEY: 'database-secret',
};
const subscription = { id: id('sub'), status: 'active', customer_id: id('ctm'), custom_data: { userId: 'private-user-sentinel' } };
const local = { id: id('sub'), status: 'active', paddle_customer_id: id('ctm'), user_id: 'private-user-sentinel', plan_id: id('pri') };
const transaction = { id: id('txn'), status: 'ready', custom_data: { userId: local.user_id }, items: [{ price: { id: id('pri') } }] };
const json = (body: unknown, headers: Record<string, string> = {}) => new Response(JSON.stringify(body), { headers });
const page = (rows: unknown[], next?: string) => json({ data: rows, meta: { pagination: { has_more: next !== undefined, next: next ?? 'unused' } } });
const baseline = () => vi.fn<typeof fetch>()
  .mockResolvedValueOnce(page([subscription]))
  .mockResolvedValueOnce(page([transaction]))
  .mockResolvedValueOnce(json([local], { 'content-range': '0-0/1' }));

describe('read-only aggregate billing inventory', () => {
  const reviewTransaction = {
    ...transaction, collection_mode: 'automatic', subscription_id: null, payments: [],
    checkout: { url: 'https://checkout.example.test/pay?private-link-sentinel' },
    created_at: '2026-06-01T12:00:00Z',
  };
  const inspectTransactions = (rows: unknown[]) => inspectAccountBillingReadiness(env, ref,
    vi.fn<typeof fetch>().mockResolvedValueOnce(page([subscription])).mockResolvedValueOnce(page(rows)), { providerOnly: true });

  it('measures legacy checkout exposure without opening links or exposing transaction identities', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(page([subscription]))
      .mockResolvedValueOnce(page([reviewTransaction,
        { ...reviewTransaction, id: id('txn', 'b'), status: 'draft', checkout: { url: null }, created_at: '2026-06-02T12:00:00Z' }]));
    const report = await inspectAccountBillingReadiness(env, ref, request, { providerOnly: true });
    expect(report.provider?.transactions?.unresolvedReview).toMatchObject({
      checkoutLinks: { present: 1, absent: 1, unknown: 0 },
      paymentHistory: { present: 0, empty: 2, unknown: 0 },
      subscriptionLinks: { present: 0, absent: 2, unknown: 0 },
      automaticCollection: 2, manualCollection: 0, unknownCollection: 0,
      allItemsUseConfiguredPrices: 2, oldestCreatedAt: '2026-06-01T12:00:00.000Z',
      newestCreatedAt: '2026-06-02T12:00:00.000Z', createdAtUnknown: 0,
      unpaidUnlinkedDraftOrReady: 2, checkoutPayabilityVerified: false, cancellationAuthorized: false,
      unpaidUnlinkedByStatus: { draft: 1, ready: 1 },
    });
    expect(request).toHaveBeenCalledTimes(2);
    for (const [url, options] of request.mock.calls) {
      expect(new URL(String(url)).hostname).toBe('sandbox-api.paddle.com');
      expect(options?.method).toBe('GET');
    }
    for (const secret of [reviewTransaction.id, local.user_id, 'private-link-sentinel', 'checkout.example.test']) {
      expect(JSON.stringify(report)).not.toContain(secret);
    }
  });

  it('keeps missing review metadata unknown, never treating it as empty or absent', async () => {
    const report = await inspectTransactions([transaction]);
    expect(report.provider?.transactions?.unresolvedReview).toMatchObject({
      paymentHistory: { unknown: 1, empty: 0 }, subscriptionLinks: { unknown: 1, absent: 0 },
      checkoutLinks: { unknown: 1, absent: 0 }, createdAtUnknown: 1, oldestCreatedAt: null,
      newestCreatedAt: null, unknownCollection: 1, unpaidUnlinkedDraftOrReady: 0,
    });
  });

  it('separates subscription-generated work and explicit zero totals without leaking arbitrary origins', async () => {
    const report = await inspectTransactions([
      { ...reviewTransaction, origin: 'subscription_payment_method_change', subscription_id: subscription.id, details: { totals: { grand_total: '0' } } },
      { ...reviewTransaction, id: id('txn', 'b'), origin: 'private-origin-sentinel', details: { totals: { grand_total: '' } } },
    ]);
    expect(report.provider?.transactions?.unresolvedReview).toMatchObject({
      origins: { subscription_payment_method_change: 1, unknown: 1 },
      linkedOrigins: { subscription_payment_method_change: 1, unknown: 0 },
      explicitlyZeroTotal: 1, unpaidUnlinkedDraftOrReady: 1,
    });
    expect(JSON.stringify(report)).not.toContain('private-origin-sentinel');
  });

  it.each([
    { payments: [{ status: 'captured', private: 'payment-secret' }] },
    { payments: [{ status: 'authorized' }] },
    { payments: null },
    { subscription_id: id('sub') },
    { subscription_id: '' },
    { collection_mode: 'manual' },
    { collection_mode: 'unknown' },
    { items: [{ price: { id: id('pri') } }, { price: { id: id('pri', 'z') } }] },
    { items: [] },
    { status: 'paid' },
    { custom_data: null },
  ])('does not classify ambiguous or linked work as unpaid unlinked checkout: %j', async overrides => {
    const report = await inspectTransactions([{ ...reviewTransaction, ...overrides }]);
    expect(report.inventoryComplete).toBe(true);
    expect(report.provider?.transactions?.unresolvedReview.unpaidUnlinkedDraftOrReady).toBe(0);
    expect(report.provider?.transactions?.unresolvedReview.cancellationAuthorized).toBe(false);
    expect(JSON.stringify(report)).not.toContain('payment-secret');
  });

  it.each(['javascript:private-secret', 'https://user:private-secret@example.test', 'not-a-url'])('never certifies or prints an unsafe checkout URL', async url => {
    const report = await inspectTransactions([{ ...reviewTransaction, checkout: { url }, created_at: 'private-secret' }]);
    expect(report.provider?.transactions?.unresolvedReview).toMatchObject({
      checkoutLinks: { present: 0, unknown: 1 }, createdAtUnknown: 1, oldestCreatedAt: null,
    });
    expect(JSON.stringify(report)).not.toContain('private-secret');
  });

  it('compares actual rows, flags open uncorrelated work, and never grants release approval', async () => {
    const request = baseline();
    const report = await inspectAccountBillingReadiness(env, ref, request);
    expect(report).toMatchObject({ inventoryComplete: true, mutationsPerformed: false, releaseApproved: false, atomicSnapshot: false,
      provider: { transactions: { unresolved: 1, unresolvedWithoutAttemptCorrelation: 1,
        unresolvedWithUserButNoAttemptCorrelation: 1, unresolvedForConfiguredPrices: 1 } },
      localComparison: { total: 1, matchingProviderIds: 1, statusMismatches: 0, identityMismatches: 0, absentFromProviderInventory: 0 } });
    expect(report.checks).toContain('unresolved-provider-transactions-require-review');
    expect(request).toHaveBeenCalledTimes(3);
    for (const [url, options] of request.mock.calls) {
      expect(options).toMatchObject({ method: 'GET', redirect: 'error', cache: 'no-store' });
      expect(options?.signal).toBeInstanceOf(AbortSignal);
      expect(options?.body).toBeUndefined();
      expect(String(url)).not.toContain('/rpc/');
      const headers = options?.headers as Record<string, string>;
      expect(headers.Authorization).toBe(`Bearer ${String(url).includes('paddle.com') ? env.PADDLE_API_KEY : env.SUPABASE_SERVICE_ROLE_KEY}`);
    }
    const output = JSON.stringify(report);
    for (const secret of [env.PADDLE_API_KEY, env.SUPABASE_SERVICE_ROLE_KEY, env.PADDLE_WEBHOOK_SECRET,
      env.VITE_PADDLE_CLIENT_TOKEN, env.VITE_SUPABASE_URL, local.user_id, local.id, local.paddle_customer_id, transaction.id]) {
      expect(output).not.toContain(secret);
    }
  });

  it.each([
    { PADDLE_ENVIRONMENT: 'live' }, { PADDLE_ENVIRONMENT: '' }, { VITE_PADDLE_ENVIRONMENT: 'production' },
    { VITE_PADDLE_CLIENT_TOKEN: 'live_wrong-environment' }, { PADDLE_API_KEY: '' }, { PADDLE_WEBHOOK_SECRET: '' },
    { PADDLE_API_KEY: 'pdl_live_apikey_wrong-environment' },
    { PADDLE_PRO_PRICE_ID: 'invalid' }, { PADDLE_FAMILY_PRICE_ID: env.PADDLE_PRO_PRICE_ID },
    { VITE_SUPABASE_URL: 'https://other.supabase.co' }, { SUPABASE_SERVICE_ROLE_KEY: '' },
  ])('refuses invalid configuration before any requests: %j', async override => {
    const request = vi.fn<typeof fetch>();
    const report = await inspectAccountBillingReadiness({ ...env, ...override }, ref, request);
    expect(report.inventoryComplete).toBe(false);
    expect(report.checks).toContain('configuration-unverified');
    expect(request).not.toHaveBeenCalled();
  });

  it('uses the production API only when all environment settings explicitly agree', async () => {
    const request = baseline();
    const report = await inspectAccountBillingReadiness({ ...env, PADDLE_ENVIRONMENT: 'production',
      VITE_PADDLE_ENVIRONMENT: 'production', VITE_PADDLE_CLIENT_TOKEN: 'live_client' }, ref, request);
    expect(report.inventoryComplete).toBe(true);
    expect(new URL(String(request.mock.calls[0][0])).origin).toBe('https://api.paddle.com');
  });

  it('paginates to has_more=false instead of trusting estimated totals', async () => {
    const request = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(page([subscription], `https://sandbox-api.paddle.com/subscriptions?after=${subscription.id}`))
      .mockResolvedValueOnce(page([{ ...subscription, id: id('sub', 'b') }]))
      .mockResolvedValueOnce(page([]))
      .mockResolvedValueOnce(json([local], { 'content-range': '0-0/1' }));
    const report = await inspectAccountBillingReadiness(env, ref, request);
    expect(report).toMatchObject({ inventoryComplete: true, provider: { subscriptions: { total: 2, pages: 2 } },
      localComparison: { providerSubscriptionsAbsentLocally: 1 } });
    expect(new URL(String(request.mock.calls[1][0])).searchParams.get('after')).toBe(subscription.id);
  });

  it.each([
    `https://evil.test/subscriptions?after=${subscription.id}`,
    `https://sandbox-api.paddle.com/transactions?after=${subscription.id}`,
    `https://private:secret@sandbox-api.paddle.com/subscriptions?after=${subscription.id}`,
    `https://sandbox-api.paddle.com/subscriptions?after=${id('sub', 'b')}`,
    'https://sandbox-api.paddle.com/subscriptions?after=invalid',
  ])('refuses unsafe or inconsistent pagination: %s', async next => {
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(page([subscription], next));
    const report = await inspectAccountBillingReadiness(env, ref, request);
    expect(report.inventoryComplete).toBe(false);
    expect(report.checks).toContain('subscriptions-unsafe-pagination');
    expect(request).toHaveBeenCalledTimes(1);
  });

  it.each([
    { data: [], meta: {} },
    { data: [{ ...subscription, status: 'invented' }], meta: { pagination: { has_more: false } } },
    { data: [subscription, subscription], meta: { pagination: { has_more: false } } },
  ])('does not certify malformed provider pages', async payload => {
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(json(payload));
    expect((await inspectAccountBillingReadiness(env, ref, request)).inventoryComplete).toBe(false);
  });

  it('stops bounded pagination with an incomplete verdict', async () => {
    let index = 0;
    const request = vi.fn<typeof fetch>(async () => {
      const rowId = `sub_${String(++index).padStart(26, '0')}`;
      return page([{ ...subscription, id: rowId }], `https://sandbox-api.paddle.com/subscriptions?after=${rowId}`);
    });
    const report = await inspectAccountBillingReadiness(env, ref, request);
    expect(request).toHaveBeenCalledTimes(100);
    expect(report.inventoryComplete).toBe(false);
    expect(report.checks).toContain('subscriptions-page-limit');
  });

  it('reports local mismatches and absent IDs without declaring them disposable test data', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(page([subscription]))
      .mockResolvedValueOnce(page([{ ...transaction, status: 'completed', subscription_id: id('sub', 'c') }]))
      .mockResolvedValueOnce(json([{ ...local, status: 'canceled', user_id: 'wrong-user' },
        { ...local, id: 'sub_fake' }], { 'content-range': '0-1/2' }));
    const report = await inspectAccountBillingReadiness(env, ref, request);
    expect(report).toMatchObject({ inventoryComplete: true,
      localComparison: { statusMismatches: 1, identityMismatches: 1, absentFromProviderInventory: 1, absentWithInvalidProviderIdFormat: 1 },
      provider: { transactions: { completedWithoutLocalSubscription: 1 } } });
    expect(report.checks).toContain('local-subscription-reconciliation-required');
  });

  it.each(['0-0/*', '0-0/2', '0-0/5001'])('rejects incomplete local counts: %s', async contentRange => {
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(page([subscription]))
      .mockResolvedValueOnce(page([])).mockResolvedValueOnce(json([local], { 'content-range': contentRange }));
    const report = await inspectAccountBillingReadiness(env, ref, request);
    expect(report.inventoryComplete).toBe(false);
    expect(report.checks).toContain('local-subscriptions-incomplete');
  });

  it('redacts provider error bodies, malformed JSON and transport errors', async () => {
    for (const fail of [
      () => Promise.resolve(new Response('secret-provider-payload', { status: 403 })),
      () => Promise.resolve(new Response('secret-provider-payload')),
      () => Promise.reject(new Error('secret-provider-payload')),
    ]) {
      const request = vi.fn<typeof fetch>(fail);
      const report = await inspectAccountBillingReadiness(env, ref, request);
      expect(report.inventoryComplete).toBe(false);
      expect(JSON.stringify(report)).not.toContain('secret-provider-payload');
    }
  });

  it('can inspect permitted transactions after a subscription 403 without inventing absent subscriptions', async () => {
    const request = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response('secret-denial-body', { status: 403 }))
      .mockResolvedValueOnce(page([transaction]))
      .mockResolvedValueOnce(json([local], { 'content-range': '0-0/1' }));
    const report = await inspectAccountBillingReadiness(env, ref, request);
    expect(report).toMatchObject({ inventoryComplete: false, status: 'blocked',
      provider: { subscriptions: null, transactions: { total: 1 } },
      localComparison: { available: false, total: 1 } });
    expect(report.localComparison).not.toHaveProperty('absentFromProviderInventory');
    expect(report.checks).toContain('subscriptions-http-403');
    expect(JSON.stringify(report)).not.toContain('secret-denial-body');
  });

  it('emits only allowlisted provider denial codes, never provider message or detail fields', async () => {
    const request = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: 'forbidden', detail: 'secret-detail' } }), { status: 403 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: 'secret-arbitrary-code' } }), { status: 403 }));
    const report = await inspectAccountBillingReadiness(env, ref, request, { providerOnly: true });
    expect(report.accessErrors).toEqual([
      { resource: 'subscriptions', status: 403, code: 'forbidden' },
      { resource: 'transactions', status: 403, code: 'other-or-unavailable' },
    ]);
    expect(JSON.stringify(report)).not.toContain('secret-');
    expect(report.inventoryComplete).toBe(false);
  });

  it('requires explicit provider-only scope to omit database comparison without local secret fallback', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(page([subscription])).mockResolvedValueOnce(page([transaction]));
    const report = await inspectAccountBillingReadiness({ ...env, SUPABASE_SERVICE_ROLE_KEY: '', VITE_SUPABASE_URL: '' }, ref,
      request, { providerOnly: true });
    expect(report).toMatchObject({ scope: 'provider-only', inventoryComplete: true, releaseApproved: false,
      localComparison: { available: false, total: null }, provider: { transactions: { completedWithoutLocalSubscription: null } } });
    expect(report.checks).toContain('local-subscription-comparison-not-performed');
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('distinguishes missing subscription IDs from missing user mappings without exposing identities', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(page([
      subscription, { ...subscription, id: id('sub', 'b') },
      { ...subscription, id: id('sub', 'c'), status: 'canceled' },
      { ...subscription, id: id('sub', 'd'), custom_data: null },
    ])).mockResolvedValueOnce(page([transaction])).mockResolvedValueOnce(json([local], { 'content-range': '0-0/1' }));
    const report = await inspectAccountBillingReadiness(env, ref, request);
    expect(report).toMatchObject({
      provider: { subscriptions: { applicationUsersWithMultipleNonCanceledSubscriptions: 1, nonCanceledWithoutApplicationUser: 1 },
        transactions: { unresolvedWithLocalSubscriptionUser: 1 } },
      localComparison: { providerSubscriptionsAbsentLocally: 3, providerMissingIdsWithAnotherLocalSubscriptionForSameUser: 2 },
    });
    expect(report.checks).toContain('multiple-provider-subscriptions-per-user-require-review');
    expect(JSON.stringify(report)).not.toContain(local.user_id);
  });

  it('does not count canceled or uncorrelated subscriptions as another active subscription for a user', async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(page([
      subscription, { ...subscription, id: id('sub', 'b'), status: 'canceled' },
      { ...subscription, id: id('sub', 'c'), custom_data: null },
      { ...subscription, id: id('sub', 'd'), custom_data: null },
    ])).mockResolvedValueOnce(page([])).mockResolvedValueOnce(json([local], { 'content-range': '0-0/1' }));
    const report = await inspectAccountBillingReadiness(env, ref, request);
    expect(report.provider.subscriptions.applicationUsersWithMultipleNonCanceledSubscriptions).toBe(0);
    expect(report.checks).not.toContain('multiple-provider-subscriptions-per-user-require-review');
  });
});
