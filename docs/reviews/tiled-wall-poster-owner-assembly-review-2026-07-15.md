# Tiled Wall Poster Owner Assembly Review

**Date:** 2026-07-15
**Reviewed artifact:** Local owner-generated ZIP (private artifact not committed)
**Digital package status:** Pass
**Physical print status:** Print proof pending
**Overall decision:** Pass for Digital Assembly / Needs Physical Print Proof

## Product Classification

The artifact is a real Tiled Wall Poster package, not a collection of independently
laid-out posters. Every sheet is a viewport into one canonical PosterScene and retains
the same scene coordinates for repeated nodes and connectors.

## Package Summary

- ZIP opens and extracts without corruption.
- Package size: approximately `7.64 MB` compressed.
- Contents: `30` numbered SVG sheets, `assembly.json`, and `README.txt`.
- Grid: `6 rows x 5 columns`.
- Paper: `A2 landscape`.
- Trimmed assembled artwork: `2838 x 2360 mm` (approximately `2.84 x 2.36 m`).
- Safe margin: `10 mm`.
- Artwork overlap: `8 mm`.
- Estimated minimum text size: `42.7 pt`.
- Readability classification: `pass`.
- No temporary, debug, or unexpected files were found.

## Structural Verification

- All `30/30` SVG files are valid XML documents.
- All `30/30` sheets contain print marks and the correct row/column label.
- Row-major numbering is complete from `1-1` through `6-5`.
- Every SVG declares the expected A2 landscape physical dimensions.
- The Arabic font asset is embedded in every sheet.
- No mojibake or replacement-character indicators were found.
- No external asset URLs, storage URLs, raw database IDs, auth tokens, scripts, or
  `foreignObject` elements were found.
- The generated configuration contains no embedded photos. Photo tiling was therefore
  not evaluated by this artifact.

## Geometry and Continuity

- Union across the package: `90` preview nodes and `155` relationship connectors.
- Repeated node geometry mismatches across overlapping sheets: `0`.
- Repeated connector geometry mismatches across overlapping sheets: `0`.
- Measured SVG viewport overlap is consistently `28 mm`. This correctly represents
  `10 mm safe margin + 8 mm artwork overlap + 10 mm safe margin` between adjacent full
  sheets.
- The manifest's assembled dimensions correctly describe the trimmed artwork area,
  excluding the outer safe margins.

This confirms that adjacent sheets consume one shared coordinate system and that no
per-sheet layout recalculation occurred.

## Owner Preview Review

The Studio's assembled preview was inspected against the package settings. It showed
one continuous full-tree composition with the title, frame, nodes, connectors, and
footer occupying the same overall document.

The first sheet row primarily carries the title and upper decorative field. Several
outer sheets contain little family-tree content. They are not corrupt or accidentally
blank, but this reveals a print-cost optimization opportunity for future large-wall
layouts.

## Non-blocking Follow-ups

### P2 - Edge-sheet utilization

Add a recommendation or an alternate crop mode when complete rows or corner sheets
contain only title, frame, or very sparse artwork. The engine must not silently remove
those sheets because that would change the intended wall composition.

### P2 - Assembly instructions

Expand `README.txt` with a small row/column map, 100% print-scale warning, trim/overlap
sequence, and final-size statement. The current one-line instruction is accurate but
too brief for a first-time owner assembling thirty A2 sheets.

**Implemented after review:** New archives now include the expanded instructions,
assembly map, final dimensions, and explicit column ordering. The reviewed archive
predates this improvement and remains unchanged.

### P2 - Photo package proof

Run a separate owner artifact check with photos enabled after the large-tree photo
preset is supported. This package proves SVG/font/geometry assembly, not embedded-image
continuity.

## Decision

The generated ZIP passes the digital owner assembly review. It is structurally sound,
privacy-safe at the checked boundary, correctly ordered, and geometrically continuous.

Do not claim the physical assembly gate as complete until a representative adjacent
sheet set is printed at 100% and its crop marks, overlap, Arabic text size, and connector
continuity are checked on paper.
