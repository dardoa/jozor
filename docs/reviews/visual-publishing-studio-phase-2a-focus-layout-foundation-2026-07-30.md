# Visual Publishing Studio Phase 2A — Focus Layout Engine Foundation Review

## Overview
Phase 2A delivers the isolated **Focus Family** layout engine foundation (`focus-family`) built on sanitized graph input (`SanitizedPreviewGraph`) and canonical `PosterScene` output. The engine centers a selected focal person at the visual center of the printable safe area and deterministically arranges surrounding ancestors, descendants, focal spouses, and focal siblings.

Focus remains strictly unexposed in the Studio UI and runtime-rejected in preview/export compatibility adapters until Phase 2B.

---

## Architecture & Contract Specification

### 1. Engine Identification & Scopes
- **Engine ID**: `focus-family` (added to `PosterLayoutSpec['engineId']`).
- **Content Scope**: `selected-root-focus` (added to `PosterContentSpec['scope']`).
- **Engine Options**: `PosterFocusLayoutOptions`
  ```typescript
  export interface PosterFocusLayoutOptions {
    readonly focalPreviewId: string;
    readonly ancestorDepth: PosterFocusDepth; // 1 | 2 | 3 | 4 | 'all'
    readonly descendantDepth: PosterFocusDepth; // 1 | 2 | 3 | 4 | 'all'
    readonly includeFocalSpouses: boolean;
    readonly includeFocalSiblings: boolean;
  }
  ```

### 2. Session Token Boundary
- The layout engine accepts session-isolated `focalPreviewId` (e.g. `preview-node-...`) ONLY.
- No session tokens (`selectedPosterRootToken`) or UI state buckets (`FocusSettingsBucket`) are imported or passed into the layout engine or `PosterScene`.
- Session token mapping to `focalPreviewId` is strictly deferred to Phase 2B.

### 3. Graph Slicing & Relationship Rules
- **Focal Node**: Located via `focalPreviewId`. Set as visual center (Tier 0). `isRoot: true` is assigned **only** to the focal node.
- **Ancestors**: Parent-child edges traversed upward from focal person up to `ancestorDepth` generations (Tiers -1, -2...).
- **Descendants**: Parent-child edges traversed downward from focal person up to `descendantDepth` generations (Tiers +1, +2...).
- **Focal Spouses**: Included if `includeFocalSpouses: true` for edges where `relationshipType === 'spouse'` connected directly to the focal person (placed on Tier 0).
- **Focal Siblings**: Included if `includeFocalSiblings: true` for nodes sharing at least one parent with the focal person (placed on Tier 0).
- **Generation Output**: `PosterSceneNode.generation = Math.abs(tier) + 1`.

### 4. Geometric Strategy
- **Visual Center**: Focal node center equals `treeBounds` center (`centerX, centerY`).
- **Vertical Direction**: Ancestors above (`Y < centerY`), Descendants below (`Y > centerY`), Focal band (spouses and siblings) on `centerY`.
- **Horizontal Direction**: Ancestors and Descendants occupy opposite sides along `X` (respecting Arabic RTL vs English LTR), Spouses & Siblings on focal column (`centerX`).
- **Invariants**:
  - Deterministic card positioning across identical requests.
  - Zero card rect overlaps (`x, y, width, height`).
  - All nodes strictly constrained inside `treeBounds` printable safe area.
  - Connectors start and end on card boundaries and reference valid scene nodes.

### 5. Capacity & Print Quality
- Focus nodes are never silently omitted.
- Spacing and card geometry scale down within preset limits (`minWidth: 104`, minimum card height `54px`).
- If density forces compact scaling, `evaluatePosterPrintQuality` reports warnings/blocks in `PrintQualityReport` rather than overlapping cards or pushing them out of bounds.

---

## Validation & Error Handling

- `validateFocusDepth`: Rejects `0`, negative numbers, floating point numbers, and integers > 4. Accepts `1 | 2 | 3 | 4 | 'all'`.
- `createPosterScene`:
  - Enforces `engineId === 'focus-family'` requires `scope === 'selected-root-focus'`, `focusOptions`, and valid `focalPreviewId` in graph.
  - Rejects `focusOptions` provided to non-Focus engines to prevent ambiguous requests.
  - Uses typed engine registry `POSTER_LAYOUT_ENGINES: Record<PosterLayoutSpec['engineId'], PosterLayoutEngine>`. Unknown engines throw controlled errors.

---

## Phase 2B Integration Prerequisites
1. Map `VisualOutputConfigPanel` and `usePosterDesignState` `focus` state bucket to `PosterFocusLayoutOptions`.
2. Connect `selectedPosterRootToken` resolver to `focalPreviewId`.
3. Enable `focus-family` in `posterCompatibilityModel.ts` and unhide Focus controls in Studio UI.
