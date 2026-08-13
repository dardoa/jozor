# Visual Publishing Studio Selected Branch Runtime Verification

**Date:** August 13, 2026
**Technical status:** Pass on Chromium and WebKit
**Owner visual status:** Internal review complete; pending owner confirmation
**Production approval:** No independent approval recorded by this verification pass

## Scope

This verification closes the runtime evidence gap for the Studio's `selected-branch` scope. It does not add another layout engine. A selected branch is rendered by the canonical `descendant-tiered` engine from a selected opaque root token.

The branch slice includes:

- the selected root;
- descendants up to the configured generation depth;
- spouses attached to people in the selected lineage.

It excludes ancestors of the selected root and sibling branches outside the selected lineage.

## Runtime Path

```text
App store people
  -> store preview boundary
  -> session-owned opaque person token catalog
  -> selected branch selector
  -> production preview sanitizer
  -> SanitizedPreviewGraph
  -> descendant-tiered PosterScene
  -> canonical SVG
  -> Studio preview / SVG / PNG / PDF
```

Raw person IDs, private contact fields, storage URLs, and authentication metadata are not accepted by PosterScene or exposed in the Studio DOM and exported SVG.

## Evidence

The mandatory Playwright scenario in `tests/e2e/visual-studio-selected-branch.spec.ts` verifies:

- keyboard activation of Selected Branch;
- an opaque `session-token-*` root selector with no raw ID option values;
- exactly four visible in-branch people in the seeded scenario;
- inclusion of the root, spouse, child, and grandchild;
- exclusion of the root's parent and sibling branch;
- canonical `descendant-tiered` SVG preview geometry;
- SVG, PNG, and PDF download events;
- matching localized basenames across the three files;
- valid PNG and PDF binary signatures;
- absence of raw ID, email, storage URL, auth token, preview ID, and technical engine sentinels from artifacts and filenames.

## Verification Results

| Gate | Result |
|---|---|
| Selected Branch Playwright, Chromium | 1/1 passed |
| Selected Branch Playwright, WebKit | 1/1 passed |
| Accessibility and responsive Playwright, Chromium | 15/15 passed |
| Visual Outputs and Studio Vitest regression | 511/511 passed |
| TypeScript | 0 errors |
| Scoped ESLint | 0 warnings and 0 errors |
| `git diff --check` | Passed |

Firefox did not reach application code in this environment. Playwright failed while creating the page with `browserContext.newPage: Cannot read properties of undefined (reading '_page')` on two consecutive runs. This is recorded as a browser-runner infrastructure issue, not as a Firefox product pass or product failure.

## Visual Review Handoff

The deterministic desktop/mobile and export review is recorded in `visual-publishing-studio-selected-branch-owner-visual-review-2026-08-13.md`. Its internal recommendation is Pass with Polish. Owner confirmation on a real family branch remains the final product gate.
