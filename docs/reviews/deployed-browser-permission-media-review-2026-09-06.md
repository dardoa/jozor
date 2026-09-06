# Deployed Browser Permission and Media Review

Date: 2026-09-06

## Status and Scope

The deployed browser gate exposed a real stale-permission defect. This report
does **not** approve the current production deployment for that gate. Corrections
are local, tested against synthetic accounts on the authorized prelaunch backend,
and still require deployment and a production-origin rerun.

Production reviewed: `https://jozor.vercel.app`, checkpoint `a15bdcf`.
Corrected frontend reviewed: isolated `http://127.0.0.1:3310`, using the same
prelaunch Supabase and a same-app proxy for the deployed private-media GET route.
The temporary server and three isolated Playwright CLI browser sessions were
closed after testing. The user's browser session was not used or closed.

## Evidence Matrix

| Check | Observed result |
| --- | --- |
| Deployed cold `/person/:id`, owner | Correct tree and details opened; authorized profile image loaded |
| Deployed cold person route, viewer at 390x844 | Editing absent; living/private names masked; authorized deceased image visible |
| Deployed owner SVG/PNG/PDF | Actual download events captured, localized matching filenames, artifacts inspected |
| Deployed owner `.jozor` archive | Actual download captured; three people and four embedded test images verified |
| Deployed editor downgrade | **Failed**: old editor badge, controls and sensitive names persisted beyond the 60-second assertion window |
| Corrected local editor downgrade | Viewer badge, masked names, no private blob images, no edit controls, without page reload |
| Corrected local promotion | Fresh authorized snapshot restored names. The subsequent image fix passed unit tests and a local loaded-image check; uninterrupted promotion with that final image fix still needs the deployment rerun |
| Corrected local revoke while offline | Returning online removed person names/images and the tree view; person route became unavailable |

Testing used three synthetic accounts, one synthetic tree, three people and four
private images. Image bytes came from `public/favicon.png`, not real portraits.
This verifies embedding and delivery, not portrait resolution or aesthetic quality.

## Findings and Corrections

1. Independent `RealtimeSubscriber` instances used the same topics on the cached
   Supabase client. The installed SDK reuses channels by topic, making their
   lifecycles interfere. Topics now have instance and subscription-generation
   ownership; callbacks from old subscriptions are rejected even for the same
   tree/account. A topic-reusing test double reproduces the ownership condition.
2. Permission handling previously trusted row identity/payload alone. RLS may
   omit DELETE identity or prevent delivery after revocation. Scoped events and
   reconnect now invalidate access and request the authoritative role. Initial
   mount, visible focus/online events, and visible 30-second polling cover missed
   notifications. Requests are coalesced; late results after account/token/tree
   changes or unmount cannot apply. Network failure is not treated as revocation.
3. Downgrade masks loaded people, clears history and cached media; confirmed
   revocation also removes tree memory and the active local cache. This cannot
   revoke copies a previously authorized user already downloaded, nor promise
   immediate client changes while offline.
4. Promotion previously restored the role but not data removed by viewer masking.
   Role changes now request a fresh snapshot even without operation-log changes.
   A queued full refresh is preserved while another reconciliation is in flight.
5. A private image hook could return a revoked URL after descriptors were masked
   then restored. Resolution is invalidated when its request identity changes;
   avatar error state now distinguishes fresh object URLs for the same asset.
6. `useTreeSettings` attempted shared-settings writes for non-owners and produced
   an activity-log RLS 403 in the deployed viewer session. Shared cloud settings
   now require resolved owner access, including a debounce-time recheck. Other
   roles retain local preferences. The current session token is forwarded.

## Export Inspection

Ignored evidence directory:
`output/playwright/deployed-media-browser-2026-09-06/`.

- `poster.svg`: two nodes, one connector, embedded Arabic font and one embedded
  public-deceased test image. Raw fixture IDs and provider storage references
  absent. The private-marked ancestor remains masked under the existing
  publishing policy, including owner-full; that policy was not changed here.
- `poster.png`: **4526 x 3200** pixels, valid PNG signature.
- `poster.pdf`: **one raster page**, A3 landscape, **1190.55 x 841.89 pt**.
  Inspected the Poppler-rendered page and the Studio preview. Arabic and the
  image are visible, but the sparse two-card layout leaves excessive whitespace.
  This is not an owner visual approval or a quantitative raster parity claim.
- `family.jozor`: three people, four images with exact source-byte parity,
  preserved Arabic gallery caption, no provider-bound media references in the
  archive JSON. Full owner archives intentionally retain portable person identity.
  **Archive import/roundtrip was not tested in this deployed review.**
- `artifact-integrity.json`: generated hashes and measured file properties.
- Screenshots: `owner-person.png`, `viewer-mobile.png`, `poster-preview.png`,
  `editor-stale-role.png`, `local-editor-before.png`, `local-viewer-after.png`,
  `local-editor-restored.png`, `local-revoked-after-reconnect.png`.

Earlier assertions failed during investigation: the deployed downgrade; a photo
load assertion; and promotion retaining masked data. They were not discarded as
passing evidence. Final local checks waited for actual loaded image pixels and
asserted removal of sensitive DOM content after downgrade/revocation.

## Verification

- Final targeted regression: **122 tests, 24 files passed**, exit 0. Covers sync
  hooks/services, channel ownership, role transitions, privacy/storage, settings,
  private image hooks and SmartAvatar. Expected injected-failure logs exist in
  negative sync tests; this is not a claim of a silent full application suite.
- `npm run typecheck`: passed.
- `npm run build`: passed, 3920 modules, 18.83 seconds. Browserslist reports
  outdated browser data; no dependency churn was included in this correction.
- Scoped ESLint across the twelve changed runtime/test files: passed with
  `--max-warnings=0`.
- `git diff --check`: passed; Git emits LF-to-CRLF conversion notices.
- No commit, push, runtime deployment, schema migration, or automatic media
  cleanup activation was performed in this browser correction pass.

## Preservation and Remaining Work

Synthetic resources and all four saved auth-state files were removed. The
normalized original resource comparison passed: **184 trees, 134 people,
180 relationships, 34 collaborators, 11 auth users**. This is the existing
normalized baseline, not a byte-for-byte database backup comparison.
All **54 original Storage objects (2,924,648 bytes)** matched the backup SHA-256
hashes, and the avatar inventory was unchanged. Mutation opt-in was restored to
false and checked after cleanup.

Remaining: deploy/recheck the corrected frontend, synthetic account-deletion UI
lifecycle, deployed archive import if required, and a separate review of legacy
media migration/automatic cleanup. UI polish includes Arabic fallback labels
(`Private`, `Focus parent`, `d. ?`) and sparse-poster page utilization.
