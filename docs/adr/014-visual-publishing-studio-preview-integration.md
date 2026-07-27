# ADR 014: Visual Publishing Studio Preview Integration

## Status

`Accepted`

> Poster rendering now follows [ADR 015](./015-svg-default-poster-rendering.md).
> ADR 014 remains authoritative for sanitization and adapter boundaries; ADR 015
> supersedes renderer separation after a sanitized `PosterScene` has been created.

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
- **Phase 3F - Adapter accepts SanitizedPreviewGraph (Completed)**: Refactored the preview adapter request contract and mapped `SanitizedPreviewGraph` parameters to `VisualPreviewModel` inside [`previewAdapterRegistry.ts`](file:///d:/AppDEV/Jozor1.1/src/features/publishing/visualOutputs/previewAdapterRegistry.ts), ensuring no raw entities enter the layout engine.
- **Phase 3G - Preview Adapter & Sanitizer Review Pack (Completed)**: Conducted architectural audit and created signoff checklist in [`visual-publishing-studio-preview-adapter-foundation-review-2026-07-08.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-publishing-studio-preview-adapter-foundation-review-2026-07-08.md) confirming zero database dependencies.
- **Phase 4A - Preview Runtime Integration Planning (Completed)**: Formulated the specification and design guidelines in [`visual-publishing-studio-preview-runtime-integration-plan-2026-07-09.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-publishing-studio-preview-runtime-integration-plan-2026-07-09.md) outlining data routing security rules and selectors architecture.
- **Phase 4B - Production Preview Sanitizer Skeleton (Completed)**: Developed [`previewProductionSanitizer.ts`](file:///d:/AppDEV/Jozor1.1/src/features/publishing/visualOutputs/previewProductionSanitizer.ts) defining schema signatures and verifying data protection boundaries.
- **Phase 4C - Preview Raw Graph Selector Contract (Completed)**: Defined `VisualPreviewGraphSelector<TRawSource = unknown>`, `VisualPreviewSelectorContext`, and an intentionally empty selector registry so future readers can only output `PreviewSanitizerRawGraph` and cannot pass raw domain entities into adapters or Studio components.
- **Phase 4D - Fixture Selector Implementation (Completed)**: Added fixture-only selectors that exercise the selector -> production sanitizer -> adapter chain under unit tests while keeping the runtime selector registry empty.
- **Phase 4E - Runtime Selector Foundation Review Pack (Completed)**: Reviewed and signed off on Phases 4A-4D as `Pass as Runtime Selector Foundation`, while confirming no live store or IndexedDB integration exists.
- **Phase 4F - Live Store Selector Planning (Completed)**: Defined the product-specific selector planning path, privacy regression requirements, runtime guards, and blocked direct store/IndexedDB integration until selector skeleton tests exist.
- **Phase 4G - Live Store Selector Skeleton (Completed)**: Added empty poster and snapshot selector skeletons that return safe empty graphs, remain unregistered in the runtime registry, and do not import store or IndexedDB modules.
- **Phase 4H - Store Shape Discovery (Completed)**: Documented the relevant `useAppStore`, `Person`, `RelationshipEdge`, and `TreeSettings` fields that future selectors may read, while keeping live reads blocked.
- **Phase 4I - Live Selector Privacy Regression Tests (Completed)**: Added store-shaped fixture tests proving contact info, media URLs/paths, notes, source text, relationship IDs, and sync metadata do not cross into preview raw or sanitized graph outputs.
- **Phase 4J - Live Selector Review Gate (Completed)**: Approved the next minimal poster selector implementation with fixture tests only, while keeping Studio integration and runtime selector registration blocked.
- **Phase 4K - Poster Live Selector Minimal Implementation (Completed)**: Implemented a root/depth-limited poster selector over `PreviewLiveTreeSource` fixtures, preserving sanitizer and adapter boundaries without registering the selector for runtime Studio use.
- **Phase 4L - Poster Live Selector Review Pack (Completed)**: Reviewed and approved the minimal poster selector pattern as safe for planning snapshot selector boundaries.
- **Phase 4M - Snapshot Selector Planning (Completed)**: Defined visible-node scoped snapshot selector boundaries, explicitly blocking full-tree traversal and viewport runtime reads.
- **Phase 4N - Snapshot Selector Minimal Implementation (Completed)**: Implemented explicit visible-node snapshot selection over `PreviewLiveTreeSource` fixtures, preserving sanitizer and adapter boundaries without runtime registration.
- **Phase 4O - Live Selector Implementation Review Pack (Completed)**: Reviewed poster and snapshot minimal selectors as `Pass as Minimal Live Selector Layer`, while keeping runtime registry and Studio wiring blocked.
- **Phase 4P - Hidden Studio Selector Wiring Planning (Completed)**: Planned a fixture-only wiring path for the hidden Studio that exercises selector -> sanitizer -> adapter without store reads or runtime registry activation.
- **Phase 4Q - Hidden Studio Fixture Selector Wiring (Completed)**: Updated the hidden Studio to build telemetry from static fixture data through fixture selectors, `productionPreviewSanitizer`, and preview adapters while keeping the shell invisible and all actions disabled.
- **Phase 4R - Hidden Live-Source Wiring Planning (Completed)**: Planned the pure mapper boundary from explicitly allowed store-shaped fields into `PreviewLiveTreeSource`, without store subscriptions or IndexedDB reads.
- **Phase 4S - Pure Live Source Mapper (Completed)**: Added `mapPreviewStoreSourceToLiveTreeSource`, a compile-level safe mapper that excludes contact fields, media URLs, notes, and metadata before selector processing.
- **Phase 4T - Hidden Runtime Store Wiring Planning (Completed)**: Defined the deferred runtime store bridge boundary and explicitly blocked runtime store subscriptions for this foundation pass.
- **Phase 4U - Visual Publishing Studio Foundation Closure Review (Completed)**: Closed the current Studio foundation as `Pass as Hidden Studio Foundation`, ready for a future gated runtime integration pack but not ready for user exposure.
- **Hidden Store Bridge Skeleton (Completed)**: Added the optional `previewSourceMode="store"` path through `useVisualStudioStorePreviewSource`, mapping allowed store fields into the sanitizer pipeline while keeping Vault exposure disabled.
- **Owner Default Exposure (Completed)**: Removed the local Vault hiding gate and rendered the Studio by default in Visual Outputs for owner/internal review with `previewSourceMode="store"`, while keeping Studio export actions disabled.

---

## Foundation Review Result

- **Status**: `Pass as Preview Adapter Foundation`
- **Connectivity**: `Not Connected to Real Tree Data`
- **Sign-off**: Approved by architecture committee on 2026-07-08.

## Runtime Selector Foundation Result

- **Status**: `Pass as Runtime Selector Foundation`
- **Connectivity**: `Not Connected to Store or IndexedDB`
- **Sign-off**: Approved by architecture committee on 2026-07-09.

## Live Selector Planning Result

- **Status**: `Planning Complete`
- **Connectivity**: `No Store or IndexedDB Wiring`
- **Next Step**: `Owner Visual QA for Studio Layout`
