# Evidence Notes - Visual Publishing Studio Poster Configuration Pass

**Date:** July 10, 2026
**Privacy:** No generated family artifact or private screenshot is committed.

## Automated Evidence

- `VisualPublishingStudio.test.tsx` verifies depth, privacy, photos, page size, orientation, preview updates, and PNG runtime handoff.
- Root selector tests verify branch rebuilding through session tokens and reject raw source IDs in rendered option markup.
- Fixture and live selectors both verify root-relative ancestor slicing and generation rebasing.
- `previewAdapterRegistry.test.ts` verifies birth/death year preservation.
- `studioPosterRenderer.test.ts` verifies year rendering in Arabic poster output.
- Vault, renderer, export adapter, and browser PNG runtime suites pass.
- TypeScript and scoped ESLint pass.

## Visual Evidence

- Arabic portrait preview rendered locally with the compact poster settings inspector.
- A landscape framing issue was identified through visual inspection and element bounds.
- The frame was corrected with a bounded preview page and explicit LTR iframe host while preserving RTL inside the generated poster document.
