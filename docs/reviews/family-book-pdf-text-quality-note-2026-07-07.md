# Family Book PDF Text Extraction Quality Note

**Date:** July 7, 2026  
**Status:** `Archived Quality Tracking`

---

## 1. Overview of Limitation

When using the **Browser Print fallback** (`controlledPdfStatus === 'fallback'`), the PDF is generated using the browser's native printing subsystems. While this produces visually correct Arabic text layout (rendering ligatures, complex scripts, and RTL ordering accurately on screen), it has a known technical limitation regarding **text extraction and copy-paste quality**:

- Selecting and copying Arabic text from browser-printed PDFs often extracts the characters in reverse order (LTR instead of RTL) or as isolated glyph shapes instead of proper ligatures.
- Search indexing engines (SEO, local document indexing) may fail to query words inside these documents correctly.

---

## 2. Long-term Resolution: Controlled PDF

To achieve archival-quality, searchable, and extractable Arabic PDFs:

- The **Controlled PDF path** (powered by Chromium/Puppeteer in Browserless, with proper PDF tag rendering) must be used.
- The Controlled PDF engine explicitly structures the document tree (`/ToUnicode` mapping table inside the PDF) to guarantee text selection matches correct logical reading order.

---

## 3. Scope & Release Status

This is a technical PDF format limitation and does **not** block the private beta visual release since the output is intended primarily for printing and visual reading. However, it remains documented for future text extraction optimization Sprints.
