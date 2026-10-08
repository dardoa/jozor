import { createHash } from 'node:crypto';

const statuses = new Set(['active', 'trialing', 'paused', 'past_due', 'canceled']);
const openStatuses = new Set(['draft', 'ready', 'billed', 'paid', 'past_due']);
const tiers = ['free', 'pro', 'family'];
const validId = (prefix, value) => typeof value === 'string' && new RegExp(`^${prefix}_[a-z0-9]{26}$`).test(value);
const validUser = value => typeof value === 'string' && value.length > 0 && value.length <= 256
  && value === value.trim() && !/[\u0000-\u001f\u007f]/.test(value);
const sorted = rows => [...rows].sort((a, b) => a.id.localeCompare(b.id));
const mapRows = rows => new Map(rows.map(row => [row.id, row]));

// PostgreSQL/Paddle timestamps may have microseconds. Do not round them to JS
// milliseconds when deciding whether a provider snapshot is older than a webhook.
const micros = value => {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) return null;
  const datePart = match[1].slice(0, 10);
  const date = new Date(`${datePart}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== datePart
    || Number(match[1].slice(11, 13)) > 23 || Number(match[1].slice(14, 16)) > 59 || Number(match[1].slice(17, 19)) > 59) return null;
  const seconds = Date.parse(match[1] + match[3]);
  return Number.isFinite(seconds) ? BigInt(seconds) * 1000n + BigInt((match[2] ?? '').padEnd(6, '0')) : null;
};
const sameTime = (a, b) => a === null && b === null || micros(a) !== null && micros(a) === micros(b);
export { micros as parseBillingTimestampMicros };
const contribution = (status, tier) => status === 'active' || status === 'trialing' ? tier : 'free';
const fixtureSignature = row => /^sub_[0-9a-f-]{36}$/.test(row.id)
  && /^cust_[0-9a-f-]{36}$/.test(row.paddle_customer_id ?? '') && row.plan_id === 'pro_monthly_price_id';

const normalizeSubscription = row => ({
  id: row.id, status: row.status, customer: row.customer_id ?? null, user: row.custom_data?.userId ?? null,
  updated: row.updated_at ?? null, period: row.current_billing_period ?? null,
  items: row.items?.map(item => ({ id: item.price?.id, quantity: item.quantity })) ?? null,
  scheduledChange: row.scheduled_change ?? null,
});

/** Pure, in-memory proposal. operations contain private IDs; only report may be logged. */
export function planAccountBillingReconciliation(snapshot, priceIds) {
  const { subscriptions, transactions, local, profiles } = snapshot;
  for (const rows of [subscriptions, transactions, local, profiles]) {
    if (!Array.isArray(rows) || rows.some(row => !validUser(row?.id)) || mapRows(rows).size !== rows.length) {
      throw new Error('Invalid reconciliation inventory');
    }
  }
  if (!validId('pri', priceIds.pro) || !validId('pri', priceIds.family) || priceIds.pro === priceIds.family) {
    throw new Error('Invalid reconciliation price mapping');
  }
  const providerById = mapRows(subscriptions);
  const localById = mapRows(local);
  const profileById = mapRows(profiles);
  const unmatched = local.filter(row => !providerById.has(row.id));
  const unresolvedUsers = new Set(unmatched.map(row => row.user_id));
  const customers = new Map();
  const userCustomers = new Map();
  const associate = (user, customer) => {
    if (!validUser(user) || !validId('ctm', customer)) return;
    if (!customers.has(customer)) customers.set(customer, new Set());
    if (!userCustomers.has(user)) userCustomers.set(user, new Set());
    customers.get(customer).add(user); userCustomers.get(user).add(customer);
  };
  for (const row of subscriptions) associate(row.custom_data?.userId, row.customer_id);
  for (const row of local) associate(row.user_id, row.paddle_customer_id);
  const anchors = local.filter(row => {
    const provider = providerById.get(row.id);
    return provider && provider.custom_data?.userId === row.user_id && provider.customer_id === row.paddle_customer_id;
  });
  const operations = [];
  const review = [];
  const holds = {};
  const hold = (entry, reason) => {
    entry.action = 'review'; entry.reason = reason;
    holds[reason] = (holds[reason] ?? 0) + 1;
  };
  const orderedSubscriptions = sorted(subscriptions);
  for (const [index, row] of orderedSubscriptions.entries()) {
    const entry = { ref: `subscription-${index + 1}`, action: 'unchanged', changedFields: [] };
    review.push(entry);
    const user = row.custom_data?.userId;
    const profile = profileById.get(user);
    const existing = localById.get(row.id);
    const item = row.items?.[0];
    const tier = item?.price?.id === priceIds.pro ? 'pro' : item?.price?.id === priceIds.family ? 'family' : null;
    const observedTime = micros(row.updated_at);
    const period = row.current_billing_period === null ? null : row.current_billing_period?.ends_at;
    if (!validId('sub', row.id) || !validId('ctm', row.customer_id) || !statuses.has(row.status)) {
      hold(entry, 'invalid-provider-subscription'); continue;
    }
    if (!validUser(user) || !profile || !tiers.includes(profile.tier)) {
      hold(entry, 'missing-or-invalid-existing-profile'); continue;
    }
    if (!Array.isArray(row.items) || row.items.length !== 1 || item.quantity !== 1 || !tier) {
      hold(entry, 'unsupported-price-or-items'); continue;
    }
    if (observedTime === null || period !== null && micros(period) === null
      || (row.status === 'active' || row.status === 'trialing') && period === null) {
      hold(entry, 'invalid-provider-timestamps'); continue;
    }
    if (customers.get(row.customer_id)?.size !== 1 || userCustomers.get(user)?.size !== 1) {
      hold(entry, 'ambiguous-customer-ownership'); continue;
    }
    if (existing && (existing.user_id !== user || existing.paddle_customer_id !== row.customer_id)) {
      hold(entry, 'local-identity-conflict'); continue;
    }
    // custom_data alone is not proof that a new customer belongs to this account.
    if (!anchors.some(anchor => anchor.user_id === user && anchor.paddle_customer_id === row.customer_id)) {
      hold(entry, 'no-corroborating-customer-link'); continue;
    }
    const after = { id: row.id, user_id: user, paddle_customer_id: row.customer_id, status: row.status,
      plan_id: item.price.id, current_period_end: period, last_event_occurred_at: row.updated_at,
      entitlement_tier: contribution(row.status, tier) };
    entry.tier = after.entitlement_tier;
    entry.status = row.status;
    if (!existing) {
      entry.action = 'insert';
      operations.push({ action: 'insert', before: null, after });
      continue;
    }
    const existingTier = existing.entitlement_tier ?? contribution(existing.status, profile.tier);
    entry.changedFields = ['status', 'plan_id'].filter(key => existing[key] !== after[key]);
    if (!sameTime(existing.current_period_end, period)) entry.changedFields.push('current_period_end');
    if (existingTier !== after.entitlement_tier) entry.changedFields.push('entitlement_tier');
    if (entry.changedFields.length === 0) continue;
    const localTime = micros(existing.last_event_occurred_at);
    if (localTime === null || observedTime <= localTime) {
      hold(entry, 'local-watermark-not-older'); continue;
    }
    entry.action = 'update';
    operations.push({ action: 'update', before: { ...existing }, after });
  }

  const proposedById = new Map(localById);
  for (const operation of operations) proposedById.set(operation.after.id, operation.after);
  const heldUsers = new Set(orderedSubscriptions.filter((_row, index) => review[index].action === 'review')
    .map(row => row.custom_data?.userId));
  const affectedUsers = new Set(operations.map(operation => operation.after.user_id));
  const projectedTiers = { unchanged: 0, changed: 0, heldForUnresolvedRows: 0 };
  for (const user of affectedUsers) {
    if (unresolvedUsers.has(user) || heldUsers.has(user)) { projectedTiers.heldForUnresolvedRows++; continue; }
    const profile = profileById.get(user);
    const strongest = Math.max(0, ...[...proposedById.values()].filter(row => row.user_id === user).map(row =>
      tiers.indexOf(contribution(row.status, row.entitlement_tier ?? profile.tier))));
    if (tiers[strongest] === profile.tier) projectedTiers.unchanged++; else projectedTiers.changed++;
  }
  const proposedInsertIds = new Set(operations.filter(operation => operation.action === 'insert').map(operation => operation.after.id));
  const open = transactions.filter(row => openStatuses.has(row.status));
  const fingerprint = createHash('sha256').update(JSON.stringify({
    subscriptions: sorted(subscriptions).map(normalizeSubscription),
    transactions: sorted(transactions).map(row => ({ id: row.id, status: row.status, updated: row.updated_at ?? null,
      user: row.custom_data?.userId ?? null, attempt: row.custom_data?.checkoutAttemptId ?? null,
      subscription: row.subscription_id ?? null, customer: row.customer_id ?? null,
      prices: row.items?.map(item => item.price?.id) ?? null })),
    local: sorted(local).map(row => ({ id: row.id, user: row.user_id, customer: row.paddle_customer_id,
      status: row.status, plan: row.plan_id, period: row.current_period_end ?? null,
      event: row.last_event_occurred_at ?? null, updated: row.updated_at ?? null, tier: row.entitlement_tier ?? null })),
    profiles: sorted(profiles).map(row => ({ id: row.id, tier: row.tier, updated: row.updated_at ?? null })), priceIds,
  })).digest('hex');
  return { operations, report: {
    version: 1, mode: 'dry-run', applyAllowed: false, mutationsPerformed: false, releaseApproved: false,
    atomicSnapshot: false, snapshotFingerprint: fingerprint,
    counts: { providerSubscriptions: subscriptions.length, localSubscriptions: local.length,
      proposedInserts: operations.filter(row => row.action === 'insert').length,
      proposedUpdates: operations.filter(row => row.action === 'update').length,
      unchangedSubscriptions: review.filter(row => row.action === 'unchanged').length,
      heldSubscriptions: review.filter(row => row.action === 'review').length },
    subscriptions: review, holds, projectedTiers,
    retainedLocalRows: { total: unmatched.length, providerFormatAbsent: unmatched.filter(row => validId('sub', row.id)).length,
      nonProviderFormat: unmatched.filter(row => !validId('sub', row.id)).length,
      repositoryFixtureSignature: unmatched.filter(fixtureSignature).length, automaticDeletes: 0 },
    transactions: { total: transactions.length, open: open.length,
      openByStatus: Object.fromEntries([...openStatuses].map(status => [status, open.filter(row => row.status === status).length])),
      legacyOpenWithoutAttempt: open.filter(row => !validUser(row.custom_data?.checkoutAttemptId)).length,
      completedMissingLocalSubscription: transactions.filter(row => row.status === 'completed' && row.subscription_id && !localById.has(row.subscription_id)).length,
      completedReferencesCoveredByProposedInserts: transactions.filter(row => row.status === 'completed'
        && proposedInsertIds.has(row.subscription_id) && row.custom_data?.userId === providerById.get(row.subscription_id)?.custom_data?.userId
        && row.customer_id === providerById.get(row.subscription_id)?.customer_id).length,
      automaticCancellations: 0 },
    requiredBeforeApply: ['reviewed-scope-and-approval', 'coordinated-legacy-admission-shutdown',
      'verified-ledger-schema-and-deletion-fences', 'fresh-provider-and-local-revalidation',
      'atomic-compare-and-write-with-account-locks', 'separate-legacy-row-and-checkout-disposition'],
  } };
}
