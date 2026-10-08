import { planAccountBillingReconciliation, parseBillingTimestampMicros } from './accountBillingReconciliation.mjs';

const fields = ['id', 'user_id', 'paddle_customer_id', 'status', 'plan_id', 'current_period_end',
  'last_event_occurred_at', 'entitlement_tier'];
const pick = (row, keys) => Object.fromEntries(keys.map(key => [key, row[key]]));
const order = rows => [...rows].sort((a, b) => a.id.localeCompare(b.id));
const fail = () => { throw new Error('Billing insert batch requires fresh, stable, insert-only ledger evidence'); };
const userId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);

/** Private payload preparation only. No transport, persistence, approval or apply path. */
export function prepareAccountBillingInsertBatch({ previousSnapshot, snapshot, priceIds, requestId, observedAt, now = Date.now() }) {
  if (typeof requestId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(requestId)
    || !Number.isSafeInteger(now)) fail();
  const observed = parseBillingTimestampMicros(observedAt);
  if (observed === null || observed < BigInt(now - 300_000) * 1000n || observed > BigInt(now + 30_000) * 1000n) fail();
  const previous = planAccountBillingReconciliation(previousSnapshot, priceIds);
  const current = planAccountBillingReconciliation(snapshot, priceIds);
  const { operations, report } = current;
  if (previous.report.snapshotFingerprint !== report.snapshotFingerprint || report.counts.heldSubscriptions !== 0
    || operations.length < 1 || operations.length > 20 || operations.some(row => row.action !== 'insert')
    || report.projectedTiers.changed !== 0 || report.projectedTiers.heldForUnresolvedRows !== 0) fail();

  const users = [...new Set(operations.map(row => row.after.user_id))].sort();
  if (users.length > 10) fail();
  const accounts = users.map(user => {
    const profile = snapshot.profiles.find(row => row.id === user);
    const before = order(snapshot.local.filter(row => row.user_id === user));
    if (!userId(user) || !profile || parseBillingTimestampMicros(profile.updated_at) === null
      || before.length < 1 || before.length > 100 || before.some(row =>
        !['free', 'pro', 'family'].includes(row.entitlement_tier)
        || parseBillingTimestampMicros(row.updated_at) === null
        || row.current_period_end !== null && parseBillingTimestampMicros(row.current_period_end) === null
        || row.last_event_occurred_at !== null && parseBillingTimestampMicros(row.last_event_occurred_at) === null)) fail();
    const inserts = order(operations.filter(row => row.after.user_id === user).map(row => row.after));
    if (inserts.some(row => parseBillingTimestampMicros(row.last_event_occurred_at) > observed + 30_000_000n)) fail();
    return { user_id: user, tier: profile.tier, updated_at: profile.updated_at,
      before: before.map(row => pick(row, [...fields, 'updated_at'])), inserts: inserts.map(row => pick(row, fields)) };
  });
  return {
    payload: { version: 1, request_id: requestId, observed_at: observedAt,
      snapshot_fingerprint: report.snapshotFingerprint, price_ids: pick(priceIds, ['pro', 'family']), accounts },
    report: { mode: 'prepared-only', applyAllowed: false, mutationsPerformed: false,
      accountCount: accounts.length, insertCount: operations.length, tierChanges: 0,
      snapshotFingerprint: report.snapshotFingerprint },
  };
}
