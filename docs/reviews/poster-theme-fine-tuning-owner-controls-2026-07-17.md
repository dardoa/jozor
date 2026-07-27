# Poster Theme Fine-Tuning Owner Controls

**Date:** 2026-07-17
**Status:** Runtime and Automated Visual Pass
**Commit:** None

## Scope

The Studio now offers an optional, constrained color fine-tuning layer above the
authored poster palettes. The owner can adjust:

- poster background;
- person-card background;
- accent and frame color;
- relationship-line color.

The authored Classic Heritage, Modern Gallery, Dense Genealogy, Evergreen, and
Monochrome palette choices remain the default and can be restored with one action.

## Canonical Scene Contract

Color choices are stored as optional `PosterColorOverrides` on PosterScene. The same
scene is consumed by Studio preview, SVG, PNG, raster PDF, Branch Collection, and
Tiled Wall outputs. Color overrides do not alter node rectangles, connector paths,
page bounds, font sizes, or print-quality geometry.

The scene boundary accepts only six-digit hexadecimal values. Invalid names, CSS
functions, URLs, declarations, and script-like values are discarded before reaching
the renderer.

## Readability

The SVG renderer derives a readable light or dark foreground independently for the
poster surface and person cards. A dark poster can therefore retain a light title
while light cards retain dark names and details. Initials also receive a foreground
chosen against the selected accent color.

## Owner UI Review

The Arabic runtime displays four compact native color swatches under an explicit
"Customize poster colors" toggle, followed by a single restore action. The controls
fit inside the existing configuration column and do not compete with the PNG/PDF
download actions.

## Verification

- PosterScene rejects non-hex styling payloads.
- Custom and palette scenes retain identical geometry.
- SVG output records whether custom colors are active.
- Dark background and light card fixtures receive different readable foregrounds.
- Studio controls update all four tokens and restore the authored palette.
- Branch Collection overview and detail scenes preserve the same overrides.

## Remaining Theme Work

Custom fonts, decorative assets, background imagery, and free-form CSS are not part
of this pass. Any future addition must retain embedded assets, print readability, and
the canonical PosterScene-to-SVG path.
