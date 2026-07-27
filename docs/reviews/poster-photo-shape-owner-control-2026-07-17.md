# Poster Photo Shape Owner Control

**Date:** 2026-07-17
**Status:** Runtime and Owner Digital Review Pass
**Commit:** None

## Scope

This pass adds the first owner-facing card customization to the SVG-first poster
runtime. The owner can select circular, square, or soft-corner photo and initials
fallback geometry. The setting applies to Classic Heritage, Modern Gallery, and Dense
Genealogy. Full-tree overview and branch-index cards remain intentionally photo-free.

## Architecture

`PosterPhotoShape` is part of the canonical `PosterCardPreset` contract. The selected
shape enters `createPosterScene`, becomes immutable scene data, and is consumed by the
single SVG renderer. The SVG renderer creates matching avatar rings, fallback fills,
image clipping paths, and initials alignment.

```text
Owner shape control
-> VisualStudioPosterOptions
-> PosterScene card preset
-> canonical SVG avatar geometry
-> Studio preview / PNG / raster PDF
```

Changing the photo shape does not recalculate node positions, card rectangles, or
connector paths. Tiled Wall Poster consumes the already-shaped scene. Branch
Collection passes the same selection to each branch scene while its index stays
text-only.

## Privacy Boundary

- The image resolver still supplies normalized embedded image data only.
- Storage URLs, access tokens, paths, and raw person IDs do not enter the SVG.
- The existing show/hide photos and hide-living-photos options remain authoritative.
- Missing or blocked photos use initials inside the selected shape.

## Owner Review

The Arabic Studio displayed the three localized choices and updated the canonical SVG
from `circle` to `square` and `rounded` without changing layout. An A3 landscape
Classic Heritage poster was downloaded with soft corners:

- PNG: actual high-resolution output inspected locally;
- PDF: one page, `1190.55 x 841.89` points;
- the owner-authorized photo retained the rounded clipping shape;
- Arabic title, name, years, frame, and footer remained intact;
- Preview, PNG, and rendered PDF matched visually.

Private output artifacts were not added to the repository.

## Verification

- PosterScene builder tests: 30 passed.
- Canonical SVG renderer tests: 14 passed.
- Visual Publishing Studio tests: 19 passed.
- Branch Collection tests: 7 passed.
- TypeScript: passed.
- Scoped ESLint: passed with zero warnings.
- Owner real-tree PNG/PDF inspection: passed.
- Commit: not created.

## Decision

Photo-shape customization is complete on the current SVG-first poster path. Optional
card fields, connector styling, and richer footer/identity composition remain separate
follow-up work.
