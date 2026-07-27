# Visual Publishing Studio Poster Renderer v1 Preview Integration - Evidence Notes

**Date:** July 10, 2026
**Evidence Type:** Unit tests and UI integration check
**Privacy Status:** No generated poster artifacts are committed.

---

## Evidence Summary

The poster preview inside the Visual Publishing Studio now uses `renderStudioPosterHtml` and displays the result through a sandboxed iframe.

Evidence points:

- The iframe `srcDoc` contains `data-studio-poster-renderer="v1"`.
- The iframe `srcDoc` contains `<meta charset="utf-8">`.
- The iframe `srcDoc` does not contain `<script>`.
- The preview still derives from sanitized preview models.
- Legacy Classic/Modern poster downloads remain paused.
- Tree Snapshot remains the only active visual download in the current export section.

---

## Commands

```powershell
npx vitest run src/features/the-vault/components/visual-studio/__tests__/VisualPublishingStudio.test.tsx src/features/the-vault/components/__tests__/ExportCloudPanel.test.tsx src/features/publishing/visualOutputs/__tests__/studioPosterRenderer.test.ts
npm run typecheck
```

---

## Next Step

Plan the Studio Poster Renderer v1 export adapters for PNG/PDF generation from the new HTML renderer output.
