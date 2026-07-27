# Classic Heritage Descendant And Full-tree Runtime

**Date:** 2026-07-14
**Status:** Runtime Implemented / Real-tree Owner Review Completed
**Commit:** None

## Delivered Scopes

Visual Publishing Studio now offers three explicit poster scopes:

- **Ancestors:** selected root toward all reachable parents.
- **Descendants:** selected root toward all reachable children.
- **Full tree:** every person record and every supported relationship in the current tree.

Ancestor and descendant scopes support a depth of 1-4 or all available generations.
Full tree always reads the complete tree and therefore hides the generation limiter.

## Canonical Data Paths

```text
Live tree boundary
  -> scope-specific raw graph selector
  -> productionPreviewSanitizer
  -> SanitizedPreviewGraph
  -> PosterScene layout engine
  -> canonical SVG
  -> Studio preview / PNG / raster PDF
```

The new engines are:

- `descendant-tiered` for uneven child branches;
- `family-network-tiered` for the complete graph.

The full-tree selector preserves parent-child, spouse/partner, and relative
relationships. The SVG identifies relationship types and gives spouse and relative
links distinct visual treatment.

## Safety And Quality Gates

- Raw person IDs stop at the sanitizer boundary.
- Scene and SVG use session-isolated `preview-node-*` identifiers.
- Private/living masking and controlled embedded-image resolution remain unchanged.
- Scope limits are derived from the selected live graph rather than the binary ancestor
  formula. Descendant branches therefore are not truncated merely because a generation
  contains more than `2^depth - 1` people.
- Dense full-tree scenes are blocked when the Classic baseline exceeds 48 people or 80
  connectors. This prevents technically complete but unreadable wall-poster exports.
- Card overlap, unreadable physical text, excessive raster memory, empty output, and
  truncation block PNG/PDF actions.

## Verification

- 68 targeted tests passed across selectors, PosterScene, SVG, Registry, and Studio UI.
- TypeScript passed.
- Scoped ESLint passed with zero warnings.
- Live browser owner review ran against the owner's signed-in 90-person tree.
- Descendants at four generations on A0 landscape rendered 51 people and 55
  relationships without truncation; PNG and PDF remained available.
- Full tree on A0 landscape preserved 90 people and 155 relationships, then correctly
  disabled PNG and PDF because the Classic layout is too dense for readable printing.

## Product Decision

The descendant runtime is accepted for continued owner review on large paper sizes.
The complete-tree data path is also accepted, but the Classic baseline is intentionally
blocked for this real tree. Full-tree export requires a dedicated Dense Genealogy layout
and preset; increasing page size alone is not considered a sufficient fix.
