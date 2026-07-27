# Visual Publishing Studio UX Blueprint

**Date:** July 8, 2026
**Status:** Approved UX Blueprint
**Authors:** Owner / Antigravity

---

## 1. Product Philosophy

Jozor is not Canva. Users do not come to Jozor to design arbitrary graphic layouts; they come to render beautiful, structured family trees and ancestral charts. Therefore, the publishing system must not be a drag-and-drop freeform canvas editor. Instead, it is a structured, configuration-driven publisher.

The Visual Publishing Studio is designed around three primary pillars:
- **Preview-First**: The main canvas preview is the focal point of the UI, displaying the output in high fidelity.
- **Configuration-First**: Customization is achieved by choosing structured presets, layout rules, data scopes, and contents rather than drawing elements.
- **Gallery-Light**: Instead of a heavy gallery of pre-rendered image cards, cards are used primarily as templates/selectors to enter the customization workflow.

---

## 2. Target Flow & Layout

### Target Customization Flow
```text
Product (Poster, Book, Snapshot)
-> Template (Classic, Modern, Fan Chart)
-> Theme / Preset (Warm, Dark, Monochromatic)
-> Layout (Coordinates, Aspect Ratio, Sizing)
-> Scope (Ancestor Depth, Descendant Depth)
-> Content (Include dates, photos, marriages)
-> Preview (Rendered high fidelity canvas preview)
-> Export (Instant high-DPI PDF or PNG download)
```

### Conceptual Layout Zones

The future studio UI consists of three primary layout zones:

1. **Preview Area (Center/Left)**
   - Takes up the majority of the screen space.
   - Shows the active visual output rendered on the user's tree.
   - Features zoom-to-fit, zoom-in, zoom-out, and pan controls.
   - Triggers live or on-demand re-rendering of the tree preview.

2. **Configuration Panel (Right Sidebar)**
   - Divided into structured collapsable sections:
     - **Product & Template Selector**: Choose between Classic Poster, Modern Poster, Snapshot, or Book.
     - **Appearance Settings**: Dropdown options for themes, presets, color schemes, and canvas orientation.
     - **Tree Parameters**: Numeric inputs or slider selectors for ancestor generation depth.
     - **Privacy & Details**: Checkbox toggles to include dates, media, or hide living family members.

3. **Action Bar (Bottom or Side Footer)**
   - Houses the export actions:
     - **Export PNG**: Downloads high-resolution image.
     - **Export PDF**: Generates high-DPI document.
     - **Status Indicator**: Displays export loading or PDF generation status.

---

## 3. Relationship to Current Visual Outputs Tab

During the migration to the Visual Publishing Studio, the existing Visual Outputs tab elements will undergo a phased transition:
- **No Immediate Deletions:** The current Classic Poster, Modern Poster, and Tree Snapshot cards will not be deleted in Phase 1. They serve as valuable fallbacks and instant actions.
- **Gradual Transition:** The existing cards will evolve into entry points. Clicking a card will open the Visual Publishing Studio preset with that specific product/template pre-selected.
- **Readiness Badges Utility:** The readiness status badges (e.g. `Structural beta pass`) remain visible on the template cards during Phase 1 to inform beta testers of the validation level.
- **Stable UX:** Current click-to-download behaviors remain fully supported, ensuring no user-facing workflows are broken during the migration.

---

## 4. Non-Goals for Phase 1

To keep the upcoming implementation focused and prevent scope creep, the following features are explicitly designated as **non-goals** for Phase 1:
- **No Live Rendering:** The preview pane will show a high-quality mock/placeholder asset. It will not render live SVG trees dynamically in Phase 1.
- **No Custom Theme Editor:** Users cannot create or edit color values; they can only select predefined presets (e.g. Warm Theme, Dark Theme).
- **No Active Paper-Size Controls:** Changing paper sizes will not reflow the design dynamically in the mock preview.
- **No Drag/Drop Canvas:** Absolute positioning of nodes, text boxes, or custom shapes remains unsupported.
- **No Export Behavior Changes:** Export generation continues to rely on the current high-DPI canvas capture and PDF adapter logic.
- **No Template Marketplace:** No template searching, uploading, or sharing modules will be built.

---

## 5. Component Architecture Sketch

The future studio UI will be structured into the following modular React component hierarchy:

```text
VisualPublishingStudio
├── VisualOutputPreviewPane      (Renders the center-stage preview card & zoom controls)
├── VisualOutputConfigPanel      (Sidebar container for all template & layout options)
│   ├── VisualOutputProductSelector  (Selector between Poster, Snapshot, and Book)
│   ├── VisualOutputTemplateSelector (Selector for registry templates: Classic/Modern)
│   └── VisualOutputDepthSlider      (Generation depth scope controller)
├── VisualOutputActionBar        (Footer containing the PNG and PDF download triggers)
└── VisualOutputReadinessNotice  (Warning / information banner regarding beta status)
```

### State Model Draft
```typescript
interface VisualPublishingStudioState {
  selectedProductId: string;    // 'poster' | 'snapshot' | 'book'
  selectedTemplateId: string;   // 'classic-ancestor-poster' | 'modern-ancestor-poster'
  selectedPreset: string;       // 'warm' | 'dark' | 'monochrome'
  selectedScope: {
    generationsDepth: number;
    rootPersonId: string;
  };
  previewStatus: 'idle' | 'generating' | 'ready' | 'stale';
  isExporting: boolean;
}
```

---

## 6. Phased Migration Plan

### Phase 0: Current State (Completed)
- Visual templates defined in the registry.
- High-DPI canvas capture and watermark logic tested.
- Export cards styled with readiness status badges.

### Phase 1: Studio Shell (Completed & Reviewed)
- Created the isolated component structure (`VisualPublishingStudio` composing `VisualOutputPreviewPane`, `VisualOutputConfigPanel`, `VisualOutputActionBar`, and `VisualOutputReadinessNotice`).
- Integrated into `ExportCloudPanel.tsx` but kept hidden from the production flow behind a disabled scaffold constant (`SHOW_VISUAL_STUDIO_SHELL = false`).
- Added full unit test suite `VisualPublishingStudio.test.tsx` verifying Scaffolding render behavior in English/Arabic.
- Verified that the current Visual Outputs cards remain active and unchanged.
- Reviewed and certified under status `Pass as Hidden Architecture Scaffold` in [`visual-publishing-studio-shell-review-2026-07-08.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-publishing-studio-shell-review-2026-07-08.md).

### Phase 2A: Registry-backed Studio Defaults (Completed)
- Bound the hidden Visual Publishing Studio shell directly to `VisualOutputRegistry`.
- Updated subcomponents (`VisualOutputPreviewPane`, `VisualOutputConfigPanel`, `VisualOutputActionBar`) to receive and display definitions, rendering name, description, capabilities, size limits, and layout parameters.
- Kept the UI passive and hidden behind the local disabled scaffold constant (`SHOW_VISUAL_STUDIO_SHELL = false`) with zero runtime export changes.
- Added test coverage verifying registry defaults binding and correct translation lookups.

### Phase 2B: Read-only Product Selector State (Completed)
- Integrated local state selection (`selectedDefinitionId`, `setSelectedDefinitionId`) in `VisualPublishingStudio.tsx` to handle changing template types.
- Updated `VisualOutputConfigPanel.tsx` to render template selection list (Classic Poster, Modern Poster, Tree Snapshot) and trigger template updates.
- Verified dynamic specs updates (productType, layoutEngine, readingStrategy, supported sizes/orientations/scopes) and conditional action buttons based on selected registry options, while keeping all controls passive and buttons disabled.
- Added tests asserting state updates on clicking template options inside the studio.

### Phase 2C: Static Preview Composition (Completed)
- Transformed the preview pane into a visual mockup frame with semantic placeholder representation depending on selected template type.
- Poster templates render a portrait frame (`poster-preview-composition`) with abstract ancestors nodes and branches styling matching theme colors (cozy warm vintage vs slate dark theme).
- Snapshot templates render a landscape frame (`snapshot-preview-composition`) with grid alignment and abstract viewport nodes.
- Integrated accessibility `aria-label` tags mapping to `previewAsset.alt` from registry.
- Kept mock previews 100% static using HTML/CSS only, with zero database calls or private user information.

### Phase 2D: Studio Hidden Review (Completed)
- Conducted architectural safety review across Phases 2A-2C in [`visual-publishing-studio-hidden-review-2026-07-08.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-publishing-studio-hidden-review-2026-07-08.md).
- Created verification notes in [`evidence_notes.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/evidence/visual-publishing-studio-hidden-review-2026-07-08/evidence_notes.md) confirming zero leaks, disabled actions, and static CSS-driven mockups.
- Certified the foundation gate as `Pass as Hidden Studio Foundation`.

### Phase 2E: Preview Integration ADR & Design Note (Completed)
- Established [`ADR 014: Visual Publishing Studio Preview Integration`](file:///d:/AppDEV/Jozor1.1/docs/adr/014-visual-publishing-studio-preview-integration.md) to govern data flow and safety.
- Mandated the **Preview Adapter Layer** pattern to isolate UI components from active exporter compilation logic.
- Outlined explicit rules regarding privacy masking (redacting contact fields, private profiles) and performance limits (dynamic debounces and conservative cap limits).

### Phase 3A: Preview Adapter Contract (Completed)
- Defined TypeScript type contracts and API interfaces in [`previewAdapterTypes.ts`](file:///d:/AppDEV/Jozor1.1/src/features/publishing/visualOutputs/previewAdapterTypes.ts).
- Implemented static placeholder mapping adapters (`posterPreviewAdapter`, `snapshotPreviewAdapter`) and registry lookup utilities in [`previewAdapterRegistry.ts`](file:///d:/AppDEV/Jozor1.1/src/features/publishing/visualOutputs/previewAdapterRegistry.ts).
- Validated via unit tests in [`previewAdapterRegistry.test.ts`](file:///d:/AppDEV/Jozor1.1/src/features/publishing/visualOutputs/__tests__/previewAdapterRegistry.test.ts) that mock outputs conform strictly to privacy rules.

### Phase 3B: Sanitized Mock Preview Model Integration (Completed)
- Integrated the static preview adapter hook inside [`VisualPublishingStudio.tsx`](file:///d:/AppDEV/Jozor1.1/src/features/the-vault/components/visual-studio/VisualPublishingStudio.tsx).
- Propagated telemetry results to the Preview Pane [`VisualOutputPreviewPane.tsx`](file:///d:/AppDEV/Jozor1.1/src/features/the-vault/components/visual-studio/VisualOutputPreviewPane.tsx) and Config Panel [`VisualOutputConfigPanel.tsx`](file:///d:/AppDEV/Jozor1.1/src/features/the-vault/components/visual-studio/VisualOutputConfigPanel.tsx).
- Handled edge cases with fallback checks for missing adapters and validated warning badge behaviors under vitest.

### Phase 3C: Sanitized Tree Data Boundary Design (Completed)
- Established the [`Sanitized Tree Data Boundary Design`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-publishing-studio-sanitized-tree-data-boundary-2026-07-08.md) mapping out allowed preview fields, blacklisted forbidden properties, and rules of isolation.
- Enforced that raw tree entities must never be passed directly into preview renderers, and even `owner-full` mode cannot bypass sanitization.

### Phase 3D: Sanitizer Contract Types (Completed)
- Defined TypeScript types for life status, relationship hints, policy settings, nodes, edges, and graphs under [`previewSanitizerTypes.ts`](file:///d:/AppDEV/Jozor1.1/src/features/publishing/visualOutputs/previewSanitizerTypes.ts).
- Established the sanitizer generic interface contract [`previewSanitizerContract.ts`](file:///d:/AppDEV/Jozor1.1/src/features/publishing/visualOutputs/previewSanitizerContract.ts) isolating raw database entities.
- Verified under unit tests in [`previewSanitizerTypes.test.ts`](file:///d:/AppDEV/Jozor1.1/src/features/publishing/visualOutputs/__tests__/previewSanitizerTypes.test.ts) that sanitized node shapes reject all forbidden fields and enforce masking rules.

### Phase 3E: Static Sanitizer Mock Implementation (Completed)
- Implemented a test/mock helper sanitizer [`previewMockSanitizer.ts`](file:///d:/AppDEV/Jozor1.1/src/features/publishing/visualOutputs/previewMockSanitizer.ts) to verify sanitization constraints.
- Confirmed under unit tests in [`previewMockSanitizer.test.ts`](file:///d:/AppDEV/Jozor1.1/src/features/publishing/visualOutputs/__tests__/previewMockSanitizer.test.ts) that names, years, photos, and edges are mapped, masked, and cropped correctly according to active policies with zero leakage.

### Phase 3F: Adapter accepts SanitizedPreviewGraph (Completed)
- Refactored [`previewAdapterTypes.ts`](file:///d:/AppDEV/Jozor1.1/src/features/publishing/visualOutputs/previewAdapterTypes.ts) introducing the optional `sanitizedGraph` parameter.
- Updated `posterPreviewAdapter` and `snapshotPreviewAdapter` inside [`previewAdapterRegistry.ts`](file:///d:/AppDEV/Jozor1.1/src/features/publishing/visualOutputs/previewAdapterRegistry.ts) to map node and edge entities directly from the sanitized graph when present, while retaining original warning queues and truncation flags.
- Verified integration behavior under unit tests in [`previewAdapterRegistry.test.ts`](file:///d:/AppDEV/Jozor1.1/src/features/publishing/visualOutputs/__tests__/previewAdapterRegistry.test.ts).

### Phase 3G: Preview Adapter & Sanitizer Review Pack (Completed)
- Completed the foundation audit report [`visual-publishing-studio-preview-adapter-foundation-review-2026-07-08.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-publishing-studio-preview-adapter-foundation-review-2026-07-08.md) and signed off on the foundation layer as: `Pass as Preview Adapter Foundation`, `Ready for Preview Runtime Integration Planning`, `Not Connected to Real Tree Data`.

### Phase 4A: Preview Runtime Integration Planning (Completed)
- Completed the integration design specifications in [`visual-publishing-studio-preview-runtime-integration-plan-2026-07-09.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-publishing-studio-preview-runtime-integration-plan-2026-07-09.md) outlining data routing security boundaries and selectors design.

### Phase 4B: Production Preview Sanitizer Skeleton (Completed)
- Designed and built the generic `productionPreviewSanitizer` in [`previewProductionSanitizer.ts`](file:///d:/AppDEV/Jozor1.1/src/features/publishing/visualOutputs/previewProductionSanitizer.ts).
- Enforced compile-level safety by creating input signatures (`PreviewSanitizerRawNode`, `PreviewSanitizerRawGraph`) that strictly exclude email, phone, and detailed notes.
- Wrote and executed unit tests in [`previewProductionSanitizer.test.ts`](file:///d:/AppDEV/Jozor1.1/src/features/publishing/visualOutputs/__tests__/previewProductionSanitizer.test.ts).

### Phase 4C: Preview Raw Graph Selector Contract (Completed)
- Defined selector contracts in [`previewGraphSelectorTypes.ts`](file:///d:/AppDEV/Jozor1.1/src/features/publishing/visualOutputs/previewGraphSelectorTypes.ts) using `VisualPreviewGraphSelector<TRawSource = unknown>` to keep the upstream source abstract.
- Added an intentionally empty selector registry in [`previewGraphSelectorRegistry.ts`](file:///d:/AppDEV/Jozor1.1/src/features/publishing/visualOutputs/previewGraphSelectorRegistry.ts), preserving the no-runtime-wiring rule.
- Verified via [`previewGraphSelectorTypes.test.ts`](file:///d:/AppDEV/Jozor1.1/src/features/publishing/visualOutputs/__tests__/previewGraphSelectorTypes.test.ts) that selectors can only output production-shaped `PreviewSanitizerRawGraph` structures and remain decoupled from store/IndexedDB/domain imports.

### Phase 4D: Fixture Selector Implementation (Completed)
- Implemented fixture-only selectors in [`previewFixtureGraphSelectors.ts`](file:///d:/AppDEV/Jozor1.1/src/features/publishing/visualOutputs/previewFixtureGraphSelectors.ts) to exercise the full selector -> production sanitizer -> adapter chain without connecting to the live tree store.
- Verified via [`previewFixtureGraphSelectors.test.ts`](file:///d:/AppDEV/Jozor1.1/src/features/publishing/visualOutputs/__tests__/previewFixtureGraphSelectors.test.ts) that poster fixtures honor root/depth boundaries, snapshot fixtures honor visible node IDs, and no fixture IDs leak into the final preview adapter model.
- Preserved the runtime selector registry as intentionally empty.

### Phase 4E: Runtime Selector Foundation Review Pack (Completed)
- Reviewed and signed off on Phase 4A-4D in [`visual-publishing-studio-runtime-selector-foundation-review-2026-07-09.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-publishing-studio-runtime-selector-foundation-review-2026-07-09.md).
- Certified the package as `Pass as Runtime Selector Foundation`, `Ready for Live Store Selector Planning`, and `Not Connected to Store or IndexedDB`.

### Phase 4F: Live Store Selector Planning (Completed)
- Planned product-specific live selectors and privacy regression requirements in [`visual-publishing-studio-live-store-selector-planning-2026-07-09.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-publishing-studio-live-store-selector-planning-2026-07-09.md).
- Confirmed that live store/IndexedDB wiring remains blocked until selector skeletons, privacy tests, and store shape discovery are complete.

### Phase 4G: Live Store Selector Skeleton (Completed)
- Created empty live selector skeletons in [`previewLiveGraphSelectors.ts`](file:///d:/AppDEV/Jozor1.1/src/features/publishing/visualOutputs/previewLiveGraphSelectors.ts).
- Verified via [`previewLiveGraphSelectors.test.ts`](file:///d:/AppDEV/Jozor1.1/src/features/publishing/visualOutputs/__tests__/previewLiveGraphSelectors.test.ts) that skeletons return safe empty graphs, are not registered in the runtime selector registry, and import no store/IndexedDB/domain modules.

### Phase 4H: Store Shape Discovery (Completed)
- Documented the canonical store/domain structures in [`visual-publishing-studio-store-shape-discovery-2026-07-09.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-publishing-studio-store-shape-discovery-2026-07-09.md).
- Identified `people`, `relationships`, `focusId`, and `treeSettings` as future selector source fields.
- Confirmed `Person` and `RelationshipEdge` objects must never cross into sanitizer/adapters directly.

### Phase 4I: Live Selector Privacy Regression Tests (Completed)
- Added store-shaped fixture privacy regression tests in [`previewLiveSelectorPrivacyRegression.test.ts`](file:///d:/AppDEV/Jozor1.1/src/features/publishing/visualOutputs/__tests__/previewLiveSelectorPrivacyRegression.test.ts).
- Verified that contact fields, media URLs/paths, notes, source text, relationship IDs, and sync metadata are excluded before sanitizer/adapter boundaries.

### Phase 4J: Live Selector Review Gate (Completed)
- Reviewed Phase 4F-4I in [`visual-publishing-studio-live-selector-review-gate-2026-07-09.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-publishing-studio-live-selector-review-gate-2026-07-09.md).
- Approved `Phase 4K - Poster Live Selector Minimal Implementation` with fixture tests only.
- Kept Studio integration and runtime selector registry activation blocked.

### Phase 4K: Poster Live Selector Minimal Implementation (Completed)
- Implemented the smallest root/depth-limited poster selector in [`previewLiveGraphSelectors.ts`](file:///d:/AppDEV/Jozor1.1/src/features/publishing/visualOutputs/previewLiveGraphSelectors.ts) using a minimal `PreviewLiveTreeSource` fixture shape only.
- Verified through [`previewLiveGraphSelectors.test.ts`](file:///d:/AppDEV/Jozor1.1/src/features/publishing/visualOutputs/__tests__/previewLiveGraphSelectors.test.ts) that the selector maps root and ancestor nodes, respects generation depth, passes through `productionPreviewSanitizer`, and reaches the preview adapter without raw IDs.
- Kept runtime selector registry activation blocked.

### Phase 4L: Poster Live Selector Review Pack (Completed)
- Reviewed and signed off on the minimal poster selector in [`visual-publishing-studio-poster-live-selector-review-2026-07-09.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-publishing-studio-poster-live-selector-review-2026-07-09.md).
- Approved the poster selector pattern as the reference for future product-specific selectors.

### Phase 4M: Snapshot Selector Planning (Completed)
- Defined viewport/visible-node boundaries in [`visual-publishing-studio-snapshot-selector-planning-2026-07-09.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-publishing-studio-snapshot-selector-planning-2026-07-09.md).
- Confirmed snapshot selector must use `visibleNodeIds`, avoid full-tree traversal, and remain unregistered from runtime.

### Phase 4N: Snapshot Selector Minimal Implementation (Completed)
- Implemented the smallest visible-node snapshot selector using source-shaped fixtures only.
- Verified snapshot selector output passes through `productionPreviewSanitizer` and `snapshotPreviewAdapter` without raw IDs.
- Kept runtime selector registry activation and Studio wiring blocked.

### Phase 4O: Live Selector Implementation Review Pack (Completed)
- Reviewed poster and snapshot selector implementations in [`visual-publishing-studio-live-selector-implementation-review-2026-07-09.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-publishing-studio-live-selector-implementation-review-2026-07-09.md).
- Certified the selector layer as `Pass as Minimal Live Selector Layer`.
- Kept runtime selector registry activation and Studio wiring blocked.

### Phase 4P: Hidden Studio Selector Wiring Planning (Completed)
- Planned how the hidden Studio may consume selector output without exposing the Studio or registering runtime selectors.

### Phase 4Q: Hidden Studio Fixture Selector Wiring (Completed)
- Wired the hidden Studio to use a static fixture source through the fixture selector -> `productionPreviewSanitizer` -> preview adapter pipeline.
- Preserved `SHOW_VISUAL_STUDIO_SHELL = false`, disabled action buttons, and zero export handler wiring.
- Recorded the review in [`visual-publishing-studio-hidden-fixture-selector-wiring-review-2026-07-09.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-publishing-studio-hidden-fixture-selector-wiring-review-2026-07-09.md).

### Phase 4R: Hidden Live-Source Wiring Planning (Completed)
- Planned the smallest read-only bridge from store-shaped data into the existing selector boundary without enabling the Studio for users.

### Phase 4S: Pure Live Source Mapper (Completed)
- Added a pure mapper from allowed store-shaped fields into `PreviewLiveTreeSource`.
- Verified compile-level exclusion of contact fields, media URLs/paths, notes, source text, and metadata.
- Kept runtime store subscriptions, IndexedDB reads, and Studio exposure blocked.

### Phase 4T: Hidden Runtime Store Wiring Planning (Completed)
- Documented the runtime bridge requirements in [`visual-publishing-studio-hidden-runtime-store-wiring-plan-2026-07-09.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-publishing-studio-hidden-runtime-store-wiring-plan-2026-07-09.md).
- Deferred live store subscription and activation to a future gated runtime integration pack.

### Phase 4U: Foundation Closure Review (Completed)
- Closed the current foundation in [`visual-publishing-studio-foundation-closure-review-2026-07-09.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-publishing-studio-foundation-closure-review-2026-07-09.md).
- Final foundation status: `Pass as Hidden Studio Foundation`.
- Next milestone: `Visual Publishing Studio Runtime Preview Activation Pack`.

### Hidden Store Bridge Skeleton (Completed)
- Added optional `previewSourceMode="store"` support inside the hidden Studio only.
- Isolated store reading in `useVisualStudioStorePreviewSource`, mapping only allowed fields into `PreviewLiveTreeSource`.
- Reviewed the bridge in [`visual-publishing-studio-hidden-store-bridge-review-2026-07-09.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-publishing-studio-hidden-store-bridge-review-2026-07-09.md).
- Next milestone: `Visual Publishing Studio Gated UI Exposure Planning`.

### Owner Default Exposure (Completed)
- Removed the local Vault hiding gate for owner/internal review.
- Rendered the Studio by default inside the Visual Outputs tab with `previewSourceMode="store"`.
- Preserved disabled Studio action buttons and kept current export cards available below the Studio.
- Reviewed the decision in [`visual-publishing-studio-owner-default-exposure-review-2026-07-09.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-publishing-studio-owner-default-exposure-review-2026-07-09.md).
- Next milestone: `Owner Visual QA for Studio Layout`.

### Visual Outputs Tab Alignment Pass (Completed)
- Reframed the visible Studio as a Limited Beta preview/review area, not a second export surface.
- Removed the disabled Studio action bar from the visible UI.
- Added a clear `Current export actions` separator above the existing poster/snapshot export cards.
- Preserved existing card-based PNG/PDF export handlers without runtime export changes.
- Reviewed the decision in [`visual-outputs-tab-alignment-pass-2026-07-10.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-outputs-tab-alignment-pass-2026-07-10.md).
- Next milestone: `Visual Outputs Tab Visual Polish Pass`.

### Visual Outputs Tab Visual Polish Pass (Completed)
- Enlarged the static preview compositions and reduced the side panel height.
- Replaced technical preview telemetry with owner-facing review summary language.
- Renamed the lower file generation section to `Actual export`.
- Preserved current export cards and handlers as the only active download path.
- Reviewed the decision in [`visual-outputs-tab-visual-polish-pass-2026-07-10.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-outputs-tab-visual-polish-pass-2026-07-10.md).
- Next milestone: `Owner Screenshot Review`.

### Visual Outputs Tab Owner Screenshot Review (Completed)
- Created the review gate in [`visual-outputs-tab-owner-screenshot-review-2026-07-10.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-outputs-tab-owner-screenshot-review-2026-07-10.md).
- Final status: `Pass for Visual Output Reviews`.
- No private screenshots or generated export artifacts are committed.
- Next milestone: `Classic Poster Owner Visual Review`.

### Classic Poster Owner Visual Review (Blocked)
- Reviewed the generated Classic Poster PDF (`شجرة أسلاف سليم النور.pdf`) as a real-tree owner output.
- Final status: `Blocked`.
- Blocking issues: broken Arabic PDF text rendering, sparse/empty pages, raw English `Family tree`, and a poster layout that does not show a meaningful tree.
- Recorded the decision in [`classic-poster-owner-visual-review-2026-07-10.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/classic-poster-owner-visual-review-2026-07-10.md).
- Next milestone: `Classic Poster PDF Renderer Fix Plan`.

### Visual Studio Renderer Pivot (Approved)
- Approved the product pivot in [`visual-studio-renderer-pivot-2026-07-10.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-studio-renderer-pivot-2026-07-10.md).
- Legacy Classic/Modern Poster downloads are paused for Limited Beta instead of being rescued through incremental fixes.
- The Visual Publishing Studio becomes the canonical path for the next poster renderer.
- Tree Snapshot remains available as the current non-poster visual export.
- Next milestone: `Visual Publishing Studio Poster Renderer v1 Plan`.

### Visual Publishing Studio Poster Renderer v1 Foundation (Started)
- Created the first Studio-owned poster renderer foundation in [`studioPosterRenderer.ts`](file:///d:/AppDEV/Jozor1.1/src/features/publishing/visualOutputs/studioPosterRenderer.ts).
- The renderer accepts only `VisualPreviewModel`, outputs UTF-8 HTML/CSS, supports RTL Arabic, escapes visible strings, and avoids canvas/SVG/script execution.
- Recorded the plan in [`visual-publishing-studio-poster-renderer-v1-plan-2026-07-10.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-publishing-studio-poster-renderer-v1-plan-2026-07-10.md).
- Next milestone: `Studio Poster Renderer v1 Preview Integration`.

### Studio Poster Renderer v1 Preview Integration (Completed)
- Integrated `renderStudioPosterHtml` into the Studio poster preview surface.
- Poster previews now render the v1 UTF-8 HTML/CSS document inside a sandboxed iframe.
- Snapshot previews remain unchanged.
- Reviewed the integration in [`visual-publishing-studio-poster-renderer-v1-preview-integration-2026-07-10.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-publishing-studio-poster-renderer-v1-preview-integration-2026-07-10.md).
- Next milestone: `Studio Poster Renderer v1 Export Adapter Planning`.

### Studio Poster Export Adapter Contract (Started)
- Added `studioPosterExportAdapter.ts` as the new export boundary for Studio poster PNG/PDF generation.
- The adapter accepts the v1 renderer output and an injected runtime, validates MIME types, and rejects empty outputs.
- No UI export actions are wired yet.
- Reviewed the plan in [`visual-publishing-studio-poster-export-adapter-planning-2026-07-10.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-publishing-studio-poster-export-adapter-planning-2026-07-10.md).
- Added `studioPosterBrowserPngRuntime.ts` as the first browser PNG runtime foundation using `html-to-image` inside a hidden iframe.
- Wired the runtime to a single active owner-review PNG action for Classic and Modern posters.
- Increased the poster preview slice to four generations / 15 people and aligned its root with the focused person.
- Reviewed the integration in [`visual-publishing-studio-owner-png-export-integration-2026-07-10.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-publishing-studio-owner-png-export-integration-2026-07-10.md).
- Next milestone: `Classic and Modern Studio PNG Owner Visual Review`, followed by `Studio Poster Controlled PDF Runtime`.

### Studio Poster Configuration Pass (Completed)
- Added compact owner controls for generation depth, A4/A3 size, portrait/landscape orientation, privacy masking, and available photos.
- Added a root-person selector using session-only UI tokens; raw database IDs remain inside the selector boundary.
- Bound every control to the shared selector, sanitizer, preview renderer, and PNG export path.
- Preserved birth/death years through the sanitized adapter and rendered them in person nodes.
- Corrected landscape preview framing without changing the RTL direction of the poster document.
- Reviewed the pass in [`visual-publishing-studio-poster-configuration-pass-2026-07-10.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-publishing-studio-poster-configuration-pass-2026-07-10.md).
- Next milestone: real-tree Classic/Modern Studio PNG owner review.

### Studio Poster Layout v2 (Completed)
- Replaced generic generation rows with a root-relative binary ancestor layout.
- Positioned the root below its ancestors and preserved missing branch space.
- Added calculated CSS connectors for every visible parent-child relationship.
- Kept Arabic RTL text independent from physical layout coordinates.
- Reviewed the renderer in [`visual-publishing-studio-poster-layout-v2-2026-07-11.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-publishing-studio-poster-layout-v2-2026-07-11.md).
- Next milestone: real-tree Classic/Modern PNG owner visual review.

### Studio Controlled Visual PDF Runtime (Implemented, Owner Review Pending)
- Added a one-page visual PDF runtime that reuses the Studio HTML/CSS composition through the high-DPI PNG runtime.
- PDF page size and orientation follow the active A4/A3 and portrait/landscape controls.
- Activated Studio PNG and PDF download actions while preserving the pause on the legacy poster PDF renderer.
- Kept the complete sanitizer and preview-model boundary in front of both output formats.
- Documented the runtime in [`visual-publishing-studio-controlled-visual-pdf-runtime-2026-07-11.md`](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-publishing-studio-controlled-visual-pdf-runtime-2026-07-11.md).
- Known boundary: the current PDF is visual/raster and is not searchable or copyable as structured Arabic text.
- Completed sanitized Classic/Modern visual QA for browser PNG and Poppler-rendered one-page PDF output.
- Corrected the physical print contract so A4/A3 PDFs use explicit millimeter dimensions rather than pixel-sized pages.
- Refined generation spacing, connector occlusion, single-year formatting, and the Arabic people-count footer from visual evidence.
- Added root-aware default titles, depth-aware subtitles, and owner-editable poster identity fields.
- Bound custom title/description copy to preview, PNG, PDF, and safe downloaded file names.
- Added adaptive heading sizes to protect poster composition from long owner-authored copy.
- Completed four-generation density QA with 15 people and 14 relationships in Classic and Modern themes.
- Completed the A4/A3 portrait/landscape PNG and PDF page matrix with correct physical dimensions.
- Replaced the misleading photo-word marker with name initials and a passive photo-availability ring.
- Clarified in the owner UI that image files are not embedded by the current sanitized renderer.
- Next milestone: owner visual review of real-tree Classic and Modern PNG/PDF artifacts.

### Current Engineering Closure

- **Implemented:** live sanitized store source, root selection, two-to-four generation depth, A4/A3, portrait/landscape, masked/owner privacy modes, photo-availability indicators, owner-authored title/description, Classic/Modern live preview, high-DPI PNG, and one-page controlled PDF.
- **Verified:** 15-node density, Arabic RTL output, Classic/Modern geometry, physical A4/A3 sizing, and PNG/PDF page matrix.
- **Intentionally deferred:** raw profile-image embedding, searchable/copyable structured PDF text, freeform margins, drag-and-drop editing, and arbitrary theme editing.
- **Only release gate remaining:** owner review of Classic and Modern PNG/PDF generated from the real family tree.
