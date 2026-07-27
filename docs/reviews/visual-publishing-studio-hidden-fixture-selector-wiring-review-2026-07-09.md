# Visual Publishing Studio Hidden Fixture Selector Wiring Review

- **Status**: `Pass as Hidden Fixture Selector Wiring`
- **Readiness**: `Ready for Hidden Live-Source Wiring Planning`
- **Connectivity**: `Fixture Source Only / Studio Still Hidden`
- **Date**: 2026-07-09

---

## 1. Scope

This review covers the first hidden Studio wiring step after the selector layer signoff.

The Studio now builds preview telemetry through the full safe pipeline:

```text
static fixture source -> fixture selector -> productionPreviewSanitizer -> preview adapter -> hidden Studio panes
```

No live family tree store, IndexedDB, profile table, export handler, PDF generator, or PNG renderer is connected.

---

## 2. Verified Behavior

| Area | Result |
|---|---|
| Poster preview | Uses fixture selector output, then sanitizer, then poster adapter. |
| Snapshot preview | Uses visible fixture IDs, then sanitizer, then snapshot adapter. |
| Preview mode | Reports `sanitized-data` instead of direct static mock fallback. |
| Privacy policy | Uses `masked` policy and disables photos. |
| Truncation | Poster fixture triggers the cap and renders warnings. |
| Snapshot bounds | Snapshot fixture renders the visible subset without truncation. |
| Action buttons | Remain disabled. |
| Shell visibility | Still controlled by `SHOW_VISUAL_STUDIO_SHELL = false`. |

---

## 3. Safety Checklist

| Rule | Status | Notes |
|---|---|---|
| No store imports in Studio | Verified | Studio imports publishing contracts/fixtures only. |
| No IndexedDB imports | Verified | No persistence layer is referenced. |
| No live person records | Verified | Local static fixture source only. |
| No raw IDs in adapter model | Verified by pipeline design | Sanitizer generates `preview-node-*` IDs. |
| No profile photo rendering | Verified | `includePhotos: false`. |
| No export handler calls | Verified | Action bar remains disabled and handler-free. |
| Hidden from users | Verified | Export panel flag remains disabled. |

---

## 4. Decision

The hidden Studio selector wiring is approved as a safe internal foundation.

Recommended next phase:

```text
Phase 4R - Hidden Live-Source Wiring Planning
```

The next phase should plan the smallest possible read-only bridge from store-shaped data into the existing selector boundary, without enabling the Studio or registering runtime selectors for users.
