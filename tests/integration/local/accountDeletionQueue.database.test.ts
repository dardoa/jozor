import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const uid = '11111111-1111-4111-8111-111111111111';
const owned = '22222222-2222-4222-8222-222222222222';
const shared = '33333333-3333-4333-8333-333333333333';
type Job = { id: string; userId: string; authId: string | null; stage: 'storage' | 'auth'; leaseToken: string; objects: { bucket: string; path: string }[] };

describe('durable account deletion queue on PostgreSQL', () => {
  let db: PGlite;
  const read = (name: string) => readFileSync(path.resolve('supabase/migrations', name), 'utf8');
  const role = (name: string) => db.exec(`RESET ROLE; SET LOCAL ROLE ${name}`);
  const scalar = async <T,>(sql: string, params: unknown[] = []) => (await db.query<{ value: T }>(sql, params)).rows[0].value;
  const request = () => scalar<string>('SELECT public.request_account_deletion() AS value');
  const claim = async (id?: string) => { await role('service_role'); return scalar<Job | null>('SELECT public.claim_account_deletion_cleanup($1) AS value', [id ?? null]); };
  const finish = async (job: Job, token: string | null = job.leaseToken) => {
    await role('service_role'); return scalar<boolean>('SELECT public.finish_account_deletion_cleanup($1, $2) AS value', [job.id, token]);
  };
  const removeObjects = async (job: Job) => {
    await db.exec('RESET ROLE');
    for (const object of job.objects) await db.query('DELETE FROM storage.objects WHERE bucket_id = $1 AND name = $2', [object.bucket, object.path]);
  };
  const rejected = async (sql: string, message: RegExp) => {
    await db.exec('SAVEPOINT denied');
    await expect(db.exec(sql)).rejects.toThrow(message);
    await db.exec('ROLLBACK TO SAVEPOINT denied');
  };

  beforeAll(async () => {
    db = new PGlite();
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE ROLE authenticator;
      CREATE SCHEMA auth; CREATE SCHEMA storage;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claims')::jsonb $$;
      CREATE TABLE auth.users (id uuid PRIMARY KEY);
      CREATE TABLE user_profiles (id text PRIMARY KEY);
      CREATE TABLE subscriptions (id text PRIMARY KEY, user_id text REFERENCES user_profiles ON DELETE CASCADE, status text NOT NULL);
      CREATE TABLE trees (id uuid PRIMARY KEY, owner_id text);
      CREATE TABLE people (id text PRIMARY KEY, tree_id uuid REFERENCES trees ON DELETE CASCADE);
      CREATE TABLE tree_collaborators (tree_id uuid REFERENCES trees ON DELETE CASCADE, collaborator_uid text, email text, role text);
      CREATE TABLE tree_invitations (tree_id uuid REFERENCES trees ON DELETE CASCADE, invited_uid text, invited_email text, accepted_by text);
      CREATE TABLE user_keys (user_id text);
      CREATE TABLE storage.objects (bucket_id text, name text, PRIMARY KEY(bucket_id, name));
      ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
      ALTER TABLE trees ENABLE ROW LEVEL SECURITY;
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      GRANT USAGE ON SCHEMA public, auth, storage TO authenticated, anon, service_role;
      GRANT SELECT ON user_profiles, trees, storage.objects TO authenticated;
      CREATE POLICY profile_owner ON user_profiles TO authenticated USING (id = auth.jwt()->>'sub');
    `);
    await db.exec(read('20260523230000_isolate_db_helpers_to_private_schema.sql'));
    const billing = read('20260531195055_billing_fixes.sql');
    await db.exec(billing.split('-- 12. Atomic profile and trees DB deletion')[1].split('-- 13.')[0]);
    await db.exec(read('20260907000200_remove_deleted_account_memberships.sql'));
    await db.exec(read('20260907000300_revoke_deleted_account_sessions.sql'));
    await db.exec(read('20260908000100_queue_account_deletion_cleanup.sql'));
    await db.exec(`
      ALTER TABLE user_profiles ADD COLUMN tier text, ADD COLUMN created_at timestamptz, ADD COLUMN updated_at timestamptz;
      ALTER TABLE subscriptions ADD CONSTRAINT uq_subscriptions_user_id UNIQUE(user_id), ADD COLUMN paddle_customer_id text, ADD COLUMN plan_id text,
        ADD COLUMN current_period_end timestamptz, ADD COLUMN last_event_occurred_at timestamptz, ADD COLUMN updated_at timestamptz;
      CREATE TABLE private.processed_paddle_webhook_events (event_id text PRIMARY KEY, occurred_at timestamptz);
      CREATE TABLE ai_monthly_usage (user_id text PRIMARY KEY REFERENCES user_profiles ON DELETE CASCADE,
        cloud_requests_used integer NOT NULL DEFAULT 0, cloud_requests_limit integer, reset_at timestamptz, updated_at timestamptz);
      ALTER TABLE storage.objects ADD COLUMN owner_id text;
    `);
    const start = billing.indexOf('CREATE OR REPLACE FUNCTION public.process_paddle_subscription_event(');
    const end = billing.indexOf('-- 17. AI usage quota reservation', start);
    expect(start).toBeGreaterThan(-1); expect(end).toBeGreaterThan(start);
    await db.exec(billing.slice(start, end));
    await db.exec(read('20260908000200_fence_account_billing_events.sql'));
    await db.exec(read('20260908000300_track_all_account_subscriptions.sql'));
    await db.exec(read('20260908000400_guard_billing_reconciliation_inserts.sql'));
  });
  afterAll(async () => { await db?.close(); });
  beforeEach(async () => {
    await db.exec(`BEGIN;
      INSERT INTO auth.users VALUES ('${uid}');
      INSERT INTO user_profiles(id) VALUES ('${uid}'), ('keeper');
      INSERT INTO trees VALUES ('${owned}', '${uid}'), ('${shared}', 'keeper');
      INSERT INTO people VALUES ('owned-person', '${owned}'), ('kept-person', '${shared}');
      INSERT INTO tree_collaborators VALUES ('${shared}', '${uid}', 'departing@example.test', 'editor'), ('${shared}', 'keeper', 'keeper@example.test', 'editor');
      INSERT INTO tree_invitations VALUES ('${shared}', '${uid}', 'departing@example.test', null);
      INSERT INTO user_keys VALUES ('${uid}'), ('keeper');
      INSERT INTO storage.objects VALUES
        ('avatars', 'users/${uid}/avatar.png'), ('avatars', '${owned}/nested/legacy.jpg'), ('person-media', '${owned}/nested/photo.webp'),
        ('avatars', 'users/${uid}-other/keep.png'), ('person-media', '${shared}/keep.webp');
    `);
    await db.query("SELECT set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: uid, email: 'departing@example.test', role: 'authenticated' })]);
    await role('authenticated');
  });
  afterEach(async () => { await db.exec('ROLLBACK; RESET ROLE'); });

  it('atomically records exact owned keys and revokes sessions while preserving another owner', async () => {
    const id = await request();
    expect(await scalar('SELECT public.is_my_account_session_active() AS value')).toBe(false);
    await db.exec('RESET ROLE');
    expect((await db.query('SELECT id FROM user_profiles')).rows).toEqual([{ id: 'keeper' }]);
    expect((await db.query('SELECT id FROM people')).rows).toEqual([{ id: 'kept-person' }]);
    expect((await db.query('SELECT user_id FROM user_keys')).rows).toEqual([{ user_id: 'keeper' }]);
    expect(await scalar('SELECT count(*)::int AS value FROM storage.objects')).toBe(5);
    const job = await claim(id);
    expect(job).toMatchObject({ id, userId: uid, authId: uid, stage: 'storage' });
    expect(job!.objects).toHaveLength(3);
    expect(JSON.stringify(job)).not.toContain('keep.');
    expect((await db.query('SELECT public.claim_account_deletion_cleanup($1) AS value', [id])).rows).toEqual([{ value: null }]);
  });

  it('also queues cleanup through the legacy authenticated RPC', async () => {
    await db.exec('SELECT public.delete_my_profile_data()');
    expect((await claim())!.objects).toHaveLength(3);
  });

  it('persists a status-only receipt in the deletion transaction and limits its grants and lifetime', async () => {
    const hash = 'ab'.repeat(32);
    const id = await scalar<string>('SELECT public.request_account_deletion($1) AS value', [hash]);
    await rejected(`SELECT public.get_account_deletion_status('${hash}')`, /permission denied/);
    await role('service_role');
    expect(await scalar('SELECT public.get_account_deletion_status($1) AS value', [hash])).toBe('pending');
    expect(await scalar('SELECT public.get_account_deletion_status($1) AS value', ['cd'.repeat(32)])).toBeNull();
    await db.exec('RESET ROLE');
    await db.query("UPDATE private.account_deletion_jobs SET requested_at = now() - interval '91 days' WHERE id = $1", [id]);
    await role('service_role');
    expect(await scalar('SELECT public.get_account_deletion_status($1) AS value', [hash])).toBeNull();
  });
  it('reports aggregate backlog health only to the service, without account or file identifiers', async () => {
    await request();
    await rejected('SELECT public.get_account_deletion_queue_health()', /permission denied/);
    await role('service_role');
    const health = await scalar('SELECT public.get_account_deletion_queue_health() AS value');
    expect(health).toEqual({ pendingJobs: 1, retryingJobs: 0, oldestPendingSeconds: 0, pendingCheckoutAttempts: 0 });
    expect(JSON.stringify(health)).not.toContain(uid);
  });

  it('rolls back the queue and revocation on a late SQL failure', async () => {
    await db.exec(`RESET ROLE;
      CREATE FUNCTION reject_delete() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'late failure'; END $$;
      CREATE TRIGGER fail_delete AFTER DELETE ON user_profiles FOR EACH ROW EXECUTE FUNCTION reject_delete();`);
    await role('authenticated');
    await rejected('SELECT public.request_account_deletion()', /late failure/);
    expect(await scalar('SELECT public.is_my_account_session_active() AS value')).toBe(true);
    await db.exec('RESET ROLE');
    expect(await scalar('SELECT count(*)::int AS value FROM private.account_deletion_jobs')).toBe(0);
    expect(await scalar('SELECT count(*)::int AS value FROM storage.objects')).toBe(5);
  });

  it.each(['active', 'trialing', 'past_due', 'paused', 'unknown'])('retains all data and queues nothing for %s billing', async status => {
    await db.exec('RESET ROLE');
    await db.query('INSERT INTO subscriptions(id, user_id, status) VALUES ($1, $2, $3)', ['open', uid, status]);
    await role('authenticated');
    await rejected('SELECT public.request_account_deletion()', /ACCOUNT_HAS_OPEN_SUBSCRIPTION/);
    expect(await scalar('SELECT public.is_my_account_session_active() AS value')).toBe(true);
    await db.exec('RESET ROLE');
    expect(await scalar('SELECT count(*)::int AS value FROM private.account_deletion_jobs')).toBe(0);
  });

  it('only completes after independently checking Storage and Auth absence', async () => {
    const id = await request();
    const storage = (await claim(id))!;
    expect(await finish(storage)).toBe(false);
    expect(await finish(storage, null)).toBe(false);
    await removeObjects(storage);
    expect(await finish(storage)).toBe(true);
    const auth = (await claim(id))!;
    expect(auth.stage).toBe('auth');
    expect(await finish(auth)).toBe(false);
    await db.exec(`RESET ROLE; DELETE FROM auth.users WHERE id = '${uid}'`);
    expect(await finish(auth)).toBe(true);
    expect(await claim(id)).toBeNull();
    await db.exec('RESET ROLE');
    expect(await scalar('SELECT count(*)::int AS value FROM storage.objects')).toBe(2);
  });

  it('blocks on any open subscription and retires every canceled ID before deleting the ledger', async () => {
    await db.exec(`RESET ROLE; INSERT INTO subscriptions(id, user_id, status) VALUES
      ('sub_first', '${uid}', 'canceled'), ('sub_second', '${uid}', 'active')`);
    await role('authenticated');
    await rejected('SELECT public.request_account_deletion()', /ACCOUNT_HAS_OPEN_SUBSCRIPTION/);
    await db.exec("RESET ROLE; UPDATE subscriptions SET status = 'canceled' WHERE id = 'sub_second'");
    await role('authenticated');
    const id = await request();
    await db.exec('RESET ROLE');
    const ids = await scalar<string[]>('SELECT subscription_ids AS value FROM private.account_deletion_jobs WHERE id = $1', [id]);
    expect(ids.sort()).toEqual(['sub_first', 'sub_second']);
    expect(await scalar('SELECT count(*)::int AS value FROM subscriptions')).toBe(0);
    await role('service_role');
    for (const subscription of ids) {
      await rejected(`SELECT public.process_paddle_subscription_event('evt-${subscription}', clock_timestamp(), '${uid}',
        '${subscription}', 'ctm_one', 'active', 'pri_pro', now(), 'pro')`, /ACCOUNT_DELETED_BILLING_REVIEW/);
    }
  });

  it('fences onboarding and exact key reuse, including after cleanup completion', async () => {
    const id = await request();
    await db.exec('RESET ROLE');
    await rejected(`INSERT INTO user_profiles(id) VALUES ('${uid}')`, /ACCOUNT_DELETION_PENDING/);
    await rejected(`INSERT INTO trees VALUES ('44444444-4444-4444-8444-444444444444', '${uid}')`, /not active/);
    const storage = (await claim(id))!;
    await removeObjects(storage);
    expect(await finish(storage)).toBe(true);
    const auth = (await claim(id))!;
    await db.exec(`RESET ROLE; DELETE FROM auth.users WHERE id = '${uid}'`);
    expect(await finish(auth)).toBe(true);
    await db.exec(`RESET ROLE; INSERT INTO user_profiles(id) VALUES ('${uid}')`);
    await rejected(`INSERT INTO storage.objects VALUES ('avatars', 'users/${uid}/avatar.png')`, /retired/);
    await db.exec(`INSERT INTO storage.objects VALUES ('avatars', 'users/${uid}/fresh.png')`);
    await role('authenticated');
    expect(await scalar('SELECT public.is_my_account_session_active() AS value')).toBe(false);
  });

  it('recovers expired leases and refuses stale workers without reopening a session', async () => {
    const id = await request();
    const old = (await claim(id))!;
    await db.exec('RESET ROLE');
    await db.query("UPDATE private.account_deletion_jobs SET lease_until = now() - interval '1 second' WHERE id = $1", [id]);
    const fresh = (await claim(id))!;
    expect(fresh.leaseToken).not.toBe(old.leaseToken);
    await removeObjects(fresh);
    expect(await finish(old)).toBe(false);
    expect(await finish(fresh)).toBe(true);
  });

  it('rejects new trees and ownership transfers to an unprofiled subject without inventing a profile', async () => {
    await db.exec('RESET ROLE');
    await rejected("INSERT INTO trees VALUES ('44444444-4444-4444-8444-444444444444', 'legacy-fixture')", /Account is not active/);
    await rejected(`UPDATE trees SET owner_id = 'legacy-fixture' WHERE id = '${owned}'`, /Account is not active/);
    expect(await scalar(`SELECT owner_id AS value FROM trees WHERE id = '${owned}'`)).toBe(uid);
    expect(await scalar("SELECT count(*)::int AS value FROM user_profiles WHERE id = 'legacy-fixture'")).toBe(0);
    expect(await scalar('SELECT count(*)::int AS value FROM private.account_deletion_jobs')).toBe(0);
  });

  it('preserves unrelated historical unprofiled trees and people when deleting another account', async () => {
    const legacyTree = '44444444-4444-4444-8444-444444444444';
    // Reproduce rows that existed before the owner-admission trigger was installed.
    await db.exec(`RESET ROLE;
      ALTER TABLE trees DISABLE TRIGGER fence_account_deletion_tree_owner;
      INSERT INTO trees VALUES ('${legacyTree}', 'legacy-fixture');
      INSERT INTO people VALUES ('legacy-person', '${legacyTree}');
      ALTER TABLE trees ENABLE TRIGGER fence_account_deletion_tree_owner;
    `);
    await role('authenticated');
    const id = await request();
    const job = (await claim(id))!;
    expect(job.treeIds).toEqual([owned]);
    await db.exec('RESET ROLE');
    expect((await db.query('SELECT * FROM trees WHERE id = $1', [legacyTree])).rows)
      .toEqual([{ id: legacyTree, owner_id: 'legacy-fixture' }]);
    expect((await db.query('SELECT * FROM people WHERE tree_id = $1', [legacyTree])).rows)
      .toEqual([{ id: 'legacy-person', tree_id: legacyTree }]);
    expect(await scalar("SELECT count(*)::int AS value FROM user_profiles WHERE id = 'legacy-fixture'")).toBe(0);
  });

  it('backs off failed work without storing raw provider errors', async () => {
    const job = (await claim(await request()))!;
    expect(await scalar('SELECT public.retry_account_deletion_cleanup($1, $2) AS value', [job.id, job.leaseToken])).toBe(true);
    expect(await claim(job.id)).toBeNull();
    await db.exec('RESET ROLE');
    expect((await db.query('SELECT stage, last_error_code, lease_token FROM private.account_deletion_jobs')).rows)
      .toEqual([{ stage: 'storage', last_error_code: 'storage_failed', lease_token: null }]);
  });

  it('bounds inventory claims to 100 and re-inventories late objects before Auth completion', async () => {
    await db.exec('RESET ROLE');
    await db.query("INSERT INTO storage.objects SELECT 'person-media', $1 || '/batch/' || n || '.png' FROM generate_series(1, 205) n", [owned]);
    await role('authenticated');
    const id = await request();
    for (const length of [100, 100, 8]) {
      const batch = (await claim(id))!;
      expect(batch.objects).toHaveLength(length);
      await removeObjects(batch);
      expect(await finish(batch)).toBe(true);
    }
    const auth = (await claim(id))!;
    await db.exec(`RESET ROLE; DELETE FROM auth.users WHERE id = '${uid}'; INSERT INTO storage.objects VALUES ('person-media', '${owned}/late.png')`);
    expect(await finish(auth)).toBe(false);
    await role('service_role');
    await scalar('SELECT public.retry_account_deletion_cleanup($1, $2) AS value', [id, auth.leaseToken]);
    await db.exec('RESET ROLE');
    await db.query('UPDATE private.account_deletion_jobs SET next_attempt_at = now() WHERE id = $1', [id]);
    expect((await claim(id))!.objects).toEqual([{ bucket: 'person-media', path: `${owned}/late.png` }]);
  });

  it('denies anonymous deletion and all user access to service-only job controls', async () => {
    for (const name of ['authenticated', 'anon']) {
      await role(name);
      await rejected('SELECT public.claim_account_deletion_cleanup()', /permission denied/);
      await rejected("SELECT public.finish_account_deletion_cleanup(null, null)", /permission denied/);
      await rejected("SELECT public.retry_account_deletion_cleanup(null, null)", /permission denied/);
      await rejected('SELECT * FROM private.account_deletion_jobs', /permission denied/);
    }
    await rejected('SELECT public.request_account_deletion()', /permission denied/);
  });

  it('blocks deletion before any mutation while checkout creation has an uncertain result', async () => {
    await role('service_role');
    const attempt = await scalar<string>('SELECT public.begin_account_checkout($1) AS value', [uid]);
    await role('authenticated');
    await rejected('SELECT public.request_account_deletion()', /ACCOUNT_HAS_PENDING_CHECKOUT/);
    expect(await scalar('SELECT public.is_my_account_session_active() AS value')).toBe(true);
    await db.exec('RESET ROLE');
    expect(await scalar('SELECT count(*)::int AS value FROM storage.objects')).toBe(5);
    expect(await scalar('SELECT count(*)::int AS value FROM private.account_deletion_jobs')).toBe(0);
    await role('service_role');
    expect(await scalar('SELECT public.record_account_checkout($1, $2) AS value', [attempt, 'txn_one'])).toBe(true);
    expect(await scalar('SELECT public.record_account_checkout($1, $2, true) AS value', [attempt, 'txn_other'])).toBe(false);
    expect(await scalar('SELECT public.record_account_checkout($1, $2, true) AS value', [attempt, 'txn_one'])).toBe(true);
    await role('authenticated');
    await request();
    await role('service_role');
    await rejected(`SELECT public.begin_account_checkout('${uid}')`, /Account is not active/);
  });
  it('preserves the account and all files if native Auth owns uploads retained on another tree', async () => {
    await db.exec('RESET ROLE');
    await db.query("UPDATE storage.objects SET owner_id = $1 WHERE name = $2", [uid, `${shared}/keep.webp`]);
    await role('authenticated');
    await rejected('SELECT public.request_account_deletion()', /ACCOUNT_HAS_RETAINED_UPLOADS/);
    expect(await scalar('SELECT public.is_my_account_session_active() AS value')).toBe(true);
    await db.exec('RESET ROLE');
    expect(await scalar('SELECT count(*)::int AS value FROM private.account_deletion_jobs')).toBe(0);
    expect(await scalar('SELECT count(*)::int AS value FROM storage.objects')).toBe(5);
    expect(await scalar('SELECT count(*)::int AS value FROM user_profiles')).toBe(2);
  });

  it('denies browser access to checkout fences and the retired billing implementation', async () => {
    for (const name of ['anon', 'authenticated']) {
      await role(name);
      await rejected(`SELECT public.begin_account_checkout('${uid}')`, /permission denied/);
      await rejected('SELECT public.record_account_checkout(null, null)', /permission denied/);
      await rejected(`SELECT public.get_pending_account_checkouts('${uid}')`, /permission denied/);
    }
    await role('service_role');
    await rejected("SELECT private.process_paddle_subscription_event_before_deletion_fence('e', now(), 'u', 's', 'c', 'active', 'p', now(), 'pro')", /permission denied/);
  });

  it('runs the real subscription transaction and resolves its matching checkout only after persistence', async () => {
    await role('service_role');
    const attempt = await scalar<string>('SELECT public.begin_account_checkout($1) AS value', [uid]);
    const args = ['event-one', uid, attempt];
    const sql = "SELECT public.process_paddle_subscription_event($1, now(), $2, 'sub_new', 'ctm_one', 'active', 'pri_pro', now(), 'pro', $3) AS value";
    expect(await scalar(sql, args)).toBe(true);
    expect(await scalar(sql, args)).toBe(false);
    expect(await scalar('SELECT public.get_pending_account_checkouts($1) AS value', [uid])).toEqual([]);
    await db.exec('RESET ROLE');
    expect((await db.query('SELECT id, status FROM subscriptions')).rows).toEqual([{ id: 'sub_new', status: 'active' }]);
    expect(await scalar('SELECT cloud_requests_limit AS value FROM ai_monthly_usage')).toBe(30);
    await role('authenticated');
    await rejected('SELECT public.request_account_deletion()', /ACCOUNT_HAS_OPEN_SUBSCRIPTION/);
  });

  it('rejects late billing resurrection before and after account recreation, but allows a new tracked checkout', async () => {
    await db.exec(`RESET ROLE; INSERT INTO subscriptions(id, user_id, status) VALUES ('sub_retired', '${uid}', 'canceled')`);
    await role('authenticated');
    const id = await request();
    const event = (subscription: string, attempt = 'NULL', status = 'active') =>
      `SELECT public.process_paddle_subscription_event('evt-${subscription}-${status}', clock_timestamp(), '${uid}', '${subscription}', 'ctm_one', '${status}', 'pri_pro', now(), 'pro', ${attempt})`;
    await role('service_role');
    await rejected(event('sub_retired'), /ACCOUNT_DELETED_BILLING_REVIEW/);
    await rejected(event('sub_unknown'), /ACCOUNT_DELETED_BILLING_REVIEW/);
    await db.exec(event('sub_retired', 'NULL', 'canceled'));
    const storage = (await claim(id))!;
    await removeObjects(storage); expect(await finish(storage)).toBe(true);
    const auth = (await claim(id))!;
    await db.exec(`RESET ROLE; DELETE FROM auth.users WHERE id = '${uid}'`);
    expect(await finish(auth)).toBe(true);
    await db.exec(`RESET ROLE; INSERT INTO user_profiles(id) VALUES ('${uid}')`);
    // Transactions in this fixture share now(); distinguish a later real signup.
    await db.query("UPDATE private.account_deletion_jobs SET requested_at = now() - interval '1 minute' WHERE id = $1", [id]);
    await role('service_role');
    await rejected(event('sub_unknown'), /ACCOUNT_DELETED_BILLING_REVIEW/);
    const attempt = await scalar<string>('SELECT public.begin_account_checkout($1) AS value', [uid]);
    await rejected(event('sub_retired', `'${attempt}'`), /ACCOUNT_DELETED_BILLING_REVIEW/);
    await db.exec(event('sub_new', `'${attempt}'`));
    await db.exec('RESET ROLE');
    expect((await db.query('SELECT id, status FROM subscriptions')).rows).toEqual([{ id: 'sub_new', status: 'active' }]);
  });

  it('resolves a checkout by its exact subscription even when a newer subscription also exists', async () => {
    await role('service_role');
    const attempt = await scalar<string>('SELECT public.begin_account_checkout($1) AS value', [uid]);
    for (const [eventId, subscription, date] of [['older', 'sub_old', '2026-09-01'], ['newer', 'sub_new', '2026-09-08']]) {
      await scalar(`SELECT public.process_paddle_subscription_event($1, $2, $3, $4, 'ctm_one', 'active', 'pri_pro', now(), 'pro') AS value`,
        [eventId, date, uid, subscription]);
    }
    expect(await scalar('SELECT public.record_account_checkout($1, $2, false, $3) AS value', [attempt, 'txn_old', 'sub_old'])).toBe(true);
    expect(await scalar('SELECT public.get_pending_account_checkouts($1) AS value', [uid])).toEqual([]);
    await role('authenticated');
    await rejected('SELECT public.request_account_deletion()', /ACCOUNT_HAS_OPEN_SUBSCRIPTION/);
  });
});
