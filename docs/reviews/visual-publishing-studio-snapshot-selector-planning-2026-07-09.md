# Visual Publishing Studio Snapshot Selector Planning

- **Status**: `Planning Complete (Phase 4N snapshot selector complete)`
- **Readiness**: `Ready for Snapshot Selector Minimal Implementation`
- **Connectivity**: `No Viewport Runtime Wiring`
- **Date**: 2026-07-09

---

## 1. Purpose

This document defines the planning boundary for the future snapshot preview selector. Snapshot previews differ from poster previews because they represent a visible tree viewport rather than a root-centered product layout.

This phase does not implement viewport runtime reads. It only defines the minimal selector shape and safety rules.

---

## 2. Governing Rule

> [!IMPORTANT]
> Snapshot selectors must operate on an explicit visible-node subset and must not perform full-tree traversal by default.

The snapshot selector must receive a bounded list of visible node IDs through `VisualPreviewSelectorContext.visibleNodeIds`.

---

## 3. Planned Input Shape

Future minimal source shape:

```typescript
interface PreviewSnapshotTreeSource {
  readonly people: Record<string, PreviewLivePersonRecord>;
  readonly relationships: readonly PreviewLiveRelationshipRecord[];
}
```

Selector context requirements:

- `productType: 'snapshot'`
- `definitionId: 'current-tree-snapshot'`
- `visibleNodeIds`
- `maxNodes`
- `language`

---

## 4. Expected Behavior

The selector should:

- return empty graph if `visibleNodeIds` is missing or empty
- select only people included in `visibleNodeIds`
- preserve edges only when both endpoints are selected
- respect `maxNodes`
- output only `PreviewSanitizerRawGraph`
- avoid reading viewport renderer objects directly
- avoid computing layout positions

The adapter or future renderer owns visual layout. The selector only owns safe data slicing.

---

## 5. Privacy Requirements

Same as poster selector:

- no contact fields
- no media URLs or paths
- no notes
- no source text
- no sync metadata
- no relationship IDs
- no direct `Person` or `RelationshipEdge` object output

Photos remain a boolean indicator only.

---

## 6. Performance Requirements

- no full-tree traversal for snapshot preview
- use `visibleNodeIds` as the primary bound
- apply `maxNodes` before edge mapping
- prune orphan edges
- compatible with debounced viewport changes

---

## 7. Decision

- **Approved**: minimal snapshot selector implementation using fixture/source-shaped inputs.
- **Blocked**: reading actual viewport state from the Studio or tree canvas.
- **Blocked**: runtime selector registry activation.
- **Implementation Result**: `Phase 4N - Snapshot Selector Minimal Implementation` completed with explicit visible-node selection and no viewport runtime wiring.
- **Next Step**: `Phase 4O - Live Selector Implementation Review Pack`.
