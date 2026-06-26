# Publishing Manuscript Manual Review

## Purpose
Use this checklist before starting major manuscript features such as narrative generation or a publishing design system. Automated tests prove the pipeline works, but manuscript quality also depends on layout, typography, RTL behavior, pagination, and real family data.

This review is intentionally about correctness and usability, not final visual polish.

## Test Cases

### Case 1: Small Tree
- Use a tree with roughly 20 to 50 people.
- Select a clear root person.
- Test branch depth `2`, `3`, and `Full branch`.
- Preview with timeline enabled and disabled.
- Preview with bibliography enabled and disabled.
- Preview with photos disabled and enabled.

Expected result:
- The preview opens quickly.
- The root person appears first in the people chapter.
- Branch-depth changes visibly affect the people included.
- Optional chapters disappear when disabled.
- Photos appear only when the photo option is enabled.

### Case 2: Medium Tree
- Use a tree with roughly 200 to 500 people.
- Preview with branch depth `3`.
- Preview with `Full branch`.
- Open the manuscript in the standalone preview window.
- Export the current transitional PDF from the preview window only as a visual baseline.

Expected result:
- The preview remains responsive enough to inspect.
- Estimated page count feels plausible.
- Person cards do not overlap.
- Long names wrap instead of escaping the card.
- Timeline and bibliography remain readable.
- Any PDF produced through manual browser print is treated as beta output, not the final professional export path.

### Case 3: Real Large Tree
- Use the main real-world test tree.
- Select the most important family root.
- Test `Full branch` only after checking smaller depths.
- Export one PDF with photos disabled.
- Export one PDF with photos enabled if image availability is reliable.

Expected result:
- Arabic shaping and RTL layout remain readable.
- Mixed Arabic/English names and places do not break directionality badly.
- Bibliography is understandable and not just a raw data dump.
- Citation coverage appears consistent with the visible people/facts.
- The browser does not freeze during preview or print export.

## Privacy Checks

- Test as owner/editor: private data may appear according to permission.
- Test as viewer: living/private people must remain masked in preview, Markdown, and PDF print output.
- Confirm photo inclusion does not bypass viewer masking.
- Confirm generated previews do not show hidden raw fields in the browser DOM.

## Configuration Checks

- Root selection changes the manuscript title and first people entry.
- Branch depth `2` excludes deeper descendants.
- Branch depth `Full branch` includes deeper descendants.
- Timeline toggle removes timeline content from preview and exported print output.
- Bibliography toggle removes evidence content from preview and exported print output.
- Photo toggle controls person-card images only; it should not change facts or citations.

## Visual Checks

- Headers and chapter titles do not collide with body content.
- Person card titles are not orphaned at the bottom of a page too often.
- Bibliography table wraps long source titles.
- Long place names wrap inside cards and tables.
- Page breaks do not split cards in a visibly broken way.
- Browser print dialog produces a reasonable PDF when using standard A4 settings.

## PDF Technical Checks

Manual browser print output is transitional. When reviewing exported PDF files, record whether:

- Arabic text is searchable and selectable.
- Fonts are embedded in a stable way.
- PDF tools report Type 3 glyph or font bounding-box warnings.
- Headers, footers, page numbers, and page size are controlled by the app rather than by user printer settings.
- The output is reproducible across machines.

If these checks fail, prefer a future controlled Headless Chromium PDF path instead of polishing manual browser printing.

## Known Deferred Polish

- Final cover design.
- Jozor branding and logo placement.
- Decorative chapter openers.
- Full publishing typography system.
- Advanced widow/orphan pagination control.
- Narrative prose generation.
- Markdown-driven editing workflow.
- EPUB/DOCX outputs.
- Controlled Headless Chromium PDF export for manuscripts.

## Decision Gate

Move to narrative generation only after:

- Preview configuration behaves correctly on all three tree sizes.
- Viewer privacy is verified in preview and export.
- Arabic/RTL output is readable enough for internal use.
- No blocker-level pagination or image issue appears in the real large tree.
