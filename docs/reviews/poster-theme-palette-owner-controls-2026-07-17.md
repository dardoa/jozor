# Poster Theme Palette Owner Controls

**Status:** Owner Runtime Visual Pass

## Available Palettes

- **Style default / حسب التصميم**: resolves to the visual direction's authored palette.
- **Warm Heritage / تراثي دافئ**: cream paper, warm brown, and bronze accents.
- **Dark Gallery / معرض داكن**: dark gallery surface with light text and gold accents.
- **Family Evergreen / أخضر عائلي**: restrained green and neutral print surfaces.
- **Print Monochrome / أحادي للطباعة**: grayscale treatment for economical or formal printing.

## Canonical Contract

The owner-facing `style-default` choice is resolved while building the scene. Every
`PosterScene` therefore records a concrete `PosterColorPalette`, never an ambiguous
automatic value. The SVG renderer derives background, foreground, cards, borders,
avatars, accents, relationship lines, and secondary text from that palette.

Preview, SVG, PNG, raster PDF, Branch Collection, and Tiled Wall outputs consume the
same palette tokens. The palette does not alter node rectangles, connector paths,
page bounds, or print-quality calculations.

## Verification

- `81` tests passed across PosterScene, SVG renderer, Studio, and Branch Collection.
- Warm and monochrome fixtures retain identical scene geometry.
- Modern Gallery resolves to `gallery-dark` when the owner keeps the style default.
- Branch details and the branch index preserve explicit palette overrides.
- SVG metadata records the concrete palette used for the artifact.

## Owner Runtime Review

All four explicit palettes were exercised against the signed-in owner's real Arabic
tree. The palette metadata and coordinated surface colors changed as expected while
the selected people, relationship structure, and scene geometry remained stable.
Arabic title, names, years, masked labels, and the custom footer remained readable.

Physical print proof for the Modern, Dense, and large-format products remains a
separate gate. See `poster-owner-visual-controls-review-2026-07-17.md`.
