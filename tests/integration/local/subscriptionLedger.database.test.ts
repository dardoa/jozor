import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

type Tier = 'free' | 'pro' | 'family';
describe('per-subscription billing ledger on PostgreSQL', () => {
  let db: PGlite;
  const read = (name: string) => readFileSync(path.resolve('supabase/migrations', name), 'utf8');
  const scalar = async <T,>(sql: string, params: unknown[] = []) => (await db.query<{ value: T }>(sql, params)).rows[0].value;
  const event = (id: string, subscription: string, options: {
    tier?: Tier; status?: string; time?: string; user?: string; customer?: string; plan?: string;
  } = {}) => scalar<boolean>(`SELECT public.process_paddle_subscription_event(
    $1, $2, $3, $4, $5, $6, $7, '2026-10-01', $8) AS value`, [id, options.time ?? '2026-09-08',
    options.user ?? 'owner', subscription, options.customer ?? 'ctm_owner', options.status ?? 'active',
    options.plan ?? 'pri_pro', options.tier ?? 'pro']);
  const tier = () => scalar<Tier>("SELECT tier AS value FROM user_profiles WHERE id = 'owner'");
  const reject = async (run: () => Promise<unknown>, message: RegExp) => {
    await db.exec('SAVEPOINT rejected_event');
    await expect(run()).rejects.toThrow(message);
    await db.exec('ROLLBACK TO SAVEPOINT rejected_event');
  };
  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA private; REVOKE ALL ON SCHEMA private FROM PUBLIC;
      CREATE FUNCTION public.current_user_id_text() RETURNS text LANGUAGE sql STABLE AS $$
        SELECT current_setting('test.user_id', true) $$;
      CREATE TABLE user_profiles (id text PRIMARY KEY, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
      CREATE TABLE private.processed_paddle_webhook_events(event_id text PRIMARY KEY, occurred_at timestamptz);
      CREATE TABLE private.account_deletion_jobs(user_id text, requested_at timestamptz, subscription_ids text[]);
      CREATE TABLE private.account_checkout_attempts(id uuid PRIMARY KEY, user_id text, requested_at timestamptz, resolved_at timestamptz);`);
    await db.exec(read('20260530190320_20260530000001_billing_subscriptions.sql'));
    await db.exec('ALTER TABLE subscriptions ADD COLUMN last_event_occurred_at timestamptz');
    const billing = read('20260531195055_billing_fixes.sql');
    const start = billing.indexOf('CREATE OR REPLACE FUNCTION public.process_paddle_subscription_event(');
    const end = billing.indexOf('-- 17. AI usage quota reservation', start);
    expect(start).toBeGreaterThan(-1); expect(end).toBeGreaterThan(start);
    await db.exec(billing.slice(start, end));
    await db.exec(read('20260908000200_fence_account_billing_events.sql'));
    await db.exec(`INSERT INTO user_profiles(id, tier) VALUES ('legacy', 'pro'), ('manual-only', 'family');
      INSERT INTO subscriptions(id, user_id, status, plan_id) VALUES ('legacy-test-id', 'legacy', 'active', 'legacy-price')`);
    await db.exec(read('20260908000300_track_all_account_subscriptions.sql'));
  });
  afterAll(async () => { await db?.close(); });
  beforeEach(async () => { await db.exec("BEGIN; INSERT INTO user_profiles(id) VALUES ('owner'), ('other')"); });
  afterEach(async () => { await db.exec('ROLLBACK; RESET ROLE'); });

  it('preserves legacy rows, existing tiers, owner read policy and the nonunique user index', async () => {
    expect((await db.query("SELECT id, entitlement_tier FROM subscriptions WHERE user_id = 'legacy'")).rows)
      .toEqual([{ id: 'legacy-test-id', entitlement_tier: 'pro' }]);
    expect(await scalar("SELECT tier AS value FROM user_profiles WHERE id = 'manual-only'")).toBe('family');
    expect(await scalar("SELECT count(*)::int AS value FROM pg_indexes WHERE indexname = 'idx_subscriptions_user_id'")).toBe(1);
    await event('e1', 's1'); await event('e2', 's2');
    await db.exec("SET LOCAL ROLE authenticated; SELECT set_config('test.user_id', 'owner', true)");
    expect((await db.query('SELECT id FROM subscriptions ORDER BY id')).rows).toEqual([{ id: 's1' }, { id: 's2' }]);
    await reject(() => db.exec("UPDATE subscriptions SET status = 'canceled'"), /permission denied/);
  });
  it('retains both subscriptions and uses the strongest eligible tier regardless of delivery order', async () => {
    await event('family', 's-family', { tier: 'family', time: '2026-09-09' });
    await event('older-pro', 's-pro', { time: '2026-09-07' });
    expect(await tier()).toBe('family');
    expect((await db.query("SELECT id FROM subscriptions WHERE user_id = 'owner' ORDER BY id")).rows)
      .toEqual([{ id: 's-family' }, { id: 's-pro' }]);
  });
  it.each(['canceled', 'paused', 'past_due'])('keeps pro when a separate family subscription becomes %s', async status => {
    await event('pro', 's-pro'); await event('family', 's-family', { tier: 'family' });
    await event('stop-family', 's-family', { tier: 'family', status, time: '2026-09-09' });
    expect(await tier()).toBe('pro');
    expect(await scalar("SELECT entitlement_tier AS value FROM subscriptions WHERE id = 's-family'")).toBe('free');
  });
  it('downgrades to free only after the last eligible subscription stops', async () => {
    await event('pro', 's-pro'); await event('trial', 's-trial', { status: 'trialing' });
    await event('cancel', 's-pro', { status: 'canceled', time: '2026-09-09' });
    expect(await tier()).toBe('pro');
    await event('cancel-trial', 's-trial', { status: 'canceled', time: '2026-09-09' });
    expect(await tier()).toBe('free');
    expect(await scalar("SELECT count(*)::int AS value FROM subscriptions WHERE user_id = 'owner'")).toBe(2);
  });
  it('ignores duplicates and orders events per subscription without reviving stale status', async () => {
    expect(await event('new', 's1', { time: '2026-09-10', status: 'canceled' })).toBe(true);
    expect(await event('old', 's1', { time: '2026-09-09' })).toBe(false);
    expect(await event('new', 's1', { time: '2026-09-10', status: 'canceled' })).toBe(false);
    expect(await tier()).toBe('free');
    expect(await event('second', 's2', { time: '2026-09-08' })).toBe(true);
    expect(await tier()).toBe('pro');
  });
  it('accepts equal-time identical snapshots but refuses ambiguous conflicting snapshots', async () => {
    await event('one', 's1');
    expect(await event('same', 's1')).toBe(false);
    await reject(() => event('conflict', 's1', { status: 'canceled' }), /SUBSCRIPTION_EVENT_TIME_CONFLICT/);
    expect(await tier()).toBe('pro');
    expect(await scalar("SELECT count(*)::int AS value FROM private.processed_paddle_webhook_events WHERE event_id = 'conflict'")).toBe(0);
  });
  it.each([{ user: 'other' }, { customer: 'ctm_other' }])('refuses identity reassignment: %j', async options => {
    await event('one', 's1');
    await reject(() => event('steal', 's1', { ...options, time: '2026-09-10' }), /SUBSCRIPTION_IDENTITY_CONFLICT/);
    expect((await db.query("SELECT user_id, paddle_customer_id FROM subscriptions WHERE id = 's1'")).rows)
      .toEqual([{ user_id: 'owner', paddle_customer_id: 'ctm_owner' }]);
    expect(await scalar("SELECT tier AS value FROM user_profiles WHERE id = 'other'")).toBe('free');
    expect(await scalar("SELECT count(*)::int AS value FROM private.processed_paddle_webhook_events WHERE event_id = 'steal'")).toBe(0);
  });
  it('does not multiply, replenish or shift an existing quota when subscriptions change', async () => {
    await event('one', 's1');
    await db.exec("UPDATE ai_monthly_usage SET cloud_requests_used = 19, reset_at = '2026-09-20' WHERE user_id = 'owner'");
    await event('two', 's2', { tier: 'family' });
    await event('cancel', 's1', { status: 'canceled', time: '2026-09-10' });
    expect((await db.query("SELECT cloud_requests_used, cloud_requests_limit, reset_at = '2026-09-20'::timestamptz AS same_reset FROM ai_monthly_usage WHERE user_id = 'owner'")).rows)
      .toEqual([{ cloud_requests_used: 19, cloud_requests_limit: 30, same_reset: true }]);
  });
  it('rolls back event, ledger and tier together on a late quota failure', async () => {
    await db.exec(`CREATE FUNCTION reject_quota() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'quota failure'; END $$;
      CREATE TRIGGER quota_failure BEFORE INSERT ON ai_monthly_usage FOR EACH ROW EXECUTE FUNCTION reject_quota()`);
    await reject(() => event('failed', 's1'), /quota failure/);
    expect(await tier()).toBe('free');
    expect(await scalar("SELECT count(*)::int AS value FROM subscriptions WHERE user_id = 'owner'")).toBe(0);
    expect(await scalar("SELECT count(*)::int AS value FROM private.processed_paddle_webhook_events")).toBe(0);
  });
  it.each([{ time: 'infinity' }, { status: 'unknown' }, { customer: '' }])('rejects invalid inputs atomically: %j', async options => {
    await reject(() => event('invalid', 's1', options), /INVALID_SUBSCRIPTION_EVENT/);
    expect(await scalar('SELECT count(*)::int AS value FROM private.processed_paddle_webhook_events')).toBe(0);
  });
  it('exposes only the fenced public RPC to service_role, never the internal implementation', async () => {
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`SET LOCAL ROLE ${role}`);
      await reject(() => event('one', 's1'), /permission denied/);
      await db.exec('RESET ROLE');
    }
    await db.exec('SET LOCAL ROLE service_role');
    expect(await event('one', 's1')).toBe(true);
    await reject(() => db.exec("SELECT private.process_paddle_subscription_event_before_deletion_fence('e', now(), 'u', 's', 'c', 'active', 'p', now(), 'pro')"), /permission denied/);
  });
});
