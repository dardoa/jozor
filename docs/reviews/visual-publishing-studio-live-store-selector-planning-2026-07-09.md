# Visual Publishing Studio Live Store Selector Planning

- **Status**: `Planning Complete (Phase 4J review gate complete)`
- **Readiness**: `Ready for Live Selector Skeleton Design`
- **Connectivity**: `No Store or IndexedDB Wiring`
- **Date**: 2026-07-09

---

## 1. Purpose

This document defines the planning boundary for future live store selectors that will eventually convert active tree data into `PreviewSanitizerRawGraph`.

It does not approve runtime data reads. It only defines the requirements that must be met before any selector can touch the application store, IndexedDB, or live user tree state.

---

## 2. Governing Rule

> [!IMPORTANT]
> Live selectors are the only future layer allowed to read raw tree data, and their output must be limited to `PreviewSanitizerRawGraph`.

Adapters, Studio components, preview panes, and renderer layers must never receive raw tree entities, raw person IDs, media URLs, notes, source text, or sync metadata.

---

## 3. Planned Selector Types

### 3.1 Poster Selector

Future name:

```text
selectPosterPreviewGraph
```

Inputs:

- active tree source
- `VisualPreviewSelectorContext`
- root person selection
- generation depth cap
- node count cap

Output:

```text
PreviewSanitizerRawGraph
```

Expected behavior:

- Select root-centered ancestor or descendant slices.
- Include only minimal production-shaped raw fields accepted by `PreviewSanitizerRawNode`.
- Preserve enough generation metadata for preview layout.
- Avoid media URLs and contact fields entirely.
- Defer privacy decisions to `productionPreviewSanitizer`.

### 3.2 Snapshot Selector

Future name:

```text
selectSnapshotPreviewGraph
```

Inputs:

- active visible viewport state
- `visibleNodeIds`
- node count cap
- current visual tree subset

Output:

```text
PreviewSanitizerRawGraph
```

Expected behavior:

- Select only visible/near-visible nodes.
- Preserve minimal relationship edges among selected nodes.
- Avoid full-tree traversal by default.
- Never pass viewport renderer objects directly to adapters.

---

## 4. Privacy Regression Requirements

Before runtime selectors are implemented, the following regression tests must exist:

- output contains no `email`
- output contains no `phone`
- output contains no `address`
- output contains no `photoUrl`
- output contains no media path
- output contains no notes or source text
- output contains no sync metadata
- output contains no raw relationship IDs
- output contains only production sanitizer raw node fields

The selector may temporarily use `rawId` internally as an input key for sanitizer mapping, but it must not pass database entities or enriched domain objects downstream.

---

## 5. Performance Requirements

Live selectors must:

- apply product-specific node caps before preview construction
- avoid full-tree reads for snapshot previews
- support conservative defaults
- be compatible with debounced preview updates
- be testable with large synthetic stores
- prune orphan edges before or during sanitization

Node cap values remain provisional and must be finalized after profiling.

---

## 6. Runtime Guard Requirements

Preview runtime integration must refuse to build a live graph when:

- active tree context is missing
- root selection is required but absent
- privacy policy cannot be resolved
- product type has no approved selector
- node count exceeds hard safety bounds

Failure should produce a passive preview warning, not a thrown UI error.

---

## 7. Implementation Sequence

The next implementation should not connect the Studio UI directly to store selectors.

Recommended sequence:

1. **Live Selector Skeleton**: create selector files with function signatures and tests, returning empty graphs or fixture-backed results only.
2. **Store Shape Discovery**: document the exact store/domain types to be read.
3. **Privacy Regression Tests**: build tests before enabling real data reads.
4. **Poster Live Selector**: implement the smallest root/depth slice first.
5. **Snapshot Live Selector**: implement visible subset selection after viewport data boundaries are clear.
6. **Hidden Studio Integration**: only after selectors and sanitizer tests pass.

---

## 8. Open Questions

- Which store slice should be considered the canonical tree source?
- Where should active root selection come from?
- Should snapshot preview rely on current viewport IDs or a derived visible subset?
- Which privacy/export settings map to `VisualPreviewSanitizerPolicy`?
- What hard cap should prevent expensive preview work on very large trees?

---

## 9. Decision

- **Approved**: planning path for live selector skeletons.
- **Blocked**: direct store/IndexedDB runtime integration.
- **Skeleton Result**: `Phase 4G - Live Store Selector Skeleton` completed with empty graph outputs and no runtime registry activation.
- **Discovery Result**: `Phase 4H - Store Shape Discovery` documented the relevant store/domain shapes without enabling runtime reads.
- **Privacy Regression Result**: `Phase 4I - Live Selector Privacy Regression Tests` added store-shaped fixture tests without live store reads.
- **Review Gate Result**: `Phase 4J - Live Selector Review Gate` approved the smallest poster selector implementation with fixture tests only.
- **Next Step**: `Phase 4K - Poster Live Selector Minimal Implementation`.
