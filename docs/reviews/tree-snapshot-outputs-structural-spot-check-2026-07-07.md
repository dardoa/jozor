# Tree Snapshot Outputs Structural Spot Check Report

**Date:** July 7, 2026  
**Status:** `Spot Check Pass for Limited Beta - structural/sanitized verification`  
**Reviewer:** Owner / Antigravity

---

## Executive Summary

This report documents the structural spot check of the **Tree Snapshot (PNG/PDF)** export outputs.

The outputs are officially promoted to **Spot Check Pass for Limited Beta - structural/sanitized verification**.

> [!IMPORTANT]
> **Owner Review & Usage Constraints:**
> - **Viewport Dependency:** The snapshot is current-view dependent and varies completely with the visible zoom/pan state of the tree when triggered.
> - **Not Print-Designed:** Unlike poster outputs, Tree Snapshot is a dynamic capture of the active viewport, not a static print-layout document. 
> - **Visual Quality Notice:** Verification confirms correct viewport transformation, padding addition, and watermark integration on sanitized data. It does not guarantee that every zoom state is "visually beautiful".
> - **Recommendation:** Owner real-tree visual inspection remains optional/recommended before broad tester exposure.

---

## Structural Evaluation & Verified Parameters

### 1. Bounding Box & Transformation (PASSED)
- The export service correctly detects bounding box (`getBBox()`) of content inside the `.viewport` element after temporarily resetting transformations.
- Spacing padding is added: `+150px` on all sides to provide breathing room.

### 2. High-DPI Resolution & Output Format (PASSED)
- Image rendering uses a scale factor of `2x` (`pixelRatio: 2`, `canvasWidth: captureWidth * 2`, `canvasHeight: captureHeight * 2`) for high-DPI outputs.
- PDF generation uses standard landscape/portrait orientation decisions depending on aspect ratio.
- Filenames default to `family_tree.pdf` and `family_tree.png`.

### 3. Watermark & Branding (PASSED)
- Watermark text `JOZOR FAMILY TREE` is applied on the generated image before triggering the file download.

### 4. Known Technical Limitations
- **Canvas Size Limits:** For extremely large family trees, the canvas size may exceed browser engine limits, causing the conversion to fail or slow down.
- **Dynamic Fonts Mock:** Fonts are skipped (`skipFonts: true`) to bypass CORS and tainted canvas issues during conversion.

---

## Output Readiness Decision

| Output Format | Status | Notes |
|---|---|---|
| **Tree Snapshot (PNG)** | `Spot Check Pass - structural/sanitized` | Captures viewport with 150px padding and watermark. |
| **Tree Snapshot (PDF)** | `Spot Check Pass - structural/sanitized` | Converts captured viewport PNG to PDF layout. |

---

## Spot Check Checklist

- [x] Correct bounding box calculations.
- [x] 150px padding added for breathing room.
- [x] 2x scale factor applied for high resolution.
- [x] Watermark text applied correctly.
- [x] Output file orientation matches aspect ratio.
- [x] No data leak or db key leaks.
