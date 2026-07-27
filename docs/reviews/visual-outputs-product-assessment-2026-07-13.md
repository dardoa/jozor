# Visual Outputs Product Assessment

**Date:** July 13, 2026
**Status:** `Assessment Complete / Implementation Not Started`
**Scope:** Visual Publishing Studio, Classic/Modern poster outputs, and Tree Snapshot product boundaries.

## Executive Decision

Visual Publishing Studio is a viable foundation for a real poster-authoring product, but the current poster renderer is not yet that product.

The correct path is **not** to rescue the legacy poster renderer and **not** to rebuild the entire Studio. Keep the Studio shell, sanitized data pipeline, registry, selectors, owner controls, and export boundary. Replace the current single-purpose ancestor layout core with a unified poster scene architecture that supports multiple layout engines, card presets, print-quality calculation, and truthful page-size capabilities.

This product is a **print-first poster rendering engine**, not an interactive-tree viewport capture tool. `PosterScene` is the canonical fixed physical document model shared by preview, PNG, and PDF. It is composed from millimeter dimensions, orientation, margins, family scope, generation count, card geometry, typography, print readability, target DPI, and memory limits.

Photos are a core owner-publishing requirement. They must enter the delivery sequence immediately after the baseline `PosterScene` through a controlled `PosterImageAssetResolver`; they are not public portable data and must never be passed to the renderer as raw storage URLs or internal paths.

Current sanitized Classic/Modern output is useful as a proven vertical ancestor-poster baseline. It is not sufficient for full-tree posters, descendants, radial/focus layouts, deep trees, A2-A0 production, actual photo embedding, detailed person cards, or professional print customization.

## Product Clarification: Print And Photo Contract

- Poster composition is based on a fixed physical page, never the user's current interactive viewport.
- The selected page dimensions in millimeters are converted into one canonical coordinate system before layout.
- Preview scales the canonical scene for the screen; it does not recompute poster geometry.
- PNG and PDF consume the same canonical scene and differ only at the output backend.
- Tree Snapshot remains a separate viewport-capture product and must not define poster architecture.
- Owner-authorized profile photos are legitimate poster content.
- Raw Supabase URLs, storage paths, authentication tokens, and internal media metadata are forbidden in the DOM, `PosterScene`, and exported artifacts.
- A `PosterImageAssetResolver` resolves approved references into normalized assets such as blobs, object URLs with controlled lifetime, or decoded bitmaps.
- The renderer receives normalized image assets and safe fallback state, not storage identifiers.
- Photo policy must support: show photos, hide photos, hide living-person photos, and initials fallback.
- Failed or unavailable image resolution must produce a deterministic safe fallback without breaking layout or export.

## A. Current State Assessment

### What The Studio Owns Today

- A visible owner-facing Studio inside the Vault Visual Outputs tab.
- Live read-only tree-store mapping through an isolated source bridge.
- Session-only root selection tokens; raw person IDs do not appear in the DOM.
- Product definitions for Classic Poster, Modern Poster, and Current Tree Snapshot.
- Sanitized poster data flow:

```text
Store-shaped tree data
  -> product selector
  -> production sanitizer
  -> SanitizedPreviewGraph
  -> preview adapter
  -> VisualPreviewModel
  -> Studio poster renderer
```

- Poster root selection.
- Editable poster title and short description.
- Ancestor depth controls for 2, 3, or 4 generations.
- A4 and A3 controls.
- Portrait and landscape controls.
- Living/private-person masking.
- Photo-availability indication without passing image files or URLs; this is temporary baseline behavior, not the intended product endpoint.
- Classic and Modern document themes.
- High-DPI PNG generation through `html-to-image` at a fixed 2x scale.
- One-page raster PDF generation through the same PNG composition and jsPDF.
- Arabic UTF-8 visual rendering that passed sanitized PNG/PDF QA.
- Four-generation QA with 15 people and 14 relationships.
- A4/A3 portrait/landscape physical-page QA.

### What Is Still A Preview Or Placeholder

- Tree Snapshot inside the Studio uses a static illustrative composition. It is not the same renderer as the actual snapshot export.
- Registry `previewAsset` entries remain `placeholder` metadata.
- The Studio poster preview uses the same rendering function but a smaller, separately calculated page size. It is visually representative, not exact WYSIWYG geometry.
- Photo handling is currently a Boolean availability indicator. Actual profile-photo resolution is absent and is now an early delivery requirement after the scene baseline.
- Registry types mention many future product/layout values that have no active renderer.

### What Does Not Exist

- Focus, radial, general horizontal-tree, descendant, branch, full-tree, or custom-scope poster rendering.
- One-generation or unrestricted/all-generation controls.
- Dynamic print-legibility scoring or paper-size recommendations.
- A2, A1, or A0 runtime generation, despite those sizes being declared in poster registry capabilities.
- Custom dimensions or custom aspect ratios.
- Actual profile-image embedding.
- Card field selection beyond display name and public birth/death years.
- Birthplace, profession, relationship label, short-name mode, or custom card typography.
- Card preset registry such as Minimal, Photo-focused, or Dense.
- User controls for spacing, connector style, card dimensions, font scale, background, or margins.
- Branding controls for app mark, watermark, family logo, copyright, creation date, or custom footer text.
- Preview zoom, fit-to-page, crop/safe areas, margin overlays, or expected-resolution display.
- Transparent PNG background.
- Vector SVG export.
- Searchable/copyable Arabic PDF text.

### Legacy Dependencies

- Legacy Classic/Modern poster cards and renderer are paused and hidden. They must remain deprecated.
- The new Studio poster PNG/PDF buttons do not call the legacy poster renderer.
- Tree Snapshot still uses its existing export handler and remains a separate viewport-capture utility.
- Existing Family Book renderers are unrelated and should not become poster layout engines.

### Reusable Assets

**Keep as-is or evolve conservatively:**

- `VisualPublishingStudio` shell and owner workflow.
- Visual output registry and capability vocabulary, after correcting capability truth.
- Store source mapper and privacy boundary.
- Poster/snapshot selectors as product-specific data slicing patterns.
- Production sanitizer and session-isolated preview IDs.
- Preview adapter boundary.
- Export adapter/runtime injection pattern.
- Existing Classic/Modern theme direction.
- Root, title, subtitle, privacy, page, and orientation controls.
- PNG/PDF download, loading, validation, and error handling.
- Current sanitized test suites and visual-QA method.

**Reuse only as algorithmic references:**

- `focusLayout.ts` contains useful focus/ancestor/descendant orientation math, but consumes raw `Person` entities and cannot cross the preview boundary directly.
- `radialLayout.ts` and `FanChart.tsx` prove radial calculations and Arabic browser rendering, but use raw domain objects and an interactive SVG component rather than a print scene.
- Family graph cluster layout may inform full-tree placement, but needs a sanitized scene adapter and print-specific bounds calculation.

**Deprecate:**

- Legacy Classic/Modern poster renderer and old poster export cards.
- Any metadata that advertises unsupported runtime behavior as active.
- Separate preview-only layout geometry that can drift from exported geometry.

## B. Gap Analysis

| Product Requirement | Current Classification | Assessment |
|---|---|---|
| Layout type selection | `Needs new layout engines` | Only a binary vertical ancestor layout exists. Landscape changes the page, not the tree reading direction. Focus/radial/horizontal/full-tree require new sanitized layout engines. |
| People scope | `Partially present` | Selected root + ancestors exists. Descendants, branch, full tree, and custom selection require new selectors and engines. |
| Generation count | `Partially present` | Only 2-4 generations. One generation, deeper generations, and all available generations are absent. |
| Person card customization | `Needs development / early priority` | Name, initials, masking, and years exist. Actual photos are a core owner-publishing requirement and belong in Phase 1B through an asset resolver; richer text fields can follow. |
| Layout customization | `Not present` | Spacing, connectors, density, card size, type scale, background, and margins are fixed in CSS. |
| A4-A0 printing | `Contract only / runtime partial` | Registry declares A4-A0, but UI and runtime support only A4/A3. A2-A0 must not be presented as ready. |
| Print clarity warning | `Not present` | Truncation telemetry exists, but no physical legibility or DPI calculation exists. |
| Branding and rights | `Partially present` | Title/subtitle exist; Jozor and people count are hardcoded. No logo, watermark, copyright, date, or family-brand controls. |
| True preview | `Partially present` | Poster preview and export share renderer code, but preview recomputes layout at a reduced page size. Snapshot preview is illustrative only. No zoom/safe areas/resolution display. |
| Final PNG | `Baseline ready` | High-DPI 2x PNG works for A4/A3 sanitized poster output. DPI is not target-print aware and transparency is absent. |
| Final PDF | `Baseline ready / professional gap` | One-page physical A4/A3 PDF works visually. It is a raster image PDF without searchable Arabic text or vector scalability. |
| SVG | `Not present` | Requires a canonical vector scene and a separate export decision. |
| Arabic | `Visually ready in baseline` | Browser-rendered Arabic passed current QA. Future vector PDF must preserve shaping and embed a verified Arabic font. |
| Large-tree behavior | `Not present` | Current hard cap is 15 poster people. No progressive density, pagination strategy, tiling, or large-tree recommendation model. |

## Layout Suitability By Tree Size

| Tree Size / Goal | Recommended Layout | Reason |
|---|---|---|
| 1-15 people, ancestors | Current vertical/horizontal ancestor poster | Clear binary hierarchy and printable cards. |
| 15-40 people around one person | Focus layout | Shows ancestors, descendants, and spouses without pretending the whole tree is a strict binary tree. |
| 15-63 ancestors | Radial/fan ancestor layout | Uses page area more efficiently than a wide top generation. |
| One descendant branch | Horizontal or vertical descendant layout | Branching is uneven; binary ancestor slots are inappropriate. |
| Medium family branch | Clustered branch layout | Preserves couples and sibling groups better than simple generation rows. |
| Large/full tree | Full-tree overview or multi-sheet product | A single detailed card poster becomes unreadable; use compact nodes, a very large sheet, or a separate overview product. |

## Generation And Readability Policy

Do not replace the current 4-generation cap with an unbounded button. Allow deeper/all-generation requests, then calculate whether the result remains printable.

The decision model should use:

- Number of visible people and maximum generation width.
- Physical page width and height in millimeters.
- Minimum card width/height in millimeters.
- Effective name font size in points.
- Longest expected name after selected name formatting.
- Card field count and photo mode.
- Connector congestion and layout density.
- Target output DPI and estimated bitmap memory.

Recommended behavior:

- Allow the owner to proceed when technically possible.
- Show a warning when expected name text is below the readable print threshold.
- Recommend a larger page or a denser preset.
- Offer compact cards or a radial layout when appropriate.
- Block only when browser memory or output dimensions are unsafe.
- Explain when the full tree requires an overview or multi-sheet product.

## C. Architecture Recommendation

### Adopt A Unified Poster Scene

The Studio should build one canonical scene before preview or export:

```text
VisualProductRequest
  -> Scope Selector
  -> Production Sanitizer
  -> SanitizedPosterGraph
  -> PosterImageAssetResolver
  -> Layout Engine
  -> PosterScene
  -> Preview / PNG / PDF / future SVG
```

Suggested contracts:

```text
PosterDocumentSpec
  page size, orientation, margins, title, branding, background

PosterContentSpec
  scope, root, generation policy, visible card fields, privacy

PosterLayoutSpec
  engine, direction, spacing preset, density preset, connectors

PosterCardPreset
  card geometry, fields, typography, photo treatment, borders

PosterScene
  positioned nodes, connector paths, text runs, images, bounds

PosterImageAssetResolver
  owner-authorized media references -> normalized safe image assets

PrintQualityReport
  effective font size, card size, DPI, memory estimate, warnings
```

### Separate Layout From Card Rendering

- Layout engines calculate node rectangles, relationship paths, generation/branch grouping, and bounds.
- Card presets decide what appears inside each rectangle.
- Themes decide color, typography, border, background, and connector appearance.
- Page composition decides title, footer, branding, safe areas, and margins.
- Exporters consume `PosterScene`; they must not recalculate family geometry.
- Photo resolution occurs before scene finalization and never exposes raw storage references to scene renderers.

This prevents Classic/Modern/Minimal from becoming separate tree algorithms.

### Layout Engine Registry

Start with:

1. `ancestor-tiered`: current binary ancestor geometry, generalized for vertical/horizontal orientation.
2. `focus-family`: sanitized adaptation of focus layout for ancestors, descendants, and spouses.
3. `radial-ancestor`: new print scene using reusable D3 partition math.
4. `descendant-tiered`: uneven descendant branching with subtree width calculation.
5. `branch-cluster`: couples/sibling groups for a selected branch.
6. `full-tree-overview`: compact overview with strict detail reduction and quality warnings.

### Rendering Strategy

Recommended mix:

- **HTML/CSS:** Studio controls, inspector, accessibility, and preview chrome.
- **SVG:** Canonical poster scene for cards, connectors, page geometry, scalable preview, and future vector output.
- **Canvas/OffscreenCanvas:** Rasterization only, preferably tiled for large PNG output.
- **PDF:** Consume the canonical scene. Keep the current raster PDF as a baseline fallback while a verified Arabic vector/text path is proven.

Avoid using interactive application components directly in print output. They depend on raw entities, hover state, viewport transforms, and screen-specific CSS.

### Preview And Export Parity

- Build `PosterScene` at the selected physical page dimensions once.
- Preview scales that exact scene with CSS/SVG viewBox.
- PNG/PDF consume the same scene without rerunning layout at different dimensions.
- Add zoom, fit-to-page, 100%, safe-area, and margin overlays around the scene.
- Show current physical size, estimated DPI, people count, and quality status.

### Arabic And PDF

- Bundle and explicitly load a tested Arabic font before scene capture.
- Add automated glyph-shaping screenshots for Arabic names, ligatures, numbers, and mixed RTL/LTR years.
- For vector PDF, require a proof that Arabic shaping and font embedding survive extraction and external PDF viewers.
- Until that proof passes, label the current PDF accurately as a high-fidelity visual PDF.

### A0 Without Browser Memory Failure

Do not create one unrestricted 2x canvas for every page size.

- Derive target pixels from physical size and selected DPI.
- Estimate raw RGBA memory before rendering.
- Prefer vector PDF for large-format printing.
- Use tiled/offscreen rasterization for A2-A0 PNG.
- Offer 150/200/300 DPI presets only when the memory estimate is safe.
- Run export work asynchronously and allow cancellation.
- Keep preview resolution independent from final export resolution.

For context, an A0 image at 300 DPI is roughly `9933 x 14043` pixels, over 550 MB before encoding and browser overhead. It must not use the current simple 2x browser-canvas policy.

## D. Phased Delivery Plan

### Phase 0 - PosterScene And Print Document Baseline

- Correct registry capabilities to match current A4/A3 runtime support.
- Define `PosterDocumentSpec`, `PosterLayoutSpec`, `PosterCardPreset`, and `PosterScene` in physical document units.
- Move preview to target-size scene scaling instead of reduced-size relayout.
- Establish A4/A3 portrait and landscape geometry, margins, and conversion rules.
- Extract the existing ancestor geometry into the first `ancestor-tiered` layout engine.
- Preserve current Classic/Modern output only as visual reference evidence.

**Exit gate:** Preview, PNG, and PDF consume identical `PosterScene` geometry; A4/A3 physical dimensions are verified and unsupported capabilities are no longer advertised.

### Phase 1A - Printable Arabic Ancestor Poster

- Support vertical and horizontal tree direction.
- Add the Classic text-card preset with verified Arabic shaping and readable typography.
- Keep the initial product scope to selected root plus ancestors on A4/A3.
- Generate PNG and one-page raster PDF from the canonical scene.
- Verify direction, margins, connectors, title, years, and card placement against real-tree owner artifacts.

**Exit gate:** Owner can create a visually truthful Arabic ancestor poster whose preview, PNG, and PDF share the same composition.

### Phase 1B - Privacy-Safe Photos And Card Presets

- Implement `PosterImageAssetResolver` as the only media-entry boundary.
- Resolve approved profile images into normalized blobs/bitmaps without exposing raw URLs, paths, tokens, or media metadata.
- Embed actual photos consistently in preview, PNG, and raster PDF.
- Add owner controls for show photos, hide photos, hide living-person photos, and initials fallback.
- Add safe loading/error fallback and revoke temporary object URLs after use.
- Add Classic Standard, Photo-focused, and Dense/Minimal card presets.
- Add photo shape and crop treatment controls that do not change layout unpredictably.

**Exit gate:** Real owner photos appear consistently across all outputs, privacy policies are enforced, failed assets fall back safely, and exported artifacts contain no internal media references.

### Phase 2 - Large-Format Print Quality

- Add A2, A1, and A0 document specifications.
- Implement `PrintQualityReport` with effective type size, card size, people density, estimated DPI, and memory warnings.
- Add dynamic page-size and readability recommendations.
- Add target DPI selection and memory-safe tiled/offscreen raster export.
- Prefer a verified Arabic-safe vector PDF path for large-format printing; retain the visual raster PDF fallback where necessary.
- Add cancellation and clear failure handling for unsafe output dimensions.

**Exit gate:** A2-A0 output passes physical-size, readability, Arabic, and browser-memory QA with truthful warnings.

### Phase 3 - Professional PDF, Branding, And Scope Expansion

- Prove an Arabic-safe vector/searchable PDF path or explicitly retain visual PDF fallback.
- Add optional Jozor mark, family name/logo, copyright, creation date, custom footer, and watermark.
- Add print margins, safe areas, and bleed/crop visualization.
- Add descendants-only selector and `descendant-tiered` engine.
- Add Focus layout with ancestors, descendants, and spouses.
- Add radial/fan ancestor layout.
- Add selected branch scope.
- Prototype full-tree overview with explicit detail reduction.
- Add an `All available generations` option for ancestor and descendant scopes.
- Treat Ancestors, Descendants, and Full Tree as explicit owner-facing scope choices.
- Preserve all supported relationships in Full Tree through a dedicated overview
  engine rather than reusing the binary ancestor layout.

**Exit gate:** Each layout passes small, sparse, dense, missing-parent, multiple-spouse, and RTL fixtures.

The accepted scope contract is documented in
`poster-scope-and-generation-product-requirements-2026-07-14.md`.

### Phase 4 - Advanced Customization

- Add selectable card fields: name mode, years, birthplace, profession, and relationship.
- Add understandable spacing/density presets before numeric fine controls.
- Add connector presets, color themes, font choices, backgrounds, and custom dimensions.
- Add custom person inclusion/exclusion and scene-level selection.
- Consider SVG export only after font and privacy review.

**Exit gate:** Customization remains preset-led and does not turn Jozor into a general-purpose canvas editor.

## E. Product Decision

### Final Verdict

**Decision:** Evolve Visual Publishing Studio incrementally, but replace its current layout/rendering core with a unified poster scene architecture.

- The Studio shell does **not** require a rewrite.
- The selector/sanitizer/privacy foundation does **not** require a rewrite.
- The export adapter boundary does **not** require a rewrite.
- The current ancestor renderer should become the first `ancestor-tiered` engine, not remain the universal poster renderer.
- New layouts require new engines, not more conditions inside `studioPosterRenderer.ts`.
- Card customization requires a preset/card contract, not scattered CSS toggles.

### Deprecation Decision

- Permanently deprecate the legacy Classic/Modern poster renderer.
- Remove legacy poster export code only after confirming no non-Vault caller depends on it.
- Keep Tree Snapshot as a separate viewport-capture product until a true snapshot scene is designed.
- Treat old structural poster approvals as historical evidence, not readiness for the new Studio output.

### Beta Visibility Decision

Hide or avoid advertising:

- Legacy poster outputs.
- A2/A1/A0 until runtime and memory QA pass.
- Actual-photo controls until `PosterImageAssetResolver` is implemented and verified; photo support itself remains an early core requirement.
- Radial/focus/full-tree/custom scopes until each has an implemented engine.
- Searchable PDF claims while PDF remains raster.

The current Studio Classic/Modern PNG/PDF path may remain visible for owner review, but external beta readiness still requires real-tree owner artifact review.

## Minimum Practical Path

The shortest credible path to a real poster editor is:

1. Make the registry truthful.
2. Introduce a physical-unit `PosterScene` and render the same target-size scene in preview and export.
3. Extract the current ancestor layout into a registered vertical/horizontal engine.
4. Ship the Arabic A4/A3 Classic text-card baseline through PNG and raster PDF.
5. Add `PosterImageAssetResolver`, actual owner photos, photo policies, and card presets.
6. Add `PrintQualityReport` and memory-safe A2-A0 output.
7. Add professional PDF/branding, then Focus, radial, descendant, and branch engines.

This path reuses the expensive privacy and Studio work already completed while avoiding both the broken legacy renderer and an unnecessary full rewrite.
