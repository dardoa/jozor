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
