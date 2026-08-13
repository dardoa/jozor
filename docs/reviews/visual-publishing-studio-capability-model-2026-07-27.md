# Visual Publishing Studio Phase 0A: Capability and Compatibility Model Audit

**Date:** July 27, 2026  
**Status:** Completed; runtime status aligned on August 13, 2026
**Author:** AI Agent (Antigravity Studio Architecture Audit)  
**Target Document:** `docs/reviews/visual-publishing-studio-capability-model-2026-07-27.md`  

---

## 1. Executive Summary

This document presents the Phase 0A architectural capability and compatibility audit for the **Visual Publishing Studio**. Runtime status statements were updated on August 13, 2026 after Focus, Radial, and Selected Branch activation; historical Phase 0A design findings remain identified as such.

### Key Audit Findings & Evidence Corrections
1. **Zero Runtime Modifications:** No code changes were made to runtime UI, `PosterScene`, renderers, export handlers, sanitizers, or file formats during Phase 0A.
2. **Standardized Capability Status Taxonomy:** All capabilities, layout engines, and product modes are strictly evaluated under 7 runtime statuses:
   - `runtime-supported-and-reachable`
   - `implemented-but-not-Studio-reachable`
   - `registry-advertised`
   - `quality-gated`
   - `planned`
   - `unassessed`
   - `incompatible` *(proven cases only)*
3. **Setting Inventory Category Totals (41 Settings Total):**
   - **Content (12):** `scope`, `generationDepth`, `privacyMode`, `showYears`, `showRelationship`, `showBirthPlace`, `showOccupation`, `showDescription`, `posterTitle`, `posterSubtitle`, `footerText`, `showJozorAttribution`.
   - **Layout (3):** `direction`, `spacing`, `layoutEngine`.
   - **Cards (8):** `includePhotos`, `hideLivingPhotos`, `photoShape`, `cardScale`, `cardEffect`, `cardFrame`, `cardCorner`, `cardLayout`.
   - **Appearance (9):** `connectorStyle`, `connectorPath`, `colorPalette`, `decoration`, `ornament`, `typography`, `fontFamily`, `pageFrame`, `header`.
   - **Print (3):** `size`, `orientation`, `marginPreset`.
   - **Advanced (1):** `colorOverrides`.
   - **Contextual-Only (5):** `selectedPosterRootToken` (primary contextual Content control), `tiledRows`, `tiledColumns`, `tiledSheetSize`, `tiledOverlapMm`.
4. **Engine Reachability Audit:**
   - `ancestor-tiered`, `descendant-tiered`, `full-tree-overview`, `branch-index-grid`, `focus-family`, and `radial-generations` are `runtime-supported-and-reachable` for their supported scopes.
   - `family-network-tiered` is `implemented-but-not-Studio-reachable` (engine code exists in `familyNetworkPosterLayout.ts`, but `createPosterScene` layout resolution never selects it from current Studio scope choices).
5. **Radial & Focus Status:**
   - **Focus:** `focusFamilyPosterLayout.ts` is registered in `PosterScene`, selectable in the Studio, and exports through the canonical SVG/PNG/PDF path for `around-person` scope.
   - **Radial:** `radialGenerationsPosterLayout.ts` is registered in `PosterScene`, selectable in the Studio, and exports through the canonical SVG/PNG/PDF path for ancestor and descendant scopes. Full-tree Radial and Radial Tiled Wall remain `unassessed`.
   - **Selected Branch:** The Studio exposes `selected-branch`; it uses the selected opaque root token, includes descendants and in-branch spouses, and renders with `descendant-tiered`.
6. **Export Runtime Correction:**
   - `studioPosterBrowserPngRuntime` allocates **a single HTML5 Canvas element** for rasterization. It does NOT perform transparent chunked PNG rasterization.
   - `posterPrintQuality` evaluates DPI and estimated memory footprint, issuing warnings or blocking high-DPI allocations.
   - `tiled-wall` export is a distinct product assembly pipeline (ZIP archive of sliced PDF/SVG tile documents), not PNG canvas chunking.

---

## 2. Current Setting Inventory & Information Architecture Classification

Every setting currently defined in `VisualOutputConfigPanel.tsx`, `visualStudioPosterOptions.ts`, `VisualPublishingStudio.tsx`, `visualOutputRegistry.ts`, and `posterSceneTypes.ts` has been cataloged and reclassified under the approved Phase 0B UX structure:

| # | Setting Key | Data Type / Options | Source File | IA Section / Category | Description & Reclassification |
|---|---|---|---|---|---|
| 1 | `selectedDefinitionId` | `classic-ancestor-poster`, `modern-ancestor-poster`, `dense-genealogy-poster`, `current-tree-snapshot` | `VisualPublishingStudio.tsx` | **Quick Setup / Template & Mode** | Primary visual output template selector |
| 2 | `scope` | `ancestors`, `descendants`, `selected-branch`, `full-tree`, `around-person` | `posterStateContracts.ts` | **Content & Scope** | Tree scope strategy; `around-person` is selected atomically by Focus mode |
| 3 | `generationDepth` | `1`, `2`, `3`, `4`, `'all'` | `visualStudioPosterOptions.ts` | **Content & Scope** | Depth of generations rendered |
| 4 | `privacyMode` | `masked`, `owner-full` | `visualStudioPosterOptions.ts` | **Content & Scope** | Masking living/private individuals |
| 5 | `showYears` | `boolean` | `visualStudioPosterOptions.ts` | **Content & Scope** | Birth and death years display toggle |
| 6 | `showRelationship` | `boolean` | `visualStudioPosterOptions.ts` | **Content & Scope** | Relationship hint label toggle |
| 7 | `showBirthPlace` | `boolean` | `visualStudioPosterOptions.ts` | **Content & Scope** | Birthplace text display toggle |
| 8 | `showOccupation` | `boolean` | `visualStudioPosterOptions.ts` | **Content & Scope** | Occupation text display toggle |
| 9 | `showDescription` | `boolean` | `visualStudioPosterOptions.ts` | **Content & Scope** | Short description text display toggle |
| 10 | `posterTitle` | `string` (max 60 chars) | `VisualOutputConfigPanel.tsx` | **Content & Scope** | Custom poster title text |
| 11 | `posterSubtitle` | `string` (max 100 chars) | `VisualOutputConfigPanel.tsx` | **Content & Scope** | Custom poster subtitle text |
| 12 | `footerText` | `string` (max 80 chars) | `visualStudioPosterOptions.ts` | **Content & Scope** | Custom poster footer text |
| 13 | `showJozorAttribution` | `boolean` | `visualStudioPosterOptions.ts` | **Content & Scope** | "Created in Jozor" branding toggle |
| 14 | `direction` | `vertical`, `horizontal` | `visualStudioPosterOptions.ts` | **Layout** | Primary flow direction of tree layout |
| 15 | `spacing` | `style-default`, `compact`, `balanced`, `airy` | `visualStudioPosterOptions.ts` | **Layout** | Node spacing density |
| 16 | `layoutEngine` | `ancestor-tiered`, `descendant-tiered`, `full-tree-overview`, `branch-index-grid`, `focus-family`, `radial-generations` | `posterSceneTypes.ts` | **Derived runtime capability** | Resolved from scope/product mode; documented for compatibility analysis but not counted as a user-owned setting |
| 17 | `includePhotos` | `boolean` | `visualStudioPosterOptions.ts` | **Cards** | Master toggle for profile photo visibility |
| 18 | `hideLivingPhotos` | `boolean` | `visualStudioPosterOptions.ts` | **Cards** | Selective photo hiding for living individuals |
| 19 | `photoShape` | `circle`, `square`, `rounded` | `visualStudioPosterOptions.ts` | **Cards** | Profile photo crop geometry |
| 20 | `cardScale` | `compact`, `standard`, `large` | `visualStudioPosterOptions.ts` | **Cards** | Person card physical scaling |
| 21 | `cardEffect` | `style-default`, `flat`, `soft`, `elevated` | `visualStudioPosterOptions.ts` | **Cards** | Card depth and drop-shadow styling |
| 22 | `cardFrame` | `style-default`, `minimal`, `classic`, `ornate` | `visualStudioPosterOptions.ts` | **Cards** | Card border frame styling |
| 23 | `cardCorner` | `style-default`, `square`, `soft`, `rounded` | `visualStudioPosterOptions.ts` | **Cards** | Card border radius geometry |
| 24 | `cardLayout` | `style-default`, `standard`, `photo-focused`, `text-minimal` | `visualStudioPosterOptions.ts` | **Cards** | Inner card element arrangement |
| 25 | `connectorStyle` | `subtle`, `classic`, `bold` | `visualStudioPosterOptions.ts` | **Appearance** | Relationship stroke weight and opacity |
| 26 | `connectorPath` | `style-default`, `straight`, `orthogonal`, `curved` | `visualStudioPosterOptions.ts` | **Appearance** | Generation line path geometry |
| 27 | `colorPalette` | `style-default`, `heritage-warm`, `gallery-dark`, `evergreen`, `monochrome-print` | `visualStudioPosterOptions.ts` | **Appearance** | Curated color theme palette |
| 28 | `decoration` | `style-default`, `clean`, `paper-grain`, `lineage-grid` | `visualStudioPosterOptions.ts` | **Appearance** | Background texture treatment |
| 29 | `ornament` | `style-default`, `none`, `lineage-medallion`, `gallery-marks`, `corner-branches` | `visualStudioPosterOptions.ts` | **Appearance** | Decorative header/corner accents |
| 30 | `typography` | `balanced`, `prominent`, `compact` | `visualStudioPosterOptions.ts` | **Appearance** | Text sizing density preset |
| 31 | `fontFamily` | `style-default`, `amiri`, `noto-sans-arabic`, `noto-kufi-arabic` | `visualStudioPosterOptions.ts` | **Appearance** | Typography font family |
| 32 | `pageFrame` | `style-default`, `none`, `minimal`, `heritage`, `gallery` | `visualStudioPosterOptions.ts` | **Appearance** | Outer poster border frame styling |
| 33 | `header` | `style-default`, `ceremonial`, `gallery-rail`, `registry` | `visualStudioPosterOptions.ts` | **Appearance** | Poster header layout composition |
| 34 | `size` | `A4`, `A3`, `A2`, `A1`, `A0` | `visualStudioPosterOptions.ts` | **Print** | Physical poster page size |
| 35 | `orientation` | `portrait`, `landscape` | `visualStudioPosterOptions.ts` | **Print** | Page orientation |
| 36 | `marginPreset` | `compact`, `balanced`, `generous` | `visualStudioPosterOptions.ts` | **Print** | Print margin width preset |
| 37 | `colorOverrides` | `{ background?, cardBackground?, accent?, connector? }` | `visualStudioPosterOptions.ts` | **Advanced** | Custom hex color overrides |
| 38 | `selectedPosterRootToken` | opaque session token | `VisualOutputConfigPanel.tsx` | **Contextual-only** | Session-owned Root/Anchor selection; raw person IDs never enter React controls or PosterScene |
| 39 | `tiledRows` | `number` (2..6) | `visualStudioPosterOptions.ts` | **Contextual-only** | Vertical tile count (Active when `scope === 'full-tree'`) |
| 40 | `tiledColumns` | `number` (2..6) | `visualStudioPosterOptions.ts` | **Contextual-only** | Horizontal tile count (Active when `scope === 'full-tree'`) |
| 41 | `tiledSheetSize` | `A4`, `A3`, `A2` | `visualStudioPosterOptions.ts` | **Contextual-only** | Physical tile sheet size (Active when `scope === 'full-tree'`) |
| 42 | `tiledOverlapMm` | `6`, `8`, `10`, `12` (mm) | `visualStudioPosterOptions.ts` | **Contextual-only** | Tile overlap seam width (Active when `scope === 'full-tree'`) |

### Category Totals Summary
- **Content:** 12
- **Layout:** 2
- **Cards:** 8
- **Appearance:** 9
- **Print:** 3
- **Advanced:** 1
- **Contextual-only:** 5
- **Quick Setup / Template & Mode:** 1
- **Total User-Owned Settings Cataloged:** 41
- **Additional Derived Runtime Capabilities Documented:** 1 (`layoutEngine`)

---

## 3. Conceptual Separation: Product Modes vs. Independent Layout Engine IDs vs. Tree Scopes

Architecturally, three distinct concepts must be decoupled. Invented placeholder categories (such as `clustered/planned`) are removed in favor of listing actual independent engine IDs:

```
+-----------------------------------------------------------------------------------+
|                               POSTER PRODUCT MODES                                |
|  (Outputs: detailed-poster | full-tree-overview | branch-collection | tiled-wall)  |
+------------------------------------------+----------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------+
|                            INDEPENDENT LAYOUT ENGINES                             |
|  - ancestor-tiered          (runtime-supported-and-reachable)                    |
|  - descendant-tiered        (runtime-supported-and-reachable)                    |
|  - family-network-tiered    (implemented-but-not-Studio-reachable)               |
|  - full-tree-overview       (runtime-supported-and-reachable)                    |
|  - branch-index-grid        (runtime-supported-and-reachable via collection)     |
|  - focus-family             (runtime-supported-and-reachable)                    |
|  - radial-generations       (runtime-supported-and-reachable)                    |
+------------------------------------------+----------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------+
|                                  TREE SCOPES                                      |
|  (Studio UI: ancestors | descendants | selected-branch | full-tree | around-person)|
+-----------------------------------------------------------------------------------+
```

1. **Poster Product Modes (Document Assembly Output Formats):**
   - `detailed-poster`: Single-page high-detail poster focused on a specific root hierarchy.
   - `full-tree-overview`: Single-page overview of an entire family graph using micro-cards (`dense-overview`).
   - `branch-collection`: Multi-poster ZIP package (overview poster + individual branch posters).
   - `tiled-wall`: Multi-sheet printable grid (e.g., 3×3 A3 sheets) assembled into a large physical wall poster.

2. **Independent Layout Engines (Spatial Calculators):**
   - `ancestor-tiered`: Binary ancestor tree layout per generation tier.
   - `descendant-tiered`: Multi-child descendant tree layout per generation tier.
   - `family-network-tiered`: Multi-generational network layout in aligned generation rows.
   - `full-tree-overview`: Compact grid layout for full-tree overview posters.
   - `branch-index-grid`: Grid layout engine for index/overview pages in branch collections.
   - `focus-family`: Bi-directional runtime layout centered on a focal person.
   - `radial-generations`: Runtime concentric polar generation ring layout for ancestor and descendant scopes.

3. **Tree Scopes (Sub-graph Data Extraction):**
   - `ancestors`: Direct parent lines going backward from root. Selectable in Studio UI.
   - `descendants`: Direct child lines going forward from root. Selectable in Studio UI.
   - `full-tree`: Complete connected family graph. Selectable in Studio UI (resolves to `full-tree-overview` engine).
   - `selected-branch`: Selectable sub-tree rooted at an opaque session token. Includes descendants and spouses attached to people in the selected lineage.

---

## 4. Runtime Capability Audit & Code Reachability Analysis

Detailed verification of actual code execution paths across definitions, layout engines, and export runtimes:

| Capability / Engine | Code Path / File | Standardized Capability Status | Audit Notes & Reachability Finding |
|---|---|---|---|
| **Classic Ancestor Poster** | `visualOutputRegistry.ts`, `posterSceneBuilder.ts` | `runtime-supported-and-reachable` | Active in Studio UI. Generates `classic-heritage` scenes and exports SVG/PNG/PDF. |
| **Modern Gallery Poster** | `visualOutputRegistry.ts`, `posterSceneBuilder.ts` | `runtime-supported-and-reachable` | Active in Studio UI. Generates `modern-gallery` scenes and exports SVG/PNG/PDF. |
| **Dense Genealogy Poster** | `visualOutputRegistry.ts`, `posterSceneBuilder.ts` | `registry-advertised` / `quality-gated` | Advertised as `status: 'experimental'` in registry. Reachable in Studio UI, but uses tiered engine with compact cards. |
| **Current Tree Snapshot** | `visualOutputRegistry.ts`, `previewLiveGraphSelectors.ts` | `runtime-supported-and-reachable` | Active snapshot definition for viewport export. |
| **`ancestor-tiered` Engine** | `ancestorTieredPosterLayout.ts` | `runtime-supported-and-reachable` | Selected when `scope === 'ancestors'`. Calculates binary ancestor tree tiers. |
| **`descendant-tiered` Engine** | `descendantTieredPosterLayout.ts` | `runtime-supported-and-reachable` | Selected when `scope === 'descendants'`. Calculates multi-child descendant tiers. |
| **`family-network-tiered` Engine** | `familyNetworkPosterLayout.ts` | `implemented-but-not-Studio-reachable` | Code exists and is unit-tested. However, `posterSceneBuilder.ts` (`createLayoutSpec`) never selects `family-network-tiered` from Studio UI scope choices. |
| **`full-tree-overview` Engine** | `fullTreeOverviewPosterLayout.ts` | `runtime-supported-and-reachable` | Selected when `scope === 'full-tree'`. Renders condensed micro-cards (`dense-overview`). |
| **`branch-index-grid` Engine** | `branchIndexPosterLayout.ts` | `runtime-supported-and-reachable` | Executed internally during `branch-collection` export to build the collection index poster. |
| **`focus-family` Engine** | `focusFamilyPosterLayout.ts` | `runtime-supported-and-reachable` | Active for `around-person`; consumes a sanitized focus graph and emits canonical PosterScene geometry. |
| **`radial-generations` Engine** | `radialGenerationsPosterLayout.ts` | `runtime-supported-and-reachable` | Active for ancestor/descendant scopes with 180-degree and 360-degree compositions; capacity failures block export. |
| **Branch Collection Export** | `branchPosterCollectionExport.ts` | `runtime-supported-and-reachable` | Assembles ZIP containing overview poster + individual branch posters. |
| **Tiled Wall Export** | `tiledWallPosterExport.ts` | `quality-gated` | Assembles ZIP of multi-sheet grid tiles; quality gate checks tile utilization and minimum text size. |

---

## 5. Compatibility Matrix: Product Mode × Layout Engine × Scope × Page Size × Detail Preset

Legend of Standardized Statuses:
- `runtime-supported-and-reachable`: Active and selectable in Studio UI and export runtimes.
- `implemented-but-not-Studio-reachable`: Engine or data layer code exists, but no UI path activates it.
- `quality-gated`: Supported, but requires print quality evaluation (warns if font size < 8pt or cards overlap).
- `planned`: Committed implementation milestone after Phase 0B mockup approval.
- `unassessed`: Requires prototype evidence before confirming compatibility.
- `incompatible`: Proven impossible or invalid.

| Product Mode | Layout Engine ID | Scope | Page Size | Detail Preset | Capability Status | Rationale, Discrepancies & Quality Gate Conditions |
|---|---|---|---|---|---|---|
| `detailed-poster` | `ancestor-tiered` | `ancestors` | A4, A3, A2, A1, A0 | Classic Heritage | `runtime-supported-and-reachable` | Fully active ancestor poster pipeline. |
| `detailed-poster` | `ancestor-tiered` | `ancestors` | A4, A3, A2, A1, A0 | Modern Gallery | `runtime-supported-and-reachable` | Modern Gallery registry and Studio both expose the same page-size range. |
| `detailed-poster` | `descendant-tiered` | `descendants` | A4, A3, A2, A1, A0 | Classic Heritage | `runtime-supported-and-reachable` | Fully active descendant poster pipeline. |
| `detailed-poster` | `descendant-tiered` | `descendants` | A4, A3, A2, A1, A0 | Modern Gallery | `runtime-supported-and-reachable` | Modern Gallery is active across the declared page-size range. |
| `detailed-poster` | `descendant-tiered` | `selected-branch` | A4, A3, A2, A1, A0 | Classic Heritage, Modern Gallery, Dense Genealogy | `runtime-supported-and-reachable` | Active Studio scope using opaque root tokens, descendants, and in-branch spouses. |
| `detailed-poster` | `focus-family` | `around-person` | A4, A3, A2, A1, A0 | Classic Heritage, Modern Gallery | `runtime-supported-and-reachable` | Active Focus runtime with independent ancestor/descendant depth and relation toggles. |
| `detailed-poster` | `radial-generations` | `ancestors`, `descendants` | A4, A3, A2, A1, A0 | Classic Heritage, Modern Gallery | `runtime-supported-and-reachable` | Active Radial runtime; print quality and geometric capacity can block invalid combinations. |
| `detailed-poster` | `ancestor-tiered` / `descendant-tiered` | `ancestors`, `descendants` | A4 | Classic Heritage, Modern Gallery | `quality-gated` | Large tree on A4 sheet drops font below 6pt; triggers quality gate warning/block. |
| `full-tree-overview` | `full-tree-overview` | `full-tree` | A3, A2, A1, A0 | Dense Genealogy | `runtime-supported-and-reachable` | `scope === 'full-tree'` in Studio resolves directly to `full-tree-overview` engine with micro-cards (`dense-overview`). |
| `full-tree-overview` | `radial-generations` | `full-tree` | A2, A1, A0 | Modern Gallery | `unassessed` | Requires prototype evidence to assess whether non-directional full-tree graphs can be mapped into radial sectors without arc collision. |
| `branch-collection` | `branch-index-grid` + `ancestor-tiered` / `descendant-tiered` | `full-tree` | A4, A3, A2 | Classic Heritage, Modern Gallery, Dense Genealogy | `runtime-supported-and-reachable` | Active ZIP export of index poster + individual branch posters. |
| `branch-collection` | `focus-family` | `full-tree` | A4, A3 | Classic Heritage | `planned` | Focus-based branch collection export. |
| `tiled-wall` | `full-tree-overview` / `ancestor-tiered` | `full-tree` | A4, A3, A2 (per sheet) | Classic Heritage, Modern Gallery, Dense Genealogy | `quality-gated` | Active ZIP export of sliced printable tile sheets. Quality gate evaluates edge sheet utilization & minimum text size. |
| `tiled-wall` | `radial-generations` | `full-tree` | A4, A3 (per sheet) | Modern Gallery | `unassessed` | Requires prototype evidence to assess seam alignment and trimming precision when radial curved arcs cross rectangular page tile boundaries. |

### Registry Declarations vs. Actual Studio Runtime Notes
1. **Modern Gallery Supported Page Sizes:** Registry `supportedSizes` and `capabilities.sizes` are aligned to A4 through A0.
2. **`family-network-tiered` Engine Reachability:**
   - **Registry `layoutEngine`:** Listed in `capabilities.layoutEngines`.
   - **Studio UI / Builder Behavior:** `posterSceneBuilder.ts` `createLayoutSpec` only assigns `full-tree-overview`, `descendant-tiered`, or `ancestor-tiered`. `family-network-tiered` is unreachable from current Studio UI options.
3. **`selected-branch` Scope:** Registry definitions declare `selected-branch`, the Studio exposes it, and runtime mapping resolves it to a sanitized `descendant-tiered` scene.

---

## 6. PNG Export Memory & Rasterization Technical Corrections

A thorough audit of `studioPosterBrowserPngRuntime.ts` and `posterPrintQuality.ts` establishes the exact technical behavior of PNG rasterization:

1. **Single Canvas Allocation:** `studioPosterBrowserPngRuntime.ts` allocates **a single HTML5 `<canvas>` element** (lines 41 & 69) matching the target physical dimensions scaled by `pixelRatio`.
2. **No Transparent PNG Chunking:** The current PNG export runtime does NOT perform chunked rasterization, tile slicing, or multi-canvas stitching.
3. **Memory Footprint & Print Quality Gate:**
   - `posterPrintQuality.ts` calculates `estimatedMemoryBytes = outputWidth * outputHeight * 4`.
   - If estimated memory exceeds safety thresholds or effective DPI drops below print targets, `evaluatePosterPrintQuality()` flags a warning or blocks export.
4. **Tiled Wall Export Pipeline:** `tiledWallPosterExport.ts` is a **separate product assembly pipeline** that generates a ZIP archive containing individual PDF/SVG tile documents. It is NOT transparent canvas chunking for large single PNGs.

---

## 7. Focus and Radial Specific Audit Findings

### Focus Engine Audit Findings
1. **Current Code Status:** `focusFamilyPosterLayout.ts` implements the production Focus engine and is registered by `posterSceneBuilder.ts`.
2. **Data Boundary:** `previewFocusGraphSelector.ts` selects from the complete source graph behind the opaque person-token catalog, then sanitizes before layout.
3. **Studio Controls:** Focal person, independent ancestor/descendant depths, spouses, and siblings are active. Switching modes preserves scoped settings.
4. **Geometry and Export:** The focal card remains centered; capacity errors are controlled; Preview, SVG, PNG, and PDF consume the same PosterScene.

### Radial Engine Audit Findings
1. **Current Code Status:** `radialGenerationsPosterLayout.ts` implements the production Radial engine and is registered by `posterSceneBuilder.ts`.
2. **Runtime Reachability:** The Studio exposes Radial/Fan for ancestor and descendant scopes, with 180-degree and 360-degree compositions and radial-specific controls.
3. **Evidence:** Runtime, accessibility, responsive, artifact, privacy, and owner-review evidence covers supported radial scenarios. Capacity guidance blocks unsupported density.
4. **Open Questions Outside the Supported Runtime:**
   - **Full-Tree Radial Mapping:** How non-directional full-tree graphs map into concentric polar sectors without arc collisions.
   - **Tiled Wall Seam Alignment:** How curved radial arc sectors slice across rectangular page tile boundaries and align when printed and trimmed.
   - **Arabic Label Orientation:** Prototype straight, tangential, and curved placement; do not require SVG `<textPath>` unless Arabic shaping and print readability remain reliable.

---

## 8. State Ownership & Approved Phase 0B UX Alignment

To support switching between visual modes without configuration loss, the studio state model follows a 4-tier ownership hierarchy:

```
+-----------------------------------------------------------------------------------+
| 1. GLOBAL STUDIO STATE                                                            |
| (language, previewSourceMode, activeSection, undo/redo history)                   |
+------------------------------------------+----------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------+
| 2. SHARED POSTER OPTIONS                                                          |
| (posterTitle, posterSubtitle, footerText, privacyMode, colorPalette, fontFamily)  |
+------------------------------------------+----------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------+
| 3. MODE-SCOPED OPTIONS BUCKETS                                                    |
| {                                                                                 |
|   'ancestor-tiered': { generationDepth, direction, cardScale, ... },              |
|   'full-tree-overview': { tiledRows, tiledColumns, tiledSheetSize, ... },          |
|   'focus-family': { ancestorDepth, descendantDepth, includeSiblings, ... },       |
|   'radial-generations': { arcSpanDegrees, ringSpacing, ... }                      |
| }                                                                                 |
+------------------------------------------+----------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------+
| 4. PRESET BASELINE + USER OVERRIDES                                               |
| (Active Preset = 'classic-heritage' | 'modern-gallery' | 'custom')                   |
| (User Overrides = Partial<VisualStudioPosterOptions> delta mask)                   |
+-----------------------------------------------------------------------------------+
```

### Approved Phase 0B UX Structure (Non-Accordion-Only)
Phase 0B adopts a flexible layout with:
- **6 Structured Sections:** Quick Setup, Content, Layout, Cards, Appearance, Print.
- **Desktop Responsive Layout:** Sticky live preview pane on the side with full controls panel.
- **Mobile Responsive Layout:** Compact expandable/collapsible top preview bar.
- **Contextual Disclosure:** Tiled wall controls revealed only when `scope === 'full-tree'`; Root/Anchor person selector revealed as primary contextual Content control.
- **Persistent Print-Quality Summary:** Sticky status bar showing DPI, minimum estimated font size pt, tile sheet count, and warnings.

---

## 9. Initial Preset Contract Proposal

### 1. Classic Heritage (`classic-heritage`)
- **Aesthetic Goal:** Warm, traditional family record poster for elegant printing and archiving.
- **Color Palette:** `heritage-warm` (Background `#f4ead8`, Cards `#fffaf0`, Accent `#a86f35`, Connectors `#8d6d4e`).
- **Typography & Font:** Font Family `amiri` (Naskh calligraphic style), `balanced` density.
- **Card Geometry:** `classic` frame, `soft` corners (6px border radius), `standard` layout, `soft` drop shadow.
- **Decoration & Ornament:** `paper-grain` background texture, `lineage-medallion` header ornament, `heritage` page frame.
- **Header Composition:** `ceremonial` centered layout.
- **Connector Lines:** `classic` stroke weight with `curved` or `orthogonal` paths.

### 2. Modern Gallery (`modern-gallery`)
- **Aesthetic Goal:** Clean, contemporary gallery presentation suitable for modern home interiors.
- **Color Palette:** `gallery-dark` (Background `#151918`, Cards `#202622`, Accent `#d8a85f`, Connectors `#86a69d`).
- **Typography & Font:** Font Family `noto-sans-arabic` (Clean modern sans-serif), `balanced` density.
- **Card Geometry:** `minimal` frame, `rounded` corners (18px border radius), `photo-focused` layout, `elevated` drop shadow.
- **Decoration & Ornament:** `clean` solid background, `gallery-marks` ornament, `gallery` page frame.
- **Header Composition:** `gallery-rail` sleek horizontal header.
- **Connector Lines:** `subtle` thin stroke weight with `straight` paths.

---

## 10. Complete Mockup State Specifications (Focus & Radial)

### Focus Family Mode Mockup State
- **Primary Controls:**
  - Focal Person Picker (`selectedPosterRootToken`) with search autocomplete.
  - Dual Generation Sliders: Ancestors Depth (1..3) & Descendants Depth (1..3).
  - Relation Toggles: Include Current Spouse(s), Include Siblings, Include In-Laws.
  - Focal Card Styling: Accent Border Glow, Larger Card Scale (+15%), Prominent Name Font.
- **Preview Display:** Focal person prominently centered at $(X_c, Y_c)$, parents above, children below, spouse adjacent, siblings flanking.

### Radial Generations Mode Mockup State (Committed Production Milestone)
- **Primary Controls:**
  - Root Ancestor / Focal Person Picker (`selectedPosterRootToken`).
  - Ring Generation Limit Slider (1..6 rings).
  - Sector Angle Span: Full 360° Circle, 180° Half Fan, 90° Quarter Arc.
  - Ring Spacing Density: `compact`, `balanced`, `airy`.
  - Arc Label Orientation: Radial Centered, Tangential Curved Along Arc.
- **Preview Display:** Concentric generation rings radiating from center root card, vector arc connectors, curved text labels along sector bounds.
- **Owner Review Note:** Both Focus and Radial mockup states are fully specified for Owner Mockup Review. Engine implementation order will be determined during Owner Mockup Review based on prototype evidence.

---

## 11. High Technical Risks & Implementation Requirements

Implementation risk for both **Focus** and **Radial** engines is classified as **HIGH**. The following 7 technical requirements must be solved with prototype evidence:

| # | Technical Area | Focus Engine Requirement | Radial Engine Requirement |
|---|---|---|---|
| 1 | **Graph Selector** | Bi-directional sub-graph extraction (ancestors + descendants + spouses + siblings around focal ID). | Concentric generation ring sub-graph extraction with sector angle allocation. |
| 2 | **Layout Mathematics** | 2D bi-directional coordinate positioning with collision avoidance for spouses and siblings. | Polar coordinate transformation $(r_g, \theta_i) \rightarrow (x, y)$ with dynamic wedge width calculation. |
| 3 | **PosterScene Geometry** | Non-rectangular bounding box calculation and page margin collision checks. | Polar bounding box calculation, outer ring margin clipping, and center anchor offset. |
| 4 | **Connector Routing** | Orthogonal/straight lines routing around focal card and spouse pairs without overlaps. | Concentric arc splines and radial ray connectors drawing smoothly between sector rings. |
| 5 | **Arabic Labels** | Multi-line text fitting within compact horizontal/vertical cards. | SVG `<textPath>` curved Arabic Naskh/Kufi text rendering along tight inner vs. outer radii. |
| 6 | **Print Quality Evaluation** | Evaluating card overlap pairs and min text size across multi-directional branches. | Radius-dependent DPI and text legibility evaluation (inner rings vs. outer rings). |
| 7 | **Preview / Export Parity** | Ensuring SVG preview, browser PNG canvas render, and PDF vector export match identically. | Ensuring curved SVG arcs and `<textPath>` labels render identically in PDF and PNG canvas. |

---

## 12. Audit Metadata and Verification Log

### Files Inspected (29 files)
1. `src/features/the-vault/components/visual-studio/VisualOutputConfigPanel.tsx`
2. `src/features/the-vault/components/visual-studio/visualStudioPosterOptions.ts`
3. `src/features/the-vault/components/visual-studio/VisualPublishingStudio.tsx`
4. `src/features/the-vault/components/visual-studio/VisualOutputActionBar.tsx`
5. `src/features/the-vault/components/visual-studio/VisualOutputPreviewPane.tsx`
6. `src/features/the-vault/components/visual-studio/VisualOutputReadinessNotice.tsx`
7. `src/features/publishing/visualOutputs/visualOutputRegistry.ts`
8. `src/features/publishing/visualOutputs/visualOutputTypes.ts`
9. `src/features/publishing/visualOutputs/posterSceneTypes.ts`
10. `src/features/publishing/visualOutputs/posterSceneBuilder.ts`
11. `src/features/publishing/visualOutputs/ancestorTieredPosterLayout.ts`
12. `src/features/publishing/visualOutputs/descendantTieredPosterLayout.ts`
13. `src/features/publishing/visualOutputs/familyNetworkPosterLayout.ts`
14. `src/features/publishing/visualOutputs/fullTreeOverviewPosterLayout.ts`
15. `src/features/publishing/visualOutputs/branchIndexPosterLayout.ts`
16. `src/features/publishing/visualOutputs/branchPosterCollection.ts`
17. `src/features/publishing/visualOutputs/branchPosterCollectionExport.ts`
18. `src/features/publishing/visualOutputs/tiledWallPoster.ts`
19. `src/features/publishing/visualOutputs/tiledWallPosterExport.ts`
20. `src/features/publishing/visualOutputs/posterDocumentSpecs.ts`
21. `src/features/publishing/visualOutputs/posterPrintQuality.ts`
22. `src/features/publishing/visualOutputs/previewGraphSelectorRegistry.ts`
23. `src/features/publishing/visualOutputs/previewGraphSelectorTypes.ts`
24. `src/features/publishing/visualOutputs/previewLiveGraphSelectors.ts`
25. `src/features/publishing/visualOutputs/previewFixtureGraphSelectors.ts`
26. `src/features/publishing/visualOutputs/previewLiveSourceMapper.ts`
27. `src/types/visualization.ts`
28. `src/utils/layout.worker.ts`
29. `src/utils/layout/radialLayout.ts`

### Phase 1A Implemented State & Contract Foundation Locations
30. `src/features/publishing/visualOutputs/posterStateContracts.ts` (Core state types: `PosterProductMode`, `PosterLayoutMode`, `PosterTreeScope`, `SharedPosterSettings`, `TieredSettingsBucket`, `FocusSettingsBucket`, `RadialSettingsBucket`, `ProductModeSettingsBucket`, `PosterDesignState`, `PosterPresetDefinition`)
31. `src/features/publishing/visualOutputs/posterPresets.ts` (Preset definitions: `classic-heritage`, `modern-gallery`)
32. `src/features/publishing/visualOutputs/posterCompatibilityModel.ts` (Reachability taxonomy, quality gate query, applicable control sections)
33. `src/features/publishing/visualOutputs/posterDesignState.ts` (Pure state transitions, preset overrides, layout bucket preservation, section resets, bounded 20-snapshot `PosterHistoryManager`)
34. `src/features/publishing/visualOutputs/posterDesignDocument.ts` (Versioned `1.0` serializable document, safety validator preventing raw IDs, storage URLs, or image payloads)
35. `src/features/publishing/visualOutputs/__tests__/posterDesignStateFoundation.test.ts` (Phase 1A Vitest unit test suite)


### Commands Executed
- `git status` (verified working tree state before and after)
- `git diff --stat` (inspected pre-existing uncommitted modifications)
- `npm run typecheck` (validated TypeScript compilation: 0 errors)
- `git diff --check` (verified zero whitespace/line-ending issues)

### Pre-existing Uncommitted Changes Report
Before Phase 0A audit execution, 4 files contained uncommitted changes from prior work:
1. `src/features/the-vault/components/visual-studio/VisualOutputConfigPanel.tsx` (+90, -2 lines)
2. `src/features/the-vault/components/visual-studio/__tests__/VisualPublishingStudio.test.tsx` (+7 lines)
3. `tests/e2e/visual-studio-accessibility.spec.ts` (+16 lines)
4. `tests/e2e/visual-studio-responsive.spec.ts` (+20 lines)

All 4 uncommitted files were strictly preserved and left untouched.

### Git Status After Audit
```
On branch main
Your branch is up to date with 'origin/main'.

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   src/features/the-vault/components/visual-studio/VisualOutputConfigPanel.tsx
	modified:   src/features/the-vault/components/visual-studio/__tests__/VisualPublishingStudio.test.tsx
	modified:   tests/e2e/visual-studio-accessibility.spec.ts
	modified:   tests/e2e/visual-studio-responsive.spec.ts

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	docs/reviews/visual-publishing-studio-capability-model-2026-07-27.md

no changes added to commit (use "git add" and/or "git commit -a")
```

### Confirmation of Zero Runtime Changes & No Commit
- **Zero Runtime Code Changes:** Confirmed. No runtime code files (`src/`, `PosterScene`, renderers, export handlers, sanitizers, or file formats) were modified, added, or deleted during Phase 0A.
- **Zero Git Commits:** Confirmed. No `git commit` command was issued. The only created artifact is the requested documentation file `docs/reviews/visual-publishing-studio-capability-model-2026-07-27.md`.
