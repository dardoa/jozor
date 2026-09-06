import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { afterEach, describe, expect, it } from 'vitest';

const migration = (name: string) => readFileSync(path.resolve('supabase/migrations', name), 'utf8');
const bootstrap = migration('20260218_bootstrap_core_schema.sql');
const identityBlock = bootstrap.match(/DO \$bootstrap\$[\s\S]*?\$bootstrap\$;/)?.[0];
if (!identityBlock) throw new Error('Fresh-install identity prerequisite is missing.');
const identitySql: string = identityBlock;

describe('fresh-install migration prerequisites', () => {
  let db: PGlite;
  afterEach(async () => { await db?.close(); });

  const setup = async () => {
    db = new PGlite();
    await db.exec(`
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql AS $$
        SELECT '{"sub":"test-owner","email":"owner@example.test"}'::jsonb;
      $$;
    `);
  };

  it('installs the identity helper before the first ownership policies', async () => {
    await setup();
    await db.exec(identitySql);
    await db.exec(`
      CREATE TABLE trees(owner_id text);
      ALTER TABLE trees ENABLE ROW LEVEL SECURITY;
      CREATE POLICY owner_read ON trees USING (owner_id = public.current_user_id_text());
    `);
    expect((await db.query('SELECT public.current_user_id_text() AS id')).rows)
      .toEqual([{ id: 'test-owner' }]);
  });

  it('does not overwrite a newer identity helper when bootstrap is reapplied', async () => {
    await setup();
    await db.exec("CREATE FUNCTION public.current_user_id_text() RETURNS text LANGUAGE sql AS $$ SELECT 'newer-wrapper' $$;");
    await db.exec(identitySql);
    expect((await db.query('SELECT public.current_user_id_text() AS id')).rows)
      .toEqual([{ id: 'newer-wrapper' }]);
  });

  it('repairs missing sync timestamps and preserves them when applied again', async () => {
    await setup();
    const peopleTable = bootstrap.match(/CREATE TABLE IF NOT EXISTS public.people \([\s\S]*?\n\);/)?.[0];
    if (!peopleTable) throw new Error('Bootstrap people schema missing');
    await db.exec('CREATE TABLE trees(id uuid PRIMARY KEY)');
    await db.exec(peopleTable);
    const repair = migration('20260905000300_ensure_person_sync_timestamps.sql');
    await db.exec(repair);
    await db.exec(`
      INSERT INTO trees VALUES ('11111111-1111-4111-8111-111111111111');
      INSERT INTO people(id, tree_id) VALUES ('person', '11111111-1111-4111-8111-111111111111');
      UPDATE people SET updated_at = '2026-01-01T00:00:00Z' WHERE id = 'person';
    `);
    await db.exec(repair);
    expect((await db.query(`SELECT created_at IS NOT NULL AS created,
      updated_at = '2026-01-01T00:00:00Z'::timestamptz AS preserved FROM people`)).rows)
      .toEqual([{ created: true, preserved: true }]);
  });

  it('creates invitation RPCs before their table and executes after the table arrives', async () => {
    await setup();
    await db.exec(identitySql);
    await db.exec(migration('20260327000100_add_invitation_in_app_actions.sql'));
    await db.exec(`
      CREATE TABLE tree_invitations(id uuid, tree_id uuid, invited_email text,
        role text, status text, expires_at timestamptz, revoked_at timestamptz);
      CREATE TABLE activity_logs(tree_id uuid, user_id text, user_email text,
        action_type text, details jsonb);
      INSERT INTO tree_invitations(id, invited_email, status, expires_at) VALUES
        ('11111111-1111-4111-8111-111111111111', 'owner@example.test', 'pending', NOW() + INTERVAL '1 day');
    `);
    expect((await db.query("SELECT public.decline_tree_invitation('11111111-1111-4111-8111-111111111111') AS declined")).rows)
      .toEqual([{ declined: true }]);
    expect((await db.query('SELECT status FROM tree_invitations')).rows).toEqual([{ status: 'declined' }]);
  });

  it('hardens installed RPCs while tolerating absent legacy helpers', async () => {
    await setup();
    await db.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE SCHEMA storage;
      CREATE TABLE storage.objects(id text);
      CREATE TABLE trees(id uuid);
      CREATE TABLE relationships(id uuid);
      CREATE TABLE locations_cache(place_name text, status text);
      CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT 'authenticated' $$;
    `);
    const signatures = [
      'accept_tree_invitation(text)', 'accept_tree_invitation_by_id(uuid)', 'can_edit_tree(uuid)',
      'create_person_and_relationship(uuid,text,jsonb,text,text)', 'create_tree_invitation(uuid,text,text,integer)',
      'create_tree_with_root(text,text,jsonb)', 'current_user_id_text()', 'decline_tree_invitation(uuid)',
      'delete_person_and_relations(uuid,text,text)', 'is_tree_collaborator(uuid,text)',
      'prune_activity_logs(uuid,integer)', 'prune_tree_operations(uuid,integer)',
      'replace_tree_content(uuid,jsonb,jsonb)', 'revoke_tree_invitation(uuid)', 'sync_tree_batch(jsonb)',
    ];
    for (const signature of signatures) {
      await db.exec(`CREATE FUNCTION public.${signature} RETURNS text LANGUAGE sql AS $$ SELECT 'unchanged' $$;`);
    }
    const paths = migration('20260520180851_harden_general_security_advisors.sql');
    const grants = migration('20260520181055_restrict_security_definer_public_execute.sql');
    await db.exec(paths);
    await db.exec(grants);
    expect((await db.query(`SELECT
      has_function_privilege('anon', 'public.sync_tree_batch(jsonb)', 'EXECUTE') AS anonymous,
      has_function_privilege('authenticated', 'public.sync_tree_batch(jsonb)', 'EXECUTE') AS signed_in
    `)).rows).toEqual([{ anonymous: false, signed_in: true }]);

    await db.exec("CREATE FUNCTION public.claim_collaborator_memberships() RETURNS text LANGUAGE sql AS $$ SELECT 'legacy-preserved' $$;");
    await db.exec(paths);
    await db.exec(grants);
    expect((await db.query(`SELECT
      public.claim_collaborator_memberships() AS value,
      has_function_privilege('anon', 'public.claim_collaborator_memberships()', 'EXECUTE') AS anonymous,
      has_function_privilege('authenticated', 'public.claim_collaborator_memberships()', 'EXECUTE') AS signed_in
    `)).rows).toEqual([{ value: 'legacy-preserved', anonymous: false, signed_in: true }]);
    expect((await db.query("SELECT proconfig FROM pg_proc WHERE oid = 'public.claim_collaborator_memberships()'::regprocedure")).rows)
      .toEqual([{ proconfig: ['search_path=public, auth, pg_temp'] }]);

    const emailRestriction = migration('20260522201523_restrict_unused_email_helper_rpc.sql');
    await db.exec(emailRestriction);
    await db.exec("CREATE FUNCTION public.current_user_email_text() RETURNS text LANGUAGE sql AS $$ SELECT 'legacy-email' $$;");
    await db.exec('GRANT EXECUTE ON FUNCTION public.current_user_email_text() TO authenticated, anon');
    await db.exec(emailRestriction);
    expect((await db.query(`SELECT
      has_function_privilege('anon', 'public.current_user_email_text()', 'EXECUTE') AS anonymous,
      has_function_privilege('authenticated', 'public.current_user_email_text()', 'EXECUTE') AS signed_in
    `)).rows).toEqual([{ anonymous: false, signed_in: false }]);
  });

  it('preserves service-only RLS for an existing legacy media table without creating it', async () => {
    await setup();
    await db.exec('CREATE ROLE service_role; CREATE ROLE anon;');
    const block = migration('20260527000000_harden_remaining_security_advisors.sql')
      .match(/DO \$legacy_media\$[\s\S]*?\$legacy_media\$;/)?.[0];
    if (!block) throw new Error('Legacy media guard missing.');
    await db.exec(block);
    expect((await db.query("SELECT to_regclass('public.media') AS relation")).rows).toEqual([{ relation: null }]);
    await db.exec("CREATE TABLE public.media(id text); INSERT INTO media VALUES ('fixture'); GRANT SELECT ON media TO anon, service_role;");
    await db.exec(block);
    await db.exec('SET ROLE anon');
    expect((await db.query('SELECT * FROM media')).rows).toEqual([]);
    await db.exec('RESET ROLE; SET ROLE service_role');
    expect((await db.query('SELECT * FROM media')).rows).toEqual([{ id: 'fixture' }]);
    await db.exec('RESET ROLE');
  });
});
