# SVG Default Poster Rendering Direction Pass

**Date:** 2026-07-13
**Status:** Direction Adopted / Initial Runtime Foundation Implemented
**Commit:** None

## Decision

SVG is now the default visual rendering format for Visual Publishing Studio poster
products. `PosterScene` remains the canonical print geometry, and PNG/PDF are
derived outputs rather than independent renderers.

The active flow is:

```text
SanitizedPreviewGraph
  -> ancestor-tiered layout
  -> PosterScene
  -> SVG Renderer
  -> Studio Preview / SVG / PNG / Raster PDF fallback
```

## Implemented Runtime Foundation

- Added deterministic `PosterScene -> SVG` serialization.
- Switched Studio poster preview from HTML `iframe` content to inline canonical SVG.
- Added direct SVG export support in the Studio poster export adapter.
- Replaced HTML screenshot capture in the PNG runtime with SVG image decoding and
  canvas rasterization.
- Kept PDF as a one-page raster fallback, now fed by the SVG-derived PNG.
- Set Classic and Modern poster registry definitions to `defaultRenderer: 'svg'`.
- Declared runtime poster targets truthfully as SVG, PNG, and PDF.
- Kept Tree Snapshot outside the SVG poster decision.

## Geometry Parity Evidence

The generated A3 landscape fixture uses a single `PosterScene` and a single SVG
string across all outputs:

- Scene size: `2263 x 1600`
- Physical size: `420 x 297 mm`
- People: `7`
- Connectors: `6`
- `sameSvgForPng: true`
- `sameSvgForPdf: true`
- PDF pages: `1`
- PDF physical page: `420 x 297 mm`

Artifacts:

- `output/playwright/visual-studio-svg-default/arabic-ancestor-poster.svg`
- `output/playwright/visual-studio-svg-default/arabic-ancestor-poster-preview.png`
- `output/playwright/visual-studio-svg-default/arabic-ancestor-poster.png`
- `output/pdf/arabic-ancestor-poster-svg-default.pdf`
- `output/playwright/visual-studio-svg-default/metadata.json`

Visual inspection confirmed intact Arabic shaping, mixed Arabic/year rendering, no
mojibake, one-page output, and matching preview/PNG/PDF geometry.

## Contract Changes

- `VisualOutputDefinition.defaultRenderer` identifies SVG as the poster default.
- `StudioPosterSvgRenderRequest` accepts a `PosterScene` plus controlled embedded
  resources.
- `StudioPosterSvgRenderResult` carries the SVG, original scene, physical dimensions,
  and renderer metadata.
- `StudioPosterExportRuntimeRequest` carries this SVG render result to derived-format
  runtimes.
- `StudioPosterExportFormat` now includes `svg`, `png`, and `pdf`.

## Security and Resource Rules

- The renderer consumes `PosterScene`, never raw person entities.
- Session preview IDs are used for structural attributes; raw person IDs are absent.
- Scripts and `foreignObject` are not emitted.
- External font and media URLs are not accepted by the SVG resource boundary.
- Optional fonts must arrive as trusted base64 font data URIs.
- Actual images will require a controlled `PosterImageAssetResolver` and embedded
  normalized assets before they enter SVG.

## Transitional Components

- `studioPosterRenderer.ts` remains temporarily as the former HTML renderer and is
  covered by its legacy tests. It is disconnected from active Studio preview and
  Studio export paths.
- PDF is a raster fallback derived from SVG. It is not advertised as vector or
  searchable.
- The follow-up Arabic font phase now embeds the bundled Amiri TrueType asset through
  `PosterFontAssetResolver`; preview and export no longer rely on an installed font.
- Photos, ornamental assets, and advanced wall-poster themes remain future resource
  and visual-direction work.

## Phased Follow-up

1. **SVG Resource Embedding:** Arabic font and controlled person-photo embedding are
   complete. Decorative assets remain part of individual theme implementation.
2. **Wall-poster visual system:** implement the approved Classic Heritage direction,
   then Modern Gallery and Dense Genealogy as real SVG scene styles.
3. **Large-format output:** add A2/A1/A0 only with memory budgets, DPI choices, and
   `PrintQualityReport` warnings.
4. **Vector PDF quality gate:** evaluate SVG-to-PDF conversion with Arabic, embedded
   fonts, photos, clipping, and exact physical dimensions. Retain raster fallback if
   any fidelity requirement fails.

## Files Added or Changed for This Pass

- `src/features/publishing/visualOutputs/studioPosterSvgRenderer.ts`
- `src/features/publishing/visualOutputs/studioPosterExportAdapter.ts`
- `src/features/publishing/visualOutputs/studioPosterBrowserPngRuntime.ts`
- `src/features/publishing/visualOutputs/studioPosterBrowserPdfRuntime.ts`
- `src/features/publishing/visualOutputs/visualOutputTypes.ts`
- `src/features/publishing/visualOutputs/visualOutputRegistry.ts`
- `src/features/the-vault/components/visual-studio/VisualOutputPreviewPane.tsx`
- `src/features/the-vault/components/visual-studio/VisualPublishingStudio.tsx`
- focused renderer, runtime, registry, scene, and Studio tests
- `scripts/visual-studio-svg-default-artifacts.mjs`
- ADR 015 and this review report
