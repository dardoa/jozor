# Visual Poster Outputs Structural Spot Check Report

**Date:** July 7, 2026
**Status:** `Spot Check Pass for Limited Beta - structural/sanitized verification`
**Reviewer:** Owner / Antigravity

---

## Executive Summary

This report documents the structural spot check of the **Classic Ancestor Poster** and **Modern Ancestor Poster** outputs in both PNG and PDF formats.

The outputs are officially promoted to **Spot Check Pass for Limited Beta - structural/sanitized verification**.

> [!IMPORTANT]
> **Owner Review Constraint:**
> - **Visual Quality Notice:** Structural verification confirms that layout coordinates, margins, page sizing, theme styles, and RTL direction are correct on sanitized data. It does not guarantee that every layout is "visually beautiful" on a real family tree.
> - **Recommendation:** Owner real-tree visual inspection remains optional/recommended before broad tester exposure.

> [!WARNING]
> **July 10, 2026 Owner Review Override:**
> The Classic Ancestor Poster PDF failed real-tree owner visual review and is now `Blocked` for Limited Beta. The product direction has pivoted away from legacy poster exports toward a new Studio renderer path. The structural result below remains historical evidence only; it does not clear Classic or Modern legacy posters for tester exposure. See [Classic Poster Owner Visual Review](file:///d:/AppDEV/Jozor1.1/docs/reviews/classic-poster-owner-visual-review-2026-07-10.md) and [Visual Studio Renderer Pivot](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-studio-renderer-pivot-2026-07-10.md).

---

## Structural Evaluation & Verified Parameters

### 1. Document Composition & Sizing (PASSED)
- Document page dimensions correctly read default layout options: `1000px x 800px` for both templates.
- Section compositions include `cover` and `tree` sections.

### 2. Node Placement & Balance (PASSED)
- **Root Node:** Centered correctly (e.g. `x=440`, `y=720` for Classic; `x=440`, `y=710` for Modern).
- **Ancestors:** Symmetric node coordinate generation on the horizontal axis (Father: `x=215`/`220`, Mother: `x=665`/`660`). Spacing is balanced without overlap.
- **RTL Arabic Text:** Preserved cleanly on nodes (e.g. `أحمد العربي`, `صالح العربي`).

### 3. Connector Lines (PASSED)
- Edge path points computed correctly (e.g. 4-point orthodiagonal connectors between father and root nodes).

### 4. Theme & Sizing Isolation (PASSED)
- **Classic Ancestor Poster:** Background matches `#fdfbf7` with `#1e293b` text.
- **Modern Ancestor Poster:** Background matches `#0f172a` with `#f8fafc` text.
- No database primary keys or internal metadata are exposed in the output payload.

---

## Output Readiness Decision

| Output Format | Status | Notes |
|---|---|---|
| **Classic Ancestor Poster (PNG)** | `Spot Check Pass - structural/sanitized` | Coordinates and styling verified. |
| **Classic Ancestor Poster (PDF)** | `Blocked after owner PDF visual review` | Historical structural coordinates passed, but real PDF review found broken Arabic text rendering and sparse poster output. |
| **Modern Ancestor Poster (PNG)** | `Spot Check Pass - structural/sanitized` | Coordinates and styling verified. |
| **Modern Ancestor Poster (PDF)** | `Paused legacy output` | Historical structural coordinates passed, but legacy poster downloads are paused in favor of the Studio renderer path. |

---

## Spot Check Checklist

- [x] Classic Poster structure correct.
- [x] Modern Poster structure correct.
- [x] Symmetric coordinate generation.
- [x] Arabic text RTL layout preserved.
- [x] Margin/border dimensions correct.
- [x] No data leak or db key leaks.
