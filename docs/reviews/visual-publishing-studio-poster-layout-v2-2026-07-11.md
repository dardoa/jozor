# Visual Publishing Studio Poster Layout v2

**Date:** July 11, 2026
**Status:** `Ready for Owner PNG Visual Review`
**Scope:** Classic and Modern Studio poster tree composition.

## Outcome

The Studio poster renderer now draws a real ancestor hierarchy instead of independent generation rows.

## Layout Model

- The selected root is positioned at the bottom of the poster.
- Parents and earlier ancestors are positioned above the root.
- Every generation uses deterministic binary branch slots.
- Parent positions are derived from `parent-child` edges, not source array order.
- Missing branches leave intentional space instead of shifting unrelated ancestors into their place.
- Node width adapts to the deepest visible generation.

## Connectors

- Each visible parent-child edge creates one CSS connector.
- Connector length and rotation are calculated from the two node centers.
- Connectors render behind nodes using a lower stacking layer.
- The renderer still uses no SVG, canvas, or script execution.

## Poster Composition

- The poster uses a fixed page height matching the selected export dimensions.
- The tree receives a stable drawing area between header and footer.
- Small preview documents use reduced node height to avoid overlap.
- Arabic RTL affects text flow while absolute branch coordinates remain physical and stable.

## Verification

- Renderer/runtime suite: 11 tests passed.
- Studio suite: 7 tests passed.
- TypeScript and scoped ESLint passed.
- Tests verify root/parent coordinates, one connector per relationship, no legacy generation rows, and no SVG/canvas output.

## Review Gate

Generate real-tree Classic and Modern PNG outputs from the Studio. The owner review should check:

1. Arabic text and year readability.
2. Correct root and ancestor placement.
3. Connector accuracy and absence of crossings.
4. Density at four generations.
5. Portrait and landscape balance.

Controlled PDF implementation should follow this review so the approved composition is reused without parallel layout rework.
