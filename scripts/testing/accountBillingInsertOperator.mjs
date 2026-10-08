import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { readAccountBillingInsertEvidence } from './accountBillingReadiness.mjs';
import { prepareAccountBillingInsertBatch } from './accountBillingInsertBatch.mjs';

const migrations = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../supabase/migrations');
const normalize = source => source.replace(/\r\n/g, '\n').trim();
const contracts = [
  ['20260908000400_guard_billing_reconciliation_inserts.sql', 'private.apply_account_billing_insert_batch(jsonb)', true, false],
  ['20260908000400_guard_billing_reconciliation_inserts.sql', 'private.billing_reconciliation_keys(jsonb,text[])', false, false],
  ['20260908000400_guard_billing_reconciliation_inserts.sql', 'private.billing_reconciliation_timestamp(jsonb,boolean)', false, false],
  ['20260908000300_track_all_account_subscriptions.sql', 'private.process_paddle_subscription_event_before_deletion_fence(text,timestamptz,text,text,text,text,text,timestamptz,text)', true, false],
  ['20260908000200_fence_account_billing_events.sql', 'public.process_paddle_subscription_event(text,timestamptz,text,text,text,text,text,timestamptz,text,text)', true, true],
  ['20260908000100_queue_account_deletion_cleanup.sql', 'public.begin_account_checkout(text)', true, true],
];

/** GET-only preparation. Only review is loggable; payload stays operator-private. */
export async function prepareBillingOperatorReview(env, expectedProjectRef, request = fetch) {
  const evidence = await readAccountBillingInsertEvidence(env, expectedProjectRef, request);
  const prepared = prepareAccountBillingInsertBatch({ ...evidence, requestId: randomUUID() });
  return { payload: prepared.payload, review: { ...prepared.report, requestId: prepared.payload.request_id,
    expectedProjectRef, providerEnvironment: evidence.report.configuration.serverEnvironment,
    admissionShutdownConfirmed: false, databaseConnectionBound: false, schemaVerified: false } };
}

/** Compare critical installed bodies and ACLs with the reviewed local migrations. */
export async function verifyBillingInsertSchema(client) {
  for (const [file, signature, definer, service] of contracts) {
    const name = signature.slice(0, signature.indexOf('('));
    const source = await readFile(path.join(migrations, file), 'utf8');
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = [...source.matchAll(new RegExp(`CREATE (?:OR REPLACE )?FUNCTION ${escaped}\\([\\s\\S]*?AS \\$\\$([\\s\\S]*?)\\$\\$;`, 'g'))];
    if (matches.length !== 1) return false;
    const { rows } = await client.query(`SELECT prosrc, prosecdef, proconfig,
      has_function_privilege('anon',oid,'EXECUTE') AS anon,
      has_function_privilege('authenticated',oid,'EXECUTE') AS authenticated,
      has_function_privilege('service_role',oid,'EXECUTE') AS service
      FROM pg_proc WHERE oid=to_regprocedure($1)`, [signature]);
    const installed = rows[0];
    if (rows.length !== 1 || normalize(installed.prosrc) !== normalize(matches[0][1]) || installed.prosecdef !== definer
      || installed.anon || installed.authenticated || installed.service !== service
      || !installed.proconfig?.includes('search_path=""')) return false;
  }
  const { rows } = await client.query(`SELECT
    (SELECT relrowsecurity FROM pg_class WHERE oid='public.subscriptions'::regclass)
    AND EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid='public.subscriptions'::regclass AND attname='entitlement_tier' AND attnotnull)
    AND EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.subscriptions'::regclass AND contype='p'
      AND conkey=ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid='public.subscriptions'::regclass AND attname='id')])
    AND EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='public.subscriptions'::regclass AND contype='f'
      AND confrelid='public.user_profiles'::regclass AND confdeltype='c'
      AND conkey=ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid='public.subscriptions'::regclass AND attname='user_id')]
      AND confkey=ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid='public.user_profiles'::regclass AND attname='id')])
    AND NOT EXISTS(SELECT 1 FROM pg_index i JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=i.indkey[0]
      WHERE i.indrelid='public.subscriptions'::regclass AND i.indisunique AND i.indnkeyatts=1 AND a.attname='user_id')
    AND to_regclass('private.account_deletion_jobs') IS NOT NULL
    AND to_regclass('private.account_checkout_attempts') IS NOT NULL
    AND NOT has_table_privilege('anon','private.account_billing_reconciliation_receipts','SELECT,INSERT,UPDATE,DELETE')
    AND NOT has_table_privilege('authenticated','private.account_billing_reconciliation_receipts','SELECT,INSERT,UPDATE,DELETE')
    AND NOT has_table_privilege('service_role','private.account_billing_reconciliation_receipts','SELECT,INSERT,UPDATE,DELETE') AS ready`);
  return rows[0]?.ready === true;
}

const preserveSql = `SELECT encode(sha256(convert_to(jsonb_build_object(
  'profiles',(SELECT jsonb_agg(to_jsonb(p) ORDER BY id) FROM user_profiles p WHERE id=ANY($1::text[])),
  'quota',(SELECT jsonb_agg(to_jsonb(q) ORDER BY user_id) FROM ai_monthly_usage q WHERE user_id=ANY($1::text[])),
  'overrides',(SELECT jsonb_agg(to_jsonb(o) ORDER BY id) FROM subscription_overrides o WHERE user_id=ANY($1::text[])),
  'existing',(SELECT jsonb_agg(to_jsonb(s) ORDER BY id) FROM subscriptions s WHERE user_id=ANY($1::text[]) AND NOT(id=ANY($2::text[])))
)::text,'UTF8')),'hex') AS digest`;
const receiptSql = `SELECT request_id::text AS "requestId", inserted_count AS "insertedCount", completed_at AS "completedAt"
  FROM private.account_billing_reconciliation_receipts WHERE request_id=$1::uuid
  AND payload_hash=encode(sha256(convert_to($2::jsonb::text,'UTF8')),'hex')`;

/** Read-only recovery on a NEW connection after an uncertain COMMIT acknowledgement. */
export async function findBillingInsertReceipt(client, payload) {
  const result = await client.query(receiptSql, [payload.request_id, JSON.stringify(payload)]);
  return result.rows.length === 1 ? result.rows[0] : null;
}

/**
 * Operator transaction kernel only: no CLI, connection factory or network defaults.
 * Local tests may supply a client directly. Hosted operators must use the target-
 * bound accountBillingTargetConnection wrapper and explicit scoped approval.
 */
export async function executeReviewedBillingInsert(client, payload, approval) {
  const accounts = payload?.accounts;
  if (!approval || payload?.version !== 1 || typeof payload?.request_id !== 'string'
    || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(payload.request_id)
    || approval.admissionShutdownConfirmed !== true || approval.requestId !== payload?.request_id
    || approval.snapshotFingerprint !== payload?.snapshot_fingerprint || !/^[a-f0-9]{64}$/.test(approval.snapshotFingerprint ?? '')
    || !Array.isArray(accounts) || accounts.length < 1 || accounts.length > 10
    || approval.accountCount !== accounts.length || accounts.some(row => !row || !Array.isArray(row.inserts) || row.inserts.length < 1
      || row.inserts.some(item => !item || typeof item.id !== 'string'))) {
    return { status: 'rejected', code: 'approval-required', mutationsPerformed: false };
  }
  const inserts = accounts.flatMap(row => row.inserts);
  if (inserts.length > 20 || approval.insertCount !== inserts.length) return { status: 'rejected', code: 'approval-scope-mismatch', mutationsPerformed: false };
  let begun = false;
  let committing = false;
  try {
    await client.query("BEGIN ISOLATION LEVEL READ COMMITTED; SET LOCAL lock_timeout='2s'; SET LOCAL statement_timeout='15s'; SET LOCAL idle_in_transaction_session_timeout='20s'");
    begun = true;
    if (!await verifyBillingInsertSchema(client)) throw new Error('schema-unverified');
    const preserveParams = [accounts.map(row => row.user_id), inserts.map(row => row.id)];
    const before = (await client.query(preserveSql, preserveParams)).rows[0].digest;
    const receipt = (await client.query('SELECT private.apply_account_billing_insert_batch($1::jsonb) AS receipt', [JSON.stringify(payload)])).rows[0]?.receipt;
    if (!receipt || receipt.requestId !== payload.request_id || receipt.insertedCount !== inserts.length || typeof receipt.replayed !== 'boolean') {
      throw new Error('receipt-mismatch');
    }
    if (!receipt.replayed) {
      const after = (await client.query(preserveSql, preserveParams)).rows[0].digest;
      if (before !== after) throw new Error('preservation-mismatch');
      const { rows } = await client.query(`SELECT count(*)=$2::int AND bool_and(
        (s.id,s.user_id,s.paddle_customer_id,s.status,s.plan_id,s.current_period_end,s.last_event_occurred_at,s.entitlement_tier)
        IS NOT DISTINCT FROM (w.id,w.user_id,w.paddle_customer_id,w.status,w.plan_id,w.current_period_end,w.last_event_occurred_at,w.entitlement_tier)) AS matches
        FROM jsonb_populate_recordset(NULL::public.subscriptions,$1::jsonb) w LEFT JOIN public.subscriptions s ON s.id=w.id`,
      [JSON.stringify(inserts), inserts.length]);
      if (rows[0]?.matches !== true) throw new Error('insert-verification-failed');
    }
    committing = true;
    await client.query('COMMIT');
    return { status: receipt.replayed ? 'already-committed' : 'committed', receipt, mutationsPerformed: !receipt.replayed };
  } catch (error) {
    if (committing) return { status: 'commit-unconfirmed', requestId: payload.request_id, discardConnection: true, requiresReceiptLookup: true };
    let discardConnection = !begun;
    if (begun) try { await client.query('ROLLBACK'); } catch { discardConnection = true; }
    const safe = ['schema-unverified', 'receipt-mismatch', 'preservation-mismatch', 'insert-verification-failed'];
    const code = safe.includes(error?.message) ? error.message
      : /^BILLING_RECONCILIATION_[A-Z_]+$/.test(error?.message ?? '') ? error.message
        : error?.code === '55P03' ? 'billing-busy' : 'execution-failed';
    return { status: 'rejected', code, mutationsPerformed: false, discardConnection };
  }
}
