# Modern Gallery Owner Export Review

**Date:** 2026-07-17
**Status:** Owner Digital Export Pass after Contrast Correction
**Commit:** None

## Review Scope

The review used the signed-in owner's real tree in the local application. Private
PNG/PDF artifacts were inspected locally and were not added to the repository.

Configuration:

- product: Modern Gallery;
- scope: descendants from the selected root;
- depth: two generations;
- document: A3 landscape;
- tree direction: horizontal;
- privacy masking: enabled;
- photos: enabled, with living-person photos hidden;
- canonical path: sanitized graph -> `descendant-tiered` -> PosterScene -> SVG ->
  preview / PNG / raster PDF.

## Initial Finding

The first owner exports exposed a blocking contrast defect. Names, the subtitle, and
the footer used SVG `currentColor`, but the root SVG group defined only `fill`. Browser
rasterization therefore resolved those elements to black over the dark Modern Gallery
surface.

The shared geometry and Arabic shaping were otherwise intact. The defect appeared in
both PNG and PDF, confirming that preview and exports were using the same SVG renderer.

## Correction

The canonical SVG root now defines both `fill` and `color` from the active theme
foreground token. A regression test asserts that Modern Gallery supplies the light
foreground to inherited names, subtitle, and footer text.

Because this correction lives in the shared SVG renderer, it applies equally to the
Studio preview, PNG rasterization, and raster PDF generation without format-specific
layout or styling branches.

## Regenerated Output

- PNG: `4526 x 3200` pixels (A3 landscape high-resolution export).
- PDF: one page, `1190.55 x 841.89` points (A3 landscape).
- Arabic title, subtitle, names, masked labels, years, and footer are readable.
- No mojibake, empty pages, clipped cards, or orphan nodes were observed.
- Owner-authorized deceased-person photos render from normalized embedded assets.
- Living/private nodes retain masked names and safe fallback avatars.
- The PNG and rendered PDF preserve the same node positions, connector paths, frame,
  title, and footer composition.

## Product Assessment

The dark gallery treatment now reads as a coherent wall-poster direction and the
actual PNG/PDF delivery path passes digital owner review.

The two-generation horizontal composition leaves a broad central field between the
root and a tall child tier. This is not a correctness or readability failure, but it
is a P2 visual-polish opportunity for future adaptive tier placement or an optional
gallery title/identity composition. It must not be addressed by introducing separate
preview and export geometry.

## Verification

- SVG renderer and browser PNG/PDF runtime tests: 17 passed.
- TypeScript: passed.
- Scoped ESLint: passed with zero warnings.
- Real-tree PNG inspection: passed after correction.
- Real-tree one-page PDF inspection: passed after correction.
- Commit: not created.

## Decision

Modern Gallery receives **Owner Digital Export Pass** for A3 landscape descendant
posters. Physical print proof and broader density fixtures remain separate gates.

## Four-generation Ancestor Re-review

The product was re-reviewed on July 21, 2026 after the shared poster header controls
were completed. This pass used the signed-in owner tree with a populated
four-generation ancestor scope, a deliberately long Arabic title, privacy masking,
and owner-authorized photos.

- Product switching initially exposed a stale font-resource race: the new Modern
  Gallery scene could render once with the previously loaded Classic font resource.
- The Studio now withholds an internally resolved font resource unless its recorded
  family matches the active canonical scene. The strict renderer mismatch guard
  remains enabled for explicitly supplied integration resources.
- Gallery Rail title and subtitle remained fully contained and readable.
- The A3 landscape PNG measured `4526 x 3200` pixels.
- The PDF remained one unrotated A3 page (`1190.55 x 841.89 pt`).
- The PDF raster measured `1985 x 1404` pixels at 120 DPI.
- Mean absolute PNG/PDF pixel difference after scaling was `1.634 / 255`.
- Ten people and ten relationships remained visible with no empty page, mojibake,
  clipped title, orphan card, or privacy fallback failure.

This stronger ancestor fixture confirms the existing Owner Digital Export Pass and
promotes the Modern Gallery registry entry from experimental to active. Physical
print proof and high-density/large-format approval remain separate product gates.
