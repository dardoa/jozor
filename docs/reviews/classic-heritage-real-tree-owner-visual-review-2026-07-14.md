# Classic Heritage Real-tree Owner Visual Review

**Date:** 2026-07-14
**Status:** Pass for Limited Beta
**Scope:** Classic Heritage ancestor poster only
**Commit:** None

## Reviewed Configuration

- Source: the owner's signed-in real family tree, inspected locally only.
- Root sample: a living descendant with a multi-generation ancestor path.
- Page: A3 landscape.
- Tree direction: horizontal.
- Depth: four generations.
- Visible graph: 10 people and 10 relationships.
- Privacy: living and private people masked; living photos hidden.
- Photos: enabled for eligible public/deceased profiles.

No family data, exported poster, or media asset was committed to the repository.
Private review artifacts remain in the local temporary review directory only.

## Visual Result

The Classic Heritage poster now meets the limited-beta wall-poster baseline:

- Arabic title, names, and mixed RTL/LTR year ranges render without mojibake.
- The composition is a single balanced A3 landscape page with no empty page,
  orphan card, clipped card, or connector crossing through card content.
- Ten cards use the available page area coherently across four ancestor tiers.
- Six eligible profile photos are embedded as normalized data images and match the
  circular Classic Heritage card treatment.
- Missing and hidden photos use initials or masked fallbacks without changing card
  geometry.
- The warm paper, restrained frame, bronze connectors, green title, and integrated
  footer read as one print composition rather than a technical viewport capture.
- Studio preview, SVG-derived PNG, and one-page raster PDF preserve the same geometry.

## Privacy Finding And Fix

The first real-tree review found one blocking privacy inconsistency: with living and
private masking enabled, the root card was masked but the automatic poster title
still included the living root's real name.

The automatic title now follows the same masking decision as the card:

- masked living/private root -> generic `Ancestor Tree` / `شجرة الأسلاف`;
- visible root -> root-specific automatic title;
- an explicitly edited owner title remains owner-controlled.

A regression assertion covers the masked automatic title and verifies that turning
off living-person masking restores the root-specific automatic title.

## Artifact Verification

- Canonical SVG length: 703 KB before the title fix; regenerated after the fix.
- Embedded images: 6.
- Raw Supabase references: 0.
- Raw storage paths/fields: 0.
- Authorization tokens: 0.
- PNG: 2263 x 1600 pixels.
- PDF: one A3 landscape page, 1190.55 x 841.89 points.
- PDF renderer: SVG-derived raster fallback via PNG and jsPDF.

The regenerated PDF was rendered back to PNG with Poppler and visually compared
against the canonical PNG. Arabic shaping, photos, card positions, connectors,
frame, title, and footer remained aligned.

## Non-blocking Follow-ups

- Replace repeated masked initials/text with a more elegant silhouette treatment.
- Consider a larger photo-focused card preset for owners prioritizing portraits.
- Add source-image quality guidance because historical photos vary in resolution.
- Continue with Modern Gallery and Dense Genealogy as separate visual directions.
- Keep vector PDF, A2/A1/A0, and large-format quality warnings in their planned phases.

## Decision

Classic Heritage can be shown to limited beta owners as the first Studio poster
template. This approval does not revive or approve the legacy Classic Poster path;
it applies only to the PosterScene -> SVG -> PNG/PDF Studio pipeline.
