import assert from 'node:assert/strict';
import { setTimeout as pause } from 'node:timers/promises';
import { withLocalPostgres } from './localPostgresHarness.mjs';
import { fixtureBatch, fixtureEventTime, fixtureId, fixturePeriodEnd, fixturePrices, fixtureRequest, installAccountBillingFixture, resetAccountBillingFixture } from './fixtures/accountBillingPostgresFixture.mjs';
import { executeReviewedBillingInsert, findBillingInsertReceipt, verifyBillingInsertSchema } from './accountBillingInsertOperator.mjs';

if (process.argv.length !== 2) throw new Error('Local test accepts no connection or credential arguments');
const results = [];
await withLocalPostgres(async ({ connect }) => {
  const a = await connect(); const b = await connect(); const observer = await connect();
  const scalar = async (client, sql, params = []) => (await client.query(sql, params)).rows[0].value;
  const apply = (client, payload) => scalar(client, 'SELECT private.apply_account_billing_insert_batch($1::jsonb) AS value', [JSON.stringify(payload)]);
  const begin = client => client.query("BEGIN ISOLATION LEVEL READ COMMITTED; SET LOCAL lock_timeout='1500ms'; SET LOCAL statement_timeout='5s'");
  const count = table => scalar(observer, `SELECT count(*)::int AS value FROM ${table}`);
  const approvalFor = payload => ({ admissionShutdownConfirmed: true, requestId: payload.request_id,
    snapshotFingerprint: payload.snapshot_fingerprint, accountCount: payload.accounts.length,
    insertCount: payload.accounts.flatMap(account => account.inserts).length });
  const rejects = (run, code) => assert.rejects(run, error => error.code === code || error.message === code);
  const check = async (name, run) => {
    await resetAccountBillingFixture(observer);
    try { await run(); results.push({ name, passed: true }); console.log(`PASS ${name}`); }
    finally { await a.query('ROLLBACK'); await b.query('ROLLBACK'); }
  };
  const waitForBlock = async (waiting, blocker) => {
    const until = Date.now() + 3000;
    while (Date.now() < until) {
      const blocked = await scalar(observer, 'SELECT $2::int = ANY(pg_blocking_pids($1::int)) AS value', [waiting, blocker]);
      if (blocked) return;
      await pause(10);
    }
    assert.fail('Expected an observed PostgreSQL lock wait');
  };
  await installAccountBillingFixture(observer);
  const pidA = await scalar(a, 'SELECT pg_backend_pid() AS value');
  const pidB = await scalar(b, 'SELECT pg_backend_pid() AS value');
  assert.notEqual(pidA, pidB);
  assert.notEqual(pidA, await scalar(observer, 'SELECT pg_backend_pid() AS value'));
  console.log(`PostgreSQL ${await scalar(observer, "SELECT current_setting('server_version') AS value")}; independent sessions verified`);

  await check('profile lock fails fast without partial rows or receipt', async () => {
    await begin(a); await a.query("SELECT 1 FROM user_profiles WHERE id='owner' FOR UPDATE");
    await begin(b); await rejects(() => apply(b, fixtureBatch()), '55P03'); await b.query('ROLLBACK');
    assert.equal(await count('subscriptions'), 1); assert.equal(await count('private.account_billing_reconciliation_receipts'), 0);
  });
  await check('uncommitted webhook blocks; committed watermark invalidates old batch', async () => {
    const payload = fixtureBatch(); await begin(a);
    await a.query("SELECT public.process_paddle_subscription_event('webhook-new',$4,'owner',$1,$2,'active',$3,$5,'family')",
      [fixtureId('sub'), fixtureId('ctm'), fixturePrices.family, fixtureEventTime, fixturePeriodEnd]);
    await begin(b); await rejects(() => apply(b, payload), '55P03'); await b.query('ROLLBACK'); await a.query('COMMIT');
    await begin(b); await rejects(() => apply(b, payload), 'BILLING_RECONCILIATION_STALE'); await b.query('ROLLBACK');
    assert.equal(await count('subscriptions'), 1); assert.equal(await count('private.account_billing_reconciliation_receipts'), 0);
  });
  await check('real account deletion wins before reconciliation and cannot be resurrected', async () => {
    await resetAccountBillingFixture(observer, { canceled: true }); const payload = fixtureBatch({ canceled: true });
    await begin(a); await a.query("SELECT set_config('request.jwt.claims',$1,true)", [JSON.stringify({ sub: 'owner', email: 'local@example.test', role: 'authenticated' })]);
    await a.query('SELECT public.request_account_deletion()');
    await begin(b); await rejects(() => apply(b, payload), '55P03'); await b.query('ROLLBACK'); await a.query('COMMIT');
    await begin(b); await rejects(() => apply(b, payload), 'BILLING_RECONCILIATION_STALE'); await b.query('ROLLBACK');
    assert.equal(await count('user_profiles'), 0); assert.equal(await count('subscriptions'), 0);
    assert.equal(await count('private.account_deletion_jobs'), 1); assert.equal(await count('private.account_billing_reconciliation_receipts'), 0);
  });
  await check('real checkout intent blocks during and after admission', async () => {
    await begin(a); await a.query("SELECT public.begin_account_checkout('owner')");
    await begin(b); await rejects(() => apply(b, fixtureBatch()), '55P03'); await b.query('ROLLBACK'); await a.query('COMMIT');
    await begin(b); await rejects(() => apply(b, fixtureBatch()), 'BILLING_RECONCILIATION_PENDING_CHECKOUT'); await b.query('ROLLBACK');
    assert.equal(await count('subscriptions'), 1); assert.equal(await count('private.account_checkout_attempts'), 1);
  });
  await check('a newly committed subscription invalidates the complete before-image', async () => {
    const payload = fixtureBatch(); await begin(a);
    await a.query("SELECT public.process_paddle_subscription_event('extra-event',$4,'owner',$1,$2,'active',$3,$5,'pro')",
      [fixtureId('sub', 'z'), fixtureId('ctm'), fixturePrices.pro, fixtureEventTime, fixturePeriodEnd]); await a.query('COMMIT');
    await begin(b); await rejects(() => apply(b, payload), 'BILLING_RECONCILIATION_STALE'); await b.query('ROLLBACK');
    assert.equal(await count('subscriptions'), 2); assert.equal(await count('private.account_billing_reconciliation_receipts'), 0);
  });
  await check('identical concurrent requests wait for a single committed receipt', async () => {
    const payload = fixtureBatch(); await begin(a); assert.equal((await apply(a, payload)).replayed, false);
    await begin(b); const pending = apply(b, payload).then(value => ({ value }), error => ({ error }));
    await waitForBlock(pidB, pidA); await a.query('COMMIT'); const second = await pending;
    assert.equal(second.error, undefined); assert.equal(second.value.replayed, true); await b.query('COMMIT');
    assert.equal(await count('subscriptions'), 2); assert.equal(await count('private.account_billing_reconciliation_receipts'), 1);
  });
  await check('receipt wait times out without poisoning a later exact retry', async () => {
    const payload = fixtureBatch(); await begin(a); await apply(a, payload);
    await begin(b); await rejects(() => apply(b, payload), '55P03'); await b.query('ROLLBACK'); await a.query('COMMIT');
    await begin(b); assert.equal((await apply(b, payload)).replayed, true); await b.query('COMMIT');
    assert.equal(await count('private.account_billing_reconciliation_receipts'), 1);
  });
  await check('a rolled-back receipt permits the waiting request to apply exactly once', async () => {
    const payload = fixtureBatch(); await begin(a); await apply(a, payload);
    await begin(b); const pending = apply(b, payload).then(value => ({ value }), error => ({ error }));
    await waitForBlock(pidB, pidA); await a.query('ROLLBACK'); const second = await pending;
    assert.equal(second.error, undefined); assert.equal(second.value.replayed, false); await b.query('COMMIT');
    assert.equal(await count('subscriptions'), 2); assert.equal(await count('private.account_billing_reconciliation_receipts'), 1);
  });
  await check('distinct concurrent batches cannot both insert the same missing ID', async () => {
    const payload = fixtureBatch(); await begin(a); await apply(a, payload);
    const other = structuredClone(payload); other.request_id = '22222222-2222-4222-8222-222222222222';
    await begin(b); await rejects(() => apply(b, other), '55P03'); await b.query('ROLLBACK'); await a.query('COMMIT');
    await begin(b); await rejects(() => apply(b, other), 'BILLING_RECONCILIATION_STALE'); await b.query('ROLLBACK');
    assert.equal(await count('private.account_billing_reconciliation_receipts'), 1);
  });
  await check('same request ID with different content conflicts after concurrent commit', async () => {
    const payload = fixtureBatch(); await begin(a); await apply(a, payload);
    const other = structuredClone(payload); other.snapshot_fingerprint = 'b'.repeat(64);
    await begin(b); const pending = apply(b, other).then(value => ({ value }), error => ({ error }));
    await waitForBlock(pidB, pidA); await a.query('COMMIT'); const second = await pending;
    assert.equal(second.error?.message, 'BILLING_RECONCILIATION_REQUEST_CONFLICT'); await b.query('ROLLBACK');
    assert.equal(await count('subscriptions'), 2);
  });
  await check('new webhook proceeds after maintenance commit without loss of the inserted row', async () => {
    await begin(a); await apply(a, fixtureBatch());
    await begin(b); const pending = b.query("SELECT public.process_paddle_subscription_event('later-event',$4,'owner',$1,$2,'canceled',$3,NULL,'pro')",
      [fixtureId('sub', 'b'), fixtureId('ctm'), fixturePrices.pro, fixtureEventTime]).then(value => ({ value }), error => ({ error }));
    await waitForBlock(pidB, pidA); await a.query('COMMIT'); const result = await pending;
    assert.equal(result.error, undefined); await b.query('COMMIT');
    assert.equal(await scalar(observer, 'SELECT status AS value FROM subscriptions WHERE id=$1', [fixtureId('sub', 'b')]), 'canceled');
    assert.equal(await scalar(observer, "SELECT tier AS value FROM user_profiles WHERE id='owner'"), 'family');
    assert.equal(await count('subscriptions'), 2);
    assert.equal(await scalar(observer, 'SELECT request_id::text AS value FROM private.account_billing_reconciliation_receipts'), fixtureRequest);
  });
  await check('operator verifies real schema, commits, preserves quotas and recognizes exact replay', async () => {
    const payload = fixtureBatch(); assert.equal(await verifyBillingInsertSchema(a), true);
    const result = await executeReviewedBillingInsert(a, payload, approvalFor(payload));
    assert.equal(result.status, 'committed'); assert.equal(result.mutationsPerformed, true);
    assert.equal(await scalar(observer, "SELECT cloud_requests_used AS value FROM ai_monthly_usage WHERE user_id='owner'"), 19);
    assert.equal((await executeReviewedBillingInsert(b, payload, approvalFor(payload))).status, 'already-committed');
    assert.equal((await findBillingInsertReceipt(observer, payload)).insertedCount, 1);
  });
  await check('operator refuses a weakened installed private function grant', async () => {
    await observer.query('GRANT EXECUTE ON FUNCTION private.apply_account_billing_insert_batch(jsonb) TO authenticated');
    try {
      const payload = fixtureBatch(); const result = await executeReviewedBillingInsert(a, payload, approvalFor(payload));
      assert.equal(result.code, 'schema-unverified'); assert.equal(await count('subscriptions'), 1);
    } finally { await observer.query('REVOKE EXECUTE ON FUNCTION private.apply_account_billing_insert_batch(jsonb) FROM authenticated'); }
  });
  await check('operator refuses an altered critical database function body', async () => {
    const original = await scalar(observer, "SELECT pg_get_functiondef('private.billing_reconciliation_keys(jsonb,text[])'::regprocedure) AS value");
    await observer.query('CREATE OR REPLACE FUNCTION private.billing_reconciliation_keys(value jsonb, keys text[]) RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path=\'\' AS $$ SELECT true $$');
    try {
      const payload = fixtureBatch(); const result = await executeReviewedBillingInsert(a, payload, approvalFor(payload));
      assert.equal(result.code, 'schema-unverified'); assert.equal(await count('private.account_billing_reconciliation_receipts'), 0);
    } finally { await observer.query(original); }
  });
  await check('operator rolls back cleanly when an account is busy', async () => {
    await begin(a); await a.query("SELECT 1 FROM user_profiles WHERE id='owner' FOR UPDATE");
    const payload = fixtureBatch(); const result = await executeReviewedBillingInsert(b, payload, approvalFor(payload));
    assert.equal(result.code, 'billing-busy'); assert.equal(result.discardConnection, false);
    assert.equal(await count('private.account_billing_reconciliation_receipts'), 0);
  });
  await check('lost COMMIT acknowledgement is unconfirmed, then recovered through a new connection receipt', async () => {
    const dedicated = await connect(); const payload = fixtureBatch();
    const losingAcknowledgement = { query: async (...args) => {
      const result = await dedicated.query(...args);
      if (args[0] === 'COMMIT') throw new Error('simulated transport loss after durable commit');
      return result;
    } };
    try {
      const result = await executeReviewedBillingInsert(losingAcknowledgement, payload, approvalFor(payload));
      assert.equal(result.status, 'commit-unconfirmed'); assert.equal(result.requiresReceiptLookup, true);
      assert.equal(result.discardConnection, true); assert.equal(Object.hasOwn(result, 'mutationsPerformed'), false);
      const recovery = await connect();
      try {
        const confirmation = await findBillingInsertReceipt(recovery, payload);
        assert.equal(confirmation.requestId, payload.request_id); assert.equal(await count('subscriptions'), 2);
        const different = structuredClone(payload); different.snapshot_fingerprint = 'b'.repeat(64);
        assert.equal(await findBillingInsertReceipt(recovery, different), null);
      } finally { await recovery.end(); }
    } finally { await dedicated.end(); }
  });
});
console.log(JSON.stringify({ localOnly: true, passed: results.length, failed: 0, cases: results, serverStopped: true }));
