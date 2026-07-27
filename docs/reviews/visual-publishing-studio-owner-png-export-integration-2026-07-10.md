# Visual Publishing Studio Owner PNG Export Integration

**Date:** July 10, 2026
**Status:** `Pass for Owner PNG Review`
**Scope:** Studio poster PNG only; Controlled PDF remains pending.

## Decision

The new Studio renderer now produces the first active downloadable poster artifact. Classic and Modern poster selections expose one owner-facing action: `Download review PNG`.

The legacy poster PDF path remains paused. Tree Snapshot continues to use its existing export cards.

## Implemented Flow

```text
Focused tree person
  -> ancestor preview selector (up to four generations / 15 people)
  -> production preview sanitizer
  -> VisualPreviewModel
  -> Studio Poster Renderer v1
  -> browser PNG runtime
  -> validated image/png Blob
  -> local download
```

## Owner UX

- The PNG action appears only for Classic and Modern poster products.
- The action disappears when Tree Snapshot is selected.
- A busy state prevents duplicate generation clicks.
- Success and failure feedback is shown through the existing toast system.
- The lower section is labeled `Additional outputs`, avoiding a competing export-center impression.

## Data And Privacy

- The selected/focused person is used as the poster root when available.
- The Studio accepts the sanitized preview model, not raw person entities.
- Living/private masking remains active in this owner-review output.
- The current review PNG excludes profile photos.

## Verification

- Studio, Vault, renderer, adapter, and browser runtime tests pass.
- TypeScript and scoped ESLint checks pass.
- Local browser inspection confirms Arabic RTL rendering and a single active Studio PNG action.
- No generated poster file or private family artifact is committed.

## Remaining Before Poster Beta Readiness

1. Generate and visually review Classic and Modern PNG files using the owner's real tree.
2. Add owner controls for privacy, photos, root person, generation depth, size, and orientation.
3. Improve relationship connector fidelity and dense fourth-generation layout.
4. Implement a Controlled PDF runtime from the same renderer document.

## Configuration Pass Update

The subsequent Poster Configuration Pass added generation depth, page size, orientation, privacy, and photo controls. Preview and PNG export now consume the same options. See `visual-publishing-studio-poster-configuration-pass-2026-07-10.md`.
