# Evidence Notes

**Review:** Visual Publishing Studio Controlled Visual PDF Runtime
**Date:** July 11, 2026

## Verified Code Path

- `studioPosterRenderer.ts` creates the UTF-8 Studio poster document.
- `studioPosterBrowserPngRuntime.ts` creates the high-DPI intermediate PNG.
- `studioPosterBrowserPdfRuntime.ts` embeds that image on one matching PDF page.
- `studioPosterExportAdapter.ts` validates the resulting PDF MIME type and file name.
- `VisualPublishingStudio.tsx` exposes the PDF action only for Studio poster products.
- `VisualOutputConfigPanel.tsx` exposes owner-facing title and short-description controls.
- `VisualOutputPreviewPane.tsx` renders the same owner-authored copy passed to both export formats.

## Automated Evidence

- Runtime/renderer/export tests: 17 passed.
- Studio/Vault component tests: 38 passed.
- Combined focused verification: 55 passed.
- TypeScript, scoped ESLint, and diff checks passed.

## Sanitized Artifact Inspection

- Generated Classic and Modern PNG artifacts at 2x browser scale.
- Generated matching one-page visual PDFs through jsPDF.
- Rendered both PDFs back to PNG with Poppler and inspected the resulting pages.
- Confirmed Arabic glyph integrity, relationship geometry, opaque node surfaces, balanced generation spacing, and clean page edges.
- Confirmed physical A4 metadata: `595.276 x 841.89 pt`, one page, no rotation, no encryption, and no JavaScript.
- Sanitized review artifacts are available locally under `output/playwright/studio-poster-review/` and are ignored by source control.

## Four-Generation Density Evidence

- Generated a complete 15-node, 14-edge sanitized ancestor graph through the real Classic and Modern Studio runtimes.
- Inspected 2x PNG output and Poppler-rendered PDF pages after generation.
- Confirmed no clipped names, overlapping cards, broken connections, extra pages, or Arabic glyph corruption.
- Confirmed both PDFs remain one physical A4 page with no JavaScript, encryption, or rotation.
- Local ignored artifacts are available under `output/playwright/studio-poster-density-review/`.
- Replaced the tiny photo-word marker with owner-readable initials and a passive photo-availability ring.

## Page Matrix Evidence

- Generated and visually inspected A4 landscape, A3 portrait, and A3 landscape artifacts from the same 15-node sanitized graph.
- Poppler confirmed one-page physical A4/A3 dimensions and zero page rotation for every PDF.
- Confirmed no clipping, overlap, footer drift, Arabic corruption, or relationship discontinuity across the matrix.
- Local ignored artifacts are available under `output/playwright/studio-poster-page-matrix-review/`.

## Privacy

Only sanitized preview models reach the renderer. No real family export artifact, screenshot, image, or PDF is stored in this evidence directory.

## Pending Evidence

Owner-generated real-tree PDF visual inspection remains required before assigning a real-tree release status.
