# Poster Connector Path Owner Controls

**Date:** 2026-07-17
**Status:** Owner Runtime Visual Pass
**Commit:** None

## Scope

This pass adds an owner-facing generation-connector path control to the Visual
Publishing Studio. It changes the authored shape of parent/child lines without
changing node placement, connector endpoints, page bounds, or export geometry.

## Implemented Choices

- Style Default
- Straight
- Stepped Corners
- Curved

Authored defaults remain product-specific:

- Classic Heritage: Curved
- Modern Gallery: Straight
- Dense Genealogy and Branch Index: Stepped Corners

Spouse and relative relationships remain straight in every mode so peer
relationships stay visually distinct from generation flow.

## Shared Rendering Contract

The resolved path style is stored in canonical `PosterScene`. The SVG renderer
uses the same connector start and end coordinates for every choice and changes
only the SVG path command:

- Straight: one line segment.
- Stepped Corners: three orthogonal line segments.
- Curved: one cubic Bezier path.

Preview, SVG, PNG, raster PDF, Branch Collection, and Tiled Wall output therefore
share the same scene geometry and selected path treatment.

## Owner Runtime Review

The control was exercised against the signed-in Arabic owner tree using the
full-tree scope with 125 parent/child connectors visible in the canonical SVG.

- Straight rendered with a direct `L` segment.
- Stepped Corners rendered with three `L` segments.
- Curved rendered with a cubic `C` segment.
- The sampled connector retained identical start and end coordinates in all
  three modes.
- Classic, Modern, and Dense style defaults resolved to Curved, Straight, and
  Stepped Corners respectively.
- The preview exposed zero raw-ID attributes, external links, or storage
  references.

## Verification

- Targeted Vitest: 105 tests passed.
- `npm run typecheck`: passed.
- Scoped ESLint: passed with zero warnings.
- `git diff --check`: passed.
- Signed-in Arabic owner runtime review: passed.

## Decision

Generation connector path controls pass owner runtime review. They are ready for
continued visual product iteration and do not weaken geometry parity, privacy,
or print-quality gates.
