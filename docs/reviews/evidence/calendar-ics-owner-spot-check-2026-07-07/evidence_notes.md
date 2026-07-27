# Calendar ICS Spot Check - Evidence Notes

**Review Date:** July 7, 2026  
**Status:** `Spot Check Pass for Limited Beta - structural/sanitized verification`

---

## 1. Context and Method

- **Review Method**: The ICS structure and event generation were inspected programmatically using a Vitest execution environment. A mock tree containing exact dates (living and deceased) and partial dates was exported to ICS and verified.
- **Date Precision**: Verified that exact birth/death dates successfully generate recurring events, while year-only (`1977`) and month-only (`1977-03`) dates are safely omitted to prevent false exact calendar events.
- **Data Protection**: No private family ICS files are committed to this repository.

---

## 2. Verified Metrics

- **Total VEVENT count:** `2` (1 living birthday event, 1 memorial event).
- **Arabic preservation:** `أحمد العربي` (living birthday summary) and `سارة العربي` (deceased memorial summary) preserved perfectly.
- **Omission count:** `2` partial-date records (খالد العربي `1977`, فاطمة العربي `1977-03`) skipped successfully.
- **Malformed lines:** `0`.
- **Private/internal leaks:** `0`.
