# Supabase Bootstrap Runbook

This runbook describes the recommended way to stand up a fresh Supabase environment for the app and verify that it matches the current schema contract.

For the full promotion path from environment bootstrap to app release sign-off, use [`release-readiness-checklist.md`](/D:/AppDEV/Jozor1.1/docs/release-readiness-checklist.md).

## Goal

Use this when you need to:

- create a new local/dev Supabase environment
- create a new staging database
- verify that a restored or manually patched environment is structurally correct

## Source of Truth

- Preferred bootstrap migration: [`20260218_bootstrap_core_schema.sql`](/D:/AppDEV/Jozor1.1/supabase/migrations/20260218_bootstrap_core_schema.sql)
- Canonical schema contract: [`20260318_document_core_schema_baseline.sql`](/D:/AppDEV/Jozor1.1/supabase/migrations/20260318_document_core_schema_baseline.sql)
- Immediate bootstrap verification: [`bootstrap_audit.sql`](/D:/AppDEV/Jozor1.1/supabase/diagnostics/bootstrap_audit.sql)
- Full schema verification: [`schema_audit.sql`](/D:/AppDEV/Jozor1.1/supabase/diagnostics/schema_audit.sql)

Do not treat [`20260318_bootstrap_core_schema.sql`](/D:/AppDEV/Jozor1.1/supabase/migrations/20260318_bootstrap_core_schema.sql) as the preferred entrypoint. It is retained as a historical duplicate for migration-history compatibility.

## Recommended Order

1. Apply [`20260218_bootstrap_core_schema.sql`](/D:/AppDEV/Jozor1.1/supabase/migrations/20260218_bootstrap_core_schema.sql).
2. Apply the remaining migrations in chronological order.
3. Run [`bootstrap_audit.sql`](/D:/AppDEV/Jozor1.1/supabase/diagnostics/bootstrap_audit.sql).
4. Run [`schema_audit.sql`](/D:/AppDEV/Jozor1.1/supabase/diagnostics/schema_audit.sql).
5. Perform the application smoke test.

## What Success Looks Like

After bootstrap:

- `trees`, `people`, `relationships`, `tree_operations`, `tree_collaborators`, `tree_shares`, `user_profiles`, `user_keys`, `activity_logs`, and `locations_cache` exist
- `people.custom_fields` and `people.metadata` exist
- `trees.focus_id` and `trees.settings` exist
- key indexes exist for `trees`, `people`, `relationships`, `tree_operations`, `tree_collaborators`, and `tree_shares`
- storage bucket `avatars` exists

After all migrations:

- RLS policies exist for `people` and `tree_operations`
- RPCs exist:
  - `create_tree_with_root`
  - `create_person_and_relationship`
  - `delete_person_and_relations`
  - `replace_tree_content`
  - `sync_tree_batch`
- sharing authorization resolves through `tree_collaborators`
- full tree restore reads snapshot data from `people` and `relationships`

## Application Smoke Test

Run this manually after the SQL checks:

1. Create a tree.
2. Add a parent and a child.
3. Edit `first_name`, `profession`, and `bio`.
4. Reload the page.
5. Confirm edits still exist.
6. Log out and log back in.
7. Confirm edits still exist.
8. Share the tree with a `viewer`.
9. Confirm the viewer can open but cannot edit.
10. Promote the viewer to `editor`.
11. Confirm the editor can edit and changes persist after reload.

## Failure Triage

If `bootstrap_audit.sql` fails:

- the environment is missing core schema pieces
- stop and fix bootstrap before investigating sync or RLS

If `bootstrap_audit.sql` passes but `schema_audit.sql` fails:

- bootstrap worked
- one or more later migrations or manual patches are missing

If both SQL audits pass but the app still fails:

- investigate RLS logic, RPC behavior, or client sync behavior
- use the app-level smoke tests and Playwright suite next

## Recommended App Validation

Before trusting a new environment for team use, run:

1. `npm run typecheck`
2. `npm run lint`
3. `npm run test`
4. `npx playwright test tests/e2e/app-smoke.spec.ts --project=chromium`

For cross-browser confidence, also run:

- `npx playwright test tests/e2e/app-smoke.spec.ts --project=firefox`
- `npx playwright test tests/e2e/app-smoke.spec.ts --project=webkit`
