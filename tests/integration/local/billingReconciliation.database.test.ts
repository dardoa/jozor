import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { prepareAccountBillingInsertBatch } from '../../../scripts/testing/accountBillingInsertBatch.mjs';

const id = (prefix: string, suffix = 'a') => `${prefix}_${suffix.repeat(26)}`;
const prices = { pro: id('pri'), family: id('pri', 'b') };
const time = '2026-09-08T10:00:00.000001Z';
const requestId = '11111111-1111-4111-8111-111111111111';
const account = (user = 'owner', suffix = 'a', missing = 'b') => {
  const family = { id: id('sub', suffix), user_id: user, paddle_customer_id: id('ctm', suffix), status: 'active',
    plan_id: prices.family, entitlement_tier: 'family', current_period_end: '2026-10-01T00:00:00Z', last_event_occurred_at: time, updated_at: time };
  const { updated_at: ignored, ...pro } = family;
  expect(ignored).toBe(time);
  return { user_id: user, tier: 'family', updated_at: time, before: [family],
    inserts: [{ ...pro, id: id('sub', missing), entitlement_tier: 'pro', plan_id: prices.pro }] };
};
const batch = () => ({ version: 1, request_id: requestId, observed_at: new Date().toISOString(),
  snapshot_fingerprint: 'a'.repeat(64), price_ids: prices, accounts: [account()] });

describe('operator-only insert reconciliation on PostgreSQL', () => {
  let db: PGlite;
  const read = (file: string) => readFileSync(path.resolve('supabase/migrations', file), 'utf8');
  const scalar = async <T,>(sql: string, params: unknown[] = []) => (await db.query<{ value: T }>(sql, params)).rows[0].value;
  const apply = (payload: unknown) => scalar<{ requestId: string; insertedCount: number; replayed: boolean }>(
    'SELECT private.apply_account_billing_insert_batch($1::jsonb) AS value', [JSON.stringify(payload)]);
  const state = () => scalar(`SELECT jsonb_build_object(
    'profiles', (SELECT jsonb_agg(to_jsonb(p) ORDER BY id) FROM user_profiles p),
    'subscriptions', (SELECT jsonb_agg(to_jsonb(s) ORDER BY id) FROM subscriptions s),
    'quota', (SELECT jsonb_agg(to_jsonb(q) ORDER BY user_id) FROM ai_monthly_usage q),
    'overrides', (SELECT jsonb_agg(to_jsonb(o) ORDER BY id) FROM subscription_overrides o),
    'events', (SELECT jsonb_agg(to_jsonb(e) ORDER BY event_id) FROM private.processed_paddle_webhook_events e),
    'receipts', (SELECT jsonb_agg(to_jsonb(r) ORDER BY request_id) FROM private.account_billing_reconciliation_receipts r)
  ) AS value`);
  const reject = async (payload: unknown, reason: RegExp) => {
    const before = await state();
    await db.exec('SAVEPOINT rejected_batch');
    await expect(apply(payload)).rejects.toThrow(reason);
    await db.exec('ROLLBACK TO SAVEPOINT rejected_batch');
    expect(await state()).toEqual(before);
  };
  const seed = async (value = account()) => {
    await db.query('INSERT INTO user_profiles(id, tier, updated_at) VALUES ($1, $2, $3)', [value.user_id, value.tier, time]);
    const row = value.before[0];
    await db.query(`INSERT INTO subscriptions(id,user_id,paddle_customer_id,status,plan_id,current_period_end,last_event_occurred_at,entitlement_tier,updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [row.id, row.user_id, row.paddle_customer_id, row.status, row.plan_id,
      row.current_period_end, row.last_event_occurred_at, row.entitlement_tier, row.updated_at]);
    await db.query("INSERT INTO ai_monthly_usage(user_id,cloud_requests_used,cloud_requests_limit,reset_at) VALUES ($1,19,77,'2026-10-20')", [value.user_id]);
  };
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA private; REVOKE ALL ON SCHEMA private FROM PUBLIC;
      CREATE FUNCTION public.current_user_id_text() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_setting('test.user_id', true) $$;
      CREATE TABLE user_profiles (id text PRIMARY KEY, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
      CREATE TABLE private.processed_paddle_webhook_events(event_id text PRIMARY KEY, occurred_at timestamptz);
      CREATE TABLE private.account_deletion_jobs(user_id text, requested_at timestamptz, subscription_ids text[], completed_at timestamptz);
      CREATE TABLE private.account_checkout_attempts(id uuid PRIMARY KEY, user_id text, requested_at timestamptz, resolved_at timestamptz);`);
    await db.exec(read('20260530190320_20260530000001_billing_subscriptions.sql'));
    await db.exec('ALTER TABLE subscriptions ADD COLUMN last_event_occurred_at timestamptz');
    const billing = read('20260531195055_billing_fixes.sql');
    const start = billing.indexOf('CREATE OR REPLACE FUNCTION public.process_paddle_subscription_event(');
    const end = billing.indexOf('-- 17. AI usage quota reservation', start);
    expect(start).toBeGreaterThan(-1); expect(end).toBeGreaterThan(start);
    await db.exec(billing.slice(start, end));
    await db.exec(read('20260908000200_fence_account_billing_events.sql'));
    await db.exec(read('20260908000300_track_all_account_subscriptions.sql'));
    await db.exec(`CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT NULL::uuid $$;
      CREATE TABLE admin_users(user_id uuid, is_active boolean);`);
    await db.exec(read('20260603173545_admin_subscription_overrides.sql'));
    await db.exec(read('20260908000400_guard_billing_reconciliation_inserts.sql'));
  });
  afterAll(async () => { await db?.close(); });
  beforeEach(async () => { await db.exec('BEGIN'); await seed(); });
  afterEach(async () => { await db.exec('ROLLBACK; RESET ROLE'); });

  it('inserts the missing subscription only, preserving profile, existing row, quotas and unrelated synthetic records exactly', async () => {
    await db.exec("INSERT INTO user_profiles(id,tier) VALUES ('unrelated','pro'); INSERT INTO subscriptions(id,user_id,status,plan_id) VALUES ('synthetic-id','unrelated','active','legacy-price')");
    const before = await scalar(`SELECT jsonb_build_object('profile',(SELECT to_jsonb(p) FROM user_profiles p WHERE id='owner'),
      'existing',(SELECT to_jsonb(s) FROM subscriptions s WHERE id=$1), 'quota',(SELECT to_jsonb(q) FROM ai_monthly_usage q WHERE user_id='owner'),
      'legacy',(SELECT to_jsonb(s) FROM subscriptions s WHERE id='synthetic-id')) AS value`, [id('sub')]);
    expect(await apply(batch())).toMatchObject({ requestId, insertedCount: 1, replayed: false });
    expect(await scalar(`SELECT jsonb_build_object('profile',(SELECT to_jsonb(p) FROM user_profiles p WHERE id='owner'),
      'existing',(SELECT to_jsonb(s) FROM subscriptions s WHERE id=$1), 'quota',(SELECT to_jsonb(q) FROM ai_monthly_usage q WHERE user_id='owner'),
      'legacy',(SELECT to_jsonb(s) FROM subscriptions s WHERE id='synthetic-id')) AS value`, [id('sub')])).toEqual(before);
    expect(await scalar('SELECT entitlement_tier AS value FROM subscriptions WHERE id=$1', [id('sub', 'b')])).toBe('pro');
    expect(await scalar('SELECT count(*)::int AS value FROM private.processed_paddle_webhook_events')).toBe(0);
  });
  it('consumes a real planner batch, not an echo mock or fabricated webhook', async () => {
    const source = account();
    const snapshot = { profiles: [{ id: source.user_id, tier: source.tier, updated_at: source.updated_at }], local: source.before, transactions: [],
      subscriptions: [...source.before, ...source.inserts].map(row => ({ id: row.id, status: row.status, customer_id: row.paddle_customer_id,
        custom_data: { userId: row.user_id }, updated_at: row.last_event_occurred_at, current_billing_period: { ends_at: row.current_period_end },
        items: [{ price: { id: row.plan_id }, quantity: 1 }] })) };
    const { payload } = prepareAccountBillingInsertBatch({ previousSnapshot: structuredClone(snapshot), snapshot, priceIds: prices,
      requestId, observedAt: new Date().toISOString() });
    expect(await apply(payload)).toMatchObject({ insertedCount: 1, replayed: false });
  });
  it('leaves manual entitlement overrides unchanged', async () => {
    await db.exec("INSERT INTO subscription_overrides(user_id,tier,source,reason,expires_at) VALUES ('owner','family','manual_comp','retained','2026-12-01')");
    const before = await scalar('SELECT to_jsonb(o) AS value FROM subscription_overrides o');
    await apply(batch());
    expect(await scalar('SELECT to_jsonb(o) AS value FROM subscription_overrides o')).toEqual(before);
  });
  it.each(['repeatable read', 'serializable'])('rejects stale-snapshot isolation: %s', async isolation => {
    await db.exec(`ROLLBACK; BEGIN ISOLATION LEVEL ${isolation}`); await seed();
    await reject(batch(), /BILLING_RECONCILIATION_ISOLATION_REQUIRED/);
  });
  it('applies two accounts atomically and records one private receipt', async () => {
    const second = account('other', 'c', 'd'); await seed(second);
    const payload = batch(); payload.accounts.unshift(second);
    expect(await apply(payload)).toMatchObject({ insertedCount: 2 });
    expect(await scalar('SELECT count(*)::int AS value FROM subscriptions')).toBe(4);
    expect(await scalar('SELECT count(*)::int AS value FROM private.account_billing_reconciliation_receipts')).toBe(1);
  });
  it('retries exactly once without overwriting a subsequent real webhook state', async () => {
    const payload = batch(); await apply(payload);
    await db.query("SELECT public.process_paddle_subscription_event('real-event','2026-09-09','owner',$1,$2,'canceled',$3,NULL,'pro')", [id('sub', 'b'), id('ctm'), prices.pro]);
    const before = await state();
    expect(await apply(payload)).toMatchObject({ replayed: true, insertedCount: 1 });
    expect(await state()).toEqual(before);
  });
  it('refuses idempotency-key reuse with a different payload', async () => {
    const payload = batch(); await apply(payload); payload.snapshot_fingerprint = 'b'.repeat(64);
    await reject(payload, /BILLING_RECONCILIATION_REQUEST_CONFLICT/);
  });
  it.each(['expired', 'future'])('refuses a %s first execution with no receipt left behind', async kind => {
    const payload = batch(); payload.observed_at = new Date(Date.now() + (kind === 'expired' ? -301_000 : 31_000)).toISOString();
    await reject(payload, /BILLING_RECONCILIATION_EXPIRED/);
  });
  it.each(['profile-tier', 'profile-time', 'row-time', 'row-status', 'row-period', 'row-plan', 'row-tier', 'row-customer', 'row-owner', 'row-event', 'row-removed', 'extra-row', 'missing-profile'])
    ('rejects changed before-images: %s', async kind => {
      if (kind === 'profile-tier') await db.exec("UPDATE user_profiles SET tier='pro' WHERE id='owner'");
      if (kind === 'profile-time') await db.exec("UPDATE user_profiles SET updated_at=updated_at + interval '1 microsecond' WHERE id='owner'");
      const changes: Record<string, string> = { 'row-time': "updated_at=updated_at + interval '1 microsecond'", 'row-status': "status='paused'",
        'row-period': "current_period_end=current_period_end + interval '1 second'", 'row-plan': "plan_id='other'", 'row-tier': "entitlement_tier='pro'",
        'row-customer': "paddle_customer_id='other'", 'row-event': "last_event_occurred_at=last_event_occurred_at + interval '1 microsecond'" };
      if (changes[kind]) await db.exec(`UPDATE subscriptions SET ${changes[kind]}`);
      if (kind === 'row-owner') { await db.exec("INSERT INTO user_profiles(id) VALUES ('other'); UPDATE subscriptions SET user_id='other'"); }
      if (kind === 'row-removed') await db.exec('DELETE FROM subscriptions');
      if (kind === 'extra-row') await db.exec("INSERT INTO subscriptions(id,user_id,status,plan_id) VALUES ('extra','owner','active','p')");
      if (kind === 'missing-profile') await db.exec("DELETE FROM user_profiles WHERE id='owner'");
      await reject(batch(), /BILLING_RECONCILIATION_STALE/);
    });
  it.each(['pending', 'historical', 'retired-id'])('refuses deletion history/retirement: %s', async kind => {
    await db.query("INSERT INTO private.account_deletion_jobs VALUES ($1,'2026-09-01',$2,$3)",
      [kind === 'retired-id' ? 'old-owner' : 'owner', kind === 'retired-id' ? [id('sub', 'b')] : [], kind === 'historical' ? time : null]);
    await reject(batch(), /BILLING_RECONCILIATION_DELETION_FENCE/);
  });
  it('rejects unresolved local checkout attempts and allows a resolved attempt without modifying it', async () => {
    await db.query("INSERT INTO private.account_checkout_attempts VALUES ($1,'owner',now(),NULL)", [requestId]);
    await reject(batch(), /BILLING_RECONCILIATION_PENDING_CHECKOUT/);
    await db.exec('UPDATE private.account_checkout_attempts SET resolved_at=now()');
    expect(await apply(batch())).toMatchObject({ insertedCount: 1 });
    expect(await scalar('SELECT count(*)::int AS value FROM private.account_checkout_attempts WHERE resolved_at IS NOT NULL')).toBe(1);
  });
  it.each(['different-customer', 'customer-used-by-other', 'subscription-used-by-other'])('rejects identity conflicts: %s', async kind => {
    const payload = batch();
    if (kind === 'different-customer') payload.accounts[0].inserts[0].paddle_customer_id = id('ctm', 'z');
    else {
      await db.exec("INSERT INTO user_profiles(id) VALUES ('other')");
      await db.query("INSERT INTO subscriptions(id,user_id,paddle_customer_id,status,plan_id) VALUES ($1,'other',$2,'canceled',$3)",
        [kind === 'subscription-used-by-other' ? id('sub', 'b') : id('sub', 'z'), kind === 'customer-used-by-other' ? id('ctm') : id('ctm', 'z'), prices.pro]);
    }
    await reject(payload, /BILLING_RECONCILIATION_(IDENTITY_CONFLICT|STALE)/);
  });
  it('rejects changes to the effective tier instead of changing a profile or manual quota', async () => {
    await db.exec("UPDATE user_profiles SET tier='pro'; UPDATE subscriptions SET plan_id='" + prices.pro + "',entitlement_tier='pro'");
    const payload = batch(); payload.accounts[0].tier = 'pro';
    payload.accounts[0].before[0].plan_id = prices.pro; payload.accounts[0].before[0].entitlement_tier = 'pro';
    payload.accounts[0].inserts[0].plan_id = prices.family; payload.accounts[0].inserts[0].entitlement_tier = 'family';
    await reject(payload, /BILLING_RECONCILIATION_TIER_CHANGE/);
  });
  it('rolls back the first account insert and receipt on a late second-account failure', async () => {
    const other = account('z-other', 'c', 'd'); await seed(other);
    const payload = batch(); payload.accounts.push(other);
    await db.exec("UPDATE user_profiles SET tier='pro' WHERE id='z-other'");
    await reject(payload, /BILLING_RECONCILIATION_STALE/);
  });
  it('rolls back every insert and receipt if a database trigger fails', async () => {
    await db.exec(`CREATE FUNCTION fail_insert() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'injected failure'; END $$;
      CREATE TRIGGER fail_insert BEFORE INSERT ON subscriptions FOR EACH ROW EXECUTE FUNCTION fail_insert()`);
    await reject(batch(), /injected failure/);
  });
  it.each(['trialing', 'paused', 'past_due', 'canceled'])('preserves the active Family entitlement when the missing subscription is %s', async status => {
    const payload = batch(); const row = payload.accounts[0].inserts[0]; row.status = status;
    if (status !== 'trialing') { row.entitlement_tier = 'free'; Object.assign(row, { current_period_end: null }); }
    await apply(payload);
    expect(await scalar('SELECT tier AS value FROM user_profiles WHERE id=$1', ['owner'])).toBe('family');
    expect(await scalar('SELECT entitlement_tier AS value FROM subscriptions WHERE id=$1', [row.id])).toBe(row.entitlement_tier);
  });
  it('rejects a duplicate insert in a different request without replaying the previous receipt', async () => {
    const payload = batch(); await apply(payload); payload.request_id = '22222222-2222-4222-8222-222222222222';
    await reject(payload, /BILLING_RECONCILIATION_STALE/);
  });
  it.each(['accounts', 'before', 'inserts'])('enforces bounded %s collections', async kind => {
    const payload = batch();
    if (kind === 'accounts') payload.accounts = Array.from({ length: 11 }, () => account());
    if (kind === 'before') payload.accounts[0].before = Array.from({ length: 101 }, () => account().before[0]);
    if (kind === 'inserts') payload.accounts[0].inserts = Array.from({ length: 21 }, () => account().inserts[0]);
    await reject(payload, /INVALID_BILLING_RECONCILIATION/);
  });
  it.each([null, [], {}, { version: 1 }, 'not-object'].map(value => [value]))('rejects malformed roots without any writes: %j', async value => {
    await reject(value, /INVALID_BILLING_RECONCILIATION/);
  });
  it.each(['extra-root', 'extra-account', 'extra-row', 'missing-field', 'null-required', 'bad-time', 'bad-date', 'bad-id', 'bad-tier', 'bad-price', 'bad-status', 'empty-before',
    'empty-inserts', 'duplicate-account', 'duplicate-insert', 'duplicate-before', 'existing-insert', 'oversize', 'future-event'])('rejects invalid contracts: %s', async kind => {
    const payload = batch(); const person = payload.accounts[0]; const row = person.inserts[0];
    if (kind === 'extra-root') Object.assign(payload, { secret: 'not-allowed' });
    if (kind === 'extra-account') Object.assign(person, { email: 'not-allowed' });
    if (kind === 'extra-row') Object.assign(row, { created_at: time });
    if (kind === 'missing-field') Reflect.deleteProperty(row, 'plan_id');
    if (kind === 'null-required') Object.assign(row, { status: null });
    if (kind === 'bad-time') row.last_event_occurred_at = 'infinity';
    if (kind === 'bad-date') row.current_period_end = '2026-02-30T00:00:00Z';
    if (kind === 'bad-id') row.id = 'synthetic-id';
    if (kind === 'bad-tier') row.entitlement_tier = 'family';
    if (kind === 'bad-price') row.plan_id = id('pri', 'z');
    if (kind === 'bad-status') row.status = 'trial';
    if (kind === 'empty-before') person.before = [];
    if (kind === 'empty-inserts') person.inserts = [];
    if (kind === 'duplicate-account') payload.accounts.push(person);
    if (kind === 'duplicate-insert') person.inserts.push(row);
    if (kind === 'duplicate-before') person.before.push(person.before[0]);
    if (kind === 'existing-insert') row.id = person.before[0].id;
    if (kind === 'oversize') row.id = 'a'.repeat(262145);
    if (kind === 'future-event') row.last_event_occurred_at = new Date(Date.now() + 60_000).toISOString();
    await reject(payload, /INVALID_BILLING_RECONCILIATION/);
  });
  it('has no public writer, no browser/service-role execution grant and no receipt table access', async () => {
    expect(await scalar("SELECT count(*)::int AS value FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='apply_account_billing_insert_batch'")).toBe(0);
    for (const role of ['anon', 'authenticated', 'service_role']) {
      // Grant schema visibility in the fixture to test function/table ACLs independently.
      await db.exec(`GRANT USAGE ON SCHEMA private TO ${role}; SET LOCAL ROLE ${role}; SAVEPOINT denied`);
      await expect(apply(batch())).rejects.toThrow(/permission denied/);
      await db.exec('ROLLBACK TO SAVEPOINT denied');
      await expect(db.exec('SELECT * FROM private.account_billing_reconciliation_receipts')).rejects.toThrow(/permission denied/);
      await db.exec('ROLLBACK TO SAVEPOINT denied; RESET ROLE');
    }
  });
});
