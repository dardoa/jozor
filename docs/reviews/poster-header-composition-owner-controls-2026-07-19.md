# Poster Header Composition Owner Controls

**Status:** Pass - Preview, PNG, and Raster PDF Owner Review

## Product Decision

Poster titles are now part of the wall-art composition rather than one shared text
block placed above every tree. `PosterScene` records one canonical header preset and
the shared SVG renderer uses it for preview, PNG, raster PDF, Branch Collection, and
Tiled Wall derivatives.

## Presets

- **Ceremonial:** centered title, family-memory subtitle, and a short accent rule.
  This is the Classic Heritage default.
- **Gallery Rail:** title and subtitle inside a strong full-width identity rail with
  automatically readable foreground color. This is the Modern Gallery default.
- **Compact Registry:** edge-aligned title, compact subtitle, and localized people
  and generation counts. This is the Dense Genealogy and Branch Index default.

The Studio also provides **Style Default**, allowing each authored visual direction
to retain its intended title system.

## Architecture

- Added `PosterHeaderPreset` and `PosterScene.headerPreset`.
- Header composition does not change node rectangles, connector endpoints, page
  bounds, or print-quality calculations.
- SVG publishes `data-poster-header` and contains all header geometry internally.
- Arabic registry metadata is localized and contains no raw technical labels.
- Branch Collection propagates an explicit owner choice to branch and overview
  scenes; style defaults remain product-specific.

## Verification

- Classic, Modern, Dense, and Branch Index defaults are covered.
- All three header systems render through the canonical SVG path.
- Geometry equality is asserted across preset changes.
- Studio selection and Branch Collection propagation are covered.
- Typecheck, scoped lint, and diff validation passed.

## Owner Tree Preview Review

The canonical SVG preview was reviewed inside the signed-in owner tree using a
populated four-generation ancestor scope and a deliberately long Arabic title.
The review covered Ceremonial, Gallery Rail, and Compact Registry compositions.

- The first pass exposed title/subtitle collisions in Ceremonial and Compact
  Registry headers. Their baseline spacing now scales safely with title size.
- The Gallery Rail title now sits inside the rail while retaining separation from
  the subtitle.
- The populated preview preserved ten visible people and ten relationships while
  switching header systems; tree geometry did not move.
- Arabic remained shaped and readable, with no mojibake or raw English metadata.
- A long-title regression assertion now verifies safe title/subtitle baseline
  separation for all three compositions on the A4 portrait fixture.

## Export Artifact Review

The same signed-in owner-tree scene was exported from the Studio as a high-resolution
PNG and a one-page raster PDF after the preview review.

- PNG dimensions: `4526 x 3200` pixels.
- PDF document: one unrotated A3 landscape page (`1190.55 x 841.89 pt`).
- Poppler-rendered PDF dimensions at 120 DPI: `1985 x 1404` pixels.
- PNG/PDF aspect ratios: `1.414375` and `1.413818`.
- Mean absolute pixel difference after proportional scaling: `1.468 / 255`.
- Arabic title shaping, owner-authorized photos, masked-person fallbacks, cards,
  connectors, frame, and footer all remained visually intact.

The first PNG exposed an RTL anchor-direction defect that placed the long title and
registry summary beyond opposite page edges. The registry now uses direction-aware
physical anchors, and the regenerated PNG/PDF keep the complete title, summary, and
subtitle inside the document with no overlap or clipping.

The poster-header owner visual gate is closed for this A3 landscape four-generation
ancestor fixture. Other page sizes and poster products retain their own visual gates.

## Header Artifact Matrix

All three header compositions were then exported from the same owner-tree fixture
through the canonical SVG-derived PNG and raster PDF paths.

| Header composition | Page | PNG/PDF mean pixel difference | Owner result |
| --- | --- | ---: | --- |
| Ceremonial | A3 landscape | `1.459 / 255` | Pass |
| Gallery Rail | A3 landscape | `1.452 / 255` | Pass |
| Compact Registry | A3 landscape | `1.468 / 255` | Pass |

The review confirmed that each composition retains its authored identity without
moving the tree: centered ceremonial hierarchy, contained gallery rail, and compact
edge-aligned registry metadata. Titles, subtitles, photos, masked fallbacks, cards,
connectors, frames, and footers remained intact in both output formats.

## A4 Portrait Artifact Review

The Ceremonial composition was also reviewed on an A4 portrait document with a
vertical four-generation ancestor layout and the same deliberately long Arabic
title.

- SVG view box: `1200 x 1697`.
- PNG dimensions: `2400 x 3394` pixels.
- PDF document: one unrotated A4 page (`595.276 x 841.89 pt`).
- Poppler-rendered PDF dimensions at 120 DPI: `993 x 1404` pixels.
- Mean absolute PNG/PDF pixel difference after scaling: `2.398 / 255`.
- Ten cards remained inside the safe area with zero card intersections.
- The title and subtitle remained inside the header region without overlap.
- Arabic shaping, mixed Arabic/year labels, owner-authorized photos, masked
  fallbacks, connectors, and footer remained visually consistent.

This closes the poster-header artifact gate across all three header systems and
across the reviewed A3 landscape and A4 portrait document configurations. It does
not replace the separate visual gates for Modern Gallery, Dense Genealogy, large
formats, Branch Collection, or Tiled Wall products.
