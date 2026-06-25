# ADR-006: Publishing Renderer Taxonomy

## Status
Accepted (June 2026)

## Context
Sprint 18 introduced an HTML/CSS print renderer for the Family Manuscript after the vector PDF path proved unsuitable for long Arabic/RTL documents. The immediate trigger was Arabic typography, but the broader architectural lesson is not language-specific.

The publishing layer now has two practical rendering families:

1. **Long-form document rendering**: books, family manuscripts, bibliography pages, evidence-aware chapters, and previewable print layouts.
2. **Graphic/vector rendering**: posters, charts, certificates, compact reports, and diagram-like outputs.

Treating these paths as "Arabic renderer" versus "English renderer" would be a design mistake. Future English manuscripts should also benefit from HTML/CSS pagination, preview, typography, and browser print behavior. Likewise, Arabic graphic posters may still require vector/canvas rendering.

## Decision
Jozor publishing renderers are classified by **output purpose**, not by language or implementation technology.

### Renderer Families

#### Document / Manuscript Renderer
Use the HTML/CSS print renderer for long-form, paginated, text-heavy outputs:

- Family manuscripts and books.
- Biography and branch chapters.
- Timeline chapters.
- Bibliography and citation/evidence pages.
- Preview-first workflows where the user reviews the document before export.

This renderer may be implemented with browser HTML/CSS print today and may later support Markdown, EPUB, DOCX, or server-side print pipelines. The stable concept is the document purpose, not the specific technology.

#### Graphic / Vector Renderer
Use vector/canvas/jsPDF-oriented renderers for compact, graphic-heavy outputs:

- Posters.
- Tree diagrams and visual charts.
- Certificates.
- Small reports where precise vector drawing matters more than text pagination.

This renderer may continue using jsPDF, canvas, SVG capture, or another vector backend. The stable concept is graphic export purpose.

## Naming Guidance
Current implementation names such as `html-print` and `vector-pdf` are transitional technical identifiers. They should not be exposed in user-facing copy as language-specific choices.

User-facing labels should describe the output:

- "Manuscript print layout"
- "Printable family manuscript"
- "Poster / chart export"
- "Graphic PDF"

Future code should prefer purpose-oriented names around:

- `document`
- `manuscript`
- `book`
- `graphic`
- `poster`

Any future rename should be done as a contained cleanup package after the current Sprint 18E preview/configuration work stabilizes.

## Consequences
- HTML/CSS print becomes the preferred path for all family manuscripts, regardless of language.
- jsPDF remains valid for posters, charts, certificates, and compact vector reports.
- Preview UX should build on the document/manuscript renderer, not on the vector PDF renderer.
- Markdown is governed by ADR-007 as a content/interchange layer under the manuscript/document family, not as a replacement for the HTML/CSS output renderer.
- Publishing tests should assert renderer selection by template/output kind, not by UI language.
- Future documentation should avoid describing the HTML renderer as an "Arabic PDF workaround"; it is the long-form document renderer.

## Deferred Work
- Add purpose-oriented metadata to publishing templates, for example `outputFamily: 'document' | 'graphic'`.
- Rename internal renderer identifiers only after current feature work is stable.
- Keep expanding the Markdown manuscript layer only as a content/interchange projection of `FamilyManuscriptModel`.
- Keep jsPDF/vector renderers focused on graphic outputs unless a specific document use case proves otherwise.
