# Large Tree Publishing Strategy

**Date:** 2026-07-15
**Status:** Accepted / Overview and Branch Collection Delivery Implemented
**Commit:** None

## Product Decision

Large family trees are not forced into one detailed A0 poster. Visual Publishing
Studio will provide three official products:

1. **Overview Poster** - one compact map containing the complete supported graph.
2. **Branch Collection** - a coordinated set of detailed branch posters.
3. **Tiled Wall Poster** - one large composition split across printable sheets.

`PrintQualityReport` remains authoritative. The Studio must reject combinations that
cannot satisfy minimum physical font size, card spacing, raster DPI, or memory limits.

## Implemented Now: Overview Foundation

Full-tree scope now resolves to:

```text
SanitizedPreviewGraph
  -> full-tree-overview
  -> dense-overview card preset
  -> PosterScene
  -> canonical SVG preview
  -> derived PNG / raster PDF when quality permits
```

The overview preset renders compact names and optional public years. Photos and large
Classic cards are intentionally omitted. Raw person IDs and storage URLs remain outside
PosterScene and SVG.

## Implemented Foundation: Branch Collection

Branch Collection now has a pure, sanitized collection manifest containing:

- collection title and shared visual theme;
- branch root preview token;
- poster ordering and cross-references;
- per-poster quality report;
- cover/overview sheet and branch sheets.

Every direct descendant of the selected anchor becomes a stable branch root. Each item
contains only that root and its reachable descendants, normalized to local generations,
then receives its own descendant-tiered PosterScene. Relationships crossing collection
boundaries are recorded as preview-ID cross references rather than drawn into the wrong
poster.

The collection export package is now implemented as one ZIP containing the overview
SVG, ordered per-branch SVG artifacts, a privacy-safe public manifest, and localized
instructions. The Studio exposes this action only in full-tree scope when descendant
branches exist. Multi-page PDF, per-branch PNG, branch selection, and richer collection
quality summaries remain later enhancements.

## Implemented Foundation: Tiled Wall Poster

Tiled Wall Poster is an in-application product, not an external workaround. Its current
foundation includes:

- a single canonical large PosterScene;
- rows, columns, sheet size, overlap, and bleed;
- stable page numbering and assembly order;
- per-tile SVG view boxes derived from the same scene geometry;
- a packaged SVG tile set plus an assembly manifest and localized instructions.

Tiling must never recalculate node positions independently for each sheet.

The Studio now exposes full-tree-only grid controls and a packaged SVG download. Each
sheet includes printable safe margins, crop/alignment marks, and page coordinates.
Owner print assembly review remains required. Multi-page PDF and memory-safe PNG tiles
remain later delivery formats derived from the same SVG sheets.

## Explicit Boundaries

- Overview does not claim to be a detailed photo poster.
- Tiled Wall Poster and Branch Collection are exposed through their tested SVG package
  paths; both still require owner output review before beta classification.
- Custom unlimited paper size is not used to bypass memory or readability limits.
- A0 raster export remains blocked if its effective DPI is below the print threshold.

## Verification

- 21 Branch Collection and Studio integration tests passed in the delivery verification.
- TypeScript passed.
- Scoped ESLint passed with zero warnings.
- No commit was created.
