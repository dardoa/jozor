# Poster Connector Style Owner Controls

**Status:** Automated Geometry Pass / Owner Visual Review Pending

## Scope

The Visual Publishing Studio now offers three relationship-line presets:

- **Subtle / ناعم** for quiet, low-contrast connections.
- **Classic / كلاسيكي** as the balanced default.
- **Bold / بارز** for stronger wall-poster visibility.

This is an owner-facing presentation control. It does not change relationship data,
node placement, connector paths, scope selection, or exporter behavior.

## Shared Rendering Contract

The selected value is stored as `PosterLayoutSpec.connectorStyle` in the canonical
`PosterScene`. The SVG renderer reads that value to set connector width and opacity.
Studio preview, PNG, raster PDF, Branch Collection, and Tiled Wall outputs therefore
consume the same style and the same scene geometry.

Relationship semantics remain visible through the existing theme-aware colors and
spouse/relative treatments. No raw IDs or relationship metadata are added to visible
poster text.

## Verification

- Targeted Vitest: `45` tests passed across Studio, SVG renderer, and Branch Collection.
- The subtle and bold fixtures produce identical node rectangles, connector endpoints,
  and connector paths.
- SVG metadata records the selected preset without introducing a second renderer.
- TypeScript, scoped ESLint, and `git diff --check` are required for final closure.

## Remaining Gate

Review the three presets on the signed-in owner tree before choosing whether Classic
remains the default for all visual directions.
