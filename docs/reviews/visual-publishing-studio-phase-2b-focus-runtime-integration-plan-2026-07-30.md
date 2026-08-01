# Visual Publishing Studio Phase 2B — Final Corrected Focus Runtime & Studio Integration Plan

## Overview & Objectives
Phase 2B connects the accepted **Focus Family** layout engine foundation (`focus-family`) to production runtime data and `VisualPublishingStudio` UI controls.

This final corrected plan incorporates core state atomic scope management with restoration, Schema Version 2 document migration, an explicit token-isolated selection boundary, corrected file ownership, bounded maxNodes truncation, Playwright E2E scenarios, and an atomic 3-step activation gate.

---

## 1. Core State Atomic Scope Switching & Restoration (`posterDesignState.ts`)

- **State Bucket Update**: Store `lastTieredScope: PosterTreeScope` inside `TieredSettingsBucket` in `posterDesignState.ts`.
- **Atomic Layout Switch to Focus**:
  - `activeLayout: 'focus-family'`
  - `state.content.scope` is **atomically** set to `'around-person'`.
- **Atomic Layout Switch to Tiered**:
  - `activeLayout: 'tiered'`
  - `state.content.scope` is **atomically** restored to `state.tiered.lastTieredScope` (defaulting to `'ancestors'`).
- **Core State Guarantee**: Scope switching logic lives in core state (`posterDesignState.ts`), ensuring pure state functions, hooks, and tests operate identically.

---

## 2. Document Schema Version 2 Migration (`posterDesignDocument.ts`)

- **Schema Version 2**: Upgrade `PosterDesignDocument` to `version: 2`.
- **Migration Function**: `migratePosterDesignDocumentV1ToV2(doc)`:
  - Migrates v1 design documents without `lastTieredScope` to v2.
  - Preserves existing v1 settings and sets `lastTieredScope` to `doc.content.scope` if it was a tiered scope, else `'ancestors'`.
- **Serialization**: JSON serialization and round-trip parsing tests verify backward and forward compatibility.

---

## 3. Explicit Focus Selection Boundary API (`previewFocusGraphSelector.ts`)

```typescript
export interface FocusSelectionBoundaryRequest {
  readonly focalPersonToken: string;
  readonly ancestorDepth: PosterFocusDepth;
  readonly descendantDepth: PosterFocusDepth;
  readonly includeSpouses: boolean;
  readonly includeSiblings: boolean;
  readonly privacyMode: PosterPrivacyMode;
  readonly maxNodes?: number;
}

export interface FocusSelectionBoundaryResult {
  readonly sanitizedGraph: SanitizedPreviewGraph;
  readonly focalPreviewId: string;
  readonly warnings: readonly string[];
}
```

- **Strict Boundary Invariant**:
  - Input receives `focalPersonToken` (session token).
  - Resolves `focalPersonToken` -> `rawFocalPersonId` strictly inside selector internal scope.
  - Slices raw graph and runs production sanitizer (`previewProductionSanitizer.ts`).
  - Derives `focalPreviewId` from the unique node where `relationshipHint === 'root'`.
  - Returns **ONLY** `{ sanitizedGraph, focalPreviewId, warnings }`.
  - **Raw person IDs (UUIDs, DB keys) MUST NEVER be returned** to React components, hooks, options builders, or export adapters.

---

## 4. File Ownership & Option Types

- **`visualStudioPosterOptions.ts`** (`src/features/the-vault/components/visual-studio/`):
  - Owns the discriminated union:
    ```typescript
    export type VisualStudioPosterOptions =
      | TieredPosterOptions
      | FocusPosterOptions;

    export interface TieredPosterOptions {
      readonly engineId: 'ancestor-tiered' | 'descendant-tiered' | 'full-tree-overview' | 'branch-index-grid';
      readonly content: PosterContentSpec;
    }

    export interface FocusPosterOptions {
      readonly engineId: 'focus-family';
      readonly content: PosterContentSpec & { readonly scope: 'selected-root-focus' };
      readonly focusOptions: PosterFocusLayoutOptions;
    }
    ```
- **`posterDesignStateRuntimeAdapter.ts`** (`src/features/the-vault/components/visual-studio/`):
  - Consumes `VisualStudioPosterOptions` and maps design state + `{ focalPreviewId }` context to `VisualStudioPosterOptions`.
  - Returns `{ supported: false, reason: ... }` if `focalPreviewId` is missing/unresolvable. **No fallback to Tiered**.

---

## 5. Bounded Focus Selector `maxNodes` & Truncation

- Default `maxNodes: 50` enforced for Focus Family selector even when `ancestorDepth = 'all'` or `descendantDepth = 'all'`.
- If BFS graph traversal exceeds `maxNodes`:
  - Truncates excess nodes.
  - Sets `sanitizedGraph.metadata.truncated = true`.
  - Emits warning message: `"Focus family selection truncated at 50 nodes."`

---

## 6. Taxonomy & Registry Capabilities

- **`PosterTreeScope` (State/UI Taxonomy)**:
  - `'full-tree' | 'ancestors' | 'descendants' | 'selected-branch' | 'around-person'`
- **`VisualOutputLayoutEngine` (Output Registry Taxonomy)**:
  - Add `'focus-family'` to `VisualOutputLayoutEngine` in `visualOutputTypes.ts`.
- **`visualOutputRegistry.ts`**:
  - Do **not** add `'selected-root'` again to `VisualOutputScope`.
  - Advertise `layoutEngines: ['ancestor-tiered', 'descendant-tiered', 'full-tree-overview', 'focus-family']` on tested poster definitions (`classic-ancestor-poster`, `modern-ancestor-poster`).

---

## 7. Typed `FocusLayoutCapacityError`

- Exported from `focusFamilyPosterLayout.ts`:
  ```typescript
  export class FocusLayoutCapacityError extends Error {
    readonly code = 'FOCUS_LAYOUT_CAPACITY_EXCEEDED';
    constructor(message: string) {
      super(message);
      this.name = 'FocusLayoutCapacityError';
    }
  }
  ```
- Handled in `VisualPublishingStudio.tsx` via typed error check. Renders owner guidance alert ("Density exceeds printable area") and disables export actions in `VisualOutputActionBar`.

---

## 8. Expanded Compatibility Matrix (60 Combinations)

- Matrix evaluation in `posterCompatibilityModel.ts`:
  4 Product Modes x 3 Layout Modes x 5 Tree Scopes = **60 total combinations**.
- `detailed-poster` + `focus-family` + `around-person` is the **ONLY** runtime-supported Focus combination (`status: 'runtime-supported-and-reachable'`). All other Focus combinations return `incompatible`.
- `radial-generations` layout remains `planned` or `incompatible` across all scopes (`isRuntimeSupported: false`).
- Tested in `posterCompatibilityModel.test.ts` across all 60 combinations explicitly.

---

## 9. Comprehensive Vitest & Playwright E2E Test Suite

### Vitest Unit & Integration Tests
1. Focus Selection Boundary & Raw ID Isolation (`previewFocusGraphSelector.test.ts`)
2. Exactly One Sanitized Root Node Validation & Missing/Duplicate Root Rejection
3. Bounded `maxNodes` Truncation with `'all'` depths
4. Schema Version 2 Migration & V1-to-V2 Round-Trip Serialization
5. Core State Atomic Scope Switch & `lastTieredScope` Restoration (`posterDesignState.test.ts`)
6. Discriminated `VisualStudioPosterOptions` Union & Adapter No-Fallback (`posterDesignStateRuntimeAdapter.test.ts`)
7. Expanded 60-Combination Compatibility Matrix (`posterCompatibilityModel.test.ts`)

### Playwright E2E Tests (`tests/e2e/visual-studio-focus.spec.ts`)
8. Focus Export Scenario (PNG/PDF export of Focus layout)
9. Focus Responsive Scenario (mobile/desktop controls & layout reflow)
10. Focus Accessibility Scenario (ARIA states, focus indicators, keyboard tab order)
11. Focus Privacy Scenario (assert zero raw IDs or storage URLs in DOM/export)
12. Focus Filename Scenario (default export filename formatting for Focus)
13. Focus Blocked-Capacity Scenario (overcrowded canvas disables export button with owner alert)
14. Radial Layout Isolation Scenario (Radial choice remains hidden in UI)

---

## 10. Atomic Step-by-Step Execution Plan

- **Step 1 (Foundation & Integration)**: Schema v2 migration, `posterDesignState` scope switching, `previewFocusGraphSelector.ts`, `visualStudioPosterOptions.ts`, `posterDesignStateRuntimeAdapter.ts`, and `VisualOutputConfigPanel.tsx` UI controls.
- **Step 2 (Automated Test Suite)**: Execute all Vitest test suites and Playwright E2E scenarios.
- **Step 3 (Atomic Capability Activation)**: ONLY after all test gates pass 100%, update `posterCompatibilityModel.ts` and `visualOutputRegistry.ts` to activate Focus capability.
- **Constraints**: Do not implement Radial. Do not commit or push.

---

## Final Runtime Evidence Closure (2026-07-31)

**Status:** Completed and runtime-activated after the corrected gate passed.

- Focus now selects from the complete live or fixture relationship source, independently of Tiered ancestor/descendant selector slices.
- Focal-person selection uses a session-owned opaque token catalog. React receives token/label options only; raw IDs and raw-compatible token fallbacks are prohibited.
- Schema v1 permits `generationDepth` without `lastTieredScope`; migration adds the field and revalidates the result against strict schema v2.
- The production sanitizer matrix covers `owner-full`, `masked`, `includePhotos`, and `hideLivingPhotos` combinations.
- The Studio integration test proves Focus selection, focal-person changes, depth/toggle changes, SVG scene updates, and Tiered scope restoration.
- Playwright evidence uses the debug `seedTreeScenario` contract and mandatory Vault navigation. SVG/PNG/PDF downloads are inspected, privacy and filenames are checked, mobile overflow and keyboard activation are verified, and dense A4 Focus output is blocked without crashing the application.
- `detailed-poster + focus-family + around-person` is runtime-supported and advertised by tested poster definitions. Radial remains unavailable.

### Verified Gate

- Visual outputs and Studio Vitest: **441/441 passed** across 32 files.
- Focus Playwright E2E: **4/4 passed** on Chromium.
- Responsive Playwright E2E: **7/7 passed** on Chromium.
- Accessibility Playwright E2E: **5/5 passed** on Chromium after the final Focus-active evidence alignment.
- Responsive Playwright E2E: **7/7 passed** on Chromium after a complete rerun.
- TypeScript: **passed** after the final typed-capacity-error correction.
- No commit or push was performed.
