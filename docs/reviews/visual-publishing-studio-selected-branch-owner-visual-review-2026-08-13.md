# Visual Publishing Studio Selected Branch Owner Visual Review

**Date:** August 13, 2026
**Internal visual recommendation:** Pass with Polish
**Owner visual status:** Pending Owner Confirmation
**Production approval:** No independent owner approval recorded

## Reviewed Output

- Selected Branch Studio preview at 1440 x 900.
- Expanded mobile preview at 390 x 844.
- High-resolution PNG at 4526 x 3200.
- One-page A3 landscape raster PDF.
- Canonical SVG used by preview, PNG, and PDF.

The deterministic store-shaped fixture contains a selected root, the root's spouse, one child, one grandchild, a parent, and a sibling branch. The output correctly includes the four people inside the selected lineage and excludes the parent and sibling branch.

## Review Corrections

The first generated evidence exposed two user-facing defects:

1. The footer described the branch as `Scope: direct ancestors`.
2. Cards rendered raw relationship hints (`root`, `spouse`, and `descendant`) while Show Relationship Hint was disabled.

Both defects were corrected in the canonical SVG renderer. The regenerated preview, SVG, PNG, and PDF now use `Scope: selected branch`, an accessible `Selected family branch` group label, and no relationship detail rows while the control is disabled. Arabic output uses `النطاق: الفرع المحدد` and `الفرع العائلي المحدد`.

## Visual Findings

### Desktop Studio

- The preview is the dominant work surface and remains separate from the settings rail.
- The selected root control clearly identifies the branch anchor.
- The complete page is inspectable with fit, zoom, and expanded-review controls.
- No settings or navigation elements overlap the poster.

### Mobile Studio

- The preview can be expanded without horizontal overflow at 390 x 844.
- The full poster remains visible and zoom controls remain reachable.
- At fit-to-page scale, person-card text is naturally small on a phone; this is acceptable for composition review because zoom and expanded review are available.

### Exported Poster

- The selected root and spouse converge cleanly into the child line, followed by the grandchild.
- Connectors terminate at card perimeters without visible orphan lines.
- Names remain inside their cards and the long grandchild label wraps without clipping.
- Header, frame, ornament, and footer are aligned consistently.
- PNG and the raster image embedded in the one-page PDF are visually equivalent.
- No mojibake, empty pages, raw identifiers, technical tokens, or storage URLs are visible.

## Remaining Polish

Sparse branches currently use the same broad page distribution strategy as larger descendant trees. A future adaptive composition option could cluster two-to-five-person branches more tightly or recommend portrait orientation. This is a visual refinement, not a correctness or export blocker.

## Verdict

Selected Branch is technically and visually ready for owner confirmation. The current evidence receives **Pass with Polish** as an internal recommendation. Final owner approval remains pending until the owner reviews the promoted screenshots and poster files.

Evidence is stored in `docs/reviews/evidence/visual-publishing-studio-selected-branch-owner-review-2026-08-13/` with SHA-256 hashes in `evidence-manifest.json`.

Evidence regeneration is explicit: run the Chromium review spec with `UPDATE_VISUAL_EVIDENCE=1`. Normal multi-browser test runs inspect temporary downloads and do not mutate promoted evidence.
