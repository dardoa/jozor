# Family Book Markdown Owner Review Report

**Date:** July 7, 2026  
**Status:** `Needs Polish`  
**Target:** `Pass for Limited Beta as Review/Archive Format after regenerated Markdown review`  
**Reviewer:** Owner / Antigravity

---

## Executive Summary

This report documents the first owner review of the Family Book Markdown export format. While Markdown is an excellent text/archival format (especially for selectable and searchable text quality), the previous output suffered from missing introductory context, technical English labels in Arabic manuscripts, a weak sources section, and relationship/generation label confusion.

The target is to move this format to `Pass for Limited Beta as Review/Archive Format` once the regenerated Markdown file is visually/textually reviewed.

---

## Identified Polish Items (Blocked for Beta)

1. **Missing Manuscript Introduction**:
   - The Markdown export lacks the template-populated introduction page present in the PDF version.
2. **Technical English Labels Leakage**:
   - Arabic manuscripts contain technical English string prefixes: `Family context`, `Family path`, `Citation coverage`, `Citations`, `Branch`, and count suffixes (`people`).
3. **Relationship / Generation Confusion**:
   - Having both `- العلاقة: الجيل 1` and `- Family context: الجيل 2` creates layout redundancy and confusion. Clearer localized labelling is needed.
4. **Loose Final Paragraph for Empty Sources**:
   - When no sources exist, the output displays an arbitrary italicized note (`*لم تتم إضافة مصادر مرتبطة بعد.*`) rather than a proper localized section header.
5. **Timeline Separators**:
   - Repeated hyphens (`-`) used as spacers look technical. Em dashes (` — `) are preferred for human-readable separation.

---

## Resolution Plan

The MarkdownManuscriptRenderer has been refactored to implement:
- Shared family name extraction and template-based introduction rendering.
- Fully localized labels for relationship, generation depth, citation coverage, source highlights (`أبرز المصادر`), and branches.
- Localized empty references header block.
- Localized em dash separator rules for timeline entries.

Once the regenerated Markdown file is visually and textually reviewed, the status will transition to `Pass for Limited Beta as Review/Archive Format`.
