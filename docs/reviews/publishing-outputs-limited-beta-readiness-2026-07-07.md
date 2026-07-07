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
| **Classic Ancestor Poster** | `Pending Owner Output Review` | UI taxonomy updated; actual generated output needs verification. |
| **Modern Ancestor Poster** | `Pending Owner Output Review` | UI taxonomy updated; actual generated output needs verification. |
| **Tree Snapshot PNG/PDF** | `Pending Owner Output Review` | Legacy label fallback; output needs visual verification. |
| **GEDCOM Export** | `Spot Check Pass for Limited Beta` | Validated owner spot check; date precision preserved. See [GEDCOM Spot Check Report](file:///d:/AppDEV/Jozor1.1/docs/reviews/gedcom-owner-spot-check-2026-07-07.md). |
| **JSON Export** | `Blocked for Limited Beta as Public Portable JSON / Current output classified as Internal Raw Export` | Parses successfully but contains private media URLs and sync metadata. See [JSON Spot Check Report](file:///d:/AppDEV/Jozor1.1/docs/reviews/json-owner-spot-check-2026-07-07.md). |
| **Jozor Archive** | `Pending Owner Archive Inspection / Classified as Full Project Archive` | ZIP package layout is validated programmatically, but pending owner extraction check. See [Jozor Archive Spot Check Report](file:///d:/AppDEV/Jozor1.1/docs/reviews/jozor-archive-owner-spot-check-2026-07-07.md). |
| **Calendar/ICS Export** | `Pending Owner Spot Check` | Standard ICS structure; pending verification. |
| **Cloud Backup** | `Operational` | Background task; excluded from publishing output reviews. |

---

## Not Yet Beta-Cleared

The following outputs are explicitly **not yet beta-cleared** for public or external testing:
- **Visual Poster Outputs**: The classic and modern ancestor poster PDF/PNG exports have not been visually reviewed by the owner.
- **Tree Snapshots**: The snapshot PDF/PNG exports have not been visually reviewed by the owner.
- **Portable Data Exports**: Selected portable data exports (Calendar/ICS) have not been spot-checked by the owner. GEDCOM has successfully passed the owner spot check. JSON Export is blocked for public use, and Jozor Archive is classified as an internal project backup pending final inspection.

---

## Follow-Up Indexes

Refer to the following documents for tracking post-beta polish:
- [Family Book PDF Follow-ups](file:///d:/AppDEV/Jozor1.1/docs/reviews/family-book-pdf-limited-beta-followups-2026-07-07.md)
- [Family Book Markdown Follow-ups](file:///d:/AppDEV/Jozor1.1/docs/reviews/family-book-markdown-limited-beta-followups-2026-07-07.md)
- [GEDCOM Export Spot Check Report](file:///d:/AppDEV/Jozor1.1/docs/reviews/gedcom-owner-spot-check-2026-07-07.md)
- [JSON Export Spot Check Report](file:///d:/AppDEV/Jozor1.1/docs/reviews/json-owner-spot-check-2026-07-07.md)
- [Jozor Archive Spot Check Report](file:///d:/AppDEV/Jozor1.1/docs/reviews/jozor-archive-owner-spot-check-2026-07-07.md)
- **Visual Outputs**: Future target is to verify generated assets and plan the Preview-first Visual Publishing Studio under [ADR 013](file:///d:/AppDEV/Jozor1.1/docs/adr/013-visual-publishing-studio-direction.md).

---

## Final Decision

> [!IMPORTANT]
> **Decision:**
> Family Book outputs (PDF and Markdown) are cleared for limited beta release.
> Visual outputs and portable data exports require targeted owner output spot checks before they can be presented as beta-ready.
