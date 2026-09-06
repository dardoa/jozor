# Kindi and Private Media Checkpoint

Date: 2026-09-06
Authorization: the owner explicitly requested commit and push to origin/main.
Local pre-push gate: passed, with the existing skipped cases identified below.
This is a delivery checkpoint, not beta or production acceptance.

## Commit Groups

The checkpoint retains the twelve existing local commits from `f4da066` through
`0875ebb` without rewriting them. The remaining changes are grouped into:

1. Private media authorization, guarded cleanup, archive import compensation,
   viewer-safe realtime, record routing, image UI boundaries and their forward
   SQL migrations/regression tests.
2. Kindi cross-browser focus handoff and isolated browser regression coverage.
3. Fresh SQL bootstrap repairs, guarded local/hosted integration tooling,
   development media API routing and verification/handoff documentation.

The source, tests and documentation are included. Local backups, environment
credentials, browser authentication state, build output, test reports and
exported artifacts are deliberately excluded.

## Pre-Commit Correction

The editor's pruned-operation-history path released its reconciliation lock
before the checkpoint reload and did not finish the saving status. The fix
keeps the lock until settlement and marks only a successfully applied,
current-context snapshot synced. Five new regressions verify completion,
coalesced notifications and discarded account/tree/role results. These cases
also ran in the complete unit gate below.

## Local Verification

| Gate | Result |
| --- | --- |
| `npm run typecheck` | Passed, rerun after the reconciliation correction |
| `npm run typecheck:api` | Passed |
| `npm run lint` | Passed, no ESLint warnings; changed reconciliation files rechecked afterward |
| `npm run test`, shard 1 | 182 files / 1266 tests passed; one file/test skipped |
| `npm run test`, shard 2 | 182 files / 1174 tests passed |
| Complete unit total | 364 files / 2440 tests passed; one existing skipped test |
| Focused reconciliation/recovery regression | 12 tests passed across two files |
| `npm run test:database:local` | 92 tests passed across three files |
| Chromium app smoke, one worker | 16 passed; one existing authenticated-account scenario skipped |
| Chromium Kindi maturity, one worker | 20 passed, no skips |
| `npm run build` | Passed; entry 882.30 kB / 287.61 kB gzip, within enforced budgets |
| Working and staged `git diff --check` | Passed |

The skipped unit is the existing real-tree visual test requiring an owner's
local file. The smoke skip requires the separate real-account auth harness;
synthetic role-boundary smoke tests did run. Neither skip is counted as a pass.
The previous Firefox/WebKit results remain in the cross-browser report; only
Chromium was rerun in this checkpoint.

Execution used local Node 24.11.1; GitHub Actions specifies Node 22 and remains
an independent clean-install/platform gate. Expected synthetic fault logs,
terminal color warnings and the existing stale Browserslist warning are not
represented as silent test output. Logs are Git-ignored under
`output/checkpoint-2026-09-06-*`.

A local audit inspected 321 outgoing/current paths and 621 content versions,
including 300 historical blobs in the twelve outgoing commits. Credential
patterns and exact local-secret comparisons produced no findings; no protected
artifact/environment paths were selected. This is a scoped check, not a claim
that automated scanning proves absence of every possible secret.

## Deployment Boundaries

- Vercel's production environment inventory has no
  `PERSON_MEDIA_CLEANUP_ENABLED`; the new cleanup handler remains disabled
  unless that flag is explicitly set to `true`. No activation was performed.
- The owner-authorized hosted SQL rollout and thirteen synthetic Auth/Storage/
  RPC tests are recorded in the [hosted validation report](prelaunch-hosted-validation-2026-09-06.md).
  This checkpoint did not rerun remote mutations or replay historical SQL.
- Vercel Git deployment does not deploy Supabase Edge Functions. The changed
  `resolve-tree-context` Edge function needs its own coordinated deployment
  and actual HTTP verification. A successful frontend build is not that proof.
- GitHub Actions and Vercel results must be checked for the exact pushed tip
  and reported in the delivery handoff, separately from these local gates.
- Legacy family-photo migration, automatic cleanup activation, deployed browser
  role/reconnect checks and a full restore rehearsal remain separately scoped.

No family photos, test credentials or backup bytes are published by this
checkpoint. The original-data preservation evidence remains private locally.

## Vercel Deployment Correction

The first push reached `d10bdbe`. Its Vercel build succeeded, but deployment
`dpl_EkQhMz3b2ucthnzqpvShfFAUnNdf` was rejected with
`exceeded_serverless_functions_per_deployment`. The authenticated deployment
metadata identified the current Hobby limit of twelve functions, consistent
with [Vercel's runtime limits](https://vercel.com/docs/functions/runtimes).
The root API directory contained fourteen entrypoints.

The three person-media entrypoints are consolidated into
`api/person-media/[action].ts`, reducing the root API entrypoint count to twelve.
Explicit rewrites preserve the existing read, migration and cleanup URLs and
their query parameters. The scheduled cleanup targets the canonical dynamic
route and remains gated by the same secret and disabled activation flag.
The existing handlers retain all method, CORS, session, role and asset checks.
Unknown, array-valued and prototype-property actions return 404 without
dispatching a handler.

The routing/media/boundary/config regression run passed 43 tests in six files.
API typecheck and scoped ESLint passed. A function-count regression now protects
the deployment budget. These focused post-push checks supplement, rather than
replace or relabel, the earlier complete local gates. The corrected pushed tip
still requires its own remote CI and Vercel result.

## Native API Runtime Correction

The consolidated deployment for `c61ec8e` reached Ready and its GitHub Actions
run passed. The independent public HTTP probe nevertheless returned 500 for
media routes. Vercel's runtime log identified `ERR_MODULE_NOT_FOUND`: the
compiled ESM entrypoint imported an extensionless source path. The existing
Vite/Vitest resolver and `noEmit` typecheck had not exercised Node's native
module loader.

The entrypoint and its local runtime dependency graph now use explicit `.js`
specifiers. Media handlers import the narrow media contract module rather than
the shared type barrel. Authentication and permission behavior are unchanged.
The new regression transpiles the real transitive graph into an ignored,
temporary ESM directory and imports it in a separate native Node process,
without a bundler and with network calls blocked. It requires read, migration
and cleanup to return 401 anonymously, and an unknown action to return 404.
The temporary directory is removed after the test.

Verification: 63 tests passed across eight media/runtime files; the native
smoke also passed independently after its cleanup-path adjustment. Application
and API typechecks, scoped ESLint and the production build passed. The emitted
entry bundle remains unchanged at 882.30 kB / 287.61 kB gzip. This regression
checks native startup and anonymous rejection, not authenticated image delivery
or the still-separate Edge deployment gate.
