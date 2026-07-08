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

### Phase 1: Studio Shell (Completed)
- Created the isolated component structure (`VisualPublishingStudio` composing `VisualOutputPreviewPane`, `VisualOutputConfigPanel`, `VisualOutputActionBar`, and `VisualOutputReadinessNotice`).
- Integrated into `ExportCloudPanel.tsx` but kept hidden from the production flow behind a disabled scaffold constant (`SHOW_VISUAL_STUDIO_SHELL = false`).
- Added full unit test suite `VisualPublishingStudio.test.tsx` verifying Scaffolding render behavior in English/Arabic.
- Verified that the current Visual Outputs cards remain active and unchanged.

### Phase 2: Live Preview
- Integrate dynamic SVG/Canvas rendering in the Preview Pane.
- Refresh preview on demand when tree settings or root person changes.

### Phase 3: Product-Specific Controls
- Add controls for customized margins, orientation toggle, and generation scope sliders.

### Phase 4: Advanced Customization
- Implement interactive nodes selection, PDF print margins, and theme preset overrides.
