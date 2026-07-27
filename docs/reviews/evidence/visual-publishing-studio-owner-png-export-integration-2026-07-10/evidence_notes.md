# Evidence Notes - Visual Publishing Studio Owner PNG Export Integration

**Date:** July 10, 2026
**Privacy:** Structure and test results only. No generated family artifact is committed.

## Verified

- Studio PNG action is active for Classic and Modern posters.
- Studio PNG action is absent for Tree Snapshot.
- The focused tree person is preferred as the poster root.
- Poster preview and export use the same UTF-8 HTML/CSS renderer.
- PNG generation is delegated to the browser runtime and validated as `image/png`.
- The hidden rendering iframe is removed on success and failure.

## Automated Evidence

- `VisualPublishingStudio.test.tsx`
- `ExportCloudPanel.test.tsx`
- `studioPosterRenderer.test.ts`
- `studioPosterExportAdapter.test.ts`
- `studioPosterBrowserPngRuntime.test.ts`
- `npm run typecheck`
- Scoped ESLint
- `git diff --check`

## Local Visual Check

The Arabic Vault Visual Outputs tab was opened locally. The Classic poster preview rendered with RTL Arabic text, the owner review PNG action appeared below the preview, and the legacy poster cards remained hidden.
