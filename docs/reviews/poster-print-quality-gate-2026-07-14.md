# Poster Print-quality Gate

**Date:** 2026-07-14
**Status:** Implemented for Classic Heritage
**Commit:** None

## Decision

Every generated `PosterScene` now receives a real `PrintQualityReport`. Poster
downloads no longer rely on an unevaluated placeholder report.

## Evaluated Signals

- effective raster DPI at the current 2x PNG/PDF fallback scale;
- minimum printed person-name size in points;
- estimated raster memory consumption;
- overlapping person-card pairs;
- sanitized selection truncation;
- empty scene detection.

## Runtime Rules

- A normal reviewed A4/A3 Classic Heritage scene passes at 9pt or larger.
- Text below 9pt receives a warning; below 8pt blocks export.
- Any card overlap blocks export.
- Any truncated selection blocks export so an incomplete `All` poster cannot be
  mistaken for the complete ancestor graph.
- Estimated raster memory above 128 MiB warns and above 256 MiB blocks.
- Blocked scenes remain visible for correction, while PNG/PDF buttons are
  disabled with plain owner-facing guidance.

## Verification

- Baseline A4/A3 fixtures pass with physical print metrics.
- A dense complete five-generation A4 fixture is blocked for overlap/readability.
- Truncated sanitized selection is blocked.
- Preview, SVG, PNG, and PDF continue to share the exact same PosterScene.
- Targeted scene/renderer/export tests: 30 passed.
- Integrated Studio/action/scene tests: 30 passed.
- TypeScript and scoped ESLint passed.

## Remaining

- Localize richer recommendations by page size and density.
- Add A2/A1/A0 document specs.
- Replace the fixed raster-scale assumption with export-request telemetry.
- Evaluate descendant and full-tree engines independently when implemented.
