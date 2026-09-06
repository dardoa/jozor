# Person Media Migration, Server Cleanup and Viewer Realtime

Date: 2026-09-06
Scope: the first three follow-up items, in order. No production changes, commit,
push, hosted migration, or owner-data testing.

## Implemented

### Interrupted Legacy Migration

- Verification compares actual source/copy bytes, including resumed copies.
  Matching MIME and length alone no longer proves a successful copy.
- An ambiguous attachment response never triggers blind compensation. A response
  can be lost after the database committed; deleting that asset would break the
  current person record. Unreferenced candidates are recovered by the server sweep.
- Gallery finalization compares the entire expected item, not only asset ID.
  A concurrently edited caption/URL is preserved. A fresh retry can finalize the
  current item without uploading again.
- Finalization removes legacy fields and queues the public object in one database
  transaction. Storage deletion follows a separate guarded claim. Shared sources
  spanning people/batches are retained until their references are resolved.
- The owner API reports `pendingCleanupCount`; diagnostics distinguishes migrated
  references from files still waiting for server deletion. `cleanedCount` counts
  finalized references, not the number of physically deleted objects.

### Server Cleanup

- Service-only RPCs inventory/claim/acknowledge work in
  `private.person_media_cleanup`. Browser roles cannot invoke them.
- Storage bytes are removed through the Storage API, never by deleting
  `storage.objects` metadata in SQL. Failed deletions/acknowledgements retry.
- A tree-scoped transaction lock coordinates claims with person, checkpoint and
  operation writes. Persistent tombstones reject late references after a deletion
  starts. Unit tests and a real concurrent attachment/claim test cover this fence.
- Current people, retained checkpoints and retained operations protect referenced
  images. Legacy cleanup conservatively waits for all legacy references in the
  tree/history, including encoded URLs; unrelated legacy/external path fields can
  retain a public candidate. This is deliberate retention, not a deletion pass.
- Orphan discovery is private-image-only, after a **24-hour unattached-upload
  grace period**, limited to 200 new candidates and 100 processed per invocation.
  Fresh uploads and arbitrary public/user avatars are excluded. An upload left
  unattached longer than that grace period may need to be uploaded again; this is
  not an indefinitely durable offline upload reservation.
- `person-media-cleanup-cron` is scheduled daily in Vercel, authenticated with
  `CRON_SECRET`, but inert unless `PERSON_MEDIA_CLEANUP_ENABLED=true`. It has NOT
  been enabled or deployed. Counts only are returned; storage paths are not logged.
- These guards cover migration/server cleanup. Existing authorized interactive
  media deletion and archive rollback are separate paths; this is not a claim of
  globally transactional DB/Storage semantics for every deletion in the app.

### Viewer Realtime

- A restrictive SELECT policy denies raw `tree_operations` payloads to viewers,
  regardless of older permissive/ALL policies. Owner/editor access is preserved.
- `tree_change_signals` contains only `tree_id` and monotonic `revision`, is
  member-readable under RLS, and signals person/relationship/operation changes.
- Viewers subscribe to signals/permissions, then reload `people_secure` through
  the existing secure tree fetch. Raw operations are not replayed into their map.
- In-flight signals coalesce into a follow-up fetch. Account/tree/role changes
  discard stale snapshots; fetch failures leave a retryable error, not saving.
- Realtime subscriptions remain attached through saving/error/recovery. They are
  rebuilt on identity/tree/role changes, avoiding a previous disconnect window
  during every reconciliation. Reconnection triggers a fresh reconciliation.
- Fresh installs now publish operations/collaborators as well as the safe signal
  table; the isolated database initially lacked the first two publications.

## Runtime and Test Files

- `src/services/privatePersonMediaLegacyMigration.ts`
- `src/services/personMediaServerCleanup.ts`
- `src/api/person-media-migration.ts`
- `src/api/person-media-cleanup-cron.ts`, `api/person-media-cleanup-cron.ts`, `vercel.json`
- `src/services/operationalMaintenanceService.ts`
- `src/features/diagnostics/components/DiagnosticsMaintenancePanels.tsx`
- `src/utils/translations/{ar,en}/general.ts`
- `src/services/sync/{RealtimeSubscriber,DeltaRemoteSyncClient}.ts`
- `src/services/deltaSyncService.ts`, `src/hooks/sync/useSupabaseSync.ts`
- Forward migrations `20260906000200` through `20260906000600`
- `tests/integration/personMediaLifecycle.integration.test.ts`
- `vitest.media-integration.config.ts`
- Focused unit tests for migration, cleanup, cron authentication/activation,
  snapshot reconciliation and subscription lifecycle.

## Verification

Final combined gates:

| Gate | Result |
| --- | --- |
| Sync/media/maintenance/diagnostics unit and component regressions | 151 passed across 28 files |
| Real local Auth, Storage, RPC and websocket suites | 13 passed across 2 files |
| Application typecheck | Passed |
| API typecheck | Passed |
| Scoped ESLint, including new tests and translations | Passed with `--max-warnings=0` |
| Git whitespace check | Passed; existing LF/CRLF conversion notices remain |

The unit suite deliberately logs synthetic RPC/IndexedDB failures; this is not
a claim of silent output or a full-application regression run.

Independent SQL after teardown verified **81 applied migrations** and **zero**
auth users, profiles, trees, people, image objects, cleanup jobs and change signals.
No production project data was used. The normal application was not stopped.

Fault-injection tests
use only synthetic accounts/trees at `http://127.0.0.1:55321` and real Auth,
PostgREST, Storage and Realtime services. A local-only guard rejects hosted targets
for this fault-injection suite. Test-only timestamp ageing changes metadata on
known synthetic objects; byte deletion still uses the Storage API.

The eight lifecycle scenarios cover lost acknowledgements, shared sources across
batches, concurrent profile/gallery edits, interrupted deletion, orphan ageing
and retained history, a simultaneous claim/attachment race, and actual editor vs
viewer websocket delivery including downgrade/revocation. The existing five media
HTTP integration tests cover image bytes, gateway masking, sync/checkpoints and
revoked delivery. Negative socket assertions are paired with positive editor
delivery and positive safe viewer delivery; an unpublished/broken feed cannot
count as a privacy pass.

## Checkpoint Reconciliation Regression

The final checkpoint review also covered the editor's operation-history-gap
path. Checkpoint recovery now retains the in-flight reconciliation lock until
the reload settles and marks a successful current-session reload synced.
Discarded results after an account, tree or role change cannot overwrite the
new context's status. Five regression cases cover completion, coalescing and
the three context changes; the focused reconciliation/recovery run passed 12
tests across two files.

## Hosted Gate: Historical Blocker

Update (2026-09-06): the distinct-staging prerequisite below was superseded by
the owner's explicit prelaunch authorization. See the later
[hosted validation report](prelaunch-hosted-validation-2026-09-06.md) and
[legacy avatar closure](legacy-avatar-storage-hardening-2026-09-06.md) for the
applied forward migrations and 13 hosted synthetic tests. Deployed API/Edge
and browser checks remain separate gates; automated cleanup stays disabled.

Follow-up CI coverage and a read-only metadata preflight are documented in
[the staging readiness gate](person-media-staging-readiness-2026-09-06.md).
Metadata presence does not replace the hosted runtime checks below.

Read-only `supabase projects list` returned one accessible healthy project,
`Jozor`, in `ap-south-1`. No separate hosted staging project was available to
verify. The existing integration guard rejects the application's configured
project as a destructive-test target.

Required next steps:

1. Provide a distinct hosted Staging project, explicit project reference and test
   credentials in a private environment file. Do not copy production family data.
2. Apply the full reviewed forward migration set there before the new API code.
   Deploy the matching API/Edge code and verify publication/RLS/server secret.
3. Exercise actual hosted API routing, Storage, account deletion and role changes,
   plus browser reload/reconnect and a cold route. Local HTTP tests are not proof
   of hosted Edge/Vercel configuration or a deployed account-deletion workflow.
4. Enable the scheduled cleanup only after reviewing retained-candidate counts,
   history retention and the 24-hour upload grace policy in Staging.
5. Re-run final gates, organize a checkpoint, and request deployment approval.

Private voice memories/complete audio backup fidelity, person-record maturity,
sparse poster composition and the separate Firefox environment issue remain
outside this pass. Kindi/help are not being restarted or declared unfinished here.
