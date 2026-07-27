# Poster Background Decoration Owner Controls

**Date:** 2026-07-17
**Status:** Owner Runtime Visual Pass
**Scope:** Safe SVG-native poster background treatments

## Decision

The owner can choose a restrained background treatment without changing the poster
layout, export geometry, or privacy boundary. This is a visual treatment layer inside
the canonical SVG document, not a background-image upload system.

## Treatments

- **Style default:** Classic Heritage resolves to Heritage Paper. Modern Gallery and
  Dense Genealogy resolve to Clean.
- **Clean:** no decorative overlay.
- **Heritage Paper:** a low-opacity SVG pattern coordinated with the active palette.
- **Subtle Lineage Grid:** a low-opacity SVG lineage grid coordinated with the active
  accent color.

## Shared Rendering Path

`VisualStudioPosterOptions.decoration` is normalized into `PosterScene.decoration`.
The shared SVG renderer reads that scene field for Studio preview, SVG, PNG, raster
PDF, Branch Collection, and Tiled Wall outputs. The treatment never recalculates node
positions, connector paths, bounds, or physical page dimensions.

## Safety Boundary

- Patterns are generated inside the SVG document.
- No remote images, CSS URLs, storage paths, or authentication tokens are accepted.
- Clean mode emits no decoration layer.
- Custom palette colors safely drive pattern colors after scene-boundary validation.
- Branch Collection overview and detail scenes receive the same explicit treatment.

## Owner Runtime Review

The controls were exercised in the signed-in Arabic owner tree. Clean mode produced
`data-poster-decoration="clean"` with zero decoration layers. Subtle Lineage Grid
produced one `poster-decoration-lineage-grid` layer and one internal SVG pattern. DOM
inspection found zero raw-ID attributes and zero externally referenced images. The
four controls fit below the palette controls without displacing the PNG/PDF actions.

## Verification

- 87 targeted Vitest checks passed across PosterScene, SVG renderer, Studio, and
  Branch Collection.
- `npm run typecheck` passed.
- Scoped ESLint passed with zero warnings.
- `git diff --check` passed.

## Deferred

- Additional embedded font families. The current safe resolver has one bundled Arabic
  font, so the UI does not pretend that system-font choices are export-safe.
- Owner-supplied or authored background imagery and decorative assets. These require a
  controlled asset resolver, size limits, embedding rules, and separate print review.
- Physical print proof of the pattern density on representative printers and paper.

No commit was created.
