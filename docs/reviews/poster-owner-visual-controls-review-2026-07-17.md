# Poster Owner Visual Controls Review

**Date:** 2026-07-17
**Status:** Owner Runtime Visual Pass
**Commit:** None

## Review Scope

The review was performed in the signed-in local application against the owner's real
Arabic family tree. Private family data and generated poster artifacts were kept local.

The review covered the shared PosterScene controls added after the Modern Gallery and
Dense Genealogy export reviews:

- card years, relationship, sanitized birth place, and sanitized occupation;
- circular, square, and soft-corner photo geometry;
- subtle, classic, and bold connector treatments;
- optional footer phrase and Jozor attribution;
- Warm Heritage, Dark Gallery, Family Evergreen, and Print Monochrome palettes.

## Runtime Findings

- The owner controls are understandable Arabic product controls; no sanitizer mode,
  raw data field, storage term, or debugging label is exposed.
- All four palettes update the canonical SVG scene while preserving the same people,
  relationship structure, page bounds, and layout geometry.
- The Dark Gallery palette retains readable Arabic text and the corrected light
  foreground treatment.
- A custom Arabic footer phrase is composed inside the poster footer and remains
  separate from the automatic scope label and optional Jozor attribution.
- Relationship, birth-place, and occupation details render as concise localized card
  lines. Living/private people remain masked and do not receive private details.
- The full descendant selection produced 74 visible people and 62 visible
  relationships from the real owner tree. On A3, the print-quality gate correctly
  rejected the combination instead of silently producing an unreadable poster.
- Reducing the descendant depth to two generations restored a normal preview while
  retaining all selected visual controls.

## Privacy Verification

The live SVG markup contained:

- no raw project or person IDs;
- no `preview-root-*` identifiers;
- no Supabase or storage URLs;
- no email, phone, address, note, or sync fields;
- only the standard `http://www.w3.org/2000/svg` namespace URL.

Owner-authorized images continue to enter the scene as normalized embedded assets;
their storage origins are not exposed in the poster markup.

## Product Assessment

The controls now form one coherent owner customization layer rather than disconnected
preview switches. Preview, PNG, raster PDF, Branch Collection, and Tiled Wall outputs
all consume the same PosterScene choices.

The remaining work is product depth, not a correctness blocker for these controls:

1. physical print proof for Modern Gallery, Dense Genealogy, and Tiled Wall assembly;
2. final owner visual review of custom color, descriptive-line, ornament, font, and
   header-composition controls added after this review;
3. deeper theme authoring beyond the current preset-led system;
4. clearer large-tree routing from an invalid single sheet to Overview, Branch
   Collection, or Tiled Wall products.

## Decision

The owner-facing photo shape, card content, connector, footer, and palette controls
receive **Owner Runtime Visual Pass**. They may remain enabled for continued owner
iteration. This decision does not replace the separate physical-print gates for the
large-format products.
