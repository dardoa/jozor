# Family Book PDF Re-Review - Evidence Notes

**Review Date:** July 7, 2026  
**Status:** `Pending Developer Visual Review`

---

## 1. Context and Method

- **Code Validation**: Completed and verified via unit tests in `HtmlManuscriptRenderer.test.ts` and `MarkdownManuscriptRenderer.test.ts`.
- **Visual Checks**: Pending developer execution in a local browser environment.

---

## 2. Evidence Guidelines

- **Screenshot & PDF Artifacts**: Must remain local and untracked (under `tmp/` or local storage).
- **Sensitive Data Protection**: Do not commit PDFs or screenshots containing real family names, photos, or lineage records to the repository.

---

## 3. Pending Verification Items

1. **Cover layout**: Inspect margins and fonts on the main cover.
2. **Introduction page break**: Verify that the introduction page is split cleanly from the cover page.
3. **Bibliography inline note styling**: Confirm that `.manuscript-sources-note` style matches the print CSS theme layout.
4. **Dates alignment**: Verify approximate dates in the timeline (e.g. `حوالي 1950`) display correctly in Arabic RTL mode.
