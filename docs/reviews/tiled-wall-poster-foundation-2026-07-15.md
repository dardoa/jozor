# Tiled Wall Poster Foundation

**Date:** 2026-07-15
**Status:** Digital Assembly Pass / Physical Print Proof Pending
**Commit:** None

## Delivered

- Added a `TiledWallPosterPlan` derived from one canonical PosterScene.
- Supports deterministic row/column grids from 1x1 through 12x12.
- Converts overlap millimeters into scene coordinates with one uniform scale, preserving
  the source scene aspect ratio without stretching.
- Centers the source scene inside the assembled wall area when the selected grid and
  paper ratio differ.
- Produces stable row-major tile labels and assembly dimensions in millimeters.
- Extended the canonical SVG renderer with an optional viewport. Tile rendering changes
  only the SVG viewBox and physical sheet metadata; it never recalculates nodes,
  connectors, or layout bounds.
- Added a ZIP exporter containing numbered SVG sheets, `assembly.json`, and localized
  print instructions.
- Added a print-sheet compositor with a 10 mm safe margin, corner crop marks, edge-center
  alignment marks, and page/row/column labels.
- Added full-tree-only Studio controls for rows, columns, A4/A3/A2 sheet size, and
  overlap, plus a direct ZIP download action.
- Added a physical readability report showing sheet count, final assembled dimensions,
  and estimated minimum text size in points. Unreadable grids are blocked; marginal
  grids receive a recommendation to add rows or columns.
- Added per-tile render culling: each SVG includes only nodes and connectors intersecting
  its sheet viewport while retaining their canonical PosterScene coordinates. This avoids
  serializing the entire 90-person scene into every sheet.
- Added non-sensitive per-sheet utilization counts, an owner-facing sparse-edge note,
  manifest file paths, and a complete localized assembly guide with a row/column map.
- Replaced the misleading single-sheet density warning with a recommendation to use
  Branch Collection or Tiled Wall Poster.

## Safety and Product Boundary

- The plan accepts PosterScene only, so raw people, database identifiers, contact fields,
  and storage URLs cannot enter the tiling layer.
- The public assembly manifest contains sheet geometry and ordering only.
- A truncated source scene is rejected at export time.
- The product is exposed only for full-tree scope. A truncated source scene is never
  offered or exported.

## Verification

- Tiled Wall Poster tests: 3 passed.
- Canonical SVG renderer regression tests: 8 passed.
- TypeScript: passed.
- Scoped ESLint: passed with zero warnings.
- `git diff --check`: passed.
- No commit was created.

## Real-tree Studio Check

The owner's 90-person, 155-relationship full-tree overview was checked with the default
`3x3 A3 landscape` configuration. The Studio reported:

- 9 sheets;
- final trimmed artwork size: `118.4 x 81.5 cm`;
- estimated minimum text size: `17.3 pt`;
- quality: print readable.

No raw identifiers were displayed and no browser console errors were observed.

The real-tree ZIP action entered its visible generation state and completed successfully
after viewport culling, without console errors. The owner later supplied the generated
archive for local-only inspection. Its 30 SVG sheets, manifest, ordering, shared geometry,
font embedding, and privacy boundary passed the digital assembly review. The physical
print proof remains pending.

## Next Step

Print a representative adjacent sheet set at 100% and verify crop alignment, repeated
overlap, Arabic continuity, and final physical size on paper.
