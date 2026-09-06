# Person Media: Staging Readiness and Regression Gate

Date: 2026-09-06
Original hosted status: Blocked pending a separate staging target.
Production changes: None. Cleanup remains disabled. No commit or push.

Superseding owner decision: the current project is prelaunch test data and may
be used for bounded hosted validation. A separate project is no longer required
for this pass. See [the prelaunch handoff](prelaunch-hosted-validation-2026-09-06.md)
for backup status, mutation boundaries and the revised execution order. The
historical verification results below do not claim a hosted run.

Follow-up: [Kindi cross-browser and legacy-image closure](kindi-cross-browser-closure-2026-09-06.md)
records the Firefox environment resolution, the actual legacy-image defect found
after launch, and 60 passing browser journeys. This closes that local browser
item, not the hosted runtime gate. A fresh read-only inventory still found only
the application project, with no separate staging target.

## Changes in This Pass

- Added `npm run test:staging:media-preflight`. It validates the target before
  constructing any request, then reads only the PostgREST API catalog and the
  `person-media` bucket configuration. It does not invoke RPCs, query families,
  create users, apply migrations, or delete objects.
- Requests have a timeout, prohibit redirects and caching, and never report
  provider response bodies, request credentials or project URLs. Output contains
  endpoint availability and bucket-contract checks only.
- Read-only probing does not require mutation opt-in. All normal integration
  tests still require `ALLOW_INTEGRATION_MUTATIONS=true`; production/app target
  rejection and exact target matching are unchanged for both paths.
- General integration runs exclude the local lifecycle fault-injection suite.
  The media configuration includes it only for the dedicated local target.
  Staging retains the five real Auth/Storage/handler tests, not Docker-specific
  timestamp ageing or synthetic lost-response injection.
- Extended the existing CI PostgreSQL suite with 12 real-SQL cases for cleanup
  permissions, retained references, tombstones, Storage acknowledgement, orphan
  grace periods, gallery compare-and-set, viewer payload isolation, role changes,
  safe revision triggers and publication membership. No SQL body is mocked.
- Registered the reviewed server-only cleanup API entry in the existing API
  boundary allowlist. Its handler imports only the Supabase SDK, Vercel types
  and the server cleanup helper; the helper has no browser/store dependencies.
- Updated the strict Vercel schedule test to require both daily jobs, rather
  than the old assumption that the reminder is the only scheduled job.
- The broader browser gate found a Kindi keyboard-focus handoff failure. The
  old five retries ended after 160ms, before a lazy person drawer could mount or
  settle. The bounded handoff now survives a delayed/remounted destination,
  waits for Kindi to close, and cancels on keyboard/pointer interaction, another
  focused control or a new Kindi action. Three regression cases cover delayed
  mounting/remounting, cancellation and timer disposal; no E2E assertion was
  weakened or timeout increased.

## What the Metadata Result Means

`prerequisites-present` means the required public API entries are exposed and
the private bucket has the expected 5 MiB JPEG/PNG/WebP restrictions. It does
**not** prove current function bodies, deployed route code, RLS, websocket
delivery, image bytes, account deletion, or browser recovery.

Every report keeps `runtimeVerified: false` and lists the outstanding runtime
gates. Missing, malformed, inaccessible or mismatched metadata returns `blocked`
and a nonzero exit code. No hosted success was recorded in this pass.

## Hosted Run Order

1. Provision a separate, empty staging project with explicit owner approval.
   Do not reuse the application's configured project or copy family data. Review
   costs, project region and access separately from this implementation.
2. Store the staging/production references and test credentials in the ignored
   `.env.integration`, following `.env.integration.example`. Keep
   `ALLOW_INTEGRATION_MUTATIONS=false` initially. Never place credentials in a
   review document or terminal output.
3. Apply the reviewed forward migration set to that verified staging target.
   Deploy matching API/Edge code with staging-only credentials. Leave
   `PERSON_MEDIA_CLEANUP_ENABLED` unset or false.
4. Run `npm run test:staging:media-preflight`. Inspect the metadata report, but
   do not mark runtime verified from this result.
5. Only after approving synthetic test mutations in that separate project, set
   mutation opt-in to true and run the applicable integration suites:

   ```powershell
   npm run test:integration:preflight
   npx vitest run --config vitest.media-integration.config.ts
   npx vitest run --config vitest.integration.config.ts
   ```

   The media suite contacts real staging Auth/Storage/RPC services but invokes
   the local API handler. It is **not** evidence of deployed HTTP routing.
6. Verify deployed Vercel/Edge routes independently, including authenticated
   image delivery, masking, owner/editor/viewer changes, downgrade/revocation,
   account deletion, browser reload/reconnect, and cold person routes. Confirm
   synthetic test users, trees and objects are cleaned afterward.
7. Review retained-candidate counts, checkpoint/operation retention and the
   24-hour unattached-upload policy before explicitly enabling cleanup in
   staging. Production rollout remains a separate approval and verification.

## Local Verification

- PostgreSQL/PGlite: **50 passed**, two files (the prior 38 plus 12 new cases).
  This is SQL execution and publication metadata, not a websocket test.
- Combined focused gate: **60 passed**, five files (24 metadata, 22 environment
  guard, three integration-config isolation, four API boundary and seven Kindi
  trigger tests). Config isolation executes the real loader in Node with only
  synthetic credentials and networking disabled.
- Chromium app smoke + Kindi maturity: **36 passed, one intentionally skipped**
  in 4.3 minutes, exit 0 with natural process/server shutdown. The skipped case
  requires two real authenticated accounts; `E2E_AUTH_ROLE_HARNESS=false` kept
  this run synthetic. English help/mobile focus, Arabic relationships and safe
  changes, confirmation/undo, viewer/editor behavior and context boundaries ran.
- The initial browser run exposed the focus defect and a Windows test-server
  teardown hang. Only the verified test-owned server was stopped. A second run
  hit a page reload while source files were changing. The final run above used
  frozen files and process-management permissions; both issues are recorded,
  not counted as successful earlier runs.
- Build passed after the focus change. Browserslist reports an existing stale
  data warning; this pass did not update dependency metadata.
- Final application/API typechecks and full ESLint passed after the Kindi
  change. `git diff --check` passed; no conflict/whitespace errors.
- Full unit shard 1: **1219 passed, one existing skipped visual test**, 181
  passing files. Full unit shard 2 final rerun: **1156 passed**, 182 files,
  exit 0 in 519.45 seconds. The initial whole-project run exposed the two stale
  API/schedule assertions and three 5-second component timeouts during concurrent
  heavy gates. Assertions were corrected to the actual reviewed contracts; the
  unchanged component cases passed in the serial rerun without increasing their
  timeouts. Execution counts here overlap with focused gates and are not additive.
- Logs: `output/person-media-full-unit-final.log` (includes the initial failures),
  `output/person-media-unit-shard2-stable.log`,
  `output/person-media-app-kindi-browser-stable.log`, and
  `output/person-media-build-final.log`. Generated logs are ignored, not committed.
- Local Node was 24.11.1; the repository declares Node 22 for CI. No hosted CI
  or deployment was run or claimed in this pass.
- The placeholder environment was deliberately rejected by the staging CLI
  before any request. This is an expected guard pass, not a staging run.

Earlier real local Storage/websocket evidence and remaining product areas are
documented in [the lifecycle closure](person-media-migration-realtime-closure-2026-09-06.md).
