# Visual Studio Renderer Pivot

**Date:** July 10, 2026
**Status:** `Approved Product Pivot`
**Decision:** Build the visual outputs through the Visual Publishing Studio renderer path instead of rescuing legacy poster exports.

---

## Context

The Classic Poster PDF owner review exposed foundational issues in the legacy poster export path:

- Arabic PDF text renders as mojibake/gibberish.
- The generated PDF is sparse and page-split in a way that does not read as a poster.
- Raw English text appears in Arabic output.
- The layout does not render a meaningful family tree.

Because the application has not entered beta yet, this is the right moment to avoid spending time rescuing a brittle legacy renderer. The Visual Publishing Studio already has the safer architecture: registry-backed products, preview selectors, sanitizer boundaries, owner-facing preview UI, and a clearer product model.

---

## Decision

The visual publishing product direction is now:

1. Treat legacy Classic/Modern Poster export cards as deprecated/paused for Limited Beta.
2. Keep legacy handlers in the codebase for now, but do not expose the old poster downloads in the Visual Outputs tab.
3. Continue showing the Visual Publishing Studio as the canonical review surface.
4. Build a new **Studio Poster Renderer v1** as the next implementation path.
5. Generate future poster PNG/PDF outputs from the Studio renderer pipeline, not from the old PDF path.

---

## Current UI Implication

The Visual Outputs tab should read as:

- **Top:** Visual Publishing Studio preview/review area.
- **Bottom:** Current available downloads.
- **Paused:** Legacy Classic/Modern Poster downloads.
- **Still available:** Tree Snapshot export, because it is not the same poster PDF path.

The UI must not imply that legacy poster PDF/PNG outputs are beta-ready.

---

## Non-Goals

- Do not repair the old poster PDF renderer in this phase.
- Do not wire new Studio export buttons yet.
- Do not delete legacy handlers yet.
- Do not claim Modern Poster is beta-ready just because the structural check passed.

---

## Next Milestone

**Visual Publishing Studio Poster Renderer v1 Plan**

The next plan should define:

- HTML/CSS or canvas strategy for the new poster renderer.
- Arabic text rendering requirements.
- PDF generation strategy with embedded fonts or browser-print-safe text rendering.
- PNG/PDF parity expectations.
- First target template: Classic Poster vNext.
- Owner review gate after generating the first vNext poster.

---

## Implementation Note

The v1 foundation has started in [`visual-publishing-studio-poster-renderer-v1-plan-2026-07-10.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-publishing-studio-poster-renderer-v1-plan-2026-07-10.md).

The first renderer is HTML/CSS based and accepts only `VisualPreviewModel`, keeping it downstream from the sanitizer and adapter boundary.
