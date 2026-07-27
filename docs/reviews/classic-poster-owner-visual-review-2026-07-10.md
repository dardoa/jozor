# Classic Poster Owner Visual Review

**Date:** July 10, 2026
**Status:** `Blocked`
**Beta Decision:** `Do not expose to Limited Beta testers`
**Reviewer:** Owner
**Reviewed artifact:** `شجرة أسلاف سليم النور.pdf`

---

## Executive Summary

The Classic Poster PDF failed the first real-tree owner visual review. This result overrides the earlier structural/sanitized spot check for Classic Poster readiness.

The blocker is not cosmetic polish. The generated PDF fails core expectations for an Arabic family poster:

- Arabic text renders as mojibake/gibberish instead of readable Arabic.
- The first page is nearly empty.
- The second page shows only one small root/person card near the bottom instead of a meaningful poster tree.
- Raw English text appears in an Arabic output.
- The pagination/viewport presentation feels misplaced.

Classic Poster must remain blocked until the PDF renderer produces readable Arabic text, localized copy, and a meaningful poster layout.

---

## Blocking Findings

### 1. Arabic Text Rendering Is Broken

The poster title and person labels render as mojibake/gibberish in the generated PDF. The owner described output similar to:

```text
þòþŸþ®...
```

This is a direct blocker. The likely area to investigate is PDF text rendering, encoding, font embedding, or the render-to-PDF path used by the poster output.

### 2. Page 1 Is Nearly Empty

The first page contains only a broken title/subtitle area and no useful poster content. This makes the PDF look like a failed export rather than a classic family poster.

### 3. Poster Tree Content Is Not Meaningful

The second page shows only one small person card near the bottom:

```text
سليم النور
(1895 - 1983)
```

The expected Classic Poster should show a clear visual ancestor tree with multiple nodes and relationships, not a sparse single-card output.

### 4. Raw English Text Appears

The second page includes raw English text:

```text
Family tree
```

For an Arabic poster output, this should be localized or replaced by the actual Arabic poster title, such as `شجرة العائلة` or `شجرة أسلاف سليم النور`.

### 5. Pagination / Viewport Feels Wrong

The `1 / 2` marker on the second page and the sparse content placement suggest that pagination, viewport capture, or page sizing may not be aligned with the poster layout.

This is secondary to the Arabic rendering failure, but it reinforces the blocked decision.

---

## Decision

**Classic Poster Owner Visual Review:** `Blocked`

Do not mark Classic Poster as `Pass for Limited Beta`.

Before the Classic Poster can be reviewed again, the implementation must address:

- Arabic PDF text rendering and font/encoding correctness.
- Actual poster tree layout rendering with meaningful node and relationship placement.
- Arabic localization of visible labels and titles.
- Page sizing/pagination so the poster content is not split into sparse, mostly empty pages.

---

## Impact on Readiness Map

The earlier structural/sanitized verification remains useful as a low-level composition check, but it is no longer sufficient for beta readiness.

The consolidated publishing readiness summary must list Classic Ancestor Poster as `Blocked` until a regenerated PDF passes owner visual review.

---

## Next Action

Prepare a **Classic Poster PDF Renderer Fix Plan** before continuing to Modern Poster or Tree Snapshot owner visual reviews.
