# Visual Publishing Studio Poster Configuration Pass

**Date:** July 10, 2026
**Status:** `Pass for Owner Configuration Review`
**Scope:** Classic and Modern Studio poster preview and PNG generation.

## Outcome

The Studio poster is no longer a fixed preview. Owner-facing controls now update the same sanitized model and renderer document used by the PNG download.

## Implemented Controls

- Poster root: choose any person from an owner-facing list backed by session-only tokens.
- Generation depth: 2, 3, or 4 generations.
- Page size: A4 or A3.
- Orientation: portrait or landscape.
- Privacy: hide living and private people, or show living people while private people remain masked.
- Photos: include available profile photos for people allowed by the active privacy policy.

## Shared Preview And Export Contract

```text
Poster controls
  -> selector depth and node cap
  -> sanitizer privacy/photo policy
  -> VisualPreviewModel
  -> preview renderer document
  -> PNG export renderer document
```

The page dimensions used for PNG export are:

- A4 portrait: 1200 x 1697
- A4 landscape: 1697 x 1200
- A3 portrait: 1600 x 2263
- A3 landscape: 2263 x 1600

## Content Improvement

Birth and death years now survive the sanitized adapter boundary and render on poster person nodes when privacy policy permits them.

## Root Selection Boundary

- Person labels are shown to the owner, but raw database IDs are never used as option values.
- UI values use session tokens such as `preview-root-2`.
- Tokens resolve to raw IDs only inside the Studio selector boundary.
- The selected ancestor slice is rebuilt and its generations are rebased from 1.

## Layout Notes

- Poster settings are hidden when Tree Snapshot is selected.
- The preview remains the dominant workspace area.
- Landscape preview uses a bounded LTR host frame while the poster document retains its own Arabic RTL direction. This prevents RTL inheritance from shifting the scaled iframe outside its viewport.

## Verification

- 52 targeted tests passed across Vault, Studio, adapters, renderer, and PNG runtime.
- TypeScript, scoped ESLint, and `git diff --check` passed.
- Portrait Arabic layout was visually inspected locally.
- Landscape page dimensions, frame size, RTL document direction, and A3 PNG handoff are covered by automated assertions.

## Remaining

1. Run owner visual reviews on real-tree Classic and Modern PNG outputs.
2. Improve connector geometry and dense fourth-generation composition based on those outputs.
3. Implement the Controlled PDF runtime from the same Studio renderer document.

## Layout v2 Update

The following layout pass replaced generation rows with a root-relative binary ancestor composition and real CSS connectors. See `visual-publishing-studio-poster-layout-v2-2026-07-11.md`.
