import { readFile } from 'node:fs/promises';

export const fixtureId = (prefix, letter = 'a') => `${prefix}_${letter.repeat(26)}`;
export const fixturePrices = { pro: fixtureId('pri'), family: fixtureId('pri', 'b') };
export const fixtureTime = new Date(Date.now() - 3_600_000).toISOString().replace('Z', '001Z');
export const fixtureEventTime = new Date(Date.parse(fixtureTime) + 60_000).toISOString();
export const fixturePeriodEnd = new Date(Date.now() + 30 * 86_400_000).toISOString();
export const fixtureRequest = '11111111-1111-4111-8111-111111111111';
export const readBillingMigration = name => readFile(new URL(`../../../supabase/migrations/${name}`, import.meta.url), 'utf8');

export async function installLegacyAccountBillingFixture(client) {
  await client.query(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS; CREATE ROLE authenticator;
    CREATE SCHEMA auth; CREATE SCHEMA storage;
    CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claims',true)::jsonb $$;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;
    CREATE TABLE auth.users(id uuid PRIMARY KEY);
    CREATE TABLE user_profiles(id text PRIMARY KEY, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
    CREATE TABLE admin_users(user_id uuid, is_active boolean);
    CREATE TABLE trees(id uuid PRIMARY KEY, owner_id text);
    CREATE TABLE people(id text PRIMARY KEY, tree_id uuid REFERENCES trees ON DELETE CASCADE);
    CREATE TABLE tree_collaborators(tree_id uuid REFERENCES trees ON DELETE CASCADE, collaborator_uid text, email text, role text);
    CREATE TABLE tree_invitations(tree_id uuid REFERENCES trees ON DELETE CASCADE, invited_uid text, invited_email text, accepted_by text);
    CREATE TABLE user_keys(user_id text);
    CREATE TABLE storage.objects(bucket_id text, name text, owner_id text, PRIMARY KEY(bucket_id,name));`);
  for (const name of ['20260523230000_isolate_db_helpers_to_private_schema.sql',
    '20260530190320_20260530000001_billing_subscriptions.sql', '20260603173545_admin_subscription_overrides.sql']) await client.query(await readBillingMigration(name));
  await client.query(`ALTER TABLE subscriptions ADD COLUMN last_event_occurred_at timestamptz;
    CREATE TABLE private.processed_paddle_webhook_events(event_id text PRIMARY KEY, occurred_at timestamptz);`);
  const billing = await readBillingMigration('20260531195055_billing_fixes.sql');
  const legacyDeletion = billing.replace(/\r\n/g, '\n').split('-- 12. Atomic profile and trees DB deletion')[1]?.split('-- 13.')[0];
  if (!legacyDeletion) throw new Error('Legacy deletion fixture source missing');
  await client.query(legacyDeletion);
  const start = billing.indexOf('CREATE OR REPLACE FUNCTION public.process_paddle_subscription_event(');
  const end = billing.indexOf('-- 17. AI usage quota reservation', start);
  if (start < 0 || end <= start) throw new Error('Billing fixture source missing');
  await client.query(billing.slice(start, end));
}

export async function installAccountBillingFixture(client) {
  await installLegacyAccountBillingFixture(client);
  for (const name of ['20260907000200_remove_deleted_account_memberships.sql', '20260907000300_revoke_deleted_account_sessions.sql',
    '20260908000100_queue_account_deletion_cleanup.sql',
    '20260908000200_fence_account_billing_events.sql', '20260908000300_track_all_account_subscriptions.sql',
    '20260908000400_guard_billing_reconciliation_inserts.sql']) await client.query(await readBillingMigration(name));
}

export async function resetAccountBillingFixture(client, { canceled = false } = {}) {
  await client.query(`TRUNCATE private.account_billing_reconciliation_receipts, private.processed_paddle_webhook_events, private.account_session_generations,
    private.account_deletion_objects, private.account_deletion_jobs, private.account_checkout_attempts,
    public.subscription_overrides, public.ai_monthly_usage, public.subscriptions, public.user_profiles CASCADE`);
  await client.query('INSERT INTO user_profiles(id,tier,updated_at) VALUES ($1,$2,$3)', ['owner', canceled ? 'free' : 'family', fixtureTime]);
  await client.query(`INSERT INTO subscriptions(id,user_id,paddle_customer_id,status,plan_id,current_period_end,last_event_occurred_at,entitlement_tier,updated_at)
    VALUES ($1,'owner',$2,$3,$4,$5,$6,$7,$6)`, [fixtureId('sub'), fixtureId('ctm'), canceled ? 'canceled' : 'active', fixturePrices.family,
    fixturePeriodEnd, fixtureTime, canceled ? 'free' : 'family']);
  await client.query("INSERT INTO ai_monthly_usage(user_id,cloud_requests_used,cloud_requests_limit,reset_at) VALUES ('owner',19,77,$1)", [fixturePeriodEnd]);
}

export function fixtureBatch({ canceled = false } = {}) {
  const before = { id: fixtureId('sub'), user_id: 'owner', paddle_customer_id: fixtureId('ctm'), status: canceled ? 'canceled' : 'active',
    plan_id: fixturePrices.family, entitlement_tier: canceled ? 'free' : 'family', current_period_end: fixturePeriodEnd,
    last_event_occurred_at: fixtureTime, updated_at: fixtureTime };
  const insert = { ...before, id: fixtureId('sub', 'b'), plan_id: fixturePrices.pro, entitlement_tier: canceled ? 'free' : 'pro' };
  delete insert.updated_at;
  return { version: 1, request_id: fixtureRequest, observed_at: new Date().toISOString(), snapshot_fingerprint: 'a'.repeat(64),
    price_ids: fixturePrices, accounts: [{ user_id: 'owner', tier: canceled ? 'free' : 'family', updated_at: fixtureTime, before: [before], inserts: [insert] }] };
}
