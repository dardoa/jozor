# Visual Publishing Studio Poster Export Adapter Planning

**Date:** July 10, 2026
**Status:** `PNG Runtime Integrated for Owner Review`
**Scope:** PNG UI integration completed; Controlled PDF runtime remains pending.

---

## Purpose

This phase defines the new export adapter boundary for converting the Studio Poster Renderer v1 HTML output into PNG/PDF files.

The adapter deliberately avoids the legacy poster export path and does not import `jsPDF`, `html-to-image`, Playwright, or browser DOM APIs directly. Instead, it accepts an injected runtime:

```text
VisualPreviewModel -> renderStudioPosterHtml -> StudioPosterExportRuntime -> Blob
```

This lets us test the export boundary now and choose the rendering runtime later.

---

## Implemented Contract

Created:

- `studioPosterExportAdapter.ts`
- `studioPosterExportAdapter.test.ts`

The adapter:

- Accepts a `StudioPosterExportRequest`.
- Calls `renderStudioPosterHtml`.
- Supports `png` and `pdf` formats.
- Requires an injected `renderPng` or `renderPdf` runtime.
- Validates returned Blob MIME types.
- Rejects empty Blob outputs.
- Sanitizes generated file names.

---

## Non-Goals

- No Visual Outputs UI button wiring.
- No browser or headless rendering runtime yet.
- No legacy poster renderer reuse.
- No generated files committed.

---

## Runtime Options To Decide Next

1. **Browser DOM runtime**
   - Render `srcDoc` into an offscreen iframe.
   - Use `html-to-image` for PNG.
   - Use browser print or a controlled PDF path for PDF.

2. **Controlled server/runtime PDF**
   - Send the renderer HTML to a controlled endpoint.
   - Use Chromium/PDF rendering outside the UI thread.

3. **Hybrid**
   - PNG in browser.
   - PDF through controlled renderer.

Recommended next step: implement a browser-only PNG runtime first, then design the controlled PDF path.

---

## Browser PNG Runtime Update

The browser PNG runtime has started with `studioPosterBrowserPngRuntime.ts`.

It:

- Creates a hidden iframe.
- Writes the Studio poster renderer HTML into that iframe.
- Finds the `data-studio-poster-renderer="v1"` root.
- Uses `html-to-image` to produce a PNG Blob.
- Removes the iframe after success or failure.

The runtime is now wired to one active owner-review action inside the Studio for Classic and Modern posters. Tree Snapshot does not use this runtime, and the legacy poster PDF path remains paused.
