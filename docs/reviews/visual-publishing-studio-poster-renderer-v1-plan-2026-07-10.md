# Visual Publishing Studio Poster Renderer v1 Plan

**Date:** July 10, 2026
**Status:** `Foundation Started`
**Decision:** Build new poster outputs from the Visual Publishing Studio renderer path instead of repairing legacy poster exporters.

---

## Purpose

This plan starts the replacement path for Classic/Modern poster outputs after the legacy Classic Poster PDF failed owner visual review.

The first implementation target is a Studio-owned HTML poster renderer that accepts only `VisualPreviewModel` data. This keeps the renderer downstream from the existing selector and sanitizer boundaries:

```text
Store-shaped source -> selector -> production sanitizer -> preview adapter -> VisualPreviewModel -> Studio Poster Renderer v1
```

---

## Renderer Strategy

The v1 renderer outputs HTML/CSS rather than directly using the legacy poster PDF renderer.

Reasons:

- Arabic text remains normal HTML text with `<meta charset="utf-8">`.
- Browser/Chromium PDF generation can embed or use system fonts more safely than low-level text drawing.
- The same markup can later be rendered to PNG or PDF.
- No raw tree data is accepted by the renderer.
- No canvas, SVG, or script is required for the first version.

---

## Implemented Foundation

Created:

- `studioPosterRenderer.ts`
- `studioPosterRenderer.test.ts`

The renderer:

- Accepts a `VisualPreviewModel` with `productType: poster`.
- Rejects non-poster preview models.
- Renders a complete HTML document with UTF-8 metadata.
- Supports Arabic RTL and English LTR.
- Uses ordinary HTML text for names and titles.
- Escapes user-visible strings before injecting them into HTML.
- Provides classic and modern theme selection.
- Avoids canvas, SVG, and script tags.

---

## Non-Goals

- No UI export button wiring in this phase.
- No PDF generation service integration yet.
- No PNG generation integration yet.
- No deletion of legacy poster handlers yet.

---

## Next Milestone

**Studio Poster Renderer v1 Preview Integration**

Next steps:

1. Render the HTML output inside a controlled preview surface or test harness.
2. Add a PDF/PNG export adapter plan for Chromium/browser rendering.
3. Generate a first local Classic Poster vNext PDF.
4. Run owner visual review on the vNext output.

---

## Preview Integration Update

Preview integration has started in [`visual-publishing-studio-poster-renderer-v1-preview-integration-2026-07-10.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-publishing-studio-poster-renderer-v1-preview-integration-2026-07-10.md).

The Studio poster preview now uses the renderer output inside a sandboxed iframe. Export adapter wiring remains out of scope.
