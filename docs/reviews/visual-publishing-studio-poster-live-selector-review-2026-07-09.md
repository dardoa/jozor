# Visual Publishing Studio Poster Live Selector Review

- **Status**: `Pass as Minimal Poster Selector Pattern`
- **Readiness**: `Ready for Snapshot Selector Planning`
- **Connectivity**: `Not Registered for Runtime Studio Use`
- **Date**: 2026-07-09

---

## 1. Scope

This report reviews Phase 4K, the minimal poster selector implementation.

The reviewed implementation:

- accepts a minimal `PreviewLiveTreeSource`
- selects a root-centered ancestor slice
- respects generation depth
- respects node count caps
- outputs only `PreviewSanitizerRawGraph`
- passes through `productionPreviewSanitizer`
- maps into the existing preview adapter

---

## 2. Safety Checklist

| Rule | Status | Notes |
|---|---|---|
| No `AppStore` dependency | Verified | Selector uses a local minimal source type. |
| No IndexedDB dependency | Verified | No persistence imports or queries. |
| Runtime registry remains inactive | Verified | Selector is exported but not registered through `getVisualPreviewGraphSelector`. |
| Output shape is sanitizer raw graph only | Verified | Output is `PreviewSanitizerRawGraph`. |
| No contact/media URL fields | Verified | Source type excludes `email`, `phone`, `address`, and `photoUrl`. |
| Raw IDs do not reach adapter model | Verified | Tests assert final `VisualPreviewModel` excludes raw IDs. |
| Living/private masking remains sanitizer-owned | Verified | Selector does not mask directly; sanitizer applies policy. |
| Snapshot selector still blocked | Verified | Snapshot selector remains an empty skeleton. |

---

## 3. Decision

The minimal poster selector pattern is approved as the template for future product-specific live selectors.

Approved next step:

```text
Phase 4M - Snapshot Selector Planning
```

Still blocked:

- runtime selector registry activation
- hidden Studio integration
- direct `useAppStore` reads inside the Studio
- IndexedDB reads
- snapshot live selector implementation until viewport boundaries are documented
