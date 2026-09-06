# Legacy Avatar Storage Authorization Closure

Date: 2026-09-06
Target: existing owner-authorized prelaunch Jozor Supabase project.
Storage authorization gate: Passed.
Vercel deployment / browser acceptance: Not performed in this pass.
Production approval: No.

## Finding and Correction

The backed-up hosted schema contained four bucket-wide insert/update/delete
policies (`Allow Auth Uploads` and three `Allow Authenticated Upload` variants).
One allowed anonymous inserts. A separate `Tree Owner Avatar Management`
policy compared `trees.name`, not the Storage object's path. The narrower
policies did not override these permissive policies: PostgreSQL combines
permissive policies with OR. A restrictive policy must also pass when mixed
with permissive policies. See [PostgreSQL policy rules](https://www.postgresql.org/docs/current/sql-createpolicy.html).

Applied forward migration:
`supabase/migrations/20260906000800_harden_legacy_avatar_management.sql`.

- Removed the known broad and redundant legacy management policies.
- Added `private.can_manage_avatar_object`, using the actual object path and
  current authenticated identity / tree role. User-account folders belong
  only to that account; tree folders require owner or editor membership.
- Rejects missing path segments, traversal segments, backslashes, control
  characters and malformed tree UUIDs before casting.
- Replaced the four canonical avatar policies with the shared predicate.
- Added restrictive authenticated and anonymous boundaries so an unrelated
  permissive policy cannot reopen the bucket. Other buckets retain their own
  policies, including the private person-media gateway boundary.
- Public legacy image delivery remains unchanged. This is an authorization
  correction for listing and mutations, **not** a migration to private images.
  Supabase distinguishes public serving from Storage management authorization
  in its [Storage access-control guide](https://supabase.com/docs/guides/storage/security/access-control).

No object content or family records were modified by the migration. The final
linked CLI dry-run returned `upToDate: true`, with no pending migrations.

## Evidence

The local SQL suite intentionally introduces an unknown permissive policy after
hardening. It still verifies denial of cross-user/cross-tree access and
anonymous/viewer writes, in addition to positive CRUD/upsert behavior. It uses
PGlite and actual application authorization SQL with simulated platform tables.

The hosted suite uses four newly created accounts, one random test tree, and
tracked synthetic image paths. No real invitations or family edits are made.
The seven added avatar tests cover:

1. Each account can upsert/update/delete its own avatar; owners/editors can
   manage legacy tree images; the legacy public URL still serves exact bytes.
2. Viewer, outsider and anonymous clients cannot upload, replace, update,
   remove or list protected tree images (three separate tests).
3. Editor, viewer and outsider clients cannot replace, update, move, copy or
   remove another account's avatar (three separate tests).

The existing role-downgrade test also verifies that a downgraded editor loses
avatar mutation permissions immediately. Six private-media tests continue to
pass, including gateway authorization, sync projection and checkpoint masking.
Media handler calls remain in-process while using hosted Auth/Storage/RPCs;
they are not evidence of deployed Vercel HTTP routing or a browser UI review.

All synthetic objects and users were cleaned up. The mutation opt-in returned
to false in the runner's finally block.

## Preservation Check

- All 54 original Storage objects matched backup SHA-256 and byte length:
  2,924,648 bytes total. Fresh read requests were used to avoid accepting stale
  CDN content as preservation evidence, not to weaken revocation tests.
- The current avatar inventory exactly matched the original inventory.
- Original business-resource hashes matched: 184 trees, 134 people, 180
  relationships, 34 collaborators and 11 auth accounts. The normalized hash
  exclusions from the earlier rollout are documented in the
  [hosted validation report](prelaunch-hosted-validation-2026-09-06.md).
- Detailed logs, backup bytes and the preservation JSON remain Git-ignored.
  No raw identifiers, credentials or family photos are published as evidence.

## Verification

| Gate | Result |
| --- | --- |
| Hosted media/legacy avatar integration | 13 passed, exit 0 |
| Local PostgreSQL/PGlite suites | 92 passed across 3 files |
| Targeted guard, media API/resolver and storage-service Vitest | 103 passed across 6 files |
| TypeScript | Passed |
| Scoped ESLint | Passed |
| Vite production build | Passed, 22.69 seconds |
| Git diff whitespace check | Passed |

Build notice: the installed Browserslist dataset is seven months old. No
dependency/lockfile update was bundled into this security correction.

## Files and Handoff

- New migration: `20260906000800_harden_legacy_avatar_management.sql`.
- New SQL tests: `tests/integration/local/avatarStorage.database.test.ts`.
- Expanded hosted tests: `tests/integration/privatePersonMedia.integration.test.ts`.
- Account-avatar upload/RPC regression: `src/services/__tests__/supabaseStorageService.test.ts`.
- This report and the current hosted-validation handoff.

No commit, push, Vercel/Edge deployment or cleanup activation occurred. The
working directory still contains the preserved earlier application changes.
Next gate: review/package the matching client/API/Edge changes, deploy them,
then run actual HTTP and browser role/reconnect checks. Legacy image migration
and automatic cleanup activation remain separate reviewed actions.
