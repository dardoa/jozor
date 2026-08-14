# Visual Publishing Studio Product Completion Audit

**Date:** 2026-08-14  
**Status:** Core runtime complete; product signoff still open  
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

- Radial is directly reachable from Quick Setup.
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

## Remaining capability decisions

### Owner signoff gates

1. Complete the owner visual decision for the promoted Focus evidence pack.
2. Complete the owner visual decision for the promoted Radial evidence pack.
3. Run one final cross-mode owner review in the live Studio after both decisions.

Automated technical passes do not replace these visual decisions.

### Compatibility decisions

The following combinations remain deliberately unresolved in `posterCompatibilityModel.ts`:

- Full-tree Radial detailed poster: `unassessed`.
- Full-tree Radial overview: `unassessed`.
- Radial Tiled Wall: `unassessed`.
- Selected-branch Branch Collection: `planned`.
- Selected-branch Tiled Wall: `planned`.

These are not blockers for the supported Studio product. They should be resolved explicitly as supported, incompatible, or deferred before a production capability freeze. They must not silently become reachable through UI fallbacks.

## Refactoring assessment

### No core rewrite

Do not restructure these stable boundaries merely for file size:

- `PosterScene` contracts and builder boundary.
- Sanitizer and opaque token boundary.
- Tiered, Focus, Radial, Branch Collection, and Tiled Wall engines.
- Canonical SVG renderer and SVG-derived export adapters.

### Targeted UI modularization recommended

Two owner-facing files carry too many responsibilities:

- `VisualOutputConfigPanel.tsx`: section navigation plus all design controls.
- `VisualPublishingStudio.tsx`: source selection, sanitization, scene construction, resources, exports, and workspace composition.

Refactor them without changing behavior:

1. Extract the four settings bodies into section components owned by the same design-state contract.
2. Extract scene preparation into a `useVisualStudioPosterScene` controller hook.
3. Extract export preparation into a `useVisualStudioPosterExports` hook.
4. Keep `VisualPublishingStudio.tsx` as the workspace composition layer.
5. Preserve all existing integration, accessibility, responsive, parity, and privacy tests during each extraction.

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

- Split settings sections first.
- Split scene/export controller hooks second.
- Make no visual or runtime capability changes in this step.

### Step 4: Capability freeze

- Decide the five unresolved matrix combinations.
- Align registry advertising, compatibility descriptions, UI reachability, and tests.

### Step 5: Final Studio completion pack

- Run full Vitest, Playwright responsive/accessibility/export suites, typecheck, scoped ESLint, and `git diff --check`.
- Perform a final owner screenshot review at desktop, tablet, and mobile sizes.
- Mark production approval only after owner visual signoff.

## Final answer to the architecture question

The Studio needs focused internal decomposition, not reconstruction. The renderer and data-safety architecture are already the strongest part of the product. The highest-value next work is owner visual closure, then UI file decomposition, then an explicit capability freeze.
