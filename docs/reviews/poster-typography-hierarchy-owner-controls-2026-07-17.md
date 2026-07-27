# Poster Typography Hierarchy Owner Controls

**Date:** 2026-07-17
**Status:** Owner Runtime Visual Pass
**Scope:** Export-safe typography density using the embedded Arabic font

## Decision

The Studio now offers three truthful typography-density choices while continuing to
use the single Arabic font that is safely bundled and embedded in exported SVG:

- **Balanced:** the authored baseline.
- **Larger Names:** increases poster title, subtitle, person names, years, and detail
  text within the existing card geometry.
- **Compact:** reduces the same hierarchy for denser compositions, while remaining
  subject to the print-quality floor.

The UI does not expose fake font-family choices backed by non-embedded system fonts.

## Canonical Path

`VisualStudioPosterOptions.typography` is stored as
`PosterScene.typographyPreset`. The scene builder scales the card typography before
the layout engine fits long names. The SVG renderer applies the same preset to the
title and subtitle and emits `data-poster-typography`. PNG and raster PDF remain
derived from that SVG. Branch Collection receives the same preset, and Tiled Wall
inherits it from its canonical scene.

## Geometry And Quality

- Card rectangles, connector coordinates, page bounds, and physical page dimensions
  do not change between typography presets.
- Long-name fitting still runs inside the layout engines.
- `PrintQualityReport` evaluates the resulting node font sizes.
- Compact mode cannot bypass the eight-point print floor or any other blocking gate.

## Owner Runtime Review

The controls were exercised against the signed-in Arabic owner tree. The first visible
card name changed from `19` scene units in Balanced mode to `21.3` in Larger Names and
`17.5` in Compact. The SVG preset metadata changed with each choice and contained zero
raw-ID attributes. A 90-person full-tree composition kept single-sheet PNG/PDF actions
disabled in Compact mode, confirming that density is not treated as permission to
produce an unreadable sheet.

## Verification

- 90 targeted Vitest checks passed across PosterScene, SVG renderer, Studio, and
  Branch Collection.
- `npm run typecheck` passed.
- Scoped ESLint passed with zero warnings.
- `git diff --check` passed.

## Deferred

Additional font families remain deferred until real Arabic font files can be bundled,
licensed, embedded, and reviewed in SVG, PNG, and PDF. System-font fallbacks are not
presented as owner choices.

No commit was created.
