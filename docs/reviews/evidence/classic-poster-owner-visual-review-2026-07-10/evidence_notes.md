# Classic Poster Owner Visual Review - Evidence Notes

**Date:** July 10, 2026
**Reviewed artifact:** `شجرة أسلاف سليم النور.pdf`
**Evidence Type:** Owner local visual review
**Privacy Status:** Generated PDF remains local and is not committed to the repository.

---

## Evidence Summary

The owner reviewed the generated Classic Poster PDF locally and reported that the output is blocked for Limited Beta.

Observed issues:

- Arabic title and person labels render as mojibake/gibberish.
- Page 1 is nearly empty.
- Page 2 contains only one small root/person card near the bottom instead of a meaningful ancestor poster.
- Raw English `Family tree` appears in the Arabic output.
- Pagination/viewport behavior looks wrong, including a visible `1 / 2` marker on the sparse second page.

---

## Artifact Handling

- The PDF artifact itself is not stored in this repository.
- No full person records, private images, or generated PDF contents are committed.
- The report records only the owner-level visual findings needed to drive the next fix plan.

---

## Review Outcome

Classic Poster is now documented as:

```text
Status: Blocked
Beta Decision: Do not expose to Limited Beta testers
```

The next required step is a renderer-level fix plan for Arabic PDF text rendering, poster layout rendering, localization, and pagination.
