# Poster Print Margin Owner Controls

**Date:** 2026-07-18
**Status:** Runtime Automated Pass / Owner Visual Review Pending
**Commit:** None

## Scope

This pass adds bounded print-margin presets to the Visual Publishing Studio. The
control changes the physical safe area used by the layout engine instead of applying
an HTML-only inset or scaling an already-built poster.

## Implemented Choices

- Compact
- Balanced
- Generous

Balanced remains the default. Each preset scales the authored page-size margin in
millimeters and converts the result into canonical PosterScene coordinates.

## Shared Document Contract

`PosterDocumentSpec` now records `marginPreset` together with physical and scene-space
insets. The selected preset is used before layout, so every engine receives the
correct content and tree bounds. `PrintQualityReport` is then evaluated against the
resulting scene rather than being bypassed.

Preview, SVG, PNG, raster PDF, and Branch Collection consume the same document
geometry. Tiled Wall continues to inherit the canonical poster scene while retaining
its own sheet assembly margins and overlap contract.

## Safety And Behavior

- Compact margins increase usable poster area without changing physical page size.
- Generous margins reduce usable area and can surface a print-quality warning or
  block when the selected content no longer fits legibly.
- No arbitrary numeric or negative margins are accepted.
- No raw profile data, storage references, or new renderer path is introduced.

## Verification

- Targeted Vitest: 111 tests passed.
- Branch Collection propagation check: 7 tests passed after the full suite.
- `npm run typecheck`: passed.
- Scoped ESLint: passed with zero warnings.
- `git diff --check`: passed.
- Signed-in owner visual review: pending.

## Decision

Print-margin presets pass automated runtime verification and are ready for owner
visual review. Advanced freeform spacing remains outside this bounded control.
