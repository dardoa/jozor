# Poster Card Corner Owner Controls

**Date:** 2026-07-17
**Status:** Runtime Automated Pass / Owner Visual Review Pending
**Commit:** None

## Scope

This pass adds an owner-facing person-card corner control to the Visual Publishing
Studio. It changes card corner geometry without changing card dimensions, node
positions, connector endpoints, page bounds, or export layout.

## Implemented Choices

- Style Default
- Square
- Soft
- Rounded

Authored defaults remain product-specific:

- Classic Heritage: Soft
- Modern Gallery: Rounded
- Dense Genealogy: Square
- Branch Index: Soft

## Shared Rendering Contract

The resolved choice is stored in canonical `PosterScene`. The scene builder derives
one bounded SVG corner radius after card scaling and before layout. Layout engines
continue to consume the same card width and height, while the SVG renderer consumes
the resolved radius for card, shadow, and inner-frame elements.

Preview, SVG, PNG, raster PDF, Branch Collection, and Tiled Wall output therefore
share one card-corner definition. No HTML-only or export-only styling path was added.

## Safety And Geometry

- Square cards use a zero corner radius.
- Soft cards use a conservative radius bounded by card height.
- Rounded cards use a larger radius capped for print stability.
- Node rectangles and connector geometry remain identical across the three choices.
- Existing privacy, image-resolution, and print-quality gates remain authoritative.

## Verification

- Targeted Vitest: 108 tests passed.
- `npm run typecheck`: passed.
- Scoped ESLint: passed with zero warnings.
- `git diff --check`: passed.
- Signed-in owner visual review: pending because the in-app browser blocked the local
  application URL during this review session.

## Decision

Card-corner controls pass automated runtime verification. They remain pending one
signed-in owner visual check before receiving an Owner Runtime Visual Pass.
