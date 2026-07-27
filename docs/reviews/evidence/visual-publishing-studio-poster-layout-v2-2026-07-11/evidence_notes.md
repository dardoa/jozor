# Evidence Notes - Visual Publishing Studio Poster Layout v2

**Date:** July 11, 2026
**Privacy:** Automated structure only. No family PNG is committed.

## Verified Structure

- Root node occupies generation 1 and the lowest vertical position.
- Parent nodes occupy generation 2 above the root.
- Binary slots preserve branch identity across deeper generations.
- Seven-node fixture output contains seven nodes and six connectors.
- CSS connector elements carry sanitized preview IDs only.
- No SVG, canvas, or scripts are present.

## Automated Evidence

- `studioPosterRenderer.test.ts`
- `studioPosterExportAdapter.test.ts`
- `studioPosterBrowserPngRuntime.test.ts`
- `VisualPublishingStudio.test.tsx`
- `npm run typecheck`
- Scoped ESLint
