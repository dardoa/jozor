# Classic Heritage SVG Theme

**Date:** 2026-07-13
**Status:** Implemented / Sanitized Visual QA Pass
**Owner Real-tree Review:** Pass for Limited Beta on 2026-07-14
**Commit:** None

## Result

The Studio Classic poster is no longer the Minimal Technical Tree Baseline. It now
uses a print-first `classic-heritage` visual style built directly into the canonical
SVG renderer. The same `PosterScene` and serialized SVG feed Studio preview, SVG
download, high-resolution PNG, and the current one-page raster PDF fallback.

## Visual Direction

- Warm paper surface with restrained grain.
- Deep green ink and limited bronze accents.
- Double print frame with quiet corner details.
- Centered Arabic title and supporting family-memory subtitle.
- Person cards with a six-pixel radius, soft shadow, and bronze top rule.
- Circular portraits overlapping the card edge with a double ring.
- Larger selected-root treatment and initials fallback for unavailable or hidden photos.
- Soft curved relationship paths that terminate at card edges.
- Integrated scope and Jozor footer inside the poster composition.

## Contract Changes

`PosterCardPreset` now identifies the visual style and owns photo geometry:

- `id`: `classic-heritage` or `modern-gallery`
- `visualStyle`: renderer-facing theme identity
- larger card bounds and Arabic typography baseline
- circular photo shape, preferred diameter, border width, and overlap behavior

The ancestor-tiered engine still produces all node rectangles, connector endpoints,
and bounds. The SVG renderer consumes those values and does not perform layout.

## Visual Evidence

Sanitized Arabic fixtures were generated for A3 and A4 landscape:

- Nodes: `7`
- Connectors: `6`
- Embedded portraits: `6`
- Failed portraits: `0`
- Raw image source in SVG: `false`
- Preview/PNG source parity: `true`
- Preview/PDF source parity: `true`
- PDF pages: `1` per fixture

Visual inspection confirmed intact Arabic shaping, readable mixed RTL/LTR years,
non-clipped footer text, photo fallback behavior, balanced ancestor tiers, and matching
PNG/PDF composition.

Artifacts:

- `output/playwright/visual-studio-svg-default/arabic-ancestor-poster.svg`
- `output/playwright/visual-studio-svg-default/arabic-ancestor-poster.png`
- `output/pdf/arabic-ancestor-poster-svg-default.pdf`
- `output/playwright/visual-studio-svg-default/arabic-ancestor-poster-a4-landscape.svg`
- `output/playwright/visual-studio-svg-default/arabic-ancestor-poster-a4-landscape.png`
- `output/pdf/arabic-ancestor-poster-svg-default-a4-landscape.pdf`

## Files

- `src/features/publishing/visualOutputs/posterSceneTypes.ts`
- `src/features/publishing/visualOutputs/posterSceneBuilder.ts`
- `src/features/publishing/visualOutputs/ancestorTieredPosterLayout.ts`
- `src/features/publishing/visualOutputs/studioPosterSvgRenderer.ts`
- focused PosterScene and SVG renderer tests
- `scripts/visual-studio-svg-default-artifacts.mjs`

## Remaining Scope

- Photo visibility and shape choices in the owner UI.
- Modern Gallery and Dense Genealogy presets.
- A2/A1/A0 with memory and readability safeguards.
- More card fields and theme customization.
- Vector PDF compatibility investigation; raster PDF remains the declared fallback.

## Studio Integration Review

The Arabic owner Studio was subsequently reviewed through the real application guest
flow. The responsive preview hierarchy, A3 landscape defaults, configuration copy,
and canonical SVG presentation passed the sanitized integration gate. See
`classic-heritage-studio-owner-screenshot-review-2026-07-13.md`. Real-tree density
and photo composition remain pending owner review.

The subsequent real-tree gate passed on 2026-07-14 using a four-generation A3
landscape sample with 10 people, 10 relationships, and six embedded photos. The
review also fixed automatic-title leakage for masked living roots. See
`classic-heritage-real-tree-owner-visual-review-2026-07-14.md`.
