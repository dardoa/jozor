# Deployed Person Route and Private Media HTTP Closure

Date: 2026-09-06
Status: targeted deployed HTTP gates passed; browser rollout gate remains open.

## Deployment

- The application/API deployment remains commit
  `a15bdcfe0e8ae422760ac6a8d603cfb914edd337` at `https://jozor.vercel.app`.
- Deployed only the already-reviewed `resolve-tree-context` Edge Function with
  `npx --offline supabase functions deploy resolve-tree-context --use-api`.
- Supabase reports version **5**, status **ACTIVE**, `verify_jwt: true`.
  No JWT verification bypass, database migration, reset, function pruning,
  legacy-photo migration, or cleanup activation was performed.
- No application runtime source changed in this pass. New local changes are
  integration tests, their guards/configuration, and review documentation.
  No new commit or push was performed.

## Narrow Test Authorization

The existing owner-approved prelaunch project was used explicitly, not labelled
as separate staging. The safety guard now admits the reviewed
`person-route-context` suite alongside `private-person-media`. The general
integration configuration still rejects prelaunch, and local fault-injection
tests remain excluded from hosted runs.

`vitest.person-route-integration.config.ts` selects only the person-route suite.
All existing exact project/link/application-URL checks and mutation opt-in checks
remain mandatory. Each run used four synthetic accounts and a random test tree.
The runners restored the original environment file with
`ALLOW_INTEGRATION_MUTATIONS=false` in `finally`.

The media suite retains its default in-process transport. Its explicit deployed
HTTP mode reads `PERSON_MEDIA_INTEGRATION_HTTP_ORIGIN` from the verified test env
file, accepts only `https://jozor.vercel.app` in prelaunch mode, and rejects
redirects. Only synthetic **user** bearer tokens go to Vercel; the service-role
key remains with the fixture setup/teardown client talking to Supabase.

## Actual Remote Results

### Person context: 12/12

Requests went to the deployed `/functions/v1/resolve-tree-context`, not a local
Edge server or mock. Verified:

- Owner/editor/viewer receive the exact allowed context contract without private
  person data; a viewer cannot directly read the underlying private person row.
- Outsider and unknown-person responses are indistinguishable 404 errors.
- Missing/invalid authentication, unsupported methods, malformed JSON, and five
  invalid payload shapes are rejected; CORS preflight succeeds.
- With the original editor token, downgrade immediately returns viewer context,
  then collaborator removal returns 404. Context responses are `no-store`.
- The payload table uses labelled object rows so `[]` is actually passed as a
  payload; an empty Vitest row previously supplied `undefined` instead.
- Teardown attempts all created resources even after a failure, then verifies
  absence of the synthetic tree, person, memberships, profiles and auth users.

Final corrected run: **12 passed**, exit 0, 26.30 seconds.

### Private media and avatar policies: 13/13

The suite was explicitly labelled **deployed Vercel HTTP**. Every `deliver()`
call used the public `/api/person-media` route, including its deployed rewrite,
native bundle, authentication and Storage access. The in-process handler was
not invoked for these deliveries.

- Exact synthetic PNG bytes were delivered for owner/editor and permitted viewer
  requests, including profile/gallery assets and owner/editor asset-only reads.
- Viewer living/private-photo reads, outsider reads, anonymous requests, and
  mismatched asset identities were denied. Successful viewer delivery carried
  `image/png` and `private, no-store, max-age=0` headers.
- After editor downgrade, the same-token living-photo and asset-only requests
  were denied, while permitted deceased-person reads still worked. Revoking the
  viewer's membership denied that viewer's previously valid image request.
- Direct and signed private Storage reads remained denied, including after
  successful gateway delivery. No cache-busting nonce was used to obtain a
  passing revocation result.
- Real sync/checkpoint RPCs preserved and removed typed photo references with
  the expected role restrictions. Legacy-avatar management policies were also
  exercised, using only test-owned paths. Existing public avatar compatibility
  remains intentional; it is not a claim that old public URLs became private.

Run: **13 passed**, exit 0, 92.03 seconds. These are HTTP/SDK assertions, not a
browser visual review or proof of poster/archive UI interaction.

## Preservation and Local Gates

- Original normalized resource hashes match the existing baseline: 184 trees,
  134 people, 180 relationships, 34 collaborators and 11 auth accounts.
  That baseline excludes previously documented timestamp/duplicate-media
  metadata fields; it is not a byte-for-byte database comparison.
- All **54 original Storage objects**, **2,924,648 bytes**, match their backup
  SHA-256 hashes; the original avatar inventory matches as well. This separate
  read-only preservation scan does request fresh bytes, unlike revocation tests.
- Synthetic tree/account/object cleanup assertions passed. No owner photo was
  migrated/deleted and automatic media cleanup remains disabled.
- Target guard/configuration plus person-route service/auth tests: **64 passed**
  across four files. Application typecheck and scoped ESLint passed.
- A separate strict TypeScript invocation covered both integration specs and
  configs (which are outside the application tsconfig). It exposed and fixed a
  test request-stub cast; those files now also pass strict checking.
- `git diff --check` passed. Git emits existing LF-to-CRLF conversion notices;
  those are not whitespace errors. A full application/E2E rerun was not claimed
  for these test-only changes.

Ignored local evidence:

- `output/prelaunch-person-route-integration-2026-09-06.log`
- `output/prelaunch-deployed-media-integration-2026-09-06.log`
- `output/prelaunch-storage-preservation-2026-09-06.json`

Reproduction uses the guarded configs with an explicitly authorized environment
file, never ordinary app credentials as an integration fallback. The local
`output/run-prelaunch-person-route-tests.mjs` and
`output/run-prelaunch-deployed-media-tests.mjs` wrappers enable the reviewed test
scope temporarily and restore the original file on normal completion/failure.
They do not protect against forced process/OS termination.

## Remaining Gates

1. Browser review was subsequently executed and exposed stale client permissions.
   Local corrections and real-browser checks are documented in
   `deployed-browser-permission-media-review-2026-09-06.md`. Deployment and the
   corrected production-origin permission rerun remain outstanding.
2. Account-deletion lifecycle using only isolated synthetic resources.
3. Separate owner review before legacy-photo migration or automatic cleanup
   activation. The backup is hash-verified but still not restore-rehearsed.
