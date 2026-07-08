# Preview Adapter Foundation Evidence Notes

- **Date**: 2026-07-08
- **Project**: Jozor Family Tree Visual Publishing Studio
- **Scope**: Safety verification logs for Phases 3A-3F

---

## 1. Test Verification Footprint

The following unit tests have successfully passed under vitest, validating compliance:

### 1.1 `previewSanitizerTypes.test.ts`
- Verifies that sanitized graph objects exclude raw properties (`email`, `phone`, `address`, `notes`, `photoUrl`, `mediaPath`, `note`, `citation`).
- Verifies that `owner-full` mode is a policy setting and is not allowed to bypass sanitizer exclusions.
- Confirms compile-time checking of decoupled structures.

### 1.2 `previewMockSanitizer.test.ts`
- Verifies that `mockPreviewSanitizer` correctly transforms simulated raw graphs.
- Asserts that names, years, and photo presence indicators are masked or stripped based on policy criteria.
- Validates node limits truncation, edge pruning, and localization output (`شخص مخفي` / `Masked person`).

### 1.3 `previewAdapterRegistry.test.ts`
- Verifies that `posterPreviewAdapter` and `snapshotPreviewAdapter` map the sanitized graphs to layout telemetry properties.
- Confirms that warning logs and truncation flags are preserved in the final model.
- Validates the default mock fallback mechanism when `sanitizedGraph` is not specified.

### 1.4 `VisualPublishingStudio.test.tsx`
- Verifies telemetry readout inside the UI panel without triggering crashes.
- Asserts layout telemetry renders correct count data.

---

## 2. Safety Audit Log

The codebase was audited to check for any leaky connections:

1. **No Database ID Leakage**:
   - The primary keys (`rawId`) are entirely blocked. All mapping utilizes sequentially generated `preview-node-${index}` strings.
2. **Zero Sensitive Attributes**:
   - Fields such as `email`, `phone`, `address`, `photoUrl`, and `notes` are completely omitted. Output verification checks strictly reject these substrings.
3. **No Database Store References**:
   - Sanitizer modules and preview adapters have zero imports from database stores, indexedDB queries, or sync contexts.
4. **No Export Engine Triggering**:
   - Adapters only construct layout configuration schemas; they do not call print handles or export routines (`onRunExport`).
5. **Studio Shell is Hidden**:
   - The studio remains deactivated behind the feature flag:
     ```typescript
     export const SHOW_VISUAL_STUDIO_SHELL = false;
     ```
