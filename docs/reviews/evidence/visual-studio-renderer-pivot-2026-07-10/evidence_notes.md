# Visual Studio Renderer Pivot - Evidence Notes

**Date:** July 10, 2026
**Evidence Type:** Product direction and UI classification update
**Privacy Status:** No generated poster artifacts are committed.

---

## Trigger

The Classic Poster PDF owner review found that the old poster output path is blocked due to broken Arabic PDF text rendering and ineffective poster layout output.

Because beta has not started, the product decision is to stop investing in the old poster export path and build visual outputs through the Visual Publishing Studio renderer path.

---

## Verified Change Scope

- Legacy poster handlers remain in the codebase.
- Legacy Classic/Modern Poster download cards are no longer shown in the Visual Outputs tab.
- The Visual Publishing Studio remains visible as the review surface.
- Tree Snapshot remains downloadable as the current non-poster visual export.
- No new renderer/export wiring is introduced in this pivot pass.

---

## Follow-Up

The next implementation package should be the Studio Poster Renderer v1 plan and first renderer implementation.
