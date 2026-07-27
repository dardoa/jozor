# Visual Publishing Studio Poster Renderer v1 Preview Integration

**Date:** July 10, 2026
**Status:** `Pass as Preview Integration Foundation`
**Scope:** Studio preview only; no export button wiring.

---

## Summary

The Visual Publishing Studio preview now renders poster templates through the new `studioPosterRenderer` HTML/CSS path instead of the older abstract CSS mockup.

This is the first visible integration point for the Studio Poster Renderer v1 foundation. It keeps the existing safety boundaries intact:

```text
Store/fixture source -> selector -> production sanitizer -> preview adapter -> VisualPreviewModel -> studioPosterRenderer -> sandboxed iframe preview
```

---

## What Changed

- `VisualOutputPreviewPane` now calls `renderStudioPosterHtml` for poster definitions.
- Poster previews are displayed inside a sandboxed `iframe` using `srcDoc`.
- The iframe preview uses the renderer's complete UTF-8 HTML document.
- The preview is scaled down inside the Studio so the poster reads as a page, not a cropped viewport.
- Snapshot preview behavior remains unchanged.

---

## Safety Notes

- The renderer receives only `VisualPreviewModel`.
- No raw person records enter the renderer.
- No export handlers are connected.
- No PNG/PDF generation is triggered.
- The iframe is sandboxed and the renderer output contains no script tags.

---

## Verification

Automated tests verify:

- The Studio uses the v1 renderer document in the poster preview.
- The preview document contains UTF-8 metadata.
- The preview document does not contain script tags.
- Legacy poster downloads remain paused.
- Tree Snapshot export remains available.

---

## Next Milestone

**Studio Poster Renderer v1 Export Adapter Planning**

The next step should define how to convert the renderer HTML into:

- PNG output.
- PDF output.
- Owner-review local artifacts.

No legacy poster PDF path should be reused for this route.

---

## Export Adapter Update

The export adapter contract has started in [`visual-publishing-studio-poster-export-adapter-planning-2026-07-10.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-publishing-studio-poster-export-adapter-planning-2026-07-10.md).

The adapter validates injected PNG/PDF runtime outputs but does not wire UI export actions yet.
