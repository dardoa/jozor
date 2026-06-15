# Release Readiness Checklist

Use this checklist before:

- promoting a build to staging
- validating a staging environment before QA
- cutting a production release

This checklist has two gates:

- **Sandbox/Staging gate**: enough to keep the current hosted test environment
  safe for development, demos, and controlled validation.
- **Production gate**: required before presenting Jozor as a public, paid,
  non-sandbox service.

This file is the operational companion to:

- [`supabase-bootstrap-runbook.md`](./supabase-bootstrap-runbook.md)
- Supabase diagnostics under [`supabase/diagnostics`](../supabase/diagnostics)
- [`production-readiness-audit-2026-06-15.md`](./production-readiness-audit-2026-06-15.md)

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

Sandbox gate:

- `typecheck`, `lint`, and the relevant targeted tests pass.
- `build` passes when the change touches runtime code or Vercel API behavior.
- Smoke validation passes on the deployed Vercel URL after pushing.

Production gate:

- full `npm run test` passes
- `npm run test:e2e:smoke` passes
- cross-browser smoke is checked on Firefox and WebKit for release candidates

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

Sandbox gate:

- the deployed commit is known and GitHub contains the pushed changes
- any failing CI job is understood before continuing the same track

Production gate:

- GitHub Actions is green on the exact commit being promoted
- failed, skipped, or cancelled checks are treated as blockers unless explicitly
  documented as unrelated infrastructure noise

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

Sandbox gate:

- migrations that changed behavior are applied to the linked sandbox project
- `security_definer_boundary_check.sql` and
  `rpc_execution_contract_check.sql` return no rows after security changes
- the leaked-password warning is allowed only while the project remains on the
  Free plan and the environment is treated as sandbox/staging

Production gate:

- all required migrations are applied to the production project
- Supabase advisors have no unresolved high-risk warnings
- leaked-password protection is enabled when the project plan supports it
- rollback notes exist for every schema change in the release window

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

Sandbox gate:

- OAuth and Picker flows work with sandbox credentials
- exposed browser keys are known to be sandbox keys
- Google Drive backup login and file listing work in the deployed test app

Production gate:

- Google API key is restricted by exact production HTTP referrers
- OAuth origins and redirect/callback origins match production URLs
- keys used during unrestricted testing are rotated before public launch

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

Sandbox gate:

- root route and at least one deep route refresh without Vercel `404`
- owner can create/edit/delete and changes persist after reload
- Google Drive backup login works if the release touched Vault or auth flows

Production gate:

- the full manual smoke list passes on the production candidate URL
- test accounts cover owner, viewer, editor, and admin surfaces
- no unexplained console errors remain in the primary user flows

## 6. Collaboration Validation

Minimum acceptance:

- `viewer` cannot add relatives
- `viewer` cannot delete or set root
- `editor` can edit allowed data
- role changes are reflected after reload

Current automated coverage:

- [`app-smoke.spec.ts`](../tests/e2e/app-smoke.spec.ts) covers role-sensitive behavior and persistence
- [`collaboration-live.spec.ts`](../tests/e2e/collaboration-live.spec.ts) is available for real multi-user validation when test credentials are configured

Sandbox gate:

- viewer/editor/owner permission behavior is checked for any release touching
  tree actions, Kindi actions, Smart Persona, Vault, settings, or diagnostics

Production gate:

- live collaboration smoke is run with real test accounts
- role changes, invitation acceptance, invitation decline, and revocation are
  validated after reload

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

Sandbox gate:

- failures are visible enough for the owner/developer to triage without raw
  secrets or raw family data in logs

Production gate:

- user-facing errors avoid internal details
- operational logs retain enough safe metadata for support
- paid-plan, billing, Google Drive, and sync failures have distinct categories

## 8. Sandbox/Staging Sign-off

A sandbox or staging environment is ready when:

- the deployed commit is pushed and identifiable
- Supabase audits pass
- app smoke validation passes
- collaboration validation passes
- no unexplained sync or auth regressions remain

The current `https://jozor.vercel.app` environment is treated as sandbox unless
all production-gate items below are explicitly completed.

## 9. Production Sign-off

Production launch is blocked until:

- CI is green on the exact promoted commit
- full unit, typecheck, lint, build, and smoke checks pass
- Supabase production advisors are clean or explicitly accepted with owner sign-off
- Google Cloud browser keys are restricted and rotated as needed
- Paddle is switched from sandbox to production deliberately, with webhook
  destination, webhook secret, client token, price IDs, and entitlement mapping
  verified
- admin override tools are limited to owner/admin accounts and audit logging is
  retained
- release rollback notes and support contact path are documented

## 10. Deferred But Tracked

Not required for every release, but recommended:

- run the live collaboration E2E with real test accounts
- confirm cross-browser interaction flows on `firefox` and `webkit`
- validate bootstrap from a clean environment if schema work landed in the release
