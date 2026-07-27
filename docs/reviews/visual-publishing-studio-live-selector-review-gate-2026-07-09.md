# Visual Publishing Studio Live Selector Review Gate

- **Status**: `Pass as Live Selector Readiness Gate (Phase 4K poster selector complete)`
- **Readiness**: `Ready for Smallest Live Selector Implementation`
- **Connectivity**: `No Live Store Wiring Enabled`
- **Date**: 2026-07-09

---

## 1. Scope

This review gate closes Phases 4F through 4I:

- **Phase 4F**: Live Store Selector Planning.
- **Phase 4G**: Live Store Selector Skeleton.
- **Phase 4H**: Store Shape Discovery.
- **Phase 4I**: Live Selector Privacy Regression Tests.

The purpose is to determine whether the project may proceed to the smallest possible live selector implementation while keeping the Studio hidden and runtime registry controlled.

---

## 2. Verified Safety Conditions

| Condition | Status | Notes |
|---|---|---|
| Live selector plan exists | Verified | Product-specific poster/snapshot selectors are planned. |
| Live selector skeletons exist | Verified | Skeletons return empty graphs only. |
| Runtime selector registry remains empty | Verified | No selector is registered for live Studio use. |
| Store shape discovery complete | Verified | `Person`, `RelationshipEdge`, `TreeSettings`, and `useAppStore` shapes documented. |
| Privacy regression tests exist | Verified | Store-shaped fixtures assert forbidden fields are stripped before sanitizer boundary. |
| No Studio runtime wiring | Verified | No Studio component was changed in Phases 4F-4I. |
| No export wiring | Verified | No PDF/PNG handlers are invoked by selector layers. |
| No IndexedDB reads | Verified | No persistence query was added. |

---

## 3. Approved Next Implementation

The next implementation may be:

```text
Phase 4K - Poster Live Selector Minimal Implementation
```

Allowed scope:

- Implement only `selectPosterPreviewGraph`.
- Input source must be a minimal typed source shape, not full `AppStore`.
- Output must be `PreviewSanitizerRawGraph`.
- Selector may read only:
  - `people`
  - `relationships`
  - root id from context
  - depth and node caps from context
- Selector must not register itself into the runtime registry yet.
- Selector must be tested with store-shaped fixtures only.

Still blocked:

- Hidden Studio integration.
- Runtime selector registry registration.
- Snapshot live selector.
- Any IndexedDB or persistence read.
- Any photo URL or media path propagation.

---

## 4. Required Tests for Phase 4K

Phase 4K must include tests verifying:

- root-centered poster slice selection
- generation depth cap
- node count cap
- parent-child edge mapping
- no contact/media/note/source fields in raw graph
- no relationship IDs in raw graph
- sanitizer output masks living/private people
- adapter output contains only preview IDs

---

## 5. Decision

- **Approved**: minimal poster live selector implementation using production-shaped fixtures is complete.
- **Blocked**: runtime Studio activation.
- **Blocked**: selector registry activation.
- **Blocked**: snapshot live selector until poster selector pattern is validated.
- **Next Step**: `Phase 4L - Poster Live Selector Review Pack`.
