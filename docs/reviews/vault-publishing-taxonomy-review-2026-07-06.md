# Vault Publishing Taxonomy Manual Review Report

**Date:** July 6, 2026  
**Status:** `PASS`  
**Reviewer:** Antigravity (Advanced Agentic Coding AI Assistant)

---

## Executive Summary

Following a series of refinements to the Vault's export and publishing architecture, a complete manual taxonomy review was performed. The goal was to ensure that all user-facing export items are categorized logically, cleanly, and consistently under their designated product taxonomies, while keeping all legacy and legacy-fallback workflows robust.

The taxonomy reorganization has been validated successfully. All runtime systems, unit tests, and layout presentation standards are fully aligned.

---

## Scope & Taxonomy Organization

The Vault export panel is now organized into five distinct, high-cohesion sections:

1. **Family Book**:
   - Holds narrative-driven manuscript output targets.
   - Contains **Family Book PDF** (primary PDF manuscript generator) and **Family Book Markdown** (clean text manuscript exporter).
2. **Visual Outputs**:
   - Represents visual representation templates and layout exports.
   - Houses Poster Templates (Classic Ancestor Poster, Modern Ancestor Poster) and the **Current Tree Snapshot**.
3. **Portable Data**:
   - Consists of standard database utility and backup exports.
   - Houses **Jozor Archive**, **JSON**, **GEDCOM**, and **Calendar** (ICS).
4. **History & Quality**:
   - Displays a unified chronological list of previous export attempts with detail expansion toggles.
   - Categorizes past entries by product taxonomy, displaying format tags and category badges.
5. **Cloud Backup**:
   - Handles external synchronization and offsite storage workflows.

---

## Verification Checklist

All items below have been verified via component audits and comprehensive unit test coverage:

- [x] **Family Book** contains `Family Book PDF` and `Family Book Markdown`.
- [x] **Markdown** exports are completely removed from the Portable Data tab, eliminating layout confusion.
- [x] **Visual Outputs** presents poster templates and tree snapshots under a polished visual hierarchy.
- [x] **Poster Templates** display print-ready capability hints (sizes A4-A0) and passive PNG/PDF tags.
- [x] **Current Tree Snapshot** uses a compact layout card, displaying viewport capability hints and PNG/PDF tags.
- [x] **Portable Data** contains only Jozor Archive, JSON, GEDCOM, and Calendar.
- [x] **Generic Print** option is completely hidden from the Vault UI to prevent concept overlap.
- [x] **History & Quality** displays the product label (e.g. `Family Book` or `Classic Ancestor Poster`), a format chip (e.g. `PDF` or `Markdown`), a category badge (e.g. `Family Book` or `Visual Output`), and the status badge.
- [x] **Arabic/RTL translation compatibility** is verified. Labels render properly in both English and Arabic.

---

## RTL / Arabic Alignment

To ensure a seamless user experience for Arabic speakers, all newly introduced labels, badges, and chips map cleanly under RTL styles:

- **Family Book Markdown** translates to `Markdown كتاب العائلة`.
- **Visual Output** category badge translates to `مخرج بصري`.
- **Portable Data** category badge translates to `بيانات قابلة للنقل`.
- **Tree Snapshot** translates to `لقطة الشجرة` (Compact title: `لقطة الشجرة الحالية`).
- **Posters** translate to `بوستر` (Titles: `شجرة الأسلاف الكلاسيكية الدافئة` & `شجرة الأسلاف العصرية الداكنة`).
- **Generic Export** translates to `تصدير عام`.

---

## Deferred by Design

The following architectural and user interface components have been deferred by design:

- **Visual Studio UI**: The interactive custom theme and layout configuration studio remains deferred to a future phase.
- **Poster Size/Orientation Controls**: Controls to customize dimensions and layout rules inside the Vault panel are deferred; the Vault currently displays these as passive print capabilities.
- **Controlled PDF Production Activation**: Direct generation of print-ready PDFs remains gated behind server-side environment readiness.
- **History Feedback/Re-export Actions**: Re-running exports or providing inline feedback directly from the history card lists is deferred.

---

## Conclusion

The Vault publishing/export taxonomy is highly coherent, structurally sound, and ready for private beta tester feedback.
