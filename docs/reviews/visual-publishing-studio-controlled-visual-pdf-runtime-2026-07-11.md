# Visual Publishing Studio Controlled Visual PDF Runtime

**Date:** July 11, 2026
**Status:** `Sanitized Visual QA Pass / Real-tree Owner Review Pending`
**Scope:** Classic and Modern Studio poster PDF downloads.

## Decision

The Studio now owns a controlled, single-page visual PDF path. The legacy poster PDF renderer remains paused.

## Runtime Flow

```text
SanitizedPreviewGraph
  -> VisualPreviewModel
  -> Studio poster HTML/CSS renderer
  -> high-DPI PNG runtime
  -> one-page jsPDF document
  -> owner download
```

The PDF path reuses the same Studio composition used by the on-screen preview and PNG download. It does not use browser print, legacy poster pagination, or a second tree layout implementation.

## Page Contract

- One poster creates exactly one PDF page.
- PDF orientation follows the selected portrait or landscape option.
- PDF pixels match the selected Studio composition dimensions.
- Physical PDF dimensions are passed explicitly in millimeters: A4 is `210 x 297 mm` and A3 is `297 x 420 mm`, with dimensions swapped for landscape.
- A4 and A3 controls feed both PNG and PDF generation.
- The poster image fills the PDF page without browser margins, headers, footers, or `about:blank` output.

## Arabic And Privacy

- Arabic is rendered by the browser-owned UTF-8 HTML/CSS composition before PDF embedding.
- The PDF runtime receives only the already sanitized Studio preview model.
- Raw person identifiers, contact fields, notes, storage URLs, and raw tree entities do not cross into the PDF runtime.
- Current privacy and photo controls are shared by preview, PNG, and PDF.
- The current sanitizer passes only photo availability, not image files or URLs. The owner option therefore adds a passive availability ring around the name initial; it does not embed profile photos.

## Poster Identity Controls

- The default title follows the selected root person instead of exposing the internal template name.
- The default subtitle follows the selected generation depth.
- Owners can edit the title and short description directly in the Studio.
- Edited copy updates the live preview, PNG, PDF, and downloaded file name through one shared state path.
- Conservative character limits and renderer-side font scaling protect the header from long Arabic or English copy.

## Known Product Boundary

This first controlled PDF is a raster visual PDF. It is suitable for preserving the poster appearance, but its Arabic text is not searchable or copyable as structured PDF text. Searchable text remains a later renderer-quality milestone.

## Automated Verification

- PDF/PNG runtimes and Studio renderer/export suites: 17 tests passed.
- Vault and Studio component suites: 38 tests passed.
- Combined focused verification: 55 tests passed.
- TypeScript passed.
- Scoped ESLint passed with zero warnings.
- `git diff --check` passed.

Tests verify portrait and landscape page construction, matching dimensions, PNG MIME validation, active Studio PNG/PDF downloads, and separation from the legacy poster cards.

## Sanitized Visual QA

Classic and Modern Arabic posters were generated from the real Studio renderer with a seven-person sanitized fixture, then inspected as both PNG and Poppler-rendered PDF pages.

Verified results:

- Arabic titles, names, and years render correctly.
- Both PDFs contain exactly one page.
- Poppler reports the portrait A4 page as `595.276 x 841.89 pt (A4)`.
- No browser header, footer, URL, page counter, or blank page is present.
- Root, parent, and grandparent levels are readable and connected correctly.
- Poster cards use opaque surfaces so connectors do not show through their content.
- Single known years render without a dangling range separator.
- Classic and Modern themes preserve the same layout geometry.

## Four-Generation Density QA

Classic and Modern Arabic posters were also generated with a complete four-generation sanitized graph: 15 people and 14 parent-child connections.

Verified results:

- All 15 person cards remain inside the A4 composition without overlap or clipping.
- The eight-person oldest generation remains readable at the narrowest card width.
- All 14 connectors terminate at visible cards and remain behind opaque card surfaces.
- PNG and Poppler-rendered PDF output preserve identical hierarchy and spacing.
- Both PDFs remain one physical A4 page with no JavaScript, encryption, rotation, or browser artifacts.
- Avatar circles use a name initial instead of the cramped `Photo`/`صورة` text marker; photo availability is indicated by a subtle ring.
- A permanent renderer regression test now covers the complete 15-node / 14-edge layout.

## Page Size And Orientation Matrix

The same complete four-generation graph was generated and inspected in the remaining production page configurations.

- A4 landscape: one page at `841.89 x 595.276 pt`.
- A3 portrait: one page at `841.89 x 1190.55 pt`.
- A3 landscape: one page at `1190.55 x 841.89 pt`.
- All inspected configurations preserve Arabic, the 15-card hierarchy, all 14 connectors, margins, and footer placement.
- No tested PDF contains JavaScript, encryption, rotation, browser headers, or extra pages.

## Owner Review Gate

The sanitized renderer/runtime gate has passed. Generate real-tree Classic and Modern PDFs and verify:

1. Arabic title, names, and years are visually intact.
2. The document has one page with no browser artifacts.
3. Root, ancestors, and connectors match the Studio preview.
4. A4/A3 and portrait/landscape dimensions are correct.
5. Real family names remain readable at four-generation density.

No generated family PDF is committed to the repository.
