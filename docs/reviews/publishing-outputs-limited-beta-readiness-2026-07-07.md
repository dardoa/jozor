# Publishing Outputs Limited Beta Readiness Summary

**Date:** July 7, 2026  
**Status:** `Pass for Limited Beta (Family Book Only)`  
**Reviewer:** Owner / Antigravity

---

## Executive Summary

This document provides a consolidated readiness status for all publishing and export outputs within the Vault. It establishes a clear boundary between products that are cleared for limited beta release and those that require further owner validation and spot checks.

---

## Output Readiness Status

| Publishing / Export Output | Status | Notes |
|---|---|---|
| **Family Book PDF** | `Pass for Limited Beta` | Visual family book output; remaining P2/P3 polish tracked separately. |
| **Family Book Markdown** | `Pass for Limited Beta` | Cleared as a review/archive text format, not a visual replacement for PDF. |
| **Classic Ancestor Poster** | `Spot Check Pass for Limited Beta - structural/sanitized verification` | Document composition, margin coordinates, and symmetric layout verified. See [Visual Poster Spot Check Report](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-poster-outputs-structural-spot-check-2026-07-07.md). |
| **Modern Ancestor Poster** | `Spot Check Pass for Limited Beta - structural/sanitized verification` | Document composition, margin coordinates, and symmetric layout verified. See [Visual Poster Spot Check Report](file:///d:/AppDEV/Jozor1.1/docs/reviews/visual-poster-outputs-structural-spot-check-2026-07-07.md). |
| **Tree Snapshot PNG/PDF** | `Pending Owner Output Review` | Legacy label fallback; output needs visual verification. |
| **GEDCOM Export** | `Spot Check Pass for Limited Beta` | Validated owner spot check; date precision preserved. See [GEDCOM Spot Check Report](file:///d:/AppDEV/Jozor1.1/docs/reviews/gedcom-owner-spot-check-2026-07-07.md). |
| **JSON Export** | `Blocked for Limited Beta as Public Portable JSON / Current output classified as Internal Raw Export` | Parses successfully but contains private media URLs and sync metadata. See [JSON Spot Check Report](file:///d:/AppDEV/Jozor1.1/docs/reviews/json-owner-spot-check-2026-07-07.md). |
| **Jozor Archive** | `Spot Check Pass as Full Project Archive / Owner Backup` | ZIP package layout, structure, and media isolation verified. Labeled as owner backup/archive, not portable data. See [Jozor Archive Spot Check Report](file:///d:/AppDEV/Jozor1.1/docs/reviews/jozor-archive-owner-spot-check-2026-07-07.md). |
| **Calendar/ICS Export** | `Spot Check Pass for Limited Beta - structural/sanitized verification` | Generated ICS file structure and mock events verified. Partial dates are safely omitted. See [Calendar ICS Spot Check Report](file:///d:/AppDEV/Jozor1.1/docs/reviews/calendar-ics-owner-spot-check-2026-07-07.md). |
| **Cloud Backup** | `Operational` | Background task; excluded from publishing output reviews. |

---

## Not Yet Beta-Cleared

The following outputs are explicitly **not yet beta-cleared** for public or external testing:
- **Visual Poster Outputs**: The classic and modern ancestor poster PDF/PNG exports have passed structural/sanitized spot checks, but a real-tree visual review by the owner is recommended before broad tester exposure.
- **Tree Snapshots**: The snapshot PDF/PNG exports have not been visually reviewed by the owner.
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
- **Visual Outputs**: Future target is to verify generated assets and plan the Preview-first Visual Publishing Studio under [ADR 013](file:///d:/AppDEV/Jozor1.1/docs/adr/013-visual-publishing-studio-direction.md).

---

## Final Decision

> [!IMPORTANT]
> **Decision:**
> Family Book outputs (PDF and Markdown) are cleared for limited beta release.
> Visual outputs and portable data exports require targeted owner output spot checks before they can be presented as beta-ready.
