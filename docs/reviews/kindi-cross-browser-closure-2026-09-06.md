# Kindi Cross-Browser and Legacy Image Boundary Closure

Checkpoint update (2026-09-06): the separate-staging prerequisite below is a
historical handoff, superseded by the owner's explicitly authorized prelaunch
path in [hosted validation](prelaunch-hosted-validation-2026-09-06.md).
That report records the subsequent migrations and 13 synthetic hosted tests;
it does not claim deployed Vercel/Edge or browser verification.

Date: 2026-09-06
Browser gate: 60/60 passed, including Firefox.
Hosted media gate: Still blocked pending a distinct staging project.
Git operations: No commit or push. Existing changes preserved.

## Environment Finding

The blank-page Firefox probe reproduced `browserContext.newPage` failing with
`Cannot read properties of undefined (reading '_page')`. Browser protocol logs
showed `Failed to launch tab subprocess @SB::LA::SpawnTarget`, followed by a
page crash before application navigation.

The identical probe succeeded with approved process permissions outside the
restricted execution sandbox: Firefox 146.0.1, Playwright 1.58.2, one page,
and the expected local HTML content. No package upgrade, browser sandbox
disablement, Firefox preference change, or application workaround was needed.
The earlier [upstream issue](https://github.com/microsoft/playwright/issues/36594)
describes a similar symptom, but is not proof of this machine's cause; the
paired local probes provide that evidence.

## Actual Defect Found After Launch

The first full Firefox run was **19 passed / one failed**. Its privacy check
detected the synthetic private-photo URL in a browser-generated CORS error.
`SmartAvatar` passed an unvalidated legacy URL to both the image cache and the
image element. Catching the fetch error could not redact a browser-generated
message. The original console assertion was retained.

The same initial run exposed background requests toward the application's
configured services from synthetic roles. It used no real authenticated account;
the observed mutation requests were rejected for invalid synthetic credentials.
The final fixture suite is isolated as described below, rather than treating
those failed requests as acceptable test isolation.

## Corrections

- `legacyPersonMediaUrl.ts` is the shared boundary for legacy profile/gallery
  image URLs. It rejects direct non-public Storage routes, signed/authenticated
  routes, raw `person-media` URLs, credential-bearing URLs, known auth query
  parameters, malformed URLs and unsupported schemes before rendering/fetching.
- Public legacy images, ordinary external image links, supported raster data
  images and local blobs remain supported. This does not migrate or remove
  stored records and does not claim arbitrary external links are private-safe.
- Canonical private assets continue through the authenticated person-media
  resolver. An unresolved private asset cannot fall back to stale legacy or
  cached bytes. No storage bucket or access policy was changed.
- `useCachedImage` keys its visible result by source and resize options. Switching
  source hides the previous image immediately, ignores late results, releases
  acquired blobs, and cannot reuse a revoked blob when returning to an earlier
  source. Loading/error behavior remains explicit.
- The Kindi synthetic suite rejects hosted application targets, disables service
  workers, intercepts external HTTP and unmocked local API requests, and closes
  external WebSockets. Only local application assets/HMR reach the server;
  scenario-specific AI mocks retain precedence. This is not a hosted backend test.
- The existing failure scenario now also requires **zero requests** for the
  rejected photo sentinel. Network payload, console, Kindi DOM and Kindi storage
  privacy assertions remain mandatory; none were removed or made conditional.

## Verification

| Gate | Result |
| --- | --- |
| Images, person workspace and Kindi trigger unit/component tests | 112 passed, 19 files |
| Tree image block, archive restore and poster image resolver | 21 passed, three files |
| Kindi Chromium | 20 passed |
| Kindi Firefox | 20 passed |
| Kindi WebKit | 20 passed |
| Combined browser run | 60 passed, no skips, exit 0, 9.0 minutes |
| Application typecheck | Passed |
| Scoped ESLint | Passed, zero warnings/errors |
| Production build | Passed, 3920 modules, entry bundle within enforced budget |
| Git whitespace check | Passed |

The 133 unit/component tests are targeted coverage, not a new full-project unit
run. Existing image-cache tests emit JSDOM canvas-not-implemented diagnostics and
gallery fault tests intentionally log synthetic failures; passing does not mean
silent output. Browser execution emits the existing terminal color warning.
Build retains the existing stale Browserslist-data warning. Local execution used
Node 24.11.1; CI specifies Node 22. No remote CI or deployment was run in this pass.
Build log: `output/kindi-cross-browser-build-2026-09-06.log` (ignored).

Changed runtime files: `src/utils/legacyPersonMediaUrl.ts`,
`src/utils/mediaUtils.ts`, `src/components/ui/SmartAvatar.tsx`, and
`src/hooks/utils/useCachedImage.ts`. Regression coverage was added in the
corresponding URL/avatar/cache tests and `tests/e2e/kindi-maturity.spec.ts`.

The final browser command was:

```powershell
$env:E2E_AUTH_ROLE_HARNESS = 'false'
npx playwright test tests/e2e/kindi-maturity.spec.ts --project=chromium --project=firefox --project=webkit --workers=1 --reporter=line
```

Use a process-permitted execution session for Firefox on this machine, not
disabled browser security or reduced assertions. The run uses the existing
local application and synthetic fixtures; it does not sign into owner data.
Evidence log: `output/kindi-cross-browser-closure-2026-09-06.log` (ignored).

## Remaining Handoff

A new read-only project inventory still returned only `Jozor` in `ap-south-1`.
No separate hosted staging target exists among accessible projects. The
[staging readiness procedure](person-media-staging-readiness-2026-09-06.md)
remains the next media rollout gate: separate empty project, reviewed migrations,
matching deployed API/Edge routes, then real role/Storage/reconnect/deletion
evidence. Cleanup activation and production deployment need separate approval.

Private voice-memory lifecycle/complete audio backups, bounded media-module
extraction and richer person-record completeness are separate product work.
They are not being marked complete by this browser gate. Kindi/help do not need
to be restarted, and Firefox is no longer an outstanding local verification item.
