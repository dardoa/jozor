# ADR 014: Visual Publishing Studio Preview Integration

## Status

`Accepted`

---

## Context

The hidden Visual Publishing Studio shell is fully established, reading metadata from `VisualOutputRegistry`, managing local selection state, and rendering static preview mockups.

However, moving from static mockups to active dynamic previews introduces significant architectural risks:
1. **Privacy leaks**: Direct rendering of family trees inside the studio preview pane could inadvertently expose private names, emails, addresses, media paths, or alive status details without proper credentials or masking.
2. **Performance lag**: Generating full high-fidelity vector diagrams (SVG or PDF layouts) for large, multi-generational user trees in real-time during studio configuration changes can freeze the browser thread.
3. **Complexity coupling**: Directly importing active exporter file generation engines into UI components leads to tight coupling, making the codebase fragile and difficult to test.

---

## Decision

We will adopt the **Preview Adapter Layer** pattern. The studio UI will never import or call export runtime handlers directly. Instead, templates will be processed through a dedicated adapter that filters data and maps it into a simplified model suitable for lightweight client-side preview rendering.

```text
Registry Definition & User Config
             ↓
      Preview Adapter
             ↓
   Sanitized Preview Model
             ↓
     Preview Renderer
             ↓
    Studio Preview Pane
```

---

## Preview Modes

The preview pane supports three progressive tiers of fidelity:

1. **Static Mock Preview** *(Implemented)*:
   - Zero database calls or family tree data extraction.
   - Abstract HTML/CSS nodes and lines representing the template type.
   - Extremely safe, fast, and completely isolated.

2. **Sanitized Data Preview** *(Planned for Phase 3)*:
   - Uses a stripped-down, filtered subset of family tree data.
   - Applies strict privacy masking rules directly in the adapter layer.
   - Used for the first dynamic rendering pass.

3. **High Fidelity Preview** *(Future scope)*:
   - Reuses pure layout calculations from active exports.
   - Displays a close representation of the final poster/snapshot output, but remains separate from file compilation engines (PDF/PNG generators).

---

## Privacy Rules

Governed by the [`Sanitized Tree Data Boundary Design`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-publishing-studio-sanitized-tree-data-boundary-2026-07-08.md), the following rules are enforced:
- **Rule of Isolation**: **Raw tree entities must never be passed directly into preview renderers.** Every data flow from the family store or database must pass through a sanitization pipeline before reaching the preview panel.
- **No live images**: The preview pane will never display person profile photos or media assets by default. If enabled in future custom themes, media paths must undergo strict secure masking check validations.
- **Privacy Masking**: Individuals flagged as living or private must have names, dates, and places obscured using identical masking policies applied during final export generation. Even in `owner-full` mode, data must pass through the sanitizer and cannot bypass the adapter boundary.
- **Strict Data Exclusions**: The sanitized preview model must never contain sensitive attributes, including:
  * Personal contact details (emails, phone numbers, addresses).
  * Raw system IDs, database primary keys, relationship IDs, or sync metadata.
  * Raw file system paths, cloud sync status, or external media URLs.
  * Raw citation text or source snippets.

---

## Renderer Strategy

- **Complete Decoupling**: Studio preview frames must never trigger active PDF compilers or PNG export processes.
- **Dedicated Adapters**: Every visual template type must define a matching preview adapter class or function:
  - `PosterPreviewAdapter` (Poster template layout and size constraints)
  - `SnapshotPreviewAdapter` (Viewport boundary coordinates)
- **Shared Pure Logic**: Layout positioning calculations (e.g. coordinates calculation, node spacing) can be extracted into shared helper files, but UI preview and background export runners must remain independent.

---

## Performance Boundaries

- **Conservative Caps**: Initial node limit caps for the preview rendering pass should be conservative and product-specific to prevent thread blockage.
- **Debounced Rendering**: Any interactive updates to preview pane components must be debounced and cancellable to ensure a smooth, lag-free UI experience.
- **Graceful Truncation**: When trees exceed performance caps, the preview must gracefully display a notification (e.g. "Preview limited for large trees") rather than crashing the workspace.

---

## Implications

- **Phase 3A - Preview Adapter Contract (Completed)**: Formalized the TypeScript interfaces, type contracts, and placeholder adapters for the Sanitized Preview Model under unit tests.
- **Phase 3B - Sanitized Mock Preview Model Integration (Completed)**: Wired the preview adapters to the hidden studio shell to inject static mock preview telemetry (counts, warning indicators, and truncation tags) into the mockup layout panes.
- **Phase 3C - Sanitized Tree Data Boundary Design (Completed)**: Established the [`Sanitized Tree Data Boundary Design`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-publishing-studio-sanitized-tree-data-boundary-2026-07-08.md) mapping out allowed preview fields, blacklisted forbidden properties, and rules of isolation.
- **Phase 3D - Sanitizer Contract Types (Completed)**: Created the type contracts and generic interface signature `VisualPreviewSanitizer<TRawGraph>` to formalize isolation from database engines.
- **Phase 3E - Static Sanitizer Mock Implementation (Completed)**: Built a test utility sanitizer `mockPreviewSanitizer` to verify data mapping, year-only parsing, edge truncation, and privacy masking under varying policies without database access.
- **Phase 3F - Adapter accepts SanitizedPreviewGraph (Next Step)**: Update the preview adapters (`posterPreviewAdapter`, `snapshotPreviewAdapter`) to accept and structure their preview models based on `SanitizedPreviewGraph` rather than hardcoded layout definitions.
