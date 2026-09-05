# Smart Persona Private Media Foundation

Date: 2026-09-05

## Checkpoint status

Implementation status: **complete locally and pending database rollout**.

The two Supabase migrations in this checkpoint have not been applied to a linked or
production project. This document must not be read as evidence that live media
has already moved out of the legacy public `avatars` bucket.

## Decision

New person profile photos and gallery photos use a versioned
`PersonMediaAssetRef`. The persisted record contains an opaque private-storage
reference, never a public or signed delivery URL. UI consumers obtain a
short-lived browser `blob:` URL through `PersonMediaAssetResolver`; poster
exports obtain bytes and embed a `data:` URI into the canonical SVG.

The legacy `photoUrl`, `photoPath`, and string gallery formats remain read-only
compatibility inputs until the owner runs the resumable migration after database
rollout. New writes never create those legacy person-media formats.

## Canonical contract

`PersonMediaAssetRef` contains:

- schema version and provider identifier;
- private bucket name;
- opaque asset UUID and media kind;
- canonical object path;
- exact image MIME type and byte length;
- immutable asset version and creation timestamp.

The only accepted object-name shape is:

```text
{treeUuid}/{profile-photo|gallery-photo}/{assetUuid}.{jpg|png|webp}
```

The path contains no person ID, name, email address, or user ID. Client
validation, record projection validation, and storage RLS all enforce this
shape.

## Data flow

### Upload and record attachment

1. The client validates JPEG, PNG, or WebP input.
2. The image processor emits a supported normalized image payload.
3. A new immutable object is uploaded to the private `person-media` bucket.
4. The person mutation records the typed asset reference through the existing
   delta-sync operation path.
5. The database trigger projects only a winning LWW `photoAsset` or `gallery`
   update into `people.custom_fields` after `sync_tree_batch` has accepted it.
6. If local record attachment fails or throws, the new object is removed or
   placed in the durable cleanup queue.
7. Replaced and removed objects are queued only after the new record state is
   accepted locally; physical deletion waits for confirmed synchronized state.

### UI delivery

1. Owner/editor requests download directly from the private bucket under RLS.
2. Viewer requests use `/api/person-media`.
3. The gateway authenticates the session and resolves the exact asset only
   through `people_secure`, so masked living/private records cannot authorize
   image delivery.
4. The gateway downloads with the service role, verifies byte length, declared
   MIME type, and the actual image signature, then returns image bytes only.
5. Gateway responses use `private, no-store` caching, vary by origin and
   authorization, and reject malformed tree/asset identifiers or unbounded
   person identifiers before querying `people_secure`.
6. `PersonMediaAssetResolver` exposes a reference-counted `blob:` URL to image
   elements and revokes it when no consumer remains.
7. Cache identity includes user, role, tree, person, asset, and version, so a
   role downgrade cannot reuse a privileged owner/editor object URL.

No storage object path, Supabase URL, signed URL, or authentication token is
placed in DOM attributes.

### Poster and archive delivery

- The Studio's internal source token is resolved to bytes before rendering.
- `PosterImageAssetResolver` validates the actual JPEG/PNG/WebP signature and
  embeds the bytes in SVG as a data URI.
- Private poster bytes are deduplicated only within one resolution operation;
  they are not retained in the resolver-wide cache across authentication
  sessions.
- Preview, SVG, PNG, and PDF continue to share the same canonical SVG resource.
- Blueprint archives omit provider references from `tree.json` and package the
  authorized image bytes under archive-local media paths.

### Cloud archive restore

1. Blueprint and legacy `.jozor` imports extract image bytes into validated
   `Blob` values; no `blob:`, data URL, archive path, or provider reference is
   passed into the cloud mutation layer.
2. The importer verifies the manifest shape, media count, person identity,
   relationship targets, image size, declared type, and binary signature before
   creating a cloud tree.
3. Person IDs are remapped through an in-memory `Map`; archive media is matched
   by the original ID and uploaded under the remapped tree using bounded
   concurrency.
4. Successful uploads become `PersonMediaAssetRef` values on the imported
   profile/gallery records. `importTreeContent` stores those values only in the
   canonical custom-fields projection.
5. A missing, corrupt, unsafe, miscounted, or unknown-person image marks the
   archive media incomplete and prevents creation of a partial cloud tree.
6. If an upload or database import fails, all successful uploads are removed.
   Failed removals enter the durable cleanup queue and retain the temporary
   tree until RLS-authorized cleanup can finish.

Local-only archive restore remains intentionally separate: it creates
short-lived object URLs from the same validated image bytes and exposes an
explicit revocation callback. Legacy voice memories are skipped during cloud
import with a warning because a private audio contract does not exist yet.

### Legacy public-object migration

1. The owner starts **Secure Legacy Person Photos** from tree maintenance. The
   browser sends only the tree ID and a bounded numeric cursor to the
   owner-authorized `/api/person-media-migration` endpoint.
2. The server scans at most 25 people per request. It accepts only objects in
   the active tree namespace of the configured Supabase project's public
   `avatars` bucket. External URLs, user-profile avatars, cross-tree paths,
   traversal paths, and malformed typed references are never fetched or
   deleted.
3. Legacy bytes are downloaded once per source object, bounded to 5 MB, and
   verified by JPEG/PNG/WebP signature and MIME type before any new upload.
4. Each destination uses an opaque immutable private path. The server downloads
   the new private copy and revalidates its byte length, MIME type, and binary
   signature before attaching it. An unverified upload is removed immediately.
5. Server-only SQL RPCs attach the verified asset with exact compare-and-set
   checks against the current profile fields or exact gallery array item.
6. The public source is removed only after every reference to that object has a
   private attachment. Legacy profile and gallery source fields are finalized
   only after storage removal succeeds.
7. A stopped request resumes from row state: an attached asset with a remaining
   legacy source performs cleanup only and never copies bytes again. A losing
   compare-and-set removes its newly uploaded private object; the public source
   remains available for retry.
8. Responses and UI feedback contain aggregate counts only. Person IDs, source
   paths, private object paths, and URLs are not returned.

The migration deliberately leaves genuine external image URLs unchanged. They
are not owned storage objects and must not be fetched server-side or deleted by
Jozor. Account deletion now recursively removes both legacy tree folders and
private `person-media` tree folders before deleting database/auth records.

## Privacy and persistence rules

- `maskPerson` removes `photoAsset`, gallery, and legacy photo fields.
- `mask_custom_fields` removes typed photo references and clears gallery and
  voice-note arrays for masked viewer records.
- A database trigger and backfill remove media duplicates from
  `people.metadata`, which is not the typed media store.
- `photoAsset: null` is preserved through outgoing sync so photo removal is an
  explicit operation.
- Invalid asset objects, cross-tree paths, unsupported types, oversized files,
  and unknown asset keys are rejected.
- The shared database validator fails closed for JSON null kinds, invalid
  creation timestamps and noncanonical UUID paths. A person-table trigger
  applies the same checks to imports/direct writes and sync projection.
- Hiding tree photos now also removes the private asset from the fallback
  avatar path; the UI cannot redisplay it indirectly.

## Durable cleanup behavior

Cleanup jobs are stored in IndexedDB schema version 8 and deduplicated by
bucket plus object path. A job runs only when:

- the user is authenticated;
- the active role is owner or editor;
- the active tree matches the job;
- sync state is `synced`; and
- the target is absent from `confirmedPeople`.

Failures use bounded exponential retry metadata. Logs contain tree and opaque
asset identifiers but never object URLs, tokens, or person content.

In-flight jobs recheck the current account, editable role, tree and confirmed
sync state before deletion. Persisted queue targets are revalidated before
storage access; an IndexedDB failure is caught and permits a later retry.
Expired image downloads cannot overwrite or evict a replacement cache entry
after the session cache is cleared, or create URLs after the final consumer
has released the request.

## Local PostgreSQL execution gate

`npm run test:database:local` runs 32 tests using in-memory PostgreSQL via
[PGlite](https://pglite.dev/docs/), without Docker, environment credentials,
network access or a linked Supabase project. The dependency is development-only.
The command is also included in the CI workflow; remote CI was not run for this
local checkpoint.

The fixture supplies platform tables and synthetic JWT claims. It executes the
repository's authorization helper migration, the actual living-person privacy
view and LWW sync function, followed by the private media migration unchanged.
Assertions cover bucket privacy, storage RLS for owner/editor/viewer/outsider/
anonymous roles, revocation, cross-tree moves, sync attachment/removal, losing
operations, atomic rollback, direct/import validation, masked/deceased records,
metadata backfill, migration reapplication, server-only migration RPC grants,
profile compare-and-set attachment/finalization, and exact gallery-item
attachment/finalization.

Three failing cases were reproduced before correction: a null asset kind, an
invalid timestamp, and a UUID that PostgreSQL could parse but storage would not
accept. All three now reject the transaction and preserve prior person state.

This is not a full Supabase stack test: object byte storage, HTTP authorization,
deployed policy interactions and realtime delivery still require the rollout
gate below. The old integration command remains separate and must not be run
against production.

## Deliberately deferred work

These items are not silently treated as complete:

1. **Voice memories:** `voiceNotes` still contains Google Drive URLs. A private
   audio asset contract, owned upload lifecycle, gateway, and cleanup policy
   remain a separate phase.
2. **Viewer realtime projection:** raw operation payloads may contain opaque
   storage references because the existing collaboration feed reads
   `tree_operations`. Bytes remain inaccessible through the viewer gateway,
   but a role-aware sanitized realtime projection should replace this broader
   legacy feed.
3. **Server orphan sweeper:** a browser crash after object upload and before
   local cleanup enqueue can still leave an unattached object. A server-side
   age-based reconciler is required for complete orphan collection.
4. **Offline image availability:** private images currently fail safely to an
   initials/silhouette fallback when bytes are unavailable; encrypted offline
   media caching is not implemented.

## Rollout gate

Before enabling this path against owner data:

1. Review and apply `20260905000100_add_private_person_media_bucket.sql`, then
   `20260905000200_add_legacy_person_media_migration_rpcs.sql`, first to a
   non-production Supabase project.
2. Verify owner, editor, viewer, role downgrade, masked living person, and
   revoked collaborator behavior with two real accounts.
3. Upload, replace, delete, reload, and export both a profile photo and gallery
   photo.
4. Inspect DOM and exported SVG/PNG/PDF for storage paths, raw URLs, tokens, and
   private-field leakage.
5. Exercise failed record attachment, offline cleanup retry, and a missing
   storage object.
6. Export and re-import an image-bearing `.jozor` archive, then verify the
   restored profile/gallery records and storage cleanup under forced failure.
7. Run **Secure Legacy Person Photos** as the owner. Repeat after any partial
   result until no eligible public references remain; confirm external links
   were reported but unchanged.
8. Verify account deletion removes both `avatars/{tree}` and
   `person-media/{tree}` objects.
9. Only then promote the migration and runtime together.

## Verification evidence

- Full Vitest gate: 2262 passed, 1 intentionally skipped, 0 failed across
  both repository shards.
- Local PostgreSQL gate: 32 passed, 0 failed.
- Legacy migration planner/API/maintenance and account-deletion targeted gate:
  50 passed, 0 failed.
- Archive extraction, private re-upload, typed attachment, and compensation
  regression gate: 45 passed, 0 failed.
- Application and API TypeScript: passed.
- Full-repository ESLint: passed with zero warnings.
- Production build: passed. `JSZip` and `browser-image-compression` now use
  explicit cacheable vendor chunks; the entry bundle is 875.66 KB / 285.62 KB
  gzip against the unchanged 950 KB / 315 KB gzip budget.
- Final diff check: passed; Git reported only the repository's existing
  LF-to-CRLF normalization notices.

## Local checkpoint and environment readiness

Checkpoint scope: `feat(persona): add private person media foundation`.
The application, API, migrations, rollback/cleanup paths, tests, and documentation
belong in one local commit so deployment cannot accidentally omit a required
part of the private-media contract.

A read-only configuration audit found that `.env` and `.env.integration` target
the same Supabase URL. The linked project matches the integration reference and
is named `Jozor`. A different production reference is declared in the integration
configuration, but that declaration alone does not establish that the linked
project is a disposable test environment.

The read-only `supabase projects list --output json` check returned one accessible
project, `Jozor`, marked linked and healthy. No separate non-production project
was visible to the current CLI account. The configuration audit and project
inventory performed no database writes.

Before the rollout gate, confirm a separate non-production target using the
actual project inventory and deployment configuration. No environment values or
credentials are included in this report. Do not run the live integration suite,
apply migrations, or execute legacy-media cleanup on an unverified target.

Remote push and live Supabase migration remain pending.
