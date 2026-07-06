# Family Book PDF Export - Limited Beta Follow-Up Tracker

**Date:** July 7, 2026  
**Status:** Staged / Non-Blocking

This document tracks P2 and P3 follow-up polish tasks for the Family Book PDF export product. These items are non-blocking and have been deferred to post-beta releases.

---

## P2 - User Experience & Design Polish

- [ ] **Closing page vertical balance**:
  - Currently, the `.manuscript-closing-section` flows directly after the timeline.
  - Balance page heights or margins to ensure the card layout sits nicely on the page and doesn't float too high if the final group size is small.
- [ ] **Reduce repeated source status in person cards**:
  - Simplify person card rendering by reducing the redundant display of `Sources: not added yet` if it appears frequently in adjacent tree nodes.
- [ ] **Confirm and document photo privacy behavior**:
  - Verify and document the rendering status for private or living people in the tree when photos are ticked/unticked, ensuring compliance with privacy standards.

---

## P3 - Technical Quality & Enhancements

- [ ] **Searchable Arabic PDF text quality via Controlled PDF**:
  - Investigate and configure Controlled PDF / Browserless/Puppeteer rendering to support logical `/ToUnicode` character mappings. This will resolve the standard browser printing limitation where copied/extracted Arabic text is reversed or unsearchable.
- [ ] **Enrich introduction page**:
  - Add compact summary statistics (e.g. total generation count, active family branches, earliest ancestor year) to the template-populated introduction page.
