# Classic Heritage Limited Beta Gate Closure

**Date:** 2026-07-14
**Status:** Closed / Pass for Limited Beta
**Commit:** None

## Cleared Product

This gate applies only to the new Visual Publishing Studio pipeline:

```text
Sanitized ancestor graph -> ancestor-tiered -> PosterScene -> SVG -> PNG / raster PDF
```

It does not approve or restore the retired legacy Classic/Modern poster exporters.

## Evidence Completed

- A4/A3 portrait and landscape geometry fixtures.
- One-to-four generation ancestor fixtures.
- Arabic font embedding and mixed RTL/LTR year rendering.
- Controlled image resolution with embedded assets and safe fallbacks.
- Real-tree A3 landscape review with 10 people, 10 relationships, and six photos.
- Matching canonical SVG, 2263 x 1600 PNG, and one-page A3 PDF composition.
- No Supabase URL, storage path, raw person id, or authentication token in the poster SVG.
- Living/private automatic-title privacy regression fixed and covered by tests.
- Studio preview hierarchy and owner controls reviewed in Arabic.

## Test Closure

- Removed the remaining React `act(...)` warning by waiting for the asynchronous
  Arabic font resource in the ExportCloudPanel integration test.
- Targeted Vault and Studio tests pass without that warning.
- Unit shard 1 passed: 136 files passed, one skipped; 662 tests passed and eight skipped.
- Unit shard 2 passed with exit code 0, including the 29-test Vault panel suite and
  the 11-test Visual Publishing Studio suite.
- Production build passed after transforming 3,904 modules.
- TypeScript, Studio-scoped ESLint, and `git diff --check` pass.
- Repository-wide ESLint reports 16 pre-existing warnings confined to GEDCOM logic
  and tests. It reports no errors, and the Studio/publishing scope passes with zero
  warnings.

## Verification Notes

- Expected failure-path logs from sync, billing, and API tests do not represent test
  failures.
- The repository test environment still emits isolated jsdom canvas capability
  notices in unrelated suites; both unit shards complete successfully.
- The production build retains existing Vite chunk-size and mixed-import warnings.
  These are application-wide optimization items, not Classic Heritage blockers.

## Runtime Boundary

Limited Beta currently includes:

- Classic Heritage;
- selected root plus ancestors;
- one to four generations, or all available ancestors behind the print-quality gate;
- A4 and A3;
- portrait and landscape page orientation;
- vertical and horizontal ancestor direction;
- photo show/hide and living-photo controls;
- SVG preview, high-resolution PNG, and one-page raster PDF.

Descendants, full tree, Modern Gallery, Dense Genealogy, A2/A1/A0, and vector PDF
are not covered by this ancestor visual approval. Descendant and full-tree runtime
foundations are implemented but remain pending real-tree owner visual review.
