# Private Media: Local Supabase Rollout Evidence

Date: 2026-09-05

Status: local Auth, PostgREST, Storage, PostgreSQL, browser photo lifecycle,
image-bearing archive round trip and real local HTTP delivery verification
passed within the scope recorded below.
Hosted staging rollout and production rollout: not performed.

## Isolation

The current CLI account exposes one hosted project, `Jozor`. No cloud project
was created, migrated, reset, or used for these tests. The app's `.env` and
`.env.integration` were not changed.

Docker Desktop was started and an independent Supabase project was initialized
under the Git-ignored `output/private-media-local` directory. Its project ID is
`private-media-local`, API port is 55321, database port is 55322, and shadow port
is 55320. It has no linked cloud project. All account/person/image data was
synthetic. The UI on port 3000 remains connected to its previous configuration.

`scripts/testing/writeLocalMediaEnvironment.mjs` accepts piped local CLI status,
validates the dedicated loopback URL, and writes only the ignored local test
environment file. Credentials are never included in this report or committed.

## Reproduced Fresh-Install Failures

Executing the complete migration history, rather than selected SQL against a
simulated schema, exposed these prerequisites:

1. The first ownership policies called `current_user_id_text()` before any
   checked-in migration created it. The initial bootstrap now creates the
   JWT-subject helper only if absent; it never replaces a later implementation.
2. The invitation action functions declared a table `%ROWTYPE` before the
   invitation-table migration. They now use `RECORD` and resolve the row at
   execution, after installation. A database regression test creates the
   functions first and successfully declines an invitation after table creation.
3. Three security-advisor migrations assumed legacy helpers already existed.
   Their targeted hardening/grants now tolerate absent legacy functions while
   preserving the original restrictions on functions that exist. Tests verify
   anonymous denial, intended authenticated access, and the email helper's
   explicit removal of authenticated access.
4. Another advisor migration assumed a legacy `public.media` table existed.
   Its service-role-only policy is conditional on table existence; no replacement
   table or permissive policy is introduced.
5. The initial collaborator table lacked `collaborator_uid`, even though the
   runtime authorization functions require it. The bootstrap now includes the
   identity column. The real HTTP fixture reproduced this before the correction.

These corrections repair reconstruction of a **fresh** database. They do not
replay already-applied history on deployed databases. Do not mark remote
migrations unapplied or run a remote reset to deploy these historical repairs.
If a deployed schema lacks a prerequisite, inspect it and use a separate forward
migration. The two new private-media migrations remain unchanged in this pass.

## Integration Safety Gate

Both existing integration suites now share a single offline environment loader:

- Explicit mutation opt-in is required before creating a client.
- Cloud project references must be real-shaped references, not placeholders.
- HTTPS host matching is exact, not `includes()`; user info, paths, query strings,
  fragments, custom ports and deceptive host suffixes are rejected.
- Declared production and configured application/deployment targets are denied.
- Local mode accepts only `http://127.0.0.1:55321`.
- Credentials never fall back to the app's `.env`.
- Both integration Vitest configurations disable `.env` loading and install only
  verified test credentials. The media suite also checks the handler's resolved
  runtime credentials before sending requests.

The default `.env.integration` currently fails the stricter preflight because
its staging/production references do not satisfy validation. This is an expected
safety rejection, not a passing cloud rollout. No network calls occur in the
preflight command.

## Initial Backend Results

| Gate | Result |
| --- | --- |
| Full local Supabase start, then fresh local reset | 73 migrations applied |
| Integration target unit tests | 20 passed |
| Isolated PostgreSQL tests | 37 passed: 32 media + 5 bootstrap regressions |
| Real local media integration | 3 passed, including verified cleanup |
| Existing real privacy integration | 6 passed |
| Application and API typechecks | Passed |
| Scoped ESLint | Passed |

The media integration suite uploads a real PNG via owner and editor clients,
compares downloaded bytes, denies public and direct viewer reads, exercises
the actual media API handler against real local Auth/PostgREST/Storage services,
checks both profile and gallery delivery, masks living/private people, rejects
unauthenticated and unknown-asset requests, and revokes access after role
downgrade or collaborator removal. Only the framework request/response objects
are an in-process adapter; the Supabase clients and responses are not mocked.

The earliest failed fixture run left three synthetic profile rows after deleting
their auth accounts. The media suite now deletes profiles explicitly and verifies
object, tree and auth-account cleanup. Those three identified remnants were
removed only from the isolated local database.

Final independent SQL counts confirmed 73 applied migrations, zero test auth
users, zero profiles, zero trees, zero people, and zero `person-media` objects.
This does not claim a deployed HTTP route, browser visual review, or production
approval.

The task's local Supabase containers were stopped after verification, preserving
their local database volume for subsequent runs. No other containers were stopped.

## Reproduction

Fresh initialization used `supabase init --workdir output/private-media-local`.
The generated config was set to the local ports above (Studio 55323, SMTP 55324,
pooler 55329), with seeds and storage vector disabled. The entire repository
`supabase/migrations` directory was copied to that isolated workspace.

With Docker running and this isolated workspace prepared:

```powershell
npx --no-install supabase start --workdir output/private-media-local --exclude studio,postgres-meta,realtime,imgproxy,mailpit,edge-runtime,logflare,vector,supavisor
npx --no-install supabase status --workdir output/private-media-local --output env | node scripts/testing/writeLocalMediaEnvironment.mjs
$env:SUPABASE_INTEGRATION_ENV_FILE = 'output/private-media-local/.env.integration'
npm run test:integration:preflight
npm run test:integration:media
npx vitest run --config vitest.integration.config.ts tests/integration/privacyDatabase.integration.test.ts
```

Do not run `db reset` without **both** `--local` and the isolated `--workdir`.
Do not copy `.temp/project-ref`, a production `.env`, or live rows into this
workspace. `test:integration:media` is deliberately separate from the broader
SaaS suite, which has other mutation scenarios outside this media gate.

## Browser Lifecycle and HTTP Follow-up

The review app ran at `http://127.0.0.1:3300` using
`vite.media-review.config.ts` and the same verified isolated backend. This config
disables application `.env` loading and Kindi AI calls. `dev:media-review` starts
this app without changing the regular port-3000 configuration. The fixture
helper, `scripts/testing/localMediaBrowserFixture.mjs`, creates a synthetic owner
and tree; it stores temporary authentication only in the ignored output folder.

### Bugs Reproduced and Fixed

1. The local API middleware did not route person-media delivery or migration and
   did not support binary responses. Both routes now load the actual server
   handlers through Vite SSR and use a binary-capable response adapter.
2. A fresh database lacked the `people.created_at` and `people.updated_at`
   columns required by existing synchronization RPCs. The forward migration
   `20260905000300_ensure_person_sync_timestamps.sql` adds only missing columns.
   It preserves existing values and is tested for repeat application. This
   migration was applied locally after the 73-migration reset, not remotely.
3. Recovering a paused outgoing queue and reconciling incoming data could show
   "saving" instead of the actionable paused/error state. Recovery now reads the
   post-enqueue status, and status helpers preserve paused pending work.
4. Clicking the sync indicator opened Vault instead of the retry controls.
   It now exposes the status tooltip; the Vault action remains available inside.
5. The profile-photo chooser was click-only and deletion was hover-only. Upload
   is now a named native button, with a separate delete button reachable by
   keyboard and visible on touch screens. Upload progress disables the chooser.
6. Photo upload completion and upload/remove failure toasts now use localized
   message keys. This is not a claim that all early-return upload messages have
   been localized.
7. Media API logging imported client-side state dependencies into server code.
   The handlers now log safe operation labels and error classes; migration
   success logging contains batch counts, not user/tree identifiers. Supabase
   configuration uses explicit static Vite environment reads for SSR loading.

### Observed Results

- Initial upload reproduced the sync-schema failure; it was not counted as a
  successful persisted photo. After repair, explicit UI retry persisted the
  replacement typed asset at version 2 and removed the superseded object.
- Reloading the tree and person drawer displayed complete, nonblank photos with
  browser `blob:` sources. Keyboard activation opened the chooser; keyboard
  deletion removed both the persisted reference and private Storage object.
- Desktop (1034 x 737) and mobile (390 x 844) screenshots were inspected. Mobile
  upload/delete controls stayed inside the viewport and deletion was visible
  without hover. These are targeted checks, not a complete responsive audit.
- A real HTTP request to `/api/person-media` returned the exact stored bytes,
  the expected MIME type, and `private, no-store, max-age=0`. An unauthenticated
  request returned 401. The migration endpoint also handled an empty batch.
- A synthetic legacy public photo was migrated via the real HTTP endpoint:
  one migrated, zero failed, byte-for-byte private copy, old public object
  inaccessible, legacy URL/path cleared, and typed private asset attached.

Evidence retained locally (ignored, not committed):

- `output/playwright/private-media-reloaded.png`
- `output/playwright/private-media-mobile.png`
- `output/private-media-local/browser/http-evidence.json`
- `output/private-media-local/browser/legacy-evidence.json`

### Final Verification and Cleanup

| Gate | Result |
| --- | --- |
| Focused Vitest: persona, media APIs, sync, local proxy, environment guard | 140 passed across 33 files |
| Isolated PostgreSQL tests | 38 passed: 32 media + 6 bootstrap/timestamp regressions |
| Real local media integration | 4 passed, including actual sync RPC attach/remove |
| Real local privacy integration | 6 passed |
| Application and API typechecks | Passed |
| Scoped ESLint | Passed with `--max-warnings=0` |
| Git diff whitespace check | Passed; Windows LF/CRLF conversion warnings remain |

The PGlite-only configuration now permits 30 seconds per test for WASM database
startup and repeated DDL under CPU load; assertions were not weakened. The first
combined run exposed an outdated client-logger assertion, which was corrected
to verify safe server logging before the final 140-test passing run.

After closing the test browser, fixture cleanup removed its tree, both profile
photos, synthetic profile/account, and local authentication files. Independent
SQL counts confirmed **74 migrations and zero auth users, profiles, trees,
people, or objects in `person-media`/`avatars`**. The evidence JSON files contain
only result metrics and timestamps, not credentials.
The dedicated port-3300 review server and local Supabase containers were stopped
after verification, preserving the local database volume. The regular app server
and the user's in-app browser were not stopped.

Realtime was deliberately excluded from this minimal local Supabase stack.
Websocket/realtime requests therefore produced 503 errors during browser review;
this is not a clean-console or multi-client realtime pass. Persistence was
checked using actual RPCs, independent database reads, HTTP requests and reload.

## Image Archive Round Trip Follow-up

The same isolated backend and port-3300 review app were used with a new synthetic
owner, two related people, one private profile photo and one private gallery
photo. The gallery caption was entered in Arabic through the UI. A real browser
download event captured the `.jozor` archive; the actual file was then imported
through **Import as new tree**, not through a mocked importer or store injection.

### Reproduced and Fixed

1. Export removed the gallery's caption and original creation date. The optional
   v2 `media.galleryMetadata` extension now preserves these fields by packaged
   file path. Both local restore and cloud extraction validate the extension;
   older v2 files without it remain supported. Skipped images cannot shift the
   metadata onto a different image.
2. Cloud import discarded the original focal person and selected the first
   imported record. The extractor now retains `focusId`; import remaps it through
   the new person-ID map and restores the root inside the rollback-protected
   operation. Unknown focal IDs are rejected before creating resources.
3. `private.generate_tree_checkpoint` omitted `photoAsset`. The database and
   Storage contained the correct image, but the checkpoint-first read path
   returned a person without it after import/reload. The forward migration
   `20260905000400_include_private_photo_in_tree_checkpoints.sql` adds that field
   without changing relationship semantics or allowing viewer checkpoint access.
   A real integration test failed on the missing field before the migration and
   passed after it. The migration was applied locally only.
4. `buildPersonCustomFields` discarded an explicit deceased flag when no death
   date was available. It now persists `isDeceased`; both a mapper regression
   test and the actual import/reload verify this case.

Historical checkpoints are **not** rewritten by the new migration. Existing
bad imported fixtures were removed during cleanup. Any hosted rollout must
coordinate this forward migration with the runtime and separately assess old
checkpoints; the local test is not evidence of a historical data repair.

### Observed Browser and Storage Results

- The restored tree has two new person IDs, the same relationship and focal
  person, two new private object paths/asset IDs, and byte-for-byte identical
  images. The gallery caption/date and explicit deceased status are preserved.
- After reloading the `/tree/<id>` URL, both real HTML image elements completed
  decoding with positive natural width and `blob:` sources. The screenshot was
  inspected, including the Arabic gallery caption. A placeholder or database
  reference alone was not counted as a display pass.
- Authorized HTTP delivery returned the exact stored bytes for both images;
  public Storage requests were denied. The private owner archive contains
  actual image files, not `objectPath`, provider-bound media references, bearer
  credentials or temporary blob URLs. This is an owner backup, not a public
  anonymized export; ordinary archive person IDs remain intentional.
- Blocking the gallery Storage upload in the browser made import fail. The
  successful profile upload was compensated, and before/after evidence retained
  exactly three existing trees and six objects. Independent SQL found zero
  orphan private objects. This tests upload failure with working compensation,
  not simultaneous offline failure of the cleanup operation.
- Deleting the restored gallery image through the UI removed both its stored
  reference and private object. Reload confirmed that it stayed deleted while
  the profile photo still loaded. The original synthetic tree was unchanged.

Ignored local evidence:

- `output/playwright/media-roundtrip.jozor`
- `output/playwright/media-archive-final-reload.png`
- `output/playwright/media-archive-gallery-deleted.png`
- `output/private-media-local/browser/archive-export-evidence.json`
- `output/private-media-local/browser/archive-restore-evidence.json`
- `output/private-media-local/browser/archive-rollback-evidence.json`
- `output/private-media-local/browser/archive-gallery-delete-evidence.json`

`scripts/testing/localMediaArchiveEvidence.mjs` checks independent database,
Storage, HTTP and archive bytes behind the existing strict local-target guard.
`localMediaBrowserFixture.mjs create --archive` prepares the synthetic family;
cleanup verifies the owner identity before removing its imported trees as well.

### Verification and Cleanup

| Gate | Result |
| --- | --- |
| Archive, import, row mapper, mutation, Drive/export regressions | 55 passed across 8 files |
| Real local media integration, including checkpoint projection | 5 passed |
| Real local privacy integration | 6 passed |
| Application and API typechecks | Passed |
| Scoped ESLint | Passed with `--max-warnings=0` |
| Git diff whitespace check | Passed; existing LF/CRLF notices remain |

The snapshot-export unit suite still emits the existing jsdom canvas
`getContext` not-implemented warning. Realtime remains excluded from this local
stack, so its browser 503 errors are not counted as a clean-console pass.

Cleanup removed all five synthetic trees, ten people, nine remaining image
objects, and the synthetic account/profile. Independent SQL confirmed **75
migrations and zero auth users, profiles, trees, people or image objects**.
The test browser, dedicated Vite server and isolated Supabase containers were
closed/stopped; the normal app and in-app browser were not touched.

## Still Required

The follow-up in [Person Routes and Private Photo Poster Review](person-route-and-private-photo-poster-review-2026-09-06.md)
verified actual private-photo SVG/PNG/PDF downloads and cold person-route reload
with local Edge Runtime enabled. The earlier media stack excluded that runtime;
its navigation observation alone was not evidence of a production failure.
The follow-up also corrects stale authorization caching and viewer context
resolution. Those changes remain local and need coordinated hosted deployment.

1. Hosted verification and manual-review tooling for ambiguous import cleanup.
   [Offline import cleanup recovery](archive-import-offline-cleanup-2026-09-06.md)
   is now locally verified through an actual failed upload, failed Storage
   deletion, reload and reconnect. The account-scoped journal removes the empty
   failed tree only after media cleanup. Saved/shared content is retained for
   review; the report records browser-local and cross-service limitations.
2. The [migration, server cleanup and viewer realtime follow-up](person-media-migration-realtime-closure-2026-09-06.md)
   now covers interrupted retries, concurrent changes, actual Storage cleanup
   and payload-free viewer websocket events locally. Hosted activation and the
   conservative retained-history/24-hour upload policy still require review.
3. A separately verified hosted staging target for deployed API and policy
   interactions, including realtime, before coordinated production rollout.
4. Sparse poster composition and constrained inline preview usability, recorded
   in the follow-up report. Successful image embedding does not close those
   product/design findings or constitute owner visual approval.
5. Voice notes are not packaged by the current image archive path. Private audio
   and full backup fidelity still need their separate contract and lifecycle.

No commit or push was made in this follow-up pass.
