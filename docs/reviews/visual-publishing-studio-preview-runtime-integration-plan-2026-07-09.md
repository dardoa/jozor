# Visual Publishing Studio Preview Runtime Integration Plan

- **Status**: `Planning Only (Phase 4A-4I privacy regression tests complete)`
- **Goal**: Map out the bridge between live database tree stores and the sanitized preview graph models.
- **Milestones**: Phase 4A (Integration Plan), Phase 4B (Production Sanitizer Skeleton), Phase 4C (Preview Raw Graph Selector Contract), Phase 4D (Fixture Selector Implementation)
- **Date**: 2026-07-09

> [!NOTE]
> **Production-shaped does not mean production-wired.** Phase 4B delivers a production-shaped `productionPreviewSanitizer` skeleton verified under unit tests, but leaves all store/IndexedDB runtime wiring disabled.

> [!NOTE]
> **Selector-shaped does not mean selector-wired.** Phase 4C defines selector contracts and an intentionally empty selector registry. No runtime selector currently queries application state or persisted tree storage.

> [!NOTE]
> **Fixture selectors are not runtime selectors.** Phase 4D adds fixture-only selector implementations to exercise the selector -> sanitizer -> adapter chain under tests, while the runtime selector registry remains empty.

> [!NOTE]
> Phase 4E reviewed this selector foundation as `Pass as Runtime Selector Foundation`; live store selector implementation remains blocked until a dedicated planning pass defines product-specific data access and privacy regression tests.

> [!NOTE]
> Phase 4F defines the live selector planning boundary. It approves planning for selector skeletons only and keeps direct store/IndexedDB runtime wiring blocked.

> [!NOTE]
> Phase 4G adds empty live selector skeletons for poster and snapshot previews. These skeletons are exported for tests and future implementation, but they are not registered in the runtime selector registry and do not read store or IndexedDB data.

> [!NOTE]
> Phase 4H documents the canonical store/domain shapes that future selectors may read. It does not permit live selector implementation yet.

> [!NOTE]
> Phase 4I adds store-shaped privacy regression fixtures to prove contact, media, notes, source text, relationship IDs, and sync metadata are stripped before sanitizer/adapter boundaries.

---

## 1. Governing Architecture Rule

> [!IMPORTANT]
> **Only selectors may touch raw tree data; adapters and Studio components must never receive raw entities.**

This rule establishes an absolute security boundary. The React component rendering layer, preview adapters, and the Studio interface elements remain completely blind to database primary keys, contact info, notes, and raw relational objects.

---

## 2. Proposed Runtime Flow

The preview update pipeline flows as a unidirectional sanitized sequence:

```text
[ Redux Tree Store / IndexedDB ]
               ↓
    [ raw preview selectors ]
               ↓
[ productionPreviewSanitizer ]
               ↓
    [ SanitizedPreviewGraph ]
               ↓
       [ Preview Adapter ]
               ↓
      [ VisualPreviewModel ]
               ↓
     [ Hidden Studio Preview ]
```

---

## 3. Required Blueprint Components

Before runtime connectivity can be enabled, the following components must be planned and designed:

1. **`productionPreviewSanitizer`**: A production-grade implementation of `VisualPreviewSanitizer<TRawGraph>` that sanitizes live tree database shapes.
2. **`previewGraphSelector`**: A Redux selector querying active family tree nodes/relationships.
3. **Product-Specific Selectors**:
   - `selectPosterPreviewGraph`: Queries nodes suitable for poster layout limits.
   - `selectSnapshotPreviewGraph`: Queries visible viewport subset nodes.
4. **Privacy Policy Mapper**: Maps the user's active export and privacy settings to the formal `VisualPreviewSanitizerPolicy` parameters.
5. **Runtime Guard**: Interceptor checking that requests are aborted if active tree context is missing.

---

## 4.1 Phase 4C Selector Contract Boundary

Phase 4C formalizes the selector entry point without enabling runtime reads:

- `VisualPreviewGraphSelector<TRawSource = unknown>` keeps the upstream data source abstract.
- Selectors may later read active tree structures, but must return only `PreviewSanitizerRawGraph`.
- Product contexts are separated through `VisualPreviewSelectorContext`:
  - Poster contexts may provide `rootPersonId`, `maxDepth`, and `maxNodes`.
  - Snapshot contexts may provide `visibleNodeIds` and viewport-scoped limits.
- The selector registry is intentionally empty until a future fixture or runtime selector implementation is approved.

Adapters and Studio components still receive no raw entities. The only permitted bridge from future selectors is the production-shaped raw graph accepted by `productionPreviewSanitizer`.

---

## 4.2 Phase 4D Fixture Selector Chain

Phase 4D proves the shape of the future runtime chain without reading live data:

```text
FixturePreviewSource
        ↓
fixture preview selectors
        ↓
PreviewSanitizerRawGraph
        ↓
productionPreviewSanitizer
        ↓
SanitizedPreviewGraph
        ↓
Preview Adapter
        ↓
VisualPreviewModel
```

The fixture selectors intentionally live outside the runtime selector registry. They validate product-specific boundaries:

- Poster fixtures can prioritize a root node and filter by generation depth.
- Snapshot fixtures can limit the graph to visible fixture node IDs.
- Both selectors output only `PreviewSanitizerRawGraph`, never raw store entities.

---

## 4. Privacy Alignment

> [!IMPORTANT]
> **Preview privacy must be equal to or stricter than export privacy.**

- **Export Alignment**: Preview rendering passes must reflect the exact privacy policy of the active publication output.
- **Photos Policy**: Profile photos must default to silhouette icons in previews. Explicit toggle permissions are required before rendering image thumbnails.
- **Masking Scope**: Living and private tree profiles must remain masked with placeholder text unless explicitly overridden by the sanitizer policy.
- **Sanitization Scope**: The `owner-full` mode is treated as a policy setting and does not bypass sanitizer exclusions.

---

## 5. Performance Safeguards

- **Performance Caps**: Layout capping limits must utilize conservative defaults, product-specific caps, and values to be finalized after profiling on large test datasets.
- **Debounced Processing**: Redux selector triggers and layout calculations must be debounced to avoid layout thrashing during edits.
- **Cancellable Calculations**: Sanitization and adapter mapping operations must support cancellation if the user triggers a new state change before completion.
- **Orphan Pruning**: Edges pointing to cropped nodes must be dropped at the selector/sanitizer layer.

---

## 5.1 Phase 4F Live Selector Planning

The live selector planning document is available at [`visual-publishing-studio-live-store-selector-planning-2026-07-09.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-publishing-studio-live-store-selector-planning-2026-07-09.md).

It defines the product-specific selector roadmap:

- `selectPosterPreviewGraph`: future root/depth-limited poster graph selection.
- `selectSnapshotPreviewGraph`: future viewport/visible-node graph selection.

It also blocks direct runtime wiring until privacy regression tests, store shape discovery, and product-specific selector skeletons are in place.

---

## 5.2 Phase 4G Live Selector Skeleton

Phase 4G introduces skeleton functions only:

- `selectPosterPreviewGraph`
- `selectSnapshotPreviewGraph`

Both currently return empty `PreviewSanitizerRawGraph` structures and are deliberately not registered via `getVisualPreviewGraphSelector`. This preserves the runtime boundary while giving the next phase concrete files and tests to evolve after store shape discovery.

---

## 5.3 Phase 4H Store Shape Discovery

Store shape discovery is documented in [`visual-publishing-studio-store-shape-discovery-2026-07-09.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-publishing-studio-store-shape-discovery-2026-07-09.md).

Key findings:

- Canonical store entry point: `useAppStore`.
- Candidate source fields: `people`, `relationships`, `focusId`, `treeSettings`.
- `Person` and `RelationshipEdge` objects must never be returned directly from preview selectors.
- Future selectors should map to `PreviewSanitizerRawGraph` and immediately pass through `productionPreviewSanitizer`.

---

## 5.4 Phase 4I Privacy Regression Fixture

Phase 4I adds tests using store-shaped fixtures that intentionally include sensitive fields such as contact info, media locations, notes, source text, relationship IDs, and sync metadata.

The test fixture confirms:

- mapped `PreviewSanitizerRawGraph` excludes contact/media/note/source fields
- relationship IDs are not serialized downstream
- `productionPreviewSanitizer` masks living/private people
- final sanitized graphs use generated preview IDs rather than store person IDs

---

## 5.5 Phase 4P-4Q Hidden Studio Selector Wiring

The hidden Studio selector wiring plan is documented in [`visual-publishing-studio-hidden-selector-wiring-plan-2026-07-09.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-publishing-studio-hidden-selector-wiring-plan-2026-07-09.md).

Phase 4Q applies the plan with static fixture data only:

```text
fixture source -> fixture selector -> productionPreviewSanitizer -> preview adapter -> hidden Studio telemetry
```

This proves the Studio can consume the sanitized pipeline without touching store data, IndexedDB, export handlers, or runtime selector registries.

---

## 5.6 Phase 4R-4S Pure Live Source Mapper

The hidden live-source wiring plan is documented in [`visual-publishing-studio-hidden-live-source-wiring-plan-2026-07-09.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-publishing-studio-hidden-live-source-wiring-plan-2026-07-09.md).

Phase 4S implements a pure mapper that accepts only explicitly allowed store-shaped fields and returns `PreviewLiveTreeSource`.

This mapper is not a runtime store subscription. It is a controlled boundary that excludes contact details, note fields, metadata, and media URLs at compile time before poster/snapshot selectors run.

---

## 5.7 Phase 4T-4U Runtime Wiring Gate and Foundation Closure

The runtime store wiring plan is documented in [`visual-publishing-studio-hidden-runtime-store-wiring-plan-2026-07-09.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-publishing-studio-hidden-runtime-store-wiring-plan-2026-07-09.md).

The foundation closure review is documented in [`visual-publishing-studio-foundation-closure-review-2026-07-09.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-publishing-studio-foundation-closure-review-2026-07-09.md).

Decision:

- Current Studio foundation is complete as hidden architecture.
- Runtime store subscription remains deferred.
- User exposure remains blocked behind a future activation pack.

---

## 5.8 Hidden Store Bridge Skeleton

The optional hidden bridge is reviewed in [`visual-publishing-studio-hidden-store-bridge-review-2026-07-09.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-publishing-studio-hidden-store-bridge-review-2026-07-09.md).

The bridge is activated only when `VisualPublishingStudio` is rendered with `previewSourceMode="store"`. The current Vault integration does not pass this mode and the entire Studio shell remains hidden behind the disabled local flag.

This means the implementation exists for test coverage and future gated planning.

---

## 5.9 Owner Default Exposure

The owner exposure decision is documented in [`visual-publishing-studio-owner-default-exposure-review-2026-07-09.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-publishing-studio-owner-default-exposure-review-2026-07-09.md).

The Studio is now visible by default in the Vault Visual Outputs tab for owner/internal review. It uses `previewSourceMode="store"` and continues to keep Studio action buttons disabled while preserving the existing visual export cards below it.

---

## 6. Open Questions

1. **Reusing Settings**: Which active publishing configurations (e.g. margin settings, styling templates) should the sanitizer fetch during layout calculations?
2. **Photo Toggles**: Should profile photo previews be blocked behind an opt-in toggle within the configuration panel?
3. **Node Limits**: What are the initial node bounds (e.g. 50, 100) to ensure a fluid viewport experience on lower-end client devices?
4. **Caching Strategies**: Should sanitized graphs be cached in memory to speed up preview switching times?
