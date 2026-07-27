# Tiled Wall Poster Assembly Guidance Pass

**Date:** 2026-07-15
**Status:** Completed
**Commit:** None

## Purpose

Close the two actionable follow-ups from the owner digital assembly review without
changing PosterScene geometry, tile viewports, or export eligibility.

## Delivered

- Added per-sheet tree-content telemetry containing node and connector counts only.
- Added a plan-level utilization summary separating tree-content sheets from
  decorative-only sheets.
- Added a non-blocking owner-facing note when edge sheets carry only the title, frame,
  or intended poster field.
- Added an optional grid recommendation that searches only smaller configurations,
  requires print quality to remain `pass`, retains at least 75% of the selected text
  size with a hard `7 pt` floor, and reduces decorative-only edge sheets.
- Kept recommendations advisory: they never mutate the selected grid or regenerate the
  PosterScene.
- Added an explicit `Apply lower-cost grid` / `تطبيق الاقتراح` action. It updates only
  rows and columns after owner intent; paper size, orientation, overlap, privacy, and
  poster content remain unchanged.
- Kept readability and utilization as separate decisions. Sparse decorative sheets do
  not incorrectly block an otherwise readable wall poster.
- Expanded `README.txt` with:
  - paper size and orientation;
  - sheet count and final assembled dimensions;
  - safe margin and overlap;
  - a complete row/column assembly map;
  - a strict 100% print-scale instruction;
  - a two-sheet proof recommendation;
  - crop, alignment, overlap, and mounting instructions;
  - explicit left-to-right column ordering for unambiguous Arabic assembly.
- Added each SVG file path and safe per-sheet content counts to `assembly.json`.

## Real-tree Verification

The owner's full-tree Studio configuration was checked at `6 x 5`, `A2 landscape`, and
`8 mm` overlap:

- `30` sheets;
- final trimmed size `283.8 x 236.0 cm`;
- estimated minimum text `42.7 pt`;
- readability remains `pass`;
- `8` edge sheets were identified as decorative-only and surfaced through a concise
  print-cost note.
- The conservative lower-cost recommendation was `4 x 4` (`16` sheets) with an
  estimated minimum text size of `33.5 pt`.
- Applying it in the real-tree Studio produced a final trimmed size of
  `227.2 x 157.6 cm`, retained A2 sheets, and remained print-readable. The Studio was
  restored to the owner's original `6 x 5` selection after verification.

No private names, profile data, raw identifiers, or asset locations are included in the
utilization summary or manifest additions.

## Verification

- Targeted Vitest: `23` tests passed.
- TypeScript: passed.
- Scoped ESLint: passed with zero warnings.
- `git diff --check`: passed.
- No commit was created.

## Artifact Note

The previously reviewed ZIP remains valid, but it predates this guidance pass. Generate
a new ZIP to receive the expanded README, manifest file paths, and utilization summary.
