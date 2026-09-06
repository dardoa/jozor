# Owner-Authorized Prelaunch Hosted Validation

Date: 2026-09-06
Target classification: existing Jozor project, prelaunch test data.
Hosted Auth/Storage/RPC media verification: thirteen synthetic tests passed,
including the follow-up legacy avatar authorization checks.
Deployed Vercel API and browser verification: pending; no deployment performed.
Production approval: No.

## Owner Decision

The owner confirmed that only the existing Supabase and Vercel projects are
available, the app has not launched, and the family tree is used for testing.
Testing and necessary data changes on this project are authorized. A second
hosted project is therefore not a prerequisite for this prelaunch pass.

This supersedes the separate-staging prerequisite in the earlier
[media readiness report](person-media-staging-readiness-2026-09-06.md). It does
not turn the current project into an isolated staging environment, authorize a
database reset, or establish permanent permission to test against future
production data.

## Boundaries

- Preserve a private local database and Storage backup before migrations.
- Test mutations should use newly created synthetic users, trees and assets.
  Teardown must address only resources created by that test run.
- Keep local lifecycle fault injection local. Do not enable bulk cleanup, RLS
  bypasses for clients, account-wide deletion, or a remote database reset.
- Do not silently disable the integration target guard or mislabel the project
  as a separate staging target. Add a narrowly scoped, explicit prelaunch path
  before running the reviewed hosted suite.
- Commit, push and deployment are separate actions; none was performed in this
  preparation pass.

## Preparation Inventory (Before Rollout)

The linked project and application configuration point to the same project.
The remote migration history matches the local history through
`20260903000100`. Ten forward migrations are pending:

1. `20260905000100`: private person media contract and storage policies.
2. `20260905000200`: guarded legacy media attachment/finalization helpers.
3. `20260905000300`: person sync timestamps.
4. `20260905000400`: private photo references in checkpoints.
5. `20260906000100`: guarded failed-import cleanup.
6. `20260906000200`: guarded server-side media cleanup lifecycle.
7. `20260906000300`: viewer-safe realtime invalidation.
8. `20260906000400`: realtime publication membership.
9. `20260906000500`: pending cleanup count.
10. `20260906000600`: cleanup queue index.

Previously edited historical bootstrap migrations must not be replayed remotely.
If an existing schema lacks a prerequisite, use a reviewed forward migration.

## Backup Scope

The completed backup is under Git-ignored
`output/prelaunch-backup-2026-09-06T16-36-39-058Z`.
It is sensitive local data and must not be committed, uploaded as QA evidence,
or included in screenshots. Incomplete attempts are labelled `incomplete`.

The captured scope is logical schema, roles and data, managed schema definitions,
migration history, Storage bucket/object inventory, and actual Storage bytes.
SHA-256 verification proves file integrity, not a successful restore. Database
and Storage snapshots are not one atomic transaction. Hosted configuration,
Edge deployments and deployment secrets are not included in this data backup.

Completed results:

- Seven SQL dumps: roles, application schema/data, Auth schema, Storage schema,
  and migration-history schema/data. Data coverage includes `public.people`,
  `public.trees`, `auth.users`, and `storage.objects`.
- All 54 Storage objects in the bucket inventory downloaded, 2,924,648 bytes.
  The before/after Storage inventories match. Local files were hash-verified.
- Restoration has not been rehearsed. No claim of a tested full restore.
- The local CLI attempted an uncached PostgreSQL image download; the successful
  run used the already-installed `pg_dump 17.6` in an ephemeral container and the
  linked Session Pooler. Credentials passed through stdin, not command arguments
  or reports. Auth and Storage schemas were dumped separately to avoid a CLI
  generated-script error with a combined schema list. Earlier incomplete runs
  remain labelled incomplete; none is used as the completed backup.
- A separate read-only media audit found 134 people and 51 legacy photo
  references, with no canonical private-photo references yet. There were 44
  populated metadata media fields, but no populated field existed only in
  metadata without a value in its canonical counterpart. This is an existence
  check, not semantic equality or a migration success claim.
- Hosted metadata still lacks the private bucket and ten required API entries.
  That is expected before the ten forward migrations and is not a passing
  runtime gate. No family records, Storage objects or schema migrations were
  modified. The CLI uses its normal temporary database login role.

Only documentation and ignored local backup utilities were added/updated in this
preparation pass. Existing application changes are preserved. `git diff --check`
passed (Git reported existing LF/CRLF conversion warnings). No application test
suite was rerun because this pass made no application-code changes.

Supabase documents the distinction between database backups and Storage object
bytes in its [backup guide](https://supabase.com/docs/guides/platform/backups),
and the logical dump components in its
[CLI backup guide](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).

## Original Execution Order

1. Verify backup integrity and inspect existing schema/data prerequisites.
2. Review and apply only the pending forward migrations, then verify their
   remote history and private bucket/API contracts.
3. Add and test an explicit owner-prelaunch target path restricted to the
   reviewed synthetic media suite. Keep general/fault-injection suites denied.
4. Run actual Auth/Storage/RPC tests and verify synthetic resource cleanup.
   In-process handler tests do not prove deployed HTTP routing.
5. Verify matching Vercel/Edge routes and browser role/reconnect behavior.
   Keep automatic media cleanup disabled until its separate activation review.

No hosted runtime pass or production approval follows from a successful backup
or metadata probe alone.

## Executed Rollout and Runtime Correction

All ten forward migrations listed above were applied successfully to the
owner-authorized project. The remote history then contained 81 entries. None
of the modified historical bootstrap migrations was replayed. The new private
bucket and required API catalog entries passed the read-only preflight.

The explicit prelaunch guard now requires the reviewed `private-person-media`
suite, a matching app URL, matching CLI-linked and owner-approved project
references, the `owner-approved-test-data` acknowledgement, and a separate
mutation opt-in. General integration and local fault-injection suites still
reject this target. Credentials remain in ignored local files, not evidence.

### Failure Found by Real Services

Initial hosted runs passed four of five tests. Immediate editor downgrade
failed: the collaborator RPC returned false, but a previously authorized
identical Storage download returned the image with `CF-Cache-Status: HIT`.
An uncached diagnostic request was denied. Both `cacheControl: '0'` and an
explicit no-store upload-header experiment failed to resolve this. Neither
experiment is classified as a security fix. The failed runs remain recorded
in the ignored execution log.

Private-media delivery now goes through `/api/person-media` for every client
role. Person-bound requests still resolve only references from `people_secure`.
Asset-only archive/poster requests perform fresh owner/editor RPC checks and
derive the path from validated tree/asset/kind/MIME selectors; they do not
accept a client path or trust a client role. This also supports authorized
checkpoint assets not attached to a current person row. The server and client
validate MIME and byte length; gateway responses are private/no-store.

The additional forward migration
`20260906000700_gate_private_media_reads_through_api.sql` was then applied.
Its restrictive SELECT policy denies authenticated object download, signing,
rendering and unsupported operations for `person-media`, while preserving
owner/editor SDK listing, upload and deletion. The service-side download occurs
only after gateway authorization. Existing authorization policies still limit
management operations to the caller's tree. The public `avatars` bucket is
not changed by this migration.

The final linked `supabase db push --dry-run` returned `upToDate: true` and
an empty migration list. Read-only preflight also confirms the owner/editor
permission RPCs required by asset-only gateway requests are exposed.

Supabase documents [operation-aware Storage policies](https://supabase.com/docs/guides/storage/schema/helper-functions)
and [Smart CDN caching](https://supabase.com/docs/guides/storage/cdn/smart-cdn).
An upload TTL is not treated as a revocation boundary. This change does not
recall bytes already downloaded by an authorized user or promise to invalidate
previous CDN responses. No canonical private family references existed at
rollout; test objects were removed after each run.

### Passing Hosted Scenarios

The final hosted run passed **6/6** with exit code 0:

1. Exact owner/editor image bytes through the gateway, with direct and signed
   Storage reads denied for owner, editor and viewer even after server reads.
2. Actual owner/editor image upload, listing and deletion remain functional.
3. Viewer deceased-person delivery succeeds; living/private images are denied.
   Missing authentication, wrong asset identity and viewer asset-only reads fail.
4. Actual sync RPC retains and removes the canonical typed photo reference.
5. The same gateway selectors immediately deny living and asset-only reads
   after editor downgrade; deceased-person viewer delivery remains allowed.
   Collaborator removal then denies that member's previously allowed request.
   Direct Storage reads remain denied, without cache-nonce substitutions.
6. Import checkpoints retain photo/gallery references while denying checkpoint
   reads to a still-enrolled viewer (the downgraded editor).

These tests use real hosted Auth, Storage and database APIs, but invoke the
application HTTP handler **in process**. They do not prove Vercel routing,
deployed bundle freshness, Edge deployment, or browser realtime behavior.

### Data Preservation and Verification

- Original resources after cleanup: 184 trees, 134 people, 180 relationships,
  34 collaborators and 11 auth accounts. Teardown verifies absence of each
  test tree, test account and test Storage object.
- Baseline hashes match after tests. The comparison excludes expected person
  timestamp changes and duplicate metadata media fields removed by migration;
  it is not a claim that every serialized database byte stayed identical.
- The backup remains hash-verified but has not been restore-rehearsed.
- Test mutation opt-in was returned to false in the runner's `finally` block.
- No legacy family photos were migrated or deleted; automatic cleanup remains
  disabled. No commit, push, or deployment was performed.

Final local verification:

| Gate | Result |
| --- | --- |
| Media API/resolver/archive/cleanup/target guard Vitest, 14 files | 165 passed |
| Local PostgreSQL/PGlite migration and policy tests, 2 files | 65 passed |
| Hosted synthetic media integration | 6 passed |
| TypeScript | Passed |
| Scoped ESLint | Passed |
| Git diff whitespace check | Passed |

The PGlite suite simulates platform tables and the Storage operation helper.
The hosted suite separately verifies real Storage operation behavior; neither
is represented as a fresh, full hosted restore rehearsal.

## Remaining Gates in Order

The legacy `avatars` authorization gate is now closed by migration
`20260906000800` and seven additional hosted tests. All 54 original Storage
object hashes and the original inventory match the backup. See the
[avatar authorization closure](legacy-avatar-storage-hardening-2026-09-06.md)
for the current 13-test hosted result and local verification. The earlier
six-test run above remains the record of the private gateway correction.

1. **Closed for the targeted HTTP boundary:** the matching API/client code is
   deployed at `a15bdcf`, and `resolve-tree-context` is deployed as Edge version 5
   with JWT verification enabled. Actual hosted Edge tests passed 12/12 and the
   deployed Vercel media/policy suite passed 13/13. See the
   [deployed HTTP closure](deployed-person-route-media-http-closure-2026-09-06.md)
   for exact scope, preservation checks, and the distinction from browser QA.
2. Browser checks for role changes, reconnect, private photo display and poster/
   archive export against the deployed code; account-deletion lifecycle remains
   a separate synthetic-resource test.
3. Review legacy-image migration and automated cleanup activation separately.
