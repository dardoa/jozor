# ADR-008: Renderer Independence

## Status
Accepted (June 2026)

## Context
Jozor publishing has grown from simple exports into a publishing platform. Recent sprints introduced structured manuscript data, relationship-edge adapters, citations, privacy masking, data-integrity summaries, HTML/CSS print output, and Markdown interchange output.

As manuscript features continue to evolve, it is tempting to mix content decisions, layout decisions, and visual styling inside individual renderer functions. That would make future narrative generation, preview configuration, and design-system work harder to change without breaking publishing behavior.

## Decision
Presentation is not business logic.

`FamilyManuscriptModel` is the source of truth for manuscript content. Renderers are responsible for projecting that model into a specific output format. Theme and layout tokens are responsible for visual presentation.

The publishing stack should keep these layers separate:

```text
Domain data
  -> FamilyManuscriptModel
  -> Renderer
  -> Theme / layout tokens
  -> Output
```

## Rules
- Content selection belongs in builders and model construction, not in CSS or renderer styling.
- Relationship, citation, privacy, and integrity decisions must happen before rendering.
- Renderers may format and escape content, but should not decide what facts are true or which relationships exist.
- Fonts, colors, spacing, borders, card radii, and similar presentation values should be grouped in theme tokens rather than scattered as unrelated literals.
- The current manuscript design may remain plain while the publishing core stabilizes.

## Non-Goals
This ADR does not start a final visual design pass.

It does not define the final cover, typography, branding, icons, ornaments, or chapter-openers. That work belongs in a later Publishing Design System sprint after preview, configuration, and narrative behavior stabilize.

## Consequences
- Sprint 18E preview/configuration can proceed without committing to a final manuscript look.
- Future narrative generation should alter manuscript content through the model or a narrative layer, not by editing renderer internals.
- Future visual polish can replace the theme and renderer presentation without rewriting relationship, citation, privacy, or integrity logic.
- Tests should distinguish content correctness from visual token choices.
