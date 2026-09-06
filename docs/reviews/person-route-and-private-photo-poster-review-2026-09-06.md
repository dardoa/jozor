# Person Routes and Private Photo Poster Review

Date: 2026-09-06 (Asia/Riyadh; evidence timestamps use UTC)

Status: targeted local verification passed. Hosted deployment, production
approval, and owner visual approval were not performed.

## Isolation

This pass reused the isolated `private-media-local` Supabase workspace on
`127.0.0.1:55321` and the review app on `127.0.0.1:3300`. Only synthetic accounts,
trees, and images were used. The regular app on port 3000, the user's in-app
browser, hosted Supabase, and the application's environment files were untouched.

The preceding media review excluded Edge Runtime. Its observed cold person-route
failure therefore did not, by itself, prove a production navigation defect.
This pass enabled Edge Runtime and exercised the actual context resolver. It
also found and corrected the authorization and response-validation issues below.
Realtime remained excluded; its browser 503 errors are not a clean-console or
multi-client realtime pass.

## Route Corrections

The existing route pipeline remains intact:

`/person/:id -> useAuthInit -> resolveTreeByPerson -> resolve-tree-context -> tree hydration -> person focus`.

1. `src/services/treeService.ts` no longer caches authorization results by
   person ID. Such a cache could retain a role across account changes or role
   revocation without a token refresh. Every resolution now requires current
   authentication and validates UUIDs and the exact role/access-type pairing.
   Only the four expected context fields reach callers.
2. `supabase/functions/resolve-tree-context/index.ts` now uses the caller-scoped
   `people_secure` projection instead of direct `people` access. Authorized
   viewers can resolve a private person's tree without receiving private person
   fields or needing elevated database access. The client uses the anon key and
   the caller's bearer token, not a service-role key.
3. The function validates malformed bodies before reading `personId`, returns
   non-cacheable JSON, and resolves membership with structured UID/email filters.
   Email fallback is limited to membership records without an assigned UID.
4. `src/components/app/appSurfaceDecision.ts` now treats a failed authenticated
   person route like a failed tree route: not-found rather than silently opening
   the tree picker. Loading still takes precedence during bootstrap.

Real Edge HTTP tests verify owner/editor/viewer context, outsider and anonymous
denial, malformed input, same-token downgrade and revocation. In the browser,
opening the synthetic child's relationship link and reloading `/person/<id>`
preserved that URL and displayed the correct person drawer.

## Actual Poster Exports

A previously browser-exported synthetic `.jozor` file was imported as a new tree
through Vault. The resulting two-person descendant scene used Classic, A3
landscape, owner-full visibility, and an Arabic title. Its private root photo was
resolved by the existing asset path; no poster renderer or layout was changed.

Each SVG, PNG, and PDF came from a real Studio button and a browser download
event. The localized basename was identical across all three formats.

| Check | Observed result |
| --- | --- |
| Preview/export SVG geometry | Exact document attributes, node rectangles and connector paths matched |
| Scene | 2 nodes, 1 connector, 1 embedded photo |
| Private photo | Decoded SVG image bytes matched private Storage bytes exactly |
| Font and image resources | Embedded data URIs; no external image href |
| SVG privacy scan | Fixture raw IDs, storage paths and bearer indicators absent |
| Hide photos | Preview contained zero photos; downloaded SVG contained no image data URI |
| PNG | Valid signature; 4526 x 3200 pixels, approximately 273.7 effective DPI |
| PDF | Valid signature; one A3 landscape page, 1190.55 x 841.89 points |
| Large preview | Actual SVG bounds 1340 x 835, with the embedded photo visible |

The large preview, actual PNG, and Poppler-rendered PDF were visually inspected.
The Arabic title was readable without mojibake; composition and photo placement
matched. PDF remains raster output, not a searchable/vector PDF claim. A valid
binary header alone was not used as visual evidence.

`scripts/testing/localMediaPosterEvidence.mjs` independently checks private
Storage bytes, structured SVG, PNG dimensions, PDF page dimensions using local
`pdfinfo`, and artifact SHA-256 hashes. It accepts only the guarded local backend
and a tree owned by the synthetic fixture account. Evidence contains metrics and
hashes, not credentials. Browser geometry comparison is separate from that helper.

### Limits and Design Findings

- This is media fidelity evidence for one sparse, two-person descendant scene,
  not coverage of every poster layout, large-format mode, or density.
- The two cards sit far apart with excessive unused page area. This remains a
  composition improvement, not an approved family wall-poster design.
- The inline preview was very small in the constrained 1034 x 737 workspace;
  the large preview enabled useful inspection. This was not a responsive redesign.
- The image is a synthetic test icon, not a portrait-quality assessment.
- The living child has no source photo, so this browser pass does not establish
  positive living-photo suppression. It does verify the explicit hide-all switch.
- SVG resource/identifier scans do not claim an exhaustive forensic scan of all
  compressed PNG/PDF payloads. Their actual decoded output was inspected.

## Verification

| Gate | Result |
| --- | --- |
| Route service, auth bootstrap, surface and protected-route Vitest | 44 passed across 7 files |
| Real context resolver Edge HTTP integration | 10 passed |
| Studio, poster image resolver and person media asset Vitest | 74 passed across 3 files |
| Application typecheck | Passed |
| API typecheck | Passed |
| Scoped ESLint | Passed with `--max-warnings=0` |
| Git diff whitespace check | Passed; existing LF/CRLF conversion notices remain |

These are 128 executed targeted tests, not a full application test run. The Edge
function compiled and ran in local Edge Runtime; application typecheck is not a
claim of a separate Deno CLI typecheck.

## Reproduction and Evidence

Prepare the isolated workspace as described in
`private-media-local-supabase-rollout-2026-09-05.md`, including all 75 migrations.
For the person-route test, enable Edge Runtime in its local config and copy the
repository function directory into the isolated Supabase workspace. Unlike the
earlier media-only command, do not exclude `edge-runtime`:

```powershell
Copy-Item -LiteralPath supabase/functions -Destination output/private-media-local/supabase -Recurse -Force
npx --offline supabase start --workdir output/private-media-local --exclude studio,postgres-meta,realtime,imgproxy,mailpit,logflare,vector,supavisor
npx --offline supabase status --workdir output/private-media-local --output env | node scripts/testing/writeLocalMediaEnvironment.mjs
npx --offline supabase functions serve resolve-tree-context --workdir output/private-media-local
```

With the function serving in its own terminal:

```powershell
$env:SUPABASE_INTEGRATION_ENV_FILE = 'output/private-media-local/.env.integration'
npx vitest run --config vitest.integration.config.ts tests/integration/personRouteContext.integration.test.ts
```

The new test needs that running function; a database-only integration environment
is insufficient. No hosted function was deployed. A future approved rollout must
deploy this Edge Function as well as the client change.

Ignored local evidence:

- `output/playwright/person-route-cold-reload.png`
- `output/playwright/private-photo-poster-preview-large.png`
- `output/playwright/private-photo-poster.svg`
- `output/playwright/private-photo-poster.png`
- `output/playwright/private-photo-poster.pdf`
- `output/playwright/private-photo-poster-pdf.png` (local PDF raster)
- `output/playwright/private-photo-poster-hidden.svg`
- `output/playwright/private-photo-poster-evidence.json`

## Cleanup and Remaining Work

The test browser was closed. Guarded cleanup removed the synthetic account and
its source/imported trees and media. Independent SQL confirmed **75 migrations
and zero auth users, profiles, trees, people, or image objects**. Edge serving,
the dedicated review Vite server, and only the isolated Supabase containers were
stopped. The local database volume was retained.

Offline compensation retry, interrupted/concurrent legacy migration, hosted
staging/realtime verification, private audio/full backup fidelity, and the sparse
poster composition findings remain separate work. No commit or push was made.

Subsequent follow-up: [Offline import cleanup recovery](archive-import-offline-cleanup-2026-09-06.md)
closes the targeted browser-local compensation retry case, with explicit limits
for ambiguous saved-content states and cross-service concurrency.
