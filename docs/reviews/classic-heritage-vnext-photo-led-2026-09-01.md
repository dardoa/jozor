# Classic Heritage vNext Photo-led Direction

**Date:** 2026-09-01
**Status:** Runtime and digital export pass
**Physical print status:** Covered by the separate large-format proof report

## Product Decision

Classic Heritage is now the default portrait-led wall-poster direction. It keeps
the warm manuscript palette, Amiri typography, ceremonial header, heritage frame,
soft card depth, circular portraits, and privacy-safe initials fallback. Dense
Genealogy remains the compact information preset for large trees.

The change updates the registered preset and the direct `PosterScene` style default,
so Studio preview and programmatic SVG/PNG/PDF creation resolve the same
`photo-focused` card composition. Owners can still hide all photos or hide living
person photos.

## Evidence

- Live owner-tree preview: 51 visible people, 6 embedded portraits, canonical
  `photo-focused` Classic Heritage SVG.
- Controlled A4 fixture: Arabic long names, mixed RTL/LTR years, masking fallback,
  and photo medallions remained inside card bounds.
- Export artifact suite: 6/6 Playwright scenarios passed with preview/export
  geometry parity, SVG/PNG/PDF derivation, image masking, privacy sentinels, and
  filename checks.
- Targeted visual-output tests: 179/179 passed across state, scene builder, and SVG
  renderer suites.

## Product Boundary

Classic Heritage is intended for small and medium family compositions. Large or
dense trees must continue through Dense Genealogy, a larger physical page, Branch
Collection, or Tiled Wall rather than shrinking portrait cards below print limits.
