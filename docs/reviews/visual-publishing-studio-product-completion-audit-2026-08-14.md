# Visual Publishing Studio Product Completion Audit

**Date:** 2026-08-15
**Status:** Core runtime and automated technical closure complete; owner signoff still open
**Production approval:** No

## Executive verdict

The Visual Publishing Studio no longer needs a renderer rewrite. Its core print-first architecture is sound:

```text
Owner tree source
  -> session-owned person token catalog
  -> approved preview selectors
  -> production sanitizer
  -> SanitizedPreviewGraph
  -> layout engine
  -> PosterScene
  -> canonical SVG
  -> Studio preview / SVG / PNG / PDF
```

The remaining work is product convergence, owner visual approval, and targeted UI modularization. `PosterScene`, the sanitizer boundary, layout engines, and SVG-derived export path should remain stable.

## Runtime inventory

### Complete and reachable

- Tiered ancestor and descendant posters.
- Selected family branch posters.
- Full-tree overview posters with print-quality gating.
- Focus Family posters around a selected person.
- Radial/Fan ancestor and descendant posters in 180-degree and 360-degree forms.
- Branch Collection archive export for a complete tree.
- Tiled Wall archive export for a complete tree.
- A4, A3, A2, A1, and A0 document specifications.
- Portrait and landscape orientation.
- Canonical SVG preview and SVG-derived PNG/PDF exports.
- Owner-controlled photos through normalized embedded assets.
- Living/private masking, photo hiding, initials fallback, and opaque session identities.
- Print-quality and layout-capacity blocking with recovery guidance.
- Responsive and keyboard-accessible Studio controls.

### Intentionally separate

- Current Tree Snapshot remains a workspace capture product below the Studio.
- It does not share poster layout controls and must not be presented as a second poster engine.
- Legacy poster PDF handlers remain outside the active Studio poster path.

## Live owner-tree review

The owner-tree review confirmed that the Studio receives a connected multi-generation graph rather than a root-only model. Ancestor scope can legitimately show one person when the selected root is the oldest recorded person; switching to descendant scope exposes the larger connected family graph.

The same review confirmed:

- Radial is directly reachable from the persistent diagram-type selector above the workspace.
- Unsupported density combinations fail with a clear capacity message.
- SVG, PNG, and PDF actions are disabled while the scene is blocked.
- The print dock is visually and functionally separate from design settings.
- No raw person identifiers are displayed in the owner-facing controls.

## UX assessment

The current workspace implements the intended information architecture:

- Main area: large canonical poster preview with zoom, fit, and expanded review.
- Side panel: four design sections only:
  - Quick Setup
  - Tree & Layout
  - Cards
  - Appearance
- Bottom dock: paper size, orientation, margins, print readiness, and export actions.
- Mobile: compact expandable preview followed by reachable design and print controls.

This is a substantial improvement over the earlier long settings page. The next UI work should preserve this structure.

## Correction included with this audit

The preview presentation now follows the active scene semantics instead of always repeating the static template name:

- Descendant Tiered uses `Descendant Tree` / `شجرة الأحفاد`.
- Radial Ancestors uses `Radial Ancestor Tree` / `شجرة الأسلاف الشعاعية`.
- Radial Descendants uses `Radial Descendant Tree` / `شجرة الأحفاد الشعاعية`.
- Focus uses `Family Focus` / `لوحة العائلة حول شخص`.
- Full-tree and selected-branch scenes use their scope-specific titles.
- A normal ancestor scene still shows its selected visual preset name, such as Dense Genealogy, so style identity is not lost.

The accessible preview label follows the same active scene title.

## Capability freeze decisions

### Owner signoff gates

1. Complete the owner visual decision for the promoted Focus evidence pack.
2. Complete the owner visual decision for the promoted Radial evidence pack.
3. Run one final cross-mode owner review in the live Studio after both decisions.

Automated technical passes do not replace these visual decisions.

The compatibility matrix no longer contains any `unassessed` combinations:

- Full-tree Radial detailed poster: `planned` and runtime-rejected until a complete-family radial model is designed and verified.
- Full-tree Radial overview: `incompatible`; the overview product retains its dedicated full-tree engine.
- Radial Tiled Wall: `planned` and runtime-rejected until both full-tree radial composition and tile-boundary evidence exist.
- Selected-branch Branch Collection: `incompatible`; the supported selected-branch poster already represents the single requested branch.
- Selected-branch Tiled Wall: `planned` for a later oversized-branch workflow and remains runtime-rejected.

Registry advertising and UI reachability remain limited to implemented combinations. Deferred combinations cannot silently become reachable through fallback state transitions.

## Refactoring assessment

### No core rewrite

Do not restructure these stable boundaries merely for file size:

- `PosterScene` contracts and builder boundary.
- Sanitizer and opaque token boundary.
- Tiered, Focus, Radial, Branch Collection, and Tiled Wall engines.
- Canonical SVG renderer and SVG-derived export adapters.

### Targeted UI modularization completed (2026-08-15)

The two owner-facing files previously carried too many responsibilities:

- `VisualOutputConfigPanel.tsx`: section navigation plus all design controls.
- `VisualPublishingStudio.tsx`: source selection, sanitization, scene construction, resources, exports, and workspace composition.

They were decomposed without changing behavior:

1. The four settings bodies now live in `VisualOutputQuickSetupSection`, `VisualOutputTreeLayoutSection`, `VisualOutputCardsSection`, and `VisualOutputAppearanceSection`.
2. Sanitized source selection, opaque token catalogs, Focus/Radial selection, `PosterScene` construction, and embedded font/image resources now live in `useVisualStudioPosterRuntime`.
3. SVG/PNG/PDF, Branch Collection, and Tiled Wall export orchestration now lives in `useVisualStudioPosterExport`.
4. `VisualPublishingStudio.tsx` is now the workspace composition layer; its size dropped from 1,131 lines to 277 lines.
5. `VisualOutputConfigPanel.tsx` now owns section navigation and shared header actions; its size dropped from 1,519 lines to 559 lines.
6. Existing integration, accessibility, responsive, parity, privacy, Focus, Radial, descendant, and selected-branch tests remain green after extraction.

This is maintainability work, not a redesign and not an engine rewrite.

## Ordered completion plan

### Step 1: Semantic presentation closure

- Complete the dynamic preview naming correction in this audit.
- Verify Tiered, Focus, Radial, full-tree, selected-branch, and Dense preset labels.

### Step 2: Owner visual closure

- Review promoted Focus artifacts.
- Review promoted Radial artifacts.
- Record Pass, Pass with polish, or Blocked without changing evidence metrics.

### Step 3: UI modularization

- **Completed 2026-08-15.** Settings sections and scene/export controller hooks are separated.
- No visual or runtime capability changes were introduced by the extraction.

### Step 4: Capability freeze

- **Completed 2026-08-15.** All five previously unresolved combinations now have explicit planned or incompatible decisions.
- Registry advertising, compatibility descriptions, UI reachability, and the exhaustive matrix tests remain aligned.

### Step 5: Final Studio completion pack

- **Automated technical gate completed 2026-08-15.** Full Vitest, Playwright responsive/accessibility/export suites, typecheck, scoped ESLint, and `git diff --check` pass.
- Perform a final owner screenshot review at desktop, tablet, and mobile sizes.
- Mark production approval only after owner visual signoff.

## Final automated technical closure (2026-08-15)

The final gate exposed and closed one real integration defect rather than weakening the evidence: after opaque session identities were introduced, image resolution still expected a source person ID while the scene supplied a sanitized preview ID. The publishing boundary now owns a non-serializable preview-to-source resolver. Renderers continue to receive only sanitized IDs and normalized embedded assets.

The same correction ensures `hideLivingPhotos` and optional safe card fields reach the Tiered sanitizer path. Focus and Radial use the same internal identity boundary, while raw IDs remain absent from `PosterScene`, DOM, SVG, PNG/PDF filenames, and serialized sanitized graphs.

Final verification results:

- Visual Outputs and Studio Vitest: 41 files, 528/528 tests passed.
- Export Artifact Parity Playwright: 6/6 scenarios passed, including embedded photos, masking, geometry parity, print dimensions, and SHA-256 uniqueness.
- Focus, Radial, selected-branch, accessibility, and responsive Playwright: 28/28 tests passed.
- TypeScript: 0 errors.
- Scoped ESLint: 0 warnings and 0 errors.
- `git diff --check`: no whitespace errors.

Automated technical status is Pass. Owner screenshot and promoted Focus/Radial visual decisions remain required before production approval.

## Owner workspace alignment pass (2026-08-16)

The live signed-in owner-tree review identified one remaining information-architecture defect: `Tree & Layout` still mixed graph geometry with privacy, poster copy, footer branding, and person-card fields. The four-section workspace was retained, but each setting now has a single owner-facing home:

- `Quick Setup`: preset, poster title and subtitle, privacy, and a collapsed poster-details disclosure for footer and Jozor attribution.
- `Tree & Layout`: selected root plus only the controls belonging to the active Tiered, Focus, or Radial geometry.
- `Cards`: visible person fields, photo visibility and shape, and collapsed detailed card styling.
- `Appearance`: palette and advanced visual styling.
- Bottom print dock: paper size, orientation, margins, readiness, and SVG/PNG/PDF actions.

Measured live results on the connected owner tree:

- Radial `Tree & Layout` now fits in its panel without internal scrolling: `434px` client height and `434px` scroll height, down from the earlier `1028px` content height.
- Desktop poster preview measured `708 x 623px`; the separate settings panel measured `319px` wide.
- Mobile poster preview measured `282 x 388px` inside a `284px` Studio width, with no Studio-level horizontal overflow.
- Radial remains directly selectable from the persistent first-step diagram selector and opens its contextual layout controls automatically.
- The legacy Current Tree Snapshot remains visibly outside the poster Studio as a separate additional output.

Verification after the redistribution:

- Visual Studio Vitest: 10 files, 94/94 tests passed.
- Accessibility, responsive, export-artifact, Focus, Radial, and selected-branch Playwright: 34/34 scenarios passed across the corrected runs.
- TypeScript and scoped ESLint remained clean.

UX status: Pass for workspace clarity and control ownership. This does not replace the separate artistic signoff on promoted Focus and Radial poster evidence.

## Delegated final closure review (2026-08-31)

The final review combined promoted print artifacts with a live signed-in owner-tree walkthrough. It exercised Tiered, Focus, Radial, full-tree overview, Branch Collection, and Tiled Wall from the owner-facing Studio rather than relying on fixtures alone.

Live owner-tree findings:

- Focus rendered 13 people and 23 relationships from the selected focal person and remained export-ready.
- Radial descendants correctly blocked an A3 composition containing 40 people and 39 relationships, then produced a reviewable A0 scene through the guided recovery action.
- Full-tree overview rendered 90 people and 155 relationships, with single-sheet, Branch Collection, and Tiled Wall product paths all directly reachable.
- The 390px Studio container measured 284px client width and 284px scroll width; preview, print dock, settings, and actions stayed inside the Studio boundary.
- A scoped DOM privacy scan found zero UUIDs, Supabase URLs, storage-path fields, or raw-ID attributes in the Studio. Normalized embedded poster images remained available.

Promoted artifact visual verdicts:

- Focus: **Pass with polish**. Vertical and horizontal compositions are coherent, focal hierarchy is clear, Arabic remains valid, and capacity failures are controlled.
- Radial: **Pass with polish**. Half-fan and full-circle compositions are balanced and readable, Arabic long names remain intact, and blocked-density guidance is actionable.
- The remaining polish is thematic and editorial: richer wall-poster art direction, more expressive photo-led presets, and further connector/card refinement. It is not a renderer, privacy, geometry, or export blocker.

Final verification:

- Visual Outputs and Studio Vitest: 41 files, 528/528 tests passed.
- Chromium Playwright completion pack: 44/44 scenarios passed with a natural process exit.
- TypeScript: 0 errors.
- Scoped ESLint: 0 warnings and 0 errors.
- `git diff --check`: no whitespace errors.

Closure decision: implemented Studio modes are technically complete and recommended for limited beta. Planned compatibility combinations remain explicitly unavailable, and the broader wall-poster visual direction stays on the post-checkpoint product roadmap.

## Final answer to the architecture question

The Studio did not require reconstruction. The targeted decomposition and capability freeze are complete, and the renderer/data-safety architecture remains intact. The highest-value remaining work is the final owner visual closure across the live desktop, tablet, and mobile workspace.
