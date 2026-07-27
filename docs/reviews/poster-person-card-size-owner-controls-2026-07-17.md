# Poster Person Card Size Owner Controls

**Date:** 2026-07-17
**Status:** Owner Runtime Visual Pass
**Scope:** Canonical person-card size control

## Decision

The Studio now provides three person-card sizes:

- **Small:** 88 percent of the authored card and photo geometry.
- **Standard:** the authored style baseline.
- **Large:** 114 percent of the authored card and photo geometry.

This is a layout input, not a CSS-only preview transform. Changing it creates a new
canonical PosterScene through the active layout engine.

## Shared Rendering Path

`VisualStudioPosterOptions.cardScale` maps to `PosterScene.cardScalePreset`. The scene
builder scales card width bounds, height, corner radius, photo diameter, and photo
border before layout. The SVG renderer consumes the resulting node rectangles without
recalculation and declares the selected scale in `data-poster-card-scale`. PNG and
raster PDF remain derivatives of the same SVG. Branch Collection receives the same
setting; Tiled Wall inherits the completed scene.

## Print Safety

- Typography density remains an independent choice.
- Long-name fitting runs against the scaled card width.
- Connector paths are recalculated by the scene layout engine, not the renderer.
- Card overlap, minimum print text, raster DPI, truncation, and memory checks remain
  enforced by PrintQualityReport.
- A large card selection cannot bypass a blocked single-sheet export.

## Owner Runtime Review

The control was exercised against the signed-in Arabic owner tree. The first Classic
card measured `280 x 160` scene units in Standard, `246.4 x 140.8` in Small, and
`319.2 x 182.4` in Large. SVG metadata followed each selection and exposed zero raw-ID
attributes. A 90-person full-tree composition with Large cards kept single-sheet PNG
and PDF actions disabled, confirming that large cards do not silently overlap or
override the quality gate.

## Verification

- 93 targeted Vitest checks passed across PosterScene, SVG renderer, Studio, and
  Branch Collection.
- `npm run typecheck` passed.
- Scoped ESLint passed with zero warnings.
- `git diff --check` passed.

No commit was created.
