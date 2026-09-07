# Kindi Optional Diagnostics Resilience

Date: 2026-09-07
Baseline: `fd16ba0a43186a174f81aa866ceee845b065f7c9`
Scope: Optional diagnostics runtime correction, prepared for an approved checkpoint.
The verification below was originally local; deployment status is not inferred from it.

## Finding and Change

Seven fire-and-forget imports in four Kindi hooks did not handle rejection of
the optional learning-service import. Search, command confirmation, and answer
feedback should not produce unhandled failures because diagnostics are unavailable.
The service's own development warnings also included raw server exceptions.

- Added `services/kindiLearningDispatch.ts` as the shared lazy dispatch boundary.
- Routed controller, search, execution, and message-feedback logging through it.
- Contained failed imports and throwing logger calls without blocking callers.
- Kept successful event and trace payloads unchanged; no new retries or persistence.
- Removed raw exception arguments from the service's development warnings.
- Retained silent failure in production and existing redaction/auth validation.
- Kept learning-service code lazy in the production build (separate 2.77 kB chunk).

No command parsing, mutation permissions, language selection, tree data, UI layout,
or Help Center content changed.

## Regression Coverage

- Lazy loading, absent traces, exact event/trace delivery, and delayed loading.
- Rejected imports, throwing loggers, later delivery after a logger failure,
  and production-console silence.
- Rejected inserts and returned database errors without exposing private errors.
- Search results survive diagnostic failure.
- Successful mutations remain confirmed, with no duplicate mutation.
- Answer feedback remains a single local rating after diagnostic failure.

The existing browser maturity journeys use synthetic scenarios, block external
HTTP/API/WebSocket traffic, and do not log in to or mutate the owner's tree.
They are regression coverage, not a live cloud/provider-availability assessment.

## Verification

| Gate | Result |
| --- | --- |
| Five targeted dispatcher/service/hook Vitest files | 42/42 passed on two consecutive final runs |
| `vitest run src/features/kindi/ src/features/help/` | 335/335 passed, 43 files |
| `vitest run src/components/__tests__/HelpCenter.test.tsx` | 7/7 passed |
| `npm run typecheck` | Exit 0 |
| `eslint src/features/kindi/ --max-warnings=0` | Exit 0, no warnings |
| `npm run build` | Exit 0; existing stale Browserslist-data notice remains |
| `git diff --check` | Exit 0; only Git LF/CRLF conversion notices |
| Existing Kindi maturity E2E, Chromium + WebKit, one worker | 40/40 passed (20 per engine), exit 0, 7.7 minutes |

Distinct unit/component total: 342 across 44 files. The targeted 42 cases are
included in that total, not additional cases. No unhandled-error or React act
warnings occurred in the complete Kindi/help unit run.

Local command logs (ignored artifacts):

- `output/kindi-diagnostics-targeted.log`
- `output/kindi-diagnostics-targeted-repeat.log`
- `output/kindi-help-diagnostics-regression.log`
- `output/kindi-help-center-regression.log`
- `output/kindi-diagnostics-typecheck.log`
- `output/kindi-diagnostics-eslint.log`
- `output/kindi-diagnostics-build.log`
- `output/kindi-diagnostics-browser.log`

Browser command: `playwright test tests/e2e/kindi-maturity.spec.ts --project=chromium --project=webkit --workers=1 --reporter=line`,
with `E2E_AUTH_ROLE_HARNESS=false`. Existing Playwright environment notices about
`NO_COLOR`/`FORCE_COLOR` are cosmetic; no test failures or retries occurred.

## Boundaries

This does not close archive import roundtrip, synthetic account deletion through
the UI, voice-media lifecycle, or a complete new owner visual review. Those remain
separate from diagnostic dispatch resilience. Hosted CI and Vercel results for
the baseline commit are not evidence of deploying these changes. Checkpoint
preparation additionally passed application/API typechecks, full-project ESLint
and the production build on 2026-09-07. This Kindi correction does not mutate
hosted family data or require a database migration.
