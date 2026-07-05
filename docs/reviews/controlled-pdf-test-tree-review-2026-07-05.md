# Controlled PDF Test Tree Review Gate (2026-07-05)

## Verdict: Pending / Conditional Pass (Local verification skipped)

In this review phase, we prepared the test tree criteria and checklist for verifying real manuscript PDF quality on the remote Browserless.io service. Since the `BROWSERLESS_TOKEN` is not yet configured in the environment, the remote PDF generation check is currently marked as **Pending**. Once tokens are available, this review gate must be executed to approve controlled mode.

---

## 1. Test Tree Criteria & Sanitized Data Model

To prevent any leakage of sensitive family data, the review utilizes a fully synthetic test tree conforming to the following model:
- **Tree Name:** `sanitized-manuscript-test-tree`
- **Language:** Arabic (RTL)
- **Scale:** 35 individuals
- **Root Person:** خالد بن عبد العزيز القاضي (Synthetic)
- **Required Entities:**
  - Root, Spouse, 4 children, 8 grandchildren.
  - 5 timeline events (e.g. birth, marriage, historical migration).
  - 6 sources (e.g. historical manuscripts, official logs, library records) with long source titles.
  - Profile photos (optional): Synthetic dummy placeholders.

---

## 2. Review Checklist

When the environment is configured and the export is triggered, the generated PDF must be inspected against the following criteria:

### Rendering & Fonts
- [ ] PDF document opens without file corruption.
- [ ] Arabic letters shape and connect correctly (no isolated glyphs).
- [ ] RTL text alignment is preserved from right to left.
- [ ] Amiri serif font (or fallback) renders beautifully.

### Layout & Page Boundaries
- [ ] Long names (e.g. 5+ grandfather titles) wrap cleanly inside card headers.
- [ ] Individual person cards do not overflow page margins.
- [ ] Fact columns align correctly with no overlapping elements.
- [ ] Bibliography table wraps long source titles without clipping.
- [ ] Timeline events do not split awkwardly across pages.

### System & Performance
- [ ] PDF file size is reasonable (e.g. < 5MB for 35 people).
- [ ] No raw HTML markup or templating code leaks into the visible text.
- [ ] No runtime console errors during pdf conversion.
- [ ] IndexedDB Export History records the mode as `"controlled-pdf"`.

---

## 3. Next Steps

1. Configure `BROWSERLESS_TOKEN` in environment settings.
2. Import the synthetic test tree.
3. Trigger Controlled PDF export under the feature flag.
4. Verify all checklist items.
5. If successful, proceed to Phase 3 (Gate activation for limited staging users).
