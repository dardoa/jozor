# Family Book PDF Owner Review Report

**Date:** July 6, 2026  
**Status:** `Blocked for Beta`  
**Reviewer:** Owner / Antigravity

---

## 1. Context and Findings

The output quality of the Family Book PDF manuscript generated via the browser-print fallback was evaluated. While the visual core layout is clean, the following blockers prevent it from being suitable for private beta testers:

1. **Browser Headers/Footers (`about:blank`)**:
   - The browser-print fallback inherits the default browser print decorations (page title, URL, date, and "about:blank" in headers/footers).
   - This makes the PDF look like a simple browser printout rather than a premium genealogy manuscript book.
2. **Visible Technical UUID on Cover**:
   - The unique manuscript/publication UUID (e.g., `manuscript-...`) was displayed as a subtitle directly on the cover page.
3. **Empty Bibliography Pages**:
   - When no sources were linked to any family members, a standalone blank "Bibliography" chapter page was still generated and appended, creating unnecessary white space.
4. **Alarming "0% Citation Coverage" Labels**:
   - Every person card repeatedly displayed "0% documented" or "0% توثيق" when no sources were present, sounding like a data-entry warning.
5. **Exact Placeholder Dates**:
   - Approximate placeholder dates (such as `1900-01-01` or `1950-01-01` set during imports) were rendered as precise calendar dates (January 1), which is misleading.
6. **Lack of Family Context/Introduction**:
   - The book lacked a short, structured introduction section explaining the scope of the manuscript.

---

## 2. Completed Polish Measures (Phase 1)

The following refinements have been implemented to address these blockers:

- **Invisible technical UUID**: The publication UUID has been removed from the visible HTML cover page and placed inside an invisible HTML comment: `<!-- manuscript-id: ... -->`.
- **Short Family Book Introduction**: Added a concise, template-based introduction page immediately following the cover page.
  - *Arabic:* `يجمع هذا المخطوط أفراد عائلة {familyName}، ويعرض الفروع والأشخاص والخط الزمني والمراجع المتاحة بحسب البيانات المسجلة في جذور.`
  - *English:* `This family book gathers the {familyName} family branch, including people, branch summaries, timeline entries, and available references from the Jozor tree data.`
- **Omit Empty Bibliography Chapters**: If zero sources are linked to the family tree, no standalone empty bibliography page is generated. A compact note is shown near the end instead: `No sources have been linked yet.` / `لم تتم إضافة مصادر مرتبطة بعد.`
- **Soften Citation Coverage**: Changed the alarming `0%` coverage label to a softer `No sources yet` / `لا توجد مصادر بعد`.
- **Approximate Date Display**: Implemented `formatManuscriptDate` to detect placeholder-like `YYYY-01-01` dates and year-only dates, formatting them correctly. If marked as approximate, they are prefixed with `about YYYY` / `حوالي YYYY`.
- **Print Guidance Warning**: Added print guidance text inside the Vault panel warning users that when using the browser print fallback, they should disable browser headers and footers before saving as PDF.

---

## 3. Core Strategy for Private Beta Release

The family book PDF feature will remain labeled as `Needs Polish` or `Blocked for Beta` until the **Controlled PDF** generation pipeline (utilizing headless chrome/Browserless) is fully configured and active in the staging/production environments, ensuring headers and footers can be programmatically removed without relying on manual user settings.
