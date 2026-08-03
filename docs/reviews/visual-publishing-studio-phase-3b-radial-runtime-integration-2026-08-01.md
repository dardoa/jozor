# Visual Publishing Studio Phase 3B — Radial Runtime Integration & Studio Activation Review

**Date**: 2026-08-01  
**Status**: Completed & Fully Verified  
**Scope**: Radial/Fan Runtime Integration, Person-Token Catalog Generalization, Schema v3 Migration, Studio Controls, Staged Activation, Unit & E2E Evidence.

---

## Executive Summary

Phase 3B integrates the isolated `radial-generations` poster layout engine (established in Phase 3A) into the live/fixture Visual Publishing Studio pipeline. Every runtime control, scope migration, person-token boundary requirement, and export format (SVG, PNG, PDF) has been activated and verified. Focus and Tiered layout engines remain 100% green and unaffected.

---

## Architectural Changes & Delivered Requirements

### 1. Generalized Session-Owned Opaque Person Token Catalog
- Unified token resolution across Tiered, Focus, and Radial into a session-owned opaque `PosterPersonTokenCatalog`.
- Completely removed positional `preview-root-${index}` generation and React-level raw ID matching fallbacks.
- Person tokens are formatted as `session-token-${nonce}-${index}` with internal private `tokenToRawId` mapping.
- Token identities remain stable across language or privacy mode changes (only labels update).

### 2. Radial Graph Boundary Selector (`previewRadialGraphSelector.ts`)
- Created `selectRadialGraphBoundary` for direct BFS graph traversal from complete raw source graphs (ancestors or descendants up to `generationRings - 1` depth).
- Integrated with `productionPreviewSanitizer` to enforce privacy filtering, photo policy, and birth place/year rules.
- Throws controlled error when tokens cannot be resolved or are invalid.

### 3. Document Schema Version 3 & Migration (`posterDesignDocument.ts`)
- Introduced `schemaVersion: 3`, requiring `lastRadialScope: 'ancestors' | 'descendants'` inside the `radial` settings bucket.
- Implemented `v1 -> v2 -> v3` and `v2 -> v3` migrations.
- Strict schema validation enforces structural integrity and security guarantees.

### 4. Atomic Scope Restoration (`posterDesignState.ts`)
- `switchLayoutMode` atomically preserves and restores mode-specific scopes:
  - `Tiered -> Radial`: preserves `lastTieredScope`, restores `lastRadialScope`.
  - `Radial -> Tiered`: preserves `lastRadialScope`, restores `lastTieredScope`.
  - `Focus -> Radial`: restores `lastRadialScope`.
  - `Radial -> Focus`: preserves `lastRadialScope`, sets scope to `'around-person'`.

### 5. Runtime Adapter & Studio Controls
- `mapPosterDesignStateToRuntimeOptions` maps Radial state to `engineId: 'radial-generations'`, `content.scope` (`selected-root-ancestors` / `selected-root-descendants`), `focalPreviewId`, `radialSpan`, `generationRings` ($3..6$), `ringSpacing`, `centerCardScale`, and `labelOrientation: 'straight-unwarped'`.
- `VisualOutputConfigPanel.tsx` exposes Radial/Fan as the third layout choice in the Layout section, with contextual controls for root selection, scope, 180°/360° span, rings (3–6), spacing, center card scale, and read-only Arabic label strategy.

### 6. Staged Activation
- Marked `detailed-poster` + `radial-generations` + `ancestors`/`descendants` as `runtime-supported-and-reachable` in `posterCompatibilityModel.ts`.
- Advertised `radial-generations` in `VISUAL_OUTPUT_DEFINITIONS` capabilities for `classic-ancestor-poster` and `modern-ancestor-poster`.
- Kept `full-tree` unassessed (`status: 'unassessed'`) and `selected-branch` incompatible.

---

## Verification Evidence

### 1. Automated Unit & Integration Tests (183 Tests Passing)
- `previewRadialGraphSelector.test.ts`: 4 passed (ancestor/descendant traversal, sanitizer privacy, token rejection).
- `posterDesignDocument.test.ts`: 6 passed (v1/v2 to v3 migration, v3 strict validation, malformed document rejection).
- `posterDesignStateRadial.test.ts`: 3 passed (atomic scope switching & bucket updates).
- `posterDesignStateRuntimeAdapterRadial.test.ts`: 2 passed (Radial options mapping & unresolvable root rejection).
- `VisualPublishingStudio.radial.test.tsx`: 2 passed (Radial controls interaction & SVG rendering).
- Full regression suite across 23 test files: 183 tests passed.

### 2. TypeScript & ESLint Verification
- `npm run typecheck`: **0 errors** (`tsc --noEmit` passed).
- `npx eslint src/features/publishing/visualOutputs/ --max-warnings=0`: **0 errors, 0 warnings**.

### 3. Playwright E2E Test Suite (`tests/e2e/visual-studio-radial.spec.ts`)
- **3 tests passed (7.6s)**:
  - `activates Radial layout, controls 180°/360° span & scope, and exports SVG/PNG/PDF`
  - `switches scope between ancestors and descendants in Radial mode`
  - `handles controlled blocked capacity in Radial mode with zero downloads`
- Real browser downloads verified for SVG, PNG, and PDF files.

---

## Final Evidence Correction

The final correction pass replaced the process-wide token map with
`createPosterPersonTokenCatalogSession()`. Each Studio source session owns and disposes its
raw-to-opaque mapping. Rebuilding localized or privacy-filtered labels preserves token identity,
while a different tree/source session receives an isolated token namespace.

The live Tiered, Focus, and Radial paths resolve roots only through this boundary. The static
fixture selector retains its explicit `fixture-root` identifier solely inside the test-data path;
owner data is never selected from React by a raw person ID.

### Unit and Integration Evidence

- Publishing visual outputs: **404/404 passed** across 29 test files, including the final sanitizer matrix.
- Radial sanitizer matrix: **8/8 passed**, including `owner-full`, `masked`, `includePhotos`, and
  `hideLivingPhotos` combinations.
- Visual Publishing Studio: **79/79 passed** across 9 test files.
- The full legacy Studio behavioral suite is included and passes **47/47**.
- Radial Studio integration verifies a non-default opaque root selection, actual node-coordinate
  changes between 180 and 360 degree geometry, token stability across language/privacy changes,
  Focus/Tiered scope restoration, and absence of raw IDs in DOM/SVG.

### Browser Evidence

- Radial Chromium E2E: **6/6 passed**.
- Focus Chromium E2E regression: **4/4 passed**.
- Accessibility Chromium E2E: **5/5 passed**, including active Focus and active Radial states.
- Responsive Chromium E2E: **7/7 passed** across desktop, tablet, breakpoint, and mobile layouts.
- SVG, PNG, and PDF downloads are mandatory assertions. The suite checks file signatures,
  one-page PDF structure, safe filenames, privacy sentinels, keyboard traversal, mobile overflow,
  geometry changes, and blocked-capacity zero-download behavior.

### Static Gates

- `npm run typecheck`: passed with zero errors.
- Scoped ESLint with `--max-warnings=0`: passed with zero warnings or errors.
- `git diff --check`: passed with no whitespace errors.

No commit or push was created by the final evidence correction pass.
