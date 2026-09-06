# Archive Import: Offline Cleanup Recovery

Date: 2026-09-06 (Asia/Riyadh)

Status: targeted local runtime and failure-recovery verification passed.
No hosted migration/deployment, commit, push, or production approval.

## Reproduced Gap

Failed cloud imports previously queued individual image deletions using the
normal active-tree media queue. The failed destination was not normally the
active tree, so those jobs might never run. After image cleanup, no durable job
remained to remove the empty failed tree. Failure of the tree deletion itself
was also only logged.

The existing profile/gallery queue still serves normal confirmed-tree edits.
Its behavior and editor permissions were not changed by this pass.

## Implementation

- `src/services/archiveImportCleanupQueue.ts` records one compensation job for
  the failed tree, including every successfully uploaded image target, before
  attempting network cleanup. Tokens, emails and binary images are not stored.
  Jobs are scoped to their initiating account, validated again before execution,
  and kept through network failures with bounded exponential backoff.
- `src/utils/db.ts` adds `archive_import_cleanup` in IndexedDB schema version 9.
  Existing tables remain present; no destructive local reset is performed.
- `src/hooks/utils/useArchiveImportCleanupLifecycle.ts` processes the signed-in
  account's jobs independently of the selected tree. It runs at initialization,
  on reconnect, when a new failed import is queued, and every 30 seconds while
  online. Periodic checks handle reconnects that arrive before backoff expires.
  Session changes and unmount invalidate further work from the old hook.
- `src/features/tree-manager/services/importTreeService.ts` preserves the
  original import error and enqueues guarded compensation instead of blindly
  deleting the destination. If local persistence fails, it warns the user that
  review is needed; it does not claim a durable retry was recorded.
- `20260906000100_guard_failed_import_cleanup.sql` adds an owner-only cleanup
  RPC. A missing or inaccessible tree produces the same non-destructive result.
  Trees with people or collaborators are retained. Finalization locks the tree,
  checks these conditions again, refuses deletion while Storage metadata remains,
  and deletes only the empty destination. Anonymous execution is revoked.
- Saved-content or ambiguous states become `review-required`, stop automatic
  deletion, and produce a localized warning directing the user to review their
  trees in Vault. Translation and notification dispatch were unit tested in
  Arabic and English. This pass did not add a cleanup management screen.

In particular, failure to restore the focal person after successful content
insertion no longer implies that all saved people should be deleted later.

## Real Browser Recovery

Only the isolated local backend (`127.0.0.1:55321`) and review app
(`127.0.0.1:3300`) were used. A synthetic owner opened a two-person source tree
and imported the actual image-bearing `media-roundtrip.jozor` file via Vault's
**Import as new tree** control. No application-store fixture injection was used.

1. Browser request interception aborted the gallery upload and Storage DELETE
   requests with an internet-disconnected failure. Profile upload succeeded.
2. Mandatory IndexedDB assertions found exactly one pending failed-import job,
   one uploaded target, and at least one failed cleanup attempt. Independent SQL
   found **2 trees, 2 people, 1 private image object**. The extra tree was empty.
3. Reloading the source tree retained the same job identity and creation time.
   The persisted job contained no token/bearer fields.
4. The browser was explicitly put offline, Storage interception was removed,
   and the browser was brought back online. Without opening the failed tree or
   calling the queue service from the test, the runtime drained the job.
5. Independent SQL then found **1 tree, 2 people, 0 private image objects**.
   The original tree URL and the child's visible heading were preserved.

This is selective Storage fault injection followed by a real browser offline /
online transition, not a claim of reloading the whole app with its server offline.
The CLI initially retained a stale file-chooser modal after `setFiles`; clearing
that tool state was required before the reload step. It did not invalidate the
persisted job or create a second tree. An invalid text file was rejected before
resource creation while clearing that state.

Ignored local evidence:

- `output/playwright/archive-cleanup-deferred.png`
- `output/playwright/archive-cleanup-recovered.png` (visually inspected)
- `output/playwright/archive-cleanup-fault.js`
- `output/playwright/archive-cleanup-reconnect.js`

## Verification

| Gate | Result |
| --- | --- |
| Import, cleanup queues/lifecycles, DB schema, localization, archive restore, photo/gallery and orchestration Vitest | 81 passed across 11 files |
| Import suite after final persistence-failure warning | 11/11 passed again |
| Real Auth/PostgREST/Storage cleanup integration | 5 passed |
| Application TypeScript check | Passed |
| Scoped ESLint | Passed with `--max-warnings=0` |
| Git diff whitespace check | Passed; existing LF/CRLF notices remain |

The 5 real integration cases cover private-object ordering, another account,
saved content added between preflight and finalization, shared trees, and
anonymous denial. The unit suite covers Storage and finalization failures,
backoff, account/session changes, target validation, concurrent flush calls,
empty-image imports, and warning localization.

The broader existing photo/gallery tests deliberately log their simulated
failure cases; orchestration also reports its fixture's missing active tree.
These are passing assertions, not a claim of warning-free test output. Realtime
was excluded locally and browser websocket 503s remain outside this gate.

To rerun the real backend suite, prepare the existing isolated workspace, apply
the new forward migration locally, then run:

```powershell
$env:SUPABASE_INTEGRATION_ENV_FILE = 'output/private-media-local/.env.integration'
npx vitest run --config vitest.integration.config.ts tests/integration/archiveImportCleanup.integration.test.ts
```

The strict integration target guard is used; credentials never fall back to the
application environment. This RPC does not require Edge Runtime.

## Limits and Handoff

- The journal belongs to this browser profile. Clearing browser storage loses
  it, and it is not a server-side scheduled cleanup worker.
- Earlier individual media jobs are not reclassified as failed-tree jobs;
  deleting a tree cannot safely be inferred from a normal photo cleanup target.
- An upload that reaches Storage but loses its success response may leave an
  unknown object. Finalization retains that tree for review rather than deleting
  it and abandoning the object. Lost final-deletion acknowledgments likewise
  remain conservative when the tree is absent.
- Storage deletion and PostgreSQL finalization are separate transactions. The
  final tree lock protects the metadata deletion check; this is not a global
  cross-service transaction or a proof against every concurrent asset attach.
- `review-required` jobs intentionally need manual review. No automatic action
  empties populated/shared trees or overrides a changed ownership decision.
- Hosted rollout must apply the RPC migration with the client release. Until
  then failed RPC calls remain queued; no cloud changes were made here.

After verification, the test browser and review server were closed, synthetic
fixtures removed, and isolated containers stopped. Independent SQL confirmed
**76 migrations and zero auth users, profiles, trees, people or image objects**.
The normal app, the user's browser, and all unrelated working-tree changes were
preserved. Interrupted legacy migration/concurrent replacement, hosted staging,
private audio, and sparse poster composition remain separate work.
