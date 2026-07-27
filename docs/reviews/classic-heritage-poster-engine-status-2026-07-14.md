# Classic Heritage Poster Engine Status

**Date:** 2026-07-14
**Status:** Core Studio Engine Implemented / Expansion QA Ongoing
**Commit:** None

## What Is Implemented

- Sanitized store boundary with privacy masking and session-only preview IDs.
- Ancestor, descendant, and complete-tree selectors.
- One-to-four and all-generation directional traversal.
- `PosterScene` as the shared physical document geometry.
- A4/A3/A2/A1/A0, portrait/landscape, and vertical/horizontal composition.
- `ancestor-tiered`, `descendant-tiered`, and `family-network-tiered` engines.
- Classic Heritage cards with Arabic names, years, initials, and embedded photos.
- SVG as the canonical preview renderer.
- PNG and one-page raster PDF derived from the exact same SVG scene.
- Controlled Arabic font and image asset resolvers.
- Print-quality evaluation and export blocking for unsafe scenes.

## Approved Today

- Classic Heritage ancestor posters passed their real-tree A3 owner review.
- Ancestor PNG/PDF is cleared for Limited Beta behind the print-quality gate.

## Implemented But Awaiting Owner Visual Approval

- Descendant posters.
- Full-tree posters with all supported relationships.
- Deep all-generation samples beyond the four generations present in the reviewed tree.

## Remaining Product Work

- A2/A1/A0 physical print proofing and owner visual approval.
- Dense Genealogy card preset for large trees.
- Modern Gallery visual direction and owner review.
- Broader full-tree layout refinement for multiple spouses and cross-generation links.
- Optional advanced card fields and relationship styling controls.
- Vector PDF only if Arabic, fonts, and embedded images remain reliable; raster PDF is
  the current truthful format.

## Deliberately Retired

The legacy Classic/Modern poster exporters remain paused. They are not reused by the
Studio and are not part of the canonical PosterScene/SVG path.
