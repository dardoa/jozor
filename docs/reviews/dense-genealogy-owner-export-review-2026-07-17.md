# Dense Genealogy Owner Export Review

**Date:** 2026-07-17
**Status:** Owner Digital Export Pass / Real-tree A0 Overview Pass
**Commit:** None

## Review Scope

The review used the signed-in owner's real tree in the local application. Private
PNG/PDF artifacts were inspected locally and were not added to the repository.

Configuration:

- product: Dense Genealogy;
- scope: descendants from the selected root;
- depth: two generations;
- document: A3 landscape;
- tree direction: horizontal;
- privacy masking: enabled;
- photos: enabled, with living-person photos hidden;
- visible graph: 11 people and 10 relationships;
- canonical path: sanitized graph -> `descendant-tiered` -> PosterScene -> SVG ->
  preview / PNG / raster PDF.

## Initial Findings

The initial Dense preset exposed two related readability defects during real-tree
review:

1. Its 14-scene-unit name size resolved below the eight-point physical print floor,
   causing the quality gate to block even the A3 fixture.
2. Raising the name size alone made the text readable but left insufficient vertical
   space between the compact avatar and the first name line.

These were card-system defects, not export-format defects. PNG and PDF consistently
reflected the same PosterScene and SVG composition.

## Corrections

- Raised Dense name, year, and status typography to the physical readability floor.
- Increased compact card height from 108 to 124 scene units while keeping it smaller
  than the 160-unit Classic/Modern card.
- Reduced the preferred avatar diameter from 44 to 34 scene units.
- Positioned non-overlapping card names from the computed avatar ring bottom rather
  than from a fixed card-relative offset.
- Added regression coverage for the print floor and avatar/name clearance.

The correction remains inside the shared preset and canonical SVG renderer. Preview,
PNG, and PDF therefore use the same corrected card geometry.

## Regenerated Output

- PNG: `4526 x 3200` pixels (A3 landscape high-resolution export).
- PDF: one page, `1190.55 x 841.89` points (A3 landscape).
- Arabic title, subtitle, names, masked labels, years, and footer are readable.
- Compact avatars no longer collide with person names.
- No mojibake, empty pages, clipped cards, or orphan nodes were observed.
- Owner-authorized deceased-person photos render from normalized embedded assets.
- Living/private people retain masked names, hidden photos, and safe fallback avatars.
- The PNG and rendered PDF preserve the same node positions, connectors, title,
  footer, and card composition.

## Product Assessment

Dense Genealogy now provides a truthful compact alternative without falling below the
minimum print-readability threshold. The reviewed two-tier descendant fixture leaves
a broad center field because one root connects to a tall child tier. This is a P2
adaptive-layout opportunity, not a delivery failure, and must remain a shared
PosterScene improvement rather than a format-specific adjustment.

Dense Genealogy is primarily intended for higher-density trees and branch packages;
this sparse fixture validates its card legibility and delivery parity but does not
replace a later physical print proof at representative high density.

## Representative-density Gate

The later density gate used a sanitized full-tree fixture containing 90 people and
89 parent-child relationships. It does not contain owner records, raw database IDs,
contact fields, storage URLs, or private media references.

- A0 landscape preserved all 90 nodes and 89 connectors.
- Every card remained inside the physical page bounds.
- Overlapping card pairs: `0`.
- Estimated minimum name size: at least `8 pt`.
- Estimated raster memory remained below the `128 MiB` warning threshold.
- The A0 scene received a warning, rather than a block, because the one-pass raster
  export is below the preferred DPI target at that physical size.
- The same 90-person graph is blocked on A3, whose current full-tree overview
  capacity is 48 people.
- A 385-person fixture is blocked on A0, whose current overview capacity is 384
  people. The engine does not shrink cards or typography below the print floor.

The capacity gate scales from the physical page area, using 48 overview nodes on A3
as the reference. A blocked one-sheet scene is routed to Branch Collection or Tiled
Wall Poster in the Studio instead of being silently exported.

This closed the sanitized representative-density engineering gate before the
equivalent owner-tree artifact was available.

## Real-tree A0 Overview Review

The representative gate was subsequently repeated in the signed-in owner runtime
against the actual complete tree. The review exposed only aggregate scene metrics;
the private source tree and generated artifacts remained local and were not added to
the repository.

- Product: Dense Genealogy.
- Scope: complete tree, all available generations.
- Visible graph: `90` people, `155` relationships, and `5` generations.
- Privacy masking: enabled; living/private profiles remained masked.
- A3 landscape was correctly blocked as too dense for a readable single sheet.
- A0 landscape remained exportable with a truthful print-density warning.
- PNG: `6400 x 4525` pixels, `865,695` bytes.
- Raster PDF: one A0 landscape page, `3370.39 x 2383.94` points, `443,954`
  bytes.
- The PDF page visually preserves the PNG composition: title, summary, frame,
  footer, nodes, connectors, and privacy treatment use the same SVG-derived scene.
- Arabic text remained shaped and readable with no mojibake.
- No blank pages, clipped cards, orphan nodes, or content outside the page frame
  were observed.

The output succeeds as a compact full-tree overview. It deliberately does not claim
the visual detail of a photo-focused family portrait poster.

## A0 Composition Polish

The owner review identified excessive vertical reservation above the complete-tree
overview. The shared layout builder previously reserved 12% of every page for the
header, even though Dense Genealogy uses the compact registry composition.

- Complete-tree overview scenes now use an adaptive 5% header reservation with a
  safe minimum; detailed ancestor and descendant scenes retain their existing 12%
  contract.
- The section gap for complete-tree overview scenes is reduced proportionally.
- The signed-in 90-person A0 preview now starts its first node at scene y `490.6`,
  approximately `10.8%` of the `4525`-unit page height, and extends through scene y
  `4021.65`, approximately `88.9%` of the page height.
- All `90` nodes and `155` relationships remain present. No title collision, clipped
  card, orphan node, or content outside the page frame was observed.
- Preview and exports continue to consume the same PosterScene geometry; no
  format-specific layout adjustment was introduced.

The polished owner artifacts were then regenerated from the same signed-in Studio
configuration:

- PNG: `6400 x 4525` pixels, `866,535` bytes.
- Raster PDF: one A0 landscape page, `3370.39 x 2383.94` points, `452,427` bytes.
- The rendered PDF page visually matches the PNG composition, including the compact
  header, page frame, node positions, relationship paths, footer, and privacy masks.
- Arabic title and card text remain shaped and readable. No mojibake, blank page,
  clipped card, or unexpected English label was observed.

This closes the A0 header-space P2 item for the reviewed full-tree composition.

At `6400` pixels across A0 landscape, the current one-pass raster is approximately
`137 DPI`. The Studio correctly reports a warning rather than claiming premium print
quality. A physical print proof remains required before wall-print quality is
promoted beyond the digital owner gate.

## Verification

- PosterScene builder tests: 48 passed after adding A3/A0 density capacity and
  full-tree header-reservation coverage.
- Shared SVG renderer tests: 34 passed.
- Visual Publishing Studio tests: 40 passed.
- Sanitized 90-person A0 fixture: warning, zero overlaps, print-floor text preserved.
- Sanitized 90-person A3 fixture: blocked and routed to large-tree products.
- Sanitized 385-person A0 fixture: blocked instead of being compressed indefinitely.
- TypeScript: passed.
- Scoped ESLint: passed with zero warnings.
- Real-tree PNG inspection: passed after correction.
- Real-tree one-page PDF inspection: passed after correction.
- Real-tree 90-person A0 overview PNG/PDF inspection: passed digitally with a
  truthful print-density warning.
- Real-tree 90-person A0 composition preview: passed after the adaptive header polish.
- Regenerated polished A0 PNG and one-page PDF visual comparison: passed.
- Commit: not created.

## Decision

Dense Genealogy receives **Owner Digital Export Pass** for A3 landscape descendant
posters and **Real-tree A0 Overview Pass** for the 90-person complete-tree artifact.
The A0 result is approved as a digital overview, not yet as a premium physical print;
physical print proof remains a separate gate before broad beta clearance.
