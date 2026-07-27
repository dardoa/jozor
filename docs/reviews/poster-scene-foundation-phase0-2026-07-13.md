# PosterScene Foundation - Phase 0

**Date:** July 13, 2026
**Status:** `Implemented / Automated Verification Pass`
**Product boundary:** Print-first ancestor poster foundation for A4/A3.
**Commit:** None created.

## Decision

Phase 0 replaces preview-specific poster geometry with a canonical `PosterScene` document. The Studio now builds one scene from a sanitized ancestor graph and passes that same scene object to preview, PNG, and PDF paths.

The legacy poster renderer was not used. No raw `Person` entity, storage URL, image payload, or database identifier was added to the scene boundary.

## New Contracts

### `PosterDocumentSpec`

Defines the physical and rendering document:

- Runtime page sizes: A4 and A3 only.
- Portrait and landscape orientation.
- Physical width and height in millimeters.
- Canonical scene dimensions used by the current raster baseline.
- Physical and scene-space margins.

### `PosterContentSpec`

Defines safe owner-selected content:

- Definition ID.
- Arabic or English language.
- Title and subtitle.
- `selected-root-ancestors` scope.
- Session-isolated root preview ID.
- Two, three, or four generations.
- Preview privacy mode.

### `PosterLayoutSpec`

Defines the implemented layout contract:

- Engine: `ancestor-tiered`.
- Direction: current vertical ancestor baseline.
- Fixed tree bounds inside the physical page composition.

### `PosterCardPreset`

Defines the current `classic-standard` card geometry and typography:

- Minimum and maximum card width.
- Card height and radius.
- Name, year, and privacy-status text sizes.
- Existing Classic baseline; the current Modern color wrapper uses the same geometry for compatibility and is not a separate Phase 0 layout.

### `PosterScene`

The canonical document shared by all output paths. It contains:

- Document, content, layout, and card contracts.
- Positioned safe preview nodes.
- Positioned parent-child connectors.
- Page, content, and tree bounds.
- Sanitized source counts only.
- A Phase 0 quality-report placeholder.

It does not contain raw people, raw IDs, contact fields, notes, storage URLs, authentication data, or image paths.

### `PrintQualityReport`

The contract exists, but Phase 0 does not fabricate quality conclusions. Every current scene reports:

```text
status: not-evaluated
evaluated: false
warnings: []
metrics: {}
```

Real DPI, readability, density, and memory warnings remain Phase 2 work.

## Data Path

```text
Store-shaped tree source
  -> existing product selector
  -> production preview sanitizer
  -> SanitizedPreviewGraph
  -> ancestor-tiered layout engine
  -> PosterScene
  -> HTML/CSS scene renderer
       -> scaled iframe preview
       -> PNG runtime
       -> raster PDF runtime using the same PNG scene
```

The layout engine accepts `SanitizedPreviewGraph` only. `PosterScene` accepts session-isolated IDs with the `preview-node-*` form only.

## Geometry Parity

Previously, preview recalculated poster layout at `640 x 900` or `750 x 530`, while export recalculated it at A4/A3 raster dimensions.

After Phase 0:

1. `VisualPublishingStudio` creates the A4/A3 `PosterDocumentSpec`.
2. It creates one `PosterScene` with target-page geometry.
3. `VisualOutputPreviewPane` renders that scene at full target dimensions and scales the iframe visually.
4. The preview does not request a reduced layout.
5. `exportStudioPoster` receives the same scene object.
6. PNG consumes HTML generated from that scene.
7. PDF obtains its physical millimeter dimensions from the scene itself and embeds the PNG generated from the same render result.

The PDF runtime no longer accepts an independent `pageSizeMm`, preventing scene/page-size drift.

## Registry Corrections

Runtime poster capabilities now advertise only:

- A4 and A3.
- Portrait and landscape.
- Selected root and ancestor line.
- PNG and PDF.
- No actual photo mode.
- `ancestor-tiered` layout.

A2, A1, A0, photo modes, and additional style variants are recorded separately under `plannedCapabilities`. Runtime support helpers correctly return `false` for planned large-format sizes.

## Privacy And Boundary Results

- No raw `Person` entity enters the scene engine.
- Scene nodes use `previewId`, never database IDs.
- Non-session identifiers are rejected before layout.
- Privacy masking and hidden years remain preserved.
- Arabic titles, names, status text, and years remain in UTF-8 HTML.
- No storage URL, Supabase reference, email, phone, notes, or image payload enters `PosterScene`.
- Actual photos and `PosterImageAssetResolver` remain outside Phase 0.
- No legacy poster renderer is called.

## Temporary Baseline Components

The following are intentionally temporary:

- The final scene is rendered through HTML/CSS rather than a canonical SVG backend.
- PNG uses browser HTML rasterization at the existing fixed pixel ratio.
- PDF is a one-page raster visual PDF, not searchable/vector Arabic PDF.
- `PrintQualityReport` has no calculation logic yet.
- Actual photo embedding is absent; the existing availability marker is not a photo implementation.
- The Modern color wrapper remains compatible with the shared geometry, but Phase 0 certifies the Classic baseline only.
- Tree Snapshot remains a separate viewport product and does not consume `PosterScene`.

## Files Added

- `src/features/publishing/visualOutputs/posterSceneTypes.ts`
- `src/features/publishing/visualOutputs/posterDocumentSpecs.ts`
- `src/features/publishing/visualOutputs/ancestorTieredPosterLayout.ts`
- `src/features/publishing/visualOutputs/posterSceneBuilder.ts`
- `src/features/publishing/visualOutputs/__tests__/posterSceneBuilder.test.ts`
- `src/features/publishing/visualOutputs/__tests__/studioPosterTestFixtures.ts`
- `docs/reviews/poster-scene-foundation-phase0-2026-07-13.md`

## Files Modified

- `src/features/publishing/index.ts`
- `src/features/publishing/visualOutputs/studioPosterRenderer.ts`
- `src/features/publishing/visualOutputs/studioPosterExportAdapter.ts`
- `src/features/publishing/visualOutputs/studioPosterBrowserPngRuntime.ts`
- `src/features/publishing/visualOutputs/studioPosterBrowserPdfRuntime.ts`
- `src/features/publishing/visualOutputs/visualOutputTypes.ts`
- `src/features/publishing/visualOutputs/visualOutputRegistry.ts`
- Poster renderer, export adapter, browser runtime, and registry tests.
- `src/features/the-vault/components/visual-studio/VisualPublishingStudio.tsx`
- `src/features/the-vault/components/visual-studio/VisualOutputPreviewPane.tsx`
- `src/features/the-vault/components/visual-studio/visualStudioPosterOptions.ts`
- `src/features/the-vault/components/visual-studio/__tests__/VisualPublishingStudio.test.tsx`

## Automated Verification

Final targeted Vitest result:

- Test files: 8 passed.
- Tests: 80 passed.
- Covered A4/A3 portrait and landscape document fixtures.
- Covered two, three, and four ancestor generations.
- Covered preview/PNG/PDF scene identity and geometry parity.
- Covered Arabic baseline and privacy masking.
- Covered rejection of non-session identifiers.
- Covered PNG/PDF runtimes and truthful registry capabilities.

Additional checks:

- `npm run typecheck`: pass.
- Scoped ESLint with `--max-warnings=0`: pass.
- Repository-wide `npm run lint -- --max-warnings=0`: blocked by 16 pre-existing warnings in `src/utils/gedcomLogic.ts` and `src/utils/__tests__/gedcomLogic.test.ts`; no Phase 0 file warning was reported.
- `git diff --check`: pass (line-ending notices only; no whitespace errors).

## Deferred Work

Not implemented in this phase:

- Actual photos or `PosterImageAssetResolver`.
- A2, A1, or A0.
- Real print-quality warnings.
- Horizontal reading direction.
- Focus, radial, descendant, branch, or full-tree layouts.
- Branding controls.
- Vector/searchable PDF or SVG.
- Custom person fields, spacing controls, or card presets beyond the baseline contract.

## Phase 0 Verdict

`Pass as PosterScene Foundation`. The architecture is ready for Phase 1A, but no Phase 1A feature was implemented here.
