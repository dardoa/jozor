# Poster Card Depth Owner Controls

**Date:** 2026-07-17
**Status:** Owner Runtime Visual Pass
**Scope:** SVG-native person-card depth effects

## Decision

The owner can choose the visual depth of person cards without changing layout:

- **Style Default:** Classic Heritage resolves to Soft Shadow, Modern Gallery to
  Elevated, and Dense Genealogy or Branch Index to Flat.
- **Flat:** no visible card shadow.
- **Soft Shadow:** restrained wall-poster depth.
- **Elevated:** stronger separation for gallery-oriented compositions.

## Canonical Rendering

The resolved choice is stored as `PosterScene.cardEffectPreset`. The SVG renderer
uses one internal `feDropShadow` definition whose offset, blur, flood opacity, and
visible layer opacity come from the scene. SVG preview, PNG, and raster PDF therefore
share the exact effect. Branch Collection receives an explicit owner choice; Tiled
Wall inherits the completed scene.

## Geometry And Safety

- Node rectangles, connector paths, page bounds, and card text are unchanged.
- No CSS URL, remote filter, image, or runtime storage reference is accepted.
- Flat mode keeps the shadow element structurally stable but sets all effect values
  and visible opacity to zero.
- Dense defaults to Flat to avoid muddy high-density print output.

## Owner Runtime Review

The control was exercised against the signed-in Arabic owner tree. Classic resolved
to Soft by default. Flat emitted `data-poster-card-effect="flat"` with shadow offset
zero. Elevated emitted offset `12` and blur `14`. Returning to Style Default and
selecting Dense Genealogy resolved to Flat. SVG inspection found zero raw-ID
attributes.

## Verification

- 96 targeted Vitest checks passed across PosterScene, SVG renderer, Studio, and
  Branch Collection.
- `npm run typecheck` passed.
- Scoped ESLint passed with zero warnings.
- `git diff --check` passed.

No commit was created.
