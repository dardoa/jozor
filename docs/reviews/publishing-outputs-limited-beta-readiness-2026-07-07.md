# Publishing Outputs Limited Beta Readiness Summary

**Date:** July 7, 2026
**Status:** `Mixed Readiness / Classic Heritage and Modern Gallery Studio Cleared`
**Reviewer:** Owner / Codex

---

## Executive Summary

This document provides a consolidated readiness status for all publishing and export outputs within the Vault. It establishes a clear boundary between products that are cleared for limited beta release and those that require further owner validation and spot checks.

---

> [!NOTE]
> **Vault Export UI Labeling:** As of July 8, 2026, the Vault Export UI has been updated to reflect these readiness decisions with explicit badges, reclassified titles, and plain text descriptions (e.g. Jozor Full Backup, Raw Project JSON, and Limited Beta Ready/Structural Beta Pass tags) to prevent tester confusion.

---

## Output Readiness Status

| Publishing / Export Output | Status | Notes |
|---|---|---|
| **Family Book PDF** | `Pass for Limited Beta` | Visual family book output; remaining P2/P3 polish tracked separately. |
| **Family Book Markdown** | `Pass for Limited Beta` | Cleared as a review/archive text format, not a visual replacement for PDF. |
| **Classic Ancestor Poster** | `Blocked legacy output / replaced by Studio renderer path` | Real-tree PDF review found broken Arabic text rendering, sparse/empty pages, raw English text, and weak poster layout. The legacy poster download is paused. See [Classic Poster Owner Visual Review](file:///d:/AppDEV/Jozor1.1/docs/reviews/classic-poster-owner-visual-review-2026-07-10.md) and [Visual Studio Renderer Pivot](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-studio-renderer-pivot-2026-07-10.md). |
| **Modern Ancestor Poster** | `Paused legacy output / replaced by Studio renderer path` | Structural checks remain historical only. Legacy poster downloads are paused because the product direction has moved to a new Studio renderer path. See [Visual Studio Renderer Pivot](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-studio-renderer-pivot-2026-07-10.md). |
| **Studio Classic Heritage Poster PNG/PDF** | `A3 ancestor scope: Pass for Limited Beta / Expanded scopes and A2-A0: Owner Visual Review Pending` | Canonical PosterScene/SVG path. Ancestors passed real-tree A3 review. Descendant/full-tree engines and memory-safe A2/A1/A0 document specs are implemented, but still require real-tree and physical-print approval. |
| **Studio Modern Gallery Poster PNG/PDF** | `Owner Digital Export Pass for A3 ancestor/descendant fixtures` | Canonical SVG-derived PNG/PDF path passed real-tree Arabic review with photos, masking, Gallery Rail header, and one-page A3 output. Physical print proof and broader large-format density gates remain pending. |
| **Studio Dense Genealogy Poster PNG/PDF** | `Owner Digital Export Pass / Real-tree A0 Overview Pass` | A3 real-tree descendant output passed after readability corrections. The actual 90-person, 155-relationship, five-generation complete owner tree also passed digital PNG/PDF review on A0; A3 was correctly blocked. The A0 raster carries a truthful density warning and still requires physical print proof. Over-capacity scenes remain routed to Branch Collection or Tiled Wall Poster. |
| **Tree Snapshot PNG/PDF** | `Spot Check Pass for Limited Beta - structural/sanitized verification` | Viewport transformation, 150px padding, and 2x high-DPI scaling verified. Captures active viewport zoom. See [Tree Snapshot Spot Check Report](file:///d:/AppDEV/Jozor1.1/docs/reviews/tree-snapshot-outputs-structural-spot-check-2026-07-07.md). |
| **GEDCOM Export** | `Spot Check Pass for Limited Beta` | Validated owner spot check; date precision preserved. See [GEDCOM Spot Check Report](file:///d:/AppDEV/Jozor1.1/docs/reviews/gedcom-owner-spot-check-2026-07-07.md). |
| **JSON Export** | `Blocked for Limited Beta as Public Portable JSON / Current output classified as Internal Raw Export` | Parses successfully but contains private media URLs and sync metadata. See [JSON Spot Check Report](file:///d:/AppDEV/Jozor1.1/docs/reviews/json-owner-spot-check-2026-07-07.md). |
| **Jozor Archive** | `Spot Check Pass as Full Project Archive / Owner Backup` | ZIP package layout, structure, and media isolation verified. Labeled as owner backup/archive, not portable data. See [Jozor Archive Spot Check Report](file:///d:/AppDEV/Jozor1.1/docs/reviews/jozor-archive-owner-spot-check-2026-07-07.md). |
| **Calendar/ICS Export** | `Spot Check Pass for Limited Beta - structural/sanitized verification` | Generated ICS file structure and mock events verified. Partial dates are safely omitted. See [Calendar ICS Spot Check Report](file:///d:/AppDEV/Jozor1.1/docs/reviews/calendar-ics-owner-spot-check-2026-07-07.md). |
| **Cloud Backup** | `Operational` | Background task; excluded from publishing output reviews. |

---

## Not Yet Beta-Cleared

The following outputs are explicitly **not yet beta-cleared** for public or external testing:
- **Legacy Poster Outputs**: Classic is blocked after owner review of the generated PDF. Modern is paused with the same legacy output family. Both are replaced by the implemented Visual Publishing Studio renderer path.
- **Studio Poster Outputs**: Classic Heritage is cleared for Limited Beta after real-tree PNG/PDF visual QA. Modern Gallery has an Owner Digital Export Pass for reviewed A3 ancestor and descendant fixtures. Dense Genealogy has passed its real-tree 90-person A0 digital overview gate but remains outside broad physical-print clearance pending an actual print proof.
- **Tree Snapshots**: The snapshot PDF/PNG exports have passed structural/sanitized spot checks, but a real-tree visual review by the owner is recommended before broad tester exposure.
- **Portable Data Exports**: Portable data exports (GEDCOM, Calendar/ICS) have successfully passed the structural/sanitized owner spot checks. JSON Export is blocked for public use, and Jozor Archive is classified as a pass for full project archive/owner backup (not clean portable data).

---

## Follow-Up Indexes

Refer to the following documents for tracking post-beta polish:
- [Family Book PDF Follow-ups](file:///d:/AppDEV/Jozor1.1/docs/reviews/family-book-pdf-limited-beta-followups-2026-07-07.md)
- [Family Book Markdown Follow-ups](file:///d:/AppDEV/Jozor1.1/docs/reviews/family-book-markdown-limited-beta-followups-2026-07-07.md)
- [GEDCOM Export Spot Check Report](file:///d:/AppDEV/Jozor1.1/docs/reviews/gedcom-owner-spot-check-2026-07-07.md)
- [JSON Export Spot Check Report](file:///d:/AppDEV/Jozor1.1/docs/reviews/json-owner-spot-check-2026-07-07.md)
- [Jozor Archive Spot Check Report](file:///d:/AppDEV/Jozor1.1/docs/reviews/jozor-archive-owner-spot-check-2026-07-07.md)
- [Calendar ICS Spot Check Report](file:///d:/AppDEV/Jozor1.1/docs/reviews/calendar-ics-owner-spot-check-2026-07-07.md)
- [Visual Poster Spot Check Report](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-poster-outputs-structural-spot-check-2026-07-07.md)
- [Classic Poster Owner Visual Review](file:///d:/AppDEV/Jozor1.1/docs/reviews/classic-poster-owner-visual-review-2026-07-10.md)
- [Visual Studio Renderer Pivot](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-studio-renderer-pivot-2026-07-10.md)
- [Tree Snapshot Spot Check Report](file:///d:/AppDEV/Jozor1.1/docs/reviews/tree-snapshot-outputs-structural-spot-check-2026-07-07.md)
- [Studio Controlled Visual PDF Runtime and QA](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-publishing-studio-controlled-visual-pdf-runtime-2026-07-11.md)
- [Classic Heritage Real-tree Owner Visual Review](file:///d:/AppDEV/Jozor1.1/docs/reviews/classic-heritage-real-tree-owner-visual-review-2026-07-14.md)
- [Poster Scope and Generation Requirements](file:///d:/AppDEV/Jozor1.1/docs/reviews/poster-scope-and-generation-product-requirements-2026-07-14.md)

---

## Final Decision

> [!IMPORTANT]
> **Decision:**
> Family Book outputs (PDF and Markdown) are cleared for limited beta release.
> Family Book outputs, GEDCOM, Calendar/ICS, and Jozor Full Backup have cleared their documented Limited Beta or owner-backup gates.
> Legacy Classic/Modern Poster downloads remain paused and must not be presented as beta-ready. Visual Publishing Studio is the canonical poster path. Classic Heritage ancestors are cleared for Limited Beta, Modern Gallery has passed reviewed A3 ancestor/descendant digital artifacts, and Dense Genealogy has passed a real-tree A0 complete-tree digital overview. Dense physical-print approval remains separate.
