# Poster Footer Identity Owner Controls

**Status:** Automated Rendering Pass / Owner Visual Review Pending

## Owner Controls

- Optional custom footer phrase, limited to 80 normalized characters.
- Optional `Created in Jozor` / `أُنشئت هذه اللوحة في جذور` attribution.
- The localized tree-scope label remains automatic and truthful.

## Canonical Composition

Footer identity is part of `PosterContentSpec`, so the same values are consumed by
Studio preview, SVG, PNG, raster PDF, Branch Collection, and Tiled Wall outputs. A
custom phrase occupies its own centered line; attribution and scope use the line
below it to avoid crowding on A4.

Text normalization is enforced at the `createPosterScene` boundary, not only in the
UI. Control characters are replaced, whitespace is collapsed, and the result is
capped at 80 characters. The SVG renderer then XML-escapes the normalized value.

## Verification

- `79` tests passed across PosterScene, SVG renderer, Studio, and Branch Collection.
- Unsafe markup-like text remains visible as escaped text and cannot create SVG nodes.
- Branch detail posters and the branch index inherit the selected identity settings.
- Disabling attribution removes only the Jozor line; scope remains visible.

## Remaining Gate

Owner visual review is required on A4/A3 and the three visual directions before this
control receives an owner runtime pass.
