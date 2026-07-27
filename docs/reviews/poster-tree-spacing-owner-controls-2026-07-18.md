# Poster Tree Spacing Owner Controls

**Date:** 2026-07-18
**Status:** Runtime Automated Pass / Owner Visual Review Pending
**Commit:** None

## Scope

This pass adds bounded tree-spacing presets to the Visual Publishing Studio. The
control is implemented inside the layout engines rather than as CSS spacing around
an already-rendered poster.

## Implemented Choices

- Style Default
- Compact
- Balanced
- Airy

Authored defaults remain product-specific:

- Classic Heritage: Balanced
- Modern Gallery: Airy
- Dense Genealogy: Compact
- Branch Index: Compact

## Layout Behavior

Tiered ancestor and descendant layouts use the preset when calculating the card span
available to dense generations. Family-network and full-tree layouts use the same
bounded rule. Branch Index scales horizontal and vertical grid gaps while retaining
its centered root and stable branch order.

The selected preset is stored in `PosterLayoutSpec`, so preview, SVG, PNG, raster PDF,
Branch Collection, and Tiled Wall all consume the same layout result. The person set,
privacy state, and relationship graph do not change when spacing changes.

## Print Safety

- Compact spacing can preserve larger cards in dense generations.
- Airy spacing reserves more whitespace by reducing card span where necessary.
- Every changed scene is re-evaluated by `PrintQualityReport`.
- Arbitrary numeric gaps and negative spacing are not accepted.
- Large-tree routing and single-sheet blocking remain authoritative.

## Verification

- Targeted Vitest: 114 tests passed.
- Four-generation A4 fixture confirmed real geometry differences with stable node IDs.
- Branch Collection preserved the selected spacing in overview and detail scenes.
- `npm run typecheck`: passed.
- Scoped ESLint: passed with zero warnings.
- `git diff --check`: passed.
- Signed-in owner visual review: pending.

## Decision

Tree-spacing presets pass automated runtime verification. Advanced freeform spacing
remains intentionally unsupported until a later print-safety design gate.
