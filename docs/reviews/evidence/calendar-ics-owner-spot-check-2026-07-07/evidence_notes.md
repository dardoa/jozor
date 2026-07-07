# Calendar ICS Spot Check - Evidence Notes

**Review Date:** July 7, 2026  
**Status:** `Pending Owner ICS Inspection`

---

## 1. Context and Method

- **Review Status**: The ICS structure has been verified programmatically from the exporter code (`src/utils/calendarLogic.ts`), confirming that `BEGIN:VCALENDAR`, `VEVENT`, and `END:VCALENDAR` blocks are correctly generated. However, final file verification remains pending owner spot check.
- **Data Protection**: No private or real family ICS files are committed to this repository.

---

## 2. Expected Metrics

When the spot check is performed, document the following:
- Calendar import validation.
- Total event count.
- Date omissions count (number of partial/year-only birth or death dates skipped).
