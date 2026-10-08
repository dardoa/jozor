import { planAccountBillingReconciliation } from './accountBillingReconciliation.mjs';

const environments = new Set(['sandbox', 'production']);
const subscriptionStatuses = ['active', 'trialing', 'paused', 'past_due', 'canceled'];
const transactionStatuses = ['draft', 'ready', 'billed', 'paid', 'completed', 'canceled', 'past_due'];
const unresolvedStatuses = new Set(['draft', 'ready', 'billed', 'paid', 'past_due']);
const idPattern = prefix => new RegExp(`^${prefix}_[a-z0-9]{26}$`);
const hasText = value => typeof value === 'string' && value.trim().length > 0;
const tally = (rows, statuses) => Object.fromEntries(statuses.map(status => [status, rows.filter(row => row.status === status).length]));

function summarizeOpenTransactions(rows, priceIds) {
  const checkoutLink = row => {
    if (row.checkout?.url === null) return 'absent';
    if (!hasText(row.checkout?.url)) return 'unknown';
    try {
      const url = new URL(row.checkout.url);
      return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? 'present' : 'unknown';
    } catch { return 'unknown'; }
  };
  const paymentHistory = row => !Array.isArray(row.payments) ? 'unknown' : row.payments.length ? 'present' : 'empty';
  const subscriptionLink = row => row.subscription_id === null ? 'absent'
    : typeof row.subscription_id === 'string' && idPattern('sub').test(row.subscription_id) ? 'present' : 'unknown';
  const allPricesConfigured = row => Array.isArray(row.items) && row.items.length > 0
    && row.items.every(item => priceIds.includes(item?.price?.id));
  const dates = rows.map(row => typeof row.created_at === 'string'
    && /^\d{4}-\d{2}-\d{2}T/.test(row.created_at) ? Date.parse(row.created_at) : NaN).filter(Number.isFinite);
  const origins = ['api', 'web', 'subscription_charge', 'subscription_payment_method_change', 'subscription_recurring', 'subscription_update'];
  const linkedRows = rows.filter(row => subscriptionLink(row) === 'present');
  const originCounts = values => ({ ...Object.fromEntries(origins.map(origin => [origin, values.filter(row => row.origin === origin).length])),
    unknown: values.filter(row => !origins.includes(row.origin)).length });
  const unpaidUnlinked = rows.filter(row => ['draft', 'ready'].includes(row.status)
    && row.collection_mode === 'automatic' && hasText(row.custom_data?.userId)
    && allPricesConfigured(row) && paymentHistory(row) === 'empty' && subscriptionLink(row) === 'absent');
  return {
    checkoutLinks: Object.fromEntries(['present', 'absent', 'unknown'].map(value => [value, rows.filter(row => checkoutLink(row) === value).length])),
    paymentHistory: Object.fromEntries(['present', 'empty', 'unknown'].map(value => [value, rows.filter(row => paymentHistory(row) === value).length])),
    subscriptionLinks: Object.fromEntries(['present', 'absent', 'unknown'].map(value => [value, rows.filter(row => subscriptionLink(row) === value).length])),
    automaticCollection: rows.filter(row => row.collection_mode === 'automatic').length,
    manualCollection: rows.filter(row => row.collection_mode === 'manual').length,
    unknownCollection: rows.filter(row => !['automatic', 'manual'].includes(row.collection_mode)).length,
    allItemsUseConfiguredPrices: rows.filter(allPricesConfigured).length,
    oldestCreatedAt: dates.length ? new Date(Math.min(...dates)).toISOString() : null,
    newestCreatedAt: dates.length ? new Date(Math.max(...dates)).toISOString() : null,
    createdAtUnknown: rows.length - dates.length,
    origins: originCounts(rows),
    linkedOrigins: originCounts(linkedRows),
    explicitlyZeroTotal: rows.filter(row => typeof row.details?.totals?.grand_total === 'string'
      && /^0+$/.test(row.details.totals.grand_total)).length,
    // A review category, NOT an apply plan: no link is opened and no cancellation is authorized.
    unpaidUnlinkedDraftOrReady: unpaidUnlinked.length,
    unpaidUnlinkedByStatus: tally(unpaidUnlinked, ['draft', 'ready']),
    checkoutPayabilityVerified: false,
    cancellationAuthorized: false,
  };
}

class AuditFailure extends Error {}

/** Read-only, aggregate-only audit. No RPCs, SDK side effects or provider mutations. */
export async function inspectAccountBillingReadiness(env, expectedProjectRef, request = fetch, { providerOnly = false, reconciliationPreview = false } = {}) {
  return inspectBillingInventory(env, expectedProjectRef, request, { providerOnly, reconciliationPreview });
}

/** Private evidence for operator preparation; never print this return value. */
export async function readAccountBillingInsertEvidence(env, expectedProjectRef, request = fetch) {
  let evidence;
  const report = await inspectBillingInventory(env, expectedProjectRef, request,
    { providerOnly: false, reconciliationPreview: true }, value => { evidence = value; });
  if (!report.inventoryComplete || !evidence) throw new Error('Billing insert evidence unavailable');
  return { ...evidence, report };
}

async function inspectBillingInventory(env, expectedProjectRef, request, { providerOnly, reconciliationPreview }, captureEvidence) {
  const mode = env.PADDLE_ENVIRONMENT?.trim();
  const browserMode = env.VITE_PADDLE_ENVIRONMENT?.trim();
  const token = env.VITE_PADDLE_CLIENT_TOKEN?.trim();
  const tokenMode = token?.startsWith('test_') ? 'sandbox' : token?.startsWith('live_') ? 'production' : 'unknown';
  const key = env.PADDLE_API_KEY?.trim();
  const keyMode = key?.startsWith('pdl_sdbx_apikey_') ? 'sandbox'
    : key?.startsWith('pdl_live_apikey_') ? 'production' : 'legacy-or-unknown';
  const priceIds = [env.PADDLE_PRO_PRICE_ID?.trim(), env.PADDLE_FAMILY_PRICE_ID?.trim()];
  const configuration = {
    serverEnvironment: environments.has(mode) ? mode : 'unknown',
    browserEnvironment: environments.has(browserMode) ? browserMode : 'unknown',
    browserTokenEnvironment: tokenMode,
    apiKeyEnvironment: keyMode,
    environmentMatches: environments.has(mode) && mode === browserMode && mode === tokenMode
      && (keyMode === 'legacy-or-unknown' || keyMode === mode),
    apiKeyPresent: hasText(env.PADDLE_API_KEY),
    webhookSecretPresent: hasText(env.PADDLE_WEBHOOK_SECRET),
    priceIdsValidAndDistinct: priceIds.every(id => typeof id === 'string' && idPattern('pri').test(id)) && priceIds[0] !== priceIds[1],
    linkedDatabaseMatches: /^[a-z0-9]{20}$/.test(expectedProjectRef ?? '')
      && env.VITE_SUPABASE_URL?.replace(/\/$/, '') === `https://${expectedProjectRef}.supabase.co`,
    databaseKeyPresent: hasText(env.SUPABASE_SERVICE_ROLE_KEY),
  };
  const report = {
    inspectedAt: new Date().toISOString(),
    scope: providerOnly ? 'provider-only' : 'provider-and-linked-database',
    status: 'blocked',
    inventoryComplete: false,
    mutationsPerformed: false,
    releaseApproved: false,
    atomicSnapshot: false,
    configuration,
    checks: [],
    accessErrors: [],
  };
  if (reconciliationPreview && providerOnly) {
    report.checks.push('reconciliation-requires-linked-database');
    return report;
  }
  if (!configuration.environmentMatches || !configuration.apiKeyPresent || !configuration.webhookSecretPresent
    || !configuration.priceIdsValidAndDistinct || (!providerOnly && (!configuration.linkedDatabaseMatches || !configuration.databaseKeyPresent))) {
    report.checks.push('configuration-unverified');
    return report;
  }

  const started = Date.now();
  const providerOrigin = mode === 'production' ? 'https://api.paddle.com' : 'https://sandbox-api.paddle.com';
  const read = async (url, headers, source) => {
    if (Date.now() - started >= 120000) throw new AuditFailure('inventory-time-limit');
    const response = await request(url, {
      method: 'GET', redirect: 'error', cache: 'no-store',
      signal: AbortSignal.timeout(10000), headers: { ...headers, Accept: 'application/json' },
    });
    if (!response.ok) {
      if (source === 'ledger-column-probe' && response.status === 400) {
        const body = await response.json().catch(() => null);
        if (body?.code === '42703' && body.message === 'column subscriptions.entitlement_tier does not exist') {
          return { response, body: { missingLedgerColumn: true } };
        }
      }
      if (response.status === 403) {
        const body = await response.json().catch(() => null);
        report.accessErrors.push({ resource: source, status: 403,
          code: body?.error?.code === 'forbidden' ? 'forbidden' : 'other-or-unavailable' });
      }
      throw new AuditFailure(`${source}-http-${response.status}`);
    }
    return { response, body: await response.json() };
  };

  const readProvider = async (resource, prefix, statuses) => {
    const rows = [];
    const seenIds = new Set();
    const seenCursors = new Set();
    let after = null;
    for (let page = 0; page < 100; page++) {
      const url = new URL(`/${resource}`, providerOrigin);
      url.searchParams.set('per_page', '30');
      url.searchParams.set('order_by', 'id[ASC]');
      if (after) url.searchParams.set('after', after);
      const { body } = await read(url.href, { Authorization: `Bearer ${env.PADDLE_API_KEY.trim()}` }, resource);
      const pagination = body?.meta?.pagination;
      if (!Array.isArray(body?.data) || body.data.length > 30 || typeof pagination?.has_more !== 'boolean') {
        throw new AuditFailure(`${resource}-invalid-page`);
      }
      for (const row of body.data) {
        if (!row || !idPattern(prefix).test(row.id) || !statuses.includes(row.status) || seenIds.has(row.id)) {
          throw new AuditFailure(`${resource}-invalid-or-duplicate-row`);
        }
        seenIds.add(row.id);
        rows.push(row);
      }
      if (!pagination.has_more) return { rows, pages: page + 1 };
      if (!body.data.length || typeof pagination.next !== 'string') throw new AuditFailure(`${resource}-invalid-pagination`);
      // Never follow arbitrary provider-supplied URLs with a bearer token.
      const next = new URL(pagination.next);
      after = next.searchParams.get('after');
      if (next.origin !== providerOrigin || next.pathname !== `/${resource}` || next.username || next.password || next.hash
        || !idPattern(prefix).test(after ?? '') || after !== body.data.at(-1).id || seenCursors.has(after)) {
        throw new AuditFailure(`${resource}-unsafe-pagination`);
      }
      seenCursors.add(after);
    }
    throw new AuditFailure(`${resource}-page-limit`);
  };

  const readLedgerColumn = async () => {
    const url = new URL('/rest/v1/subscriptions', `https://${expectedProjectRef}.supabase.co`);
    url.searchParams.set('select', 'entitlement_tier'); url.searchParams.set('limit', '0');
    const key = env.SUPABASE_SERVICE_ROLE_KEY.trim();
    const { body } = await read(url.href, { apikey: key, Authorization: `Bearer ${key}` }, 'ledger-column-probe');
    if (body?.missingLedgerColumn) return false;
    if (!Array.isArray(body) || body.length !== 0) throw new AuditFailure('ledger-column-probe-invalid');
    return true;
  };

  const readLocalSubscriptions = async (hasLedgerColumn = false) => {
    const rows = [];
    let expectedTotal;
    for (let offset = 0; offset < 5000; offset += 1000) {
      const url = new URL('/rest/v1/subscriptions', `https://${expectedProjectRef}.supabase.co`);
      url.searchParams.set('select', 'id,user_id,status,paddle_customer_id,plan_id'
        + (reconciliationPreview ? ',current_period_end,last_event_occurred_at,updated_at' : '')
        + (hasLedgerColumn ? ',entitlement_tier' : ''));
      url.searchParams.set('order', 'id.asc');
      url.searchParams.set('limit', '1000');
      url.searchParams.set('offset', String(offset));
      const key = env.SUPABASE_SERVICE_ROLE_KEY.trim();
      const { response, body } = await read(url.href, { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact' }, 'local-subscriptions');
      const totalMatch = /\/(\d+)$/.exec(response.headers.get('content-range') ?? '');
      const total = totalMatch ? Number(totalMatch[1]) : NaN;
      if (!Array.isArray(body) || !Number.isSafeInteger(total) || total > 5000
        || (expectedTotal !== undefined && expectedTotal !== total)
        || body.length !== Math.min(1000, Math.max(total - offset, 0))) throw new AuditFailure('local-subscriptions-incomplete');
      expectedTotal = total;
      for (const row of body) {
        if (!hasText(row?.id) || !hasText(row?.user_id) || !subscriptionStatuses.includes(row.status)) {
          throw new AuditFailure('local-subscriptions-invalid-row');
        }
        if (hasLedgerColumn && !['free', 'pro', 'family'].includes(row.entitlement_tier)) throw new AuditFailure('invalid-ledger-entitlement');
      }
      rows.push(...body);
      if (rows.length === total) {
        if (new Set(rows.map(row => row.id)).size !== total) throw new AuditFailure('local-subscriptions-duplicate-row');
        return rows;
      }
    }
    throw new AuditFailure('local-subscriptions-row-limit');
  };

  const readRelatedProfiles = async (subscriptions, transactions, local) => {
    const users = [...new Set([...subscriptions.map(row => row.custom_data?.userId),
      ...transactions.map(row => row.custom_data?.userId), ...local.map(row => row.user_id)]
      .filter(user => typeof user === 'string' && user.length > 0 && user.length <= 256 && !/[\u0000-\u001f\u007f]/.test(user)))].sort();
    const rows = [];
    for (let index = 0; index < users.length; index += 10) {
      const batch = users.slice(index, index + 10);
      const url = new URL('/rest/v1/user_profiles', `https://${expectedProjectRef}.supabase.co`);
      url.searchParams.set('select', 'id,tier,updated_at');
      url.searchParams.set('id', `in.(${batch.map(user => JSON.stringify(user)).join(',')})`);
      url.searchParams.set('order', 'id.asc');
      url.searchParams.set('limit', '10');
      const key = env.SUPABASE_SERVICE_ROLE_KEY.trim();
      const { response, body } = await read(url.href, { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'count=exact' }, 'local-profiles');
      const match = /\/(\d+)$/.exec(response.headers.get('content-range') ?? '');
      if (!Array.isArray(body) || !match || Number(match[1]) !== body.length || body.length > batch.length
        || body.some(row => !row || !batch.includes(row.id) || !['free', 'pro', 'family'].includes(row.tier))) {
        throw new AuditFailure('local-profiles-incomplete-or-invalid');
      }
      rows.push(...body);
    }
    if (new Set(rows.map(row => row.id)).size !== rows.length) throw new AuditFailure('local-profiles-duplicate-row');
    return rows;
  };

  try {
    const readPermittedProvider = async (resource, prefix, statuses) => {
      try {
        return await readProvider(resource, prefix, statuses);
      } catch (error) {
        if (!(error instanceof AuditFailure) || error.message !== `${resource}-http-403`) throw error;
        report.checks.push(error.message);
        return null;
      }
    };
    const hasLedgerColumn = reconciliationPreview ? await readLedgerColumn() : false;
    const subscriptions = await readPermittedProvider('subscriptions', 'sub', subscriptionStatuses);
    const transactions = await readPermittedProvider('transactions', 'txn', transactionStatuses);
    const local = providerOnly ? null : await readLocalSubscriptions(hasLedgerColumn);
    const providerById = new Map((subscriptions?.rows ?? []).map(row => [row.id, row]));
    const localById = new Map((local ?? []).map(row => [row.id, row]));
    const localUsers = new Set((local ?? []).map(row => row.user_id));
    const providerMissingLocally = (subscriptions?.rows ?? []).filter(row => !localById.has(row.id));
    const matching = (local ?? []).filter(row => providerById.has(row.id));
    const unmatched = (local ?? []).filter(row => !providerById.has(row.id));
    const open = (transactions?.rows ?? []).filter(row => unresolvedStatuses.has(row.status));
    const correlated = row => hasText(row.custom_data?.checkoutAttemptId);
    const mappedUser = row => hasText(row.custom_data?.userId);
    const nonCanceledSubscriptionsByUser = new Map();
    for (const row of subscriptions?.rows ?? []) {
      if (row.status === 'canceled' || !mappedUser(row)) continue;
      const user = row.custom_data.userId;
      nonCanceledSubscriptionsByUser.set(user, (nonCanceledSubscriptionsByUser.get(user) ?? 0) + 1);
    }
    const statusMismatches = matching.filter(row => row.status !== providerById.get(row.id).status).length;
    const identityMismatches = matching.filter(row => {
      const provider = providerById.get(row.id);
      return row.paddle_customer_id !== provider.customer_id || provider.custom_data?.userId !== row.user_id;
    }).length;
    report.provider = {
      environment: mode,
      subscriptions: subscriptions ? {
        total: subscriptions.rows.length, pages: subscriptions.pages, byStatus: tally(subscriptions.rows, subscriptionStatuses),
        applicationUsersWithMultipleNonCanceledSubscriptions: [...nonCanceledSubscriptionsByUser.values()].filter(count => count > 1).length,
        nonCanceledWithoutApplicationUser: subscriptions.rows.filter(row => row.status !== 'canceled' && !mappedUser(row)).length,
      } : null,
      transactions: transactions ? {
        total: transactions.rows.length, pages: transactions.pages, byStatus: tally(transactions.rows, transactionStatuses),
        unresolved: open.length,
        unresolvedWithApplicationUser: open.filter(mappedUser).length,
        unresolvedWithoutAttemptCorrelation: open.filter(row => !correlated(row)).length,
        unresolvedWithUserButNoAttemptCorrelation: open.filter(row => mappedUser(row) && !correlated(row)).length,
        unresolvedForConfiguredPrices: open.filter(row => row.items?.some(item => priceIds.includes(item.price?.id))).length,
        unresolvedWithLocalSubscriptionUser: local ? open.filter(row => mappedUser(row) && localUsers.has(row.custom_data.userId)).length : null,
        completedWithoutLocalSubscription: local ? transactions.rows.filter(row => row.status === 'completed'
          && hasText(row.subscription_id) && !localById.has(row.subscription_id)).length : null,
        unresolvedReview: summarizeOpenTransactions(open, priceIds),
      } : null,
    };
    report.localComparison = subscriptions && local ? {
      available: true,
      total: local.length, matchingProviderIds: matching.length,
      statusMismatches, identityMismatches,
      absentFromProviderInventory: unmatched.length,
      absentWithInvalidProviderIdFormat: unmatched.filter(row => !idPattern('sub').test(row.id)).length,
      providerSubscriptionsAbsentLocally: providerMissingLocally.length,
      providerMissingIdsWithAnotherLocalSubscriptionForSameUser: providerMissingLocally.filter(row => mappedUser(row) && localUsers.has(row.custom_data.userId)).length,
    } : { available: false, total: local?.length ?? null };
    report.inventoryComplete = subscriptions !== null && transactions !== null;
    report.status = report.inventoryComplete ? 'inventory-complete-review-required' : 'blocked';
    if (subscriptions && (unmatched.length || statusMismatches || identityMismatches)) report.checks.push('local-subscription-reconciliation-required');
    if (open.length) report.checks.push('unresolved-provider-transactions-require-review');
    if (report.localComparison.providerSubscriptionsAbsentLocally) report.checks.push('provider-subscriptions-missing-locally');
    if (report.provider.subscriptions?.applicationUsersWithMultipleNonCanceledSubscriptions) report.checks.push('multiple-provider-subscriptions-per-user-require-review');
    if (!local) report.checks.push('local-subscription-comparison-not-performed');
    report.checks.push('coordinated-admission-shutdown-and-hosted-acceptance-still-required');
    if (reconciliationPreview && report.inventoryComplete && local) {
      const profiles = await readRelatedProfiles(subscriptions.rows, transactions.rows, local);
      const priceMapping = { pro: priceIds[0], family: priceIds[1] };
      const firstSnapshot = { subscriptions: subscriptions.rows, transactions: transactions.rows, local, profiles };
      const first = planAccountBillingReconciliation(firstSnapshot, priceMapping);
      // Two complete observations detect drift but do not constitute a distributed
      // transaction or authorize a later write using this preview as a stale plan.
      const secondHasLedgerColumn = await readLedgerColumn();
      if (hasLedgerColumn !== secondHasLedgerColumn) throw new AuditFailure('ledger-schema-changed-during-preview');
      const secondSubscriptions = await readProvider('subscriptions', 'sub', subscriptionStatuses);
      const secondTransactions = await readProvider('transactions', 'txn', transactionStatuses);
      const secondLocal = await readLocalSubscriptions(secondHasLedgerColumn);
      const secondProfiles = await readRelatedProfiles(secondSubscriptions.rows, secondTransactions.rows, secondLocal);
      const secondSnapshot = { subscriptions: secondSubscriptions.rows,
        transactions: secondTransactions.rows, local: secondLocal, profiles: secondProfiles };
      const second = planAccountBillingReconciliation(secondSnapshot, priceMapping);
      const stable = first.report.snapshotFingerprint === second.report.snapshotFingerprint;
      report.reconciliation = { ...second.report, stableAcrossTwoReads: stable,
        entitlementBasis: hasLedgerColumn ? 'ledger-column' : 'legacy-profile-projection', schemaFullyVerified: false,
        completedAt: new Date().toISOString() };
      report.status = stable ? 'reconciliation-preview-review-required' : 'blocked';
      report.checks.push(stable ? 'reconciliation-preview-not-authorized-for-apply' : 'reconciliation-inventory-changed');
      if (!stable) report.inventoryComplete = false;
      if (stable && hasLedgerColumn && captureEvidence) captureEvidence({ previousSnapshot: firstSnapshot, snapshot: secondSnapshot,
        priceIds: priceMapping, observedAt: report.inspectedAt });
    }
  } catch (error) {
    // SDK/transport errors may carry private request URLs, payloads or headers.
    report.inventoryComplete = false;
    report.status = 'blocked';
    report.checks.push(error instanceof AuditFailure ? error.message : 'inventory-unavailable');
  }
  return report;
}
