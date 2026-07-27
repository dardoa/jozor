# Poster Page Frame Owner Controls

**Date:** 2026-07-17
**Status:** Owner Runtime Visual Pass
**Scope:** Canonical wall-poster page frame

## Decision

The owner can choose the overall wall-poster frame independently of the card frame:

- **Style Default:** Classic Heritage resolves to Heritage, Modern Gallery to Modern
  Gallery, and Dense Genealogy or Branch Index to Minimal.
- **No Frame:** removes page-frame markup.
- **Minimal:** one restrained outer frame.
- **Heritage:** double frame with four corner treatments.
- **Modern Gallery:** gallery-oriented frame with two accent marks.

## Canonical Rendering

The resolved value is stored as `PosterScene.pageFramePreset`. The SVG renderer
selects the corresponding frame composition and derives its outer stroke width from
the selected frame itself, not from the original theme. PNG and raster PDF are
therefore identical derivatives. Branch Collection receives the owner choice and
Tiled Wall inherits the canonical scene.

## Geometry And Safety

- Page-frame selection does not change tree bounds, node rectangles, connectors,
  typography, or physical page size.
- All frame shapes are internal SVG primitives.
- No external images, CSS URLs, raw identifiers, or storage paths are introduced.

## Owner Runtime Review

The control was exercised against the signed-in Arabic owner tree. Classic resolved
to Heritage by default. No Frame produced zero frame groups. Heritage produced four
corner elements. Modern Gallery produced two gallery accent elements. Returning to
Style Default resolved Modern to Gallery and Dense to Minimal. DOM inspection found
zero raw-ID attributes and zero external links.

## Verification

- 102 targeted Vitest checks passed across PosterScene, SVG renderer, Studio, and
  Branch Collection.
- `npm run typecheck` passed.
- Scoped ESLint passed with zero warnings.
- `git diff --check` passed.

No commit was created.
