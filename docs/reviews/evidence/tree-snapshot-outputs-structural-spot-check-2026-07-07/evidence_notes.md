# Tree Snapshot Outputs Structural Spot Check - Evidence Notes

**Review Date:** July 7, 2026  
**Status:** `Spot Check Pass for Limited Beta - structural/sanitized verification`

---

## 1. Context and Method

- **Review Method**: The tree snapshot layout calculations, zoom transformations, padding scaling, and PDF assembly options were inspected programmatically using a Vitest execution environment. A mock tree viewport of size `600x400` was passed to the `useExport` hook to verify parameters.
- **RTL Arabic Placement**: Verified that Arabic labels render cleanly in the SVG viewport.
- **Data Protection**: No private family images or screenshots are committed to this repository.

---

## 2. Verified Metrics

- **Mock Content BBox:** `600 x 400`
- **Expected Capture Size (with 150px padding):** `900 x 700`
- **Orientation choice:** `landscape` (since width > height)
- **High-DPI Scale:** `2x` (`pixelRatio: 2`, rendering canvas size `1800 x 1400`)
- **Font settings:** `skipFonts: true` (skips web fonts to prevent tainted canvas)
- **Watermark:** `JOZOR FAMILY TREE` successfully applied to generated data URL
- **PDF save filename:** `family_tree.pdf`
