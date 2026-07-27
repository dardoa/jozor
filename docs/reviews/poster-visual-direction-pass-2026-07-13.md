# Poster Visual Direction Pass

**Date:** 2026-07-13
**Status:** Ready for Owner Direction Selection
**Product:** Print-first Family Wall Poster System
**Runtime Changes:** None

> Subsequent runtime direction: all approved poster themes will be implemented on
> the canonical `PosterScene -> SVG` path defined by ADR 015. PNG and PDF are derived
> formats and do not receive theme-specific layout renderers.

## Product Decision

Visual Outputs is not a technical tree-export product. Its poster product is a
family wall-art system that preserves genealogy while presenting people, photos,
and family identity with emotional and visual value.

The current `ancestor-tiered` output is reclassified as:

**Minimal Technical Tree Baseline**

It remains useful for geometry, privacy, Arabic text, and preview/export parity
testing. It must not be promoted as `Classic Poster` merely through incremental
font, line, or spacing polish.

## Direction 1 - Classic Heritage

![Classic Heritage full poster](../../output/playwright/poster-visual-direction-pass-2026-07-13/classic-heritage-full-poster.png)

**Visual thesis:** A warm family archive made suitable for the living room,
using restrained heritage materials rather than heavy ornament.

- **Person card:** warm paper card, light bronze border, soft shadow, circular
  portrait crossing the card edge, Arabic name, year range, and one optional
  detail line.
- **Photo behavior:** prominent but balanced; circular crop with a double frame;
  initials can occupy the same portrait well when a photo is absent.
- **Connectors:** soft bronze, thin, calm, and visually subordinate to portraits.
- **Background:** warm paper field with a restrained outer frame and minimal
  corner detail.
- **Title:** centered ceremonial title with a short family-memory subtitle.
- **Footer:** location and creation line integrated into the lower frame.
- **Why it prints well:** strong hierarchy, moderate ink coverage, recognizable
  family warmth, and enough structure for A3-A1 wall display.
- **Risk:** excessive ornament or sepia would quickly make it feel nostalgic or
  generic; the restraint shown here is part of the direction.

**Recommendation:** strongest candidate for `Classic Poster vNext` and the
default owner-facing poster.

## Direction 2 - Modern Gallery

![Modern Gallery full poster](../../output/playwright/poster-visual-direction-pass-2026-07-13/modern-gallery-full-poster.png)

**Visual thesis:** A contemporary portrait wall in which faces lead and genealogy
quietly connects them.

- **Person card:** no conventional box; large circular photo, name, years, and a
  short detail line float as one portrait unit.
- **Photo behavior:** the largest and most visually important of the three
  directions; root portrait receives additional scale and framing.
- **Connectors:** very thin desaturated green lines that recede behind portraits.
- **Background:** calm light gallery field with a deep green editorial identity
  rail.
- **Title:** located inside the identity rail rather than floating above the
  tree.
- **Footer:** a family statement and date complete the same rail.
- **Why it prints well:** resembles considered home decor rather than genealogy
  software, especially for small or medium family scopes.
- **Risk:** lower information capacity and more sensitivity to missing or
  inconsistent portrait photography.

**Recommendation:** retain as a distinct `Modern Gallery` theme, not merely a
color variant of Classic Heritage.

## Direction 3 - Dense Genealogy

![Dense Genealogy full poster](../../output/playwright/poster-visual-direction-pass-2026-07-13/dense-genealogy-full-poster.png)

**Visual thesis:** A rigorous large-tree reference poster that still looks
intentional on a wall.

- **Person card:** compact horizontal card with a square portrait, Arabic name,
  years, and one clipped optional detail line.
- **Photo behavior:** smaller and consistent; square or softly rounded crops
  preserve density.
- **Connectors:** fine neutral green lines with low visual weight and compact
  routes.
- **Background:** low-ink cool neutral field with a dark print frame.
- **Title:** compact registry header sharing a line with generation and person
  counts.
- **Footer:** scope and creation metadata integrated as reference information.
- **Why it prints well:** supports more people per physical page while preserving
  readable photos and names; naturally pairs with A2-A0 recommendations.
- **Risk:** without strict minimum card and type sizes it can regress into the
  technical baseline.

**Recommendation:** develop as a large-tree preset after the primary Classic
direction, with mandatory print-quality warnings.

## Card Direction Comparison

![Person card direction comparison](../../output/playwright/poster-visual-direction-pass-2026-07-13/person-card-direction-comparison.png)

The three directions are intentionally different systems:

| Direction | Photo | Card | Information density | Connector role |
| --- | --- | --- | --- | --- |
| Classic Heritage | Circular, framed | Warm elevated card | Medium | Soft heritage line |
| Modern Gallery | Large circular portrait | Cardless portrait unit | Low-medium | Nearly invisible guide |
| Dense Genealogy | Compact square | Horizontal information card | High | Precise structural line |

They should not be implemented as one card with three color palettes. Each needs
its own card geometry, spacing rules, connector styling, and title/footer
composition while still consuming the same canonical `PosterScene` document
geometry.

## System Implications

The visual product should evolve through explicit layers:

```text
PosterScene document geometry
  -> selected layout engine
  -> visual direction/theme tokens
  -> card composition preset
  -> connector style
  -> title/footer composition
  -> resolved photo assets
  -> preview / PNG / raster PDF
```

The `PosterScene` foundation remains valid, but it must grow beyond simple node
rectangles. Future scene/render contracts need theme-safe fields for:

- photo frame geometry and fallback behavior;
- card composition and optional information fields;
- connector stroke, routing, and corner strategy;
- background, border, title, and footer composition;
- print readability and page-size recommendations.

## Photo Product Boundary

Photos are a primary owner-publishing feature, not public portable data.

The direction pack uses local mock portraits only. Production implementation
must use `PosterImageAssetResolver` so scene/render layers receive normalized
blobs or bitmaps rather than Supabase URLs, storage paths, tokens, or metadata.
Owner controls must include show photos, hide photos, hide living-person photos,
and initials fallback.

## Recommended Decision

Adopt **Classic Heritage** as `Classic Poster vNext`.

Keep **Modern Gallery** as a separate portrait-led theme and **Dense Genealogy**
as the large-tree information preset. This gives the product one accessible
default without collapsing three materially different use cases into a single
layout.

The next implementation phase should begin only after owner selection. It should
encode the selected direction's design tokens and card composition, then move
immediately to the privacy-safe image resolver rather than polishing the
technical baseline.

## Evidence

The source mockup, portrait references, generator script, and rendered comparisons
remain local review artifacts. They are intentionally excluded from version
control because visual references may include owner-specific labels or media
whose redistribution rights are not established.

The committed report records product direction only. It contains no raw storage
URL, access token, export runtime payload, or private family graph.
