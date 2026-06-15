# Release Readiness Checklist

Use this checklist before:

- promoting a build to staging
- validating a staging environment before QA
- cutting a production release

This file is the operational companion to:

- [`supabase-bootstrap-runbook.md`](./supabase-bootstrap-runbook.md)
- Supabase diagnostics under [`supabase/diagnostics`](../supabase/diagnostics)

## 1. Code Health

Run these locally or in CI:

1. `npm run typecheck`
2. `npm run lint`
3. `npm run test`
4. `npm run test:e2e:smoke`

Expected result:

- all commands pass
- no new lint failures
- smoke E2E passes on `chromium`

Recommended before release candidates:

- `npx playwright test tests/e2e/app-smoke.spec.ts --project=firefox --reporter=line`
- `npx playwright test tests/e2e/app-smoke.spec.ts --project=webkit --reporter=line`

## 2. CI Status

Confirm the GitHub Actions workflow at [`ci.yml`](../.github/workflows/ci.yml) is green for the target commit.

Expected result:

- `typecheck` passes
- `lint` passes
- `test` passes
- Playwright smoke passes

If Playwright fails:

- download `playwright-report`
- inspect `test-results`
- do not promote the build until the failure is understood

## 3. Supabase Readiness

For a newly bootstrapped or patched environment:

1. Run [`bootstrap_audit.sql`](../supabase/diagnostics/bootstrap_audit.sql)
2. Run [`schema_audit.sql`](../supabase/diagnostics/schema_audit.sql)
3. Run [`rpc_execution_contract_check.sql`](../supabase/diagnostics/rpc_execution_contract_check.sql)

Expected result:

- core tables exist
- required JSONB columns exist
- RPCs exist
- RLS policies exist
- storage bucket `avatars` exists
- the RPC execution contract check returns no rows

If any audit fails:

- stop release validation
- fix schema drift before app testing

## 4. Google Cloud Readiness

The browser variable `VITE_GOOGLE_API_KEY` is used only for Google Picker developer-key initialization.
It is intentionally public, so it must be restricted before any non-sandbox release.

Minimum acceptance:

- use a dedicated Google API key for Jozor Picker, not a shared project-wide key
- restrict the key by HTTP referrer to the exact deployed origins, such as `https://jozor.vercel.app/*`
- restrict the key by API scope to only the APIs needed by Picker/Drive flows
- keep OAuth client origins and redirect/callback origins aligned with the deployed environment
- rotate the key if it was ever tested without referrer restrictions

If these restrictions are not confirmed, do not promote the build beyond sandbox/staging.

## 5. App Smoke Validation

Run this manually on the target environment:

1. Sign in as an owner.
2. Create a tree.
3. Add a parent and a child.
4. Edit `first_name`, `profession`, and `bio`.
5. Reload the page.
6. Confirm the edits still exist.
7. Log out and log back in.
8. Confirm the edits still exist.
9. Share the tree with a `viewer`.
10. Confirm the viewer can open but cannot edit.
11. Promote the viewer to `editor`.
12. Confirm the editor can edit and changes persist after reload.

## 6. Collaboration Validation

Minimum acceptance:

- `viewer` cannot add relatives
- `viewer` cannot delete or set root
- `editor` can edit allowed data
- role changes are reflected after reload

Current automated coverage:

- [`app-smoke.spec.ts`](../tests/e2e/app-smoke.spec.ts) covers role-sensitive behavior and persistence
- [`collaboration-live.spec.ts`](../tests/e2e/collaboration-live.spec.ts) is available for real multi-user validation when test credentials are configured

## 7. Observability Check

Before release, confirm these flows produce useful diagnostics in the console or logs:

- person save failures
- `sync_tree_batch` failures
- `replace_tree_content` failures
- share invitation or role-update failures
- Google Drive auth or sync failures

Expected result:

- errors are categorized
- user-facing messages are clearer than raw backend errors
- logs include enough metadata to identify `treeId`, user, and operation type

## 8. Staging Sign-off

A staging environment is ready when:

- CI is green on the deployed commit
- Supabase audits pass
- app smoke validation passes
- collaboration validation passes
- no unexplained sync or auth regressions remain

## 9. Deferred But Tracked

Not required for every release, but recommended:

- run the live collaboration E2E with real test accounts
- confirm cross-browser interaction flows on `firefox` and `webkit`
- validate bootstrap from a clean environment if schema work landed in the release
