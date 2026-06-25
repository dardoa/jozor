# ADR-007: Markdown Manuscript Layer

## Status
Accepted (June 2026)

## Context
Sprint 18 introduced `FamilyManuscriptModel` as the stable intermediate structure for book-like publishing. It also established the HTML/CSS document renderer as the preferred output path for long-form manuscripts because browser layout handles Arabic shaping, RTL text, fonts, wrapping, and page flow better than vector PDF primitives.

Sprint 19 added a Markdown manuscript renderer and a `.md` export path. Markdown is valuable for review, interchange, future narrative workflows, and possible downstream formats, but it must not blur the renderer taxonomy established in ADR-006.

## Decision
Markdown is a **content and interchange layer** generated from `FamilyManuscriptModel`.

It is not the primary print renderer, and it does not replace the HTML/CSS document renderer for family manuscripts.

The canonical flow for long-form manuscripts remains:

```text
Family tree data
  -> FamilyManuscriptModel
  -> HTML/CSS document renderer
  -> browser preview / print / PDF
```

Markdown is an additional projection:

```text
Family tree data
  -> FamilyManuscriptModel
  -> Markdown manuscript renderer
  -> text review / interchange / future narrative and document workflows
```

## Intended Uses
Markdown output is appropriate for:

- Lightweight manuscript review outside the application.
- Copy editing and text-oriented collaboration.
- Future narrative generation handoff.
- Future HTML, EPUB, DOCX, or documentation-style publishing experiments.
- Debuggable inspection of the manuscript structure without requiring PDF generation.

## Boundaries
Markdown exports must respect the same publishing boundaries as other egress paths:

- Viewer exports must use masked people.
- Relationship data must prefer `RelationshipEdge` through the publishing relationship adapter.
- Sources and citations must come from the citation/evidence pipeline.
- User-facing Markdown exports should omit technical metadata by default.

## Non-Goals
This ADR does not approve:

- Replacing the HTML/CSS print renderer with Markdown-to-PDF.
- Moving manuscript pagination, typography, or RTL layout decisions into Markdown.
- Adding AI narrative generation directly inside the PDF or Markdown renderer.
- Creating a separate route or feature area for Markdown authoring.
- Treating Markdown as a third renderer family alongside document and graphic renderers.

## Consequences
- `FamilyManuscriptModel` remains the source of truth for manuscript content.
- HTML/CSS remains the preferred renderer for printable family books and previews.
- Markdown can evolve independently as a text/interchange renderer without destabilizing print output.
- Future narrative generation should produce structured manuscript content or Markdown fragments that are reconciled back through the manuscript model, not mutate PDF renderer internals.
- Future preview UX may expose Markdown only as an auxiliary text view if it provides clear user value.
- Tests should cover privacy and evidence behavior for Markdown separately from print layout behavior.
