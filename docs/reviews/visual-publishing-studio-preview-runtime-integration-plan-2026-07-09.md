# Visual Publishing Studio Preview Runtime Integration Plan

- **Status**: `Planning Only (Phase 4A Plan Complete, Phase 4B skeleton under tests)`
- **Goal**: Map out the bridge between live database tree stores and the sanitized preview graph models.
- **Milestones**: Phase 4A (Integration Plan), Phase 4B (Production Sanitizer Skeleton)
- **Date**: 2026-07-09

> [!NOTE]
> **Production-shaped does not mean production-wired.** Phase 4B delivers a production-shaped `productionPreviewSanitizer` skeleton verified under unit tests, but leaves all store/IndexedDB runtime wiring disabled.

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

## 6. Open Questions

1. **Reusing Settings**: Which active publishing configurations (e.g. margin settings, styling templates) should the sanitizer fetch during layout calculations?
2. **Photo Toggles**: Should profile photo previews be blocked behind an opt-in toggle within the configuration panel?
3. **Node Limits**: What are the initial node bounds (e.g. 50, 100) to ensure a fluid viewport experience on lower-end client devices?
4. **Caching Strategies**: Should sanitized graphs be cached in memory to speed up preview switching times?
