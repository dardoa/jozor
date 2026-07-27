# Printable Arabic Ancestor Poster - Phase 1A

**Date:** 2026-07-13
**Status:** Engineering Baseline Complete / Visual Product Direction Superseded
**Product Classification:** Minimal Technical Tree Baseline
**Commit:** None (owner requested no commit)

> Product vision clarification: this artifact proves print geometry, Arabic
> rendering, and preview/export parity. It is not accepted as the visual design
> of `Classic Poster`. Visual product acceptance moved to the Poster Visual
> Direction Pass before further renderer styling.

## Decision Boundary

Phase 1A implements the first print-first Arabic ancestor-tree engineering
baseline on top of the canonical `PosterScene` foundation. Its visual output is
now classified as a technical baseline rather than a finished wall-poster
direction.

The implementation is limited to:

- selected root and ancestors only;
- one to four generations;
- vertical and horizontal tree directions;
- A4 and A3 in portrait and landscape;
- the Classic text-card preset;
- high-resolution PNG and one-page raster PDF.

Photos, large-format page sizes, additional layouts, custom styling, branding,
SVG, and searchable/vector PDF remain outside this phase.

## New Poster Contracts

The print pipeline is governed by the following contracts:

- `PosterDocumentSpec`: physical page size, orientation, margins, safe area,
  DPI baseline, and canonical scene dimensions.
- `PosterContentSpec`: title, subtitle, language, selected-root ancestor scope,
  generation count, and privacy mode.
- `PosterLayoutSpec`: `ancestor-tiered` engine identity, vertical/horizontal
  direction, and layout spacing.
- `PosterCardPreset`: Classic card dimensions and typography constraints.
- `PosterScene`: the immutable document geometry consumed by preview, PNG, and
  PDF paths.
- `PrintQualityReport`: retained as a contract only; real print-quality warnings
  remain deferred to Phase 2.

## Canonical Data Flow

```text
Live tree selector
  -> production sanitizer
  -> SanitizedPreviewGraph
  -> ancestor-tiered layout engine
  -> PosterScene
       -> Studio preview HTML
       -> high-resolution PNG runtime
       -> one-page raster PDF runtime
```

Raw person entities, database IDs, contact fields, notes, storage URLs, and image
paths do not enter the scene engine. Scene nodes use session-isolated
`preview-node-*` identifiers only.

## Shared Geometry

Preview, PNG, and PDF receive the same `PosterScene` object. Neither export
runtime recalculates node positions, connector paths, bounds, margins, or page
dimensions.

The Phase 1A QA fixture produced:

- page: A3 landscape, 420 x 297 mm;
- canonical scene: 2263 x 1600 CSS pixels;
- 15 nodes and 14 connectors;
- one masked living/private node;
- PNG: 4526 x 3200 pixels at 2x capture;
- PDF: one page at exactly 420 x 297 mm.

After normalizing raster dimensions, PNG-to-preview and PDF-to-preview RMS
differences were approximately 3.2/255. This is consistent with raster
anti-aliasing and shows no geometry drift.

## Layout Behavior

The `ancestor-tiered` engine now:

- traverses only parent-child ancestors reachable from the selected root;
- excludes disconnected nodes instead of placing orphans;
- balances each generation by its actual node count, including sparse trees and
  missing parents;
- places the root at the bottom for vertical trees;
- places the Arabic root at the right for horizontal trees and progresses toward
  older generations on the left;
- keeps all cards and connectors inside the document safe area;
- supports root-only through complete four-generation binary fixtures.

## Classic Arabic Cards

Classic cards render:

- Arabic display name;
- birth/death years when available;
- two-character initials fallback;
- masked labels without private years;
- card-relative name font sizing with a 9-16 px range;
- up to three wrapped name lines with overflow containment;
- isolated left-to-right year ranges inside the right-to-left document.

The bundled `Amiri-Regular.ttf` font is declared through `@font-face`. Browser
export waits for `document.fonts.load()` and `document.fonts.ready` before raster
capture. Ligatures and Arabic shaping are enabled. The generated artifacts show
no mojibake and contain no unintended English poster labels.

## Studio UX

For the poster product, the Studio exposes only Phase 1A controls:

- Classic preset;
- one to four generations;
- vertical or horizontal direction;
- A4 or A3;
- portrait or landscape;
- poster title and short description.

Modern poster selection and photo controls are not presented as Phase 1A
capabilities. Tree Snapshot remains a separate product rather than a poster
layout mode.

## Real Artifacts

- Preview evidence: `output/playwright/visual-studio-phase1a/classic-arabic-ancestor-poster-phase1a-preview.png`
- PNG export: `output/playwright/visual-studio-phase1a/classic-arabic-ancestor-poster-phase1a.png`
- Raster PDF export: `output/pdf/classic-arabic-ancestor-poster-phase1a.pdf`
- PDF page render: `output/playwright/visual-studio-phase1a/classic-arabic-ancestor-poster-phase1a-pdf-render.png`
- Geometry metadata: `output/playwright/visual-studio-phase1a/classic-arabic-ancestor-poster-phase1a-metadata.json`

These artifacts were generated locally from a sanitized Arabic four-generation
fixture. No private owner tree data was written to the repository.

## Internal Visual QA

The generated preview, PNG, and rendered PDF were inspected locally:

- Arabic title, names, ligatures, and mixed Arabic/year lines are readable;
- the long Arabic name remains inside its card;
- the masked person has no private years;
- all 15 nodes are visible and connected;
- no empty second page exists;
- no orphan or disconnected card is rendered;
- preview, PNG, and PDF composition and connector geometry match.

The artifacts remain valid geometry and rendering evidence. They are not a
candidate for visual product promotion as `Classic Poster`.

## Files Added or Updated for the Foundation and Phase 1A

- `src/features/publishing/visualOutputs/posterSceneTypes.ts`
- `src/features/publishing/visualOutputs/posterDocumentSpecs.ts`
- `src/features/publishing/visualOutputs/ancestorTieredPosterLayout.ts`
- `src/features/publishing/visualOutputs/posterSceneBuilder.ts`
- `src/features/publishing/visualOutputs/studioPosterRenderer.ts`
- `src/features/publishing/visualOutputs/studioPosterExportAdapter.ts`
- `src/features/publishing/visualOutputs/studioPosterBrowserPngRuntime.ts`
- `src/features/publishing/visualOutputs/studioPosterBrowserPdfRuntime.ts`
- `src/features/publishing/visualOutputs/visualOutputRegistry.ts`
- `src/features/publishing/visualOutputs/visualOutputTypes.ts`
- `src/features/publishing/index.ts`
- `src/features/the-vault/components/visual-studio/VisualPublishingStudio.tsx`
- `src/features/the-vault/components/visual-studio/VisualOutputPreviewPane.tsx`
- `src/features/the-vault/components/visual-studio/VisualOutputConfigPanel.tsx`
- `src/features/the-vault/components/visual-studio/visualStudioPosterOptions.ts`
- targeted unit and component test files under the corresponding `__tests__`
  directories;
- `scripts/visual-studio-phase1a-artifacts.mjs`.

## Verification

- Targeted Vitest: **85 passed / 85** across 8 files.
- `npm run typecheck`: **Pass**.
- Scoped ESLint for Phase 1A runtime/UI files with `--max-warnings=0`: **Pass**.
- `git diff --check`: **Pass** (line-ending notices only).
- Browser PNG generation: **Pass**.
- Browser raster PDF generation: **Pass**.
- PDF page count and physical dimensions: **Pass** (1 page, 420 x 297 mm).

## Superseding Visual Gate

Before any further visual renderer work, the product must select a wall-poster
direction from the Poster Visual Direction Pass. Incremental changes to font
size, line darkness, or whitespace on this baseline are explicitly insufficient
for product acceptance.
