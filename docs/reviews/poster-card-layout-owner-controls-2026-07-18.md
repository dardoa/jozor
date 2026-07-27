# Poster Card Content Layout Owner Controls

**Status:** Runtime Automated Pass / Owner Visual Review Pending

## Scope

This pass adds three owner-selectable content compositions to person cards without
creating a second preview or export renderer:

- Standard keeps the balanced card composition.
- Photo-focused enlarges the portrait or initials fallback and gives the card more
  vertical space.
- Text-minimal removes the portrait region and shortens the card for dense trees.

Style Default remains available. Classic and Dense retain Standard, Modern Gallery
uses Photo-focused, and the branch index keeps its dedicated text-only composition.

## Canonical Flow

`Visual Studio option -> PosterScene builder -> card geometry -> layout engine -> SVG`

The chosen layout is recorded as `PosterScene.cardLayoutPreset`. It is applied before
the layout engine positions cards, so preview, PNG, raster PDF, Branch Collection,
and Tiled Wall outputs consume the same resulting geometry. PrintQualityReport is
evaluated after the reflow.

## Safety

- Text-minimal emits no avatar or photo element.
- Photo-focused receives only resolver-owned embedded image data or initials fallback.
- No raw person IDs, storage URLs, contact fields, or private notes are introduced.
- Existing privacy masking and living-photo policy remain authoritative.

## Verification

- Builder coverage verifies defaults, card reflow, stable preview IDs, and quality evaluation.
- SVG coverage verifies canonical metadata and the absence of photo markup in Text-minimal.
- Studio coverage verifies all choices update the shared preview scene.
- Branch Collection coverage verifies explicit choice propagation.

Owner visual review remains required on the signed-in Arabic tree before this control
receives visual signoff.
