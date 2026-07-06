# ADR 012: Visual Output Product Contract

## Status
Proposed

## Context
As the Jozor platform expands its publishing capabilities, we need to introduce more visual outputs (e.g. posters, fan charts, timeline visualizations, and maps).
Historically, exports in The Vault were organized by file formats (e.g. PDF, PNG, GEDCOM). However, as we scale, a single file format (like PDF) can be produced by very different products (e.g., a multi-page Family Book manuscript vs a large-format Ancestor Poster).
To prevent visual confusion and maintain architectural coherence, we must establish a clear domain-level Visual Output Product contract.

## Decision
We establish a domain-level Visual Output Product contract structured around a clear taxonomy hierarchy:

1. **Product Type**: The high-level intent/product category the user wants to produce (e.g., `poster`, `snapshot`, `fan-chart`, `timeline`, `migration-map`).
2. **Template**: The specific visual/layout implementation mapping logic to a structure (e.g. `classic-ancestor`, `modern-ancestor`, `current-tree`).
3. **Preset**: Future styling identity (e.g., warm vintage theme, dark indigo theme).
4. **Renderer**: The final output format / file type target (e.g. `png`, `pdf`, `svg`, `html`).

### Rationale
- **Product over Format**: Organizing outputs by product type rather than file format aligns the codebase with user intent. Selecting "PDF" could mean exporting a book, printing a poster, or getting a tree snapshot; selecting "Poster" maps to specific styling, sizing, and orientation rules, regardless of whether the final container is PDF or PNG.
- **De-coupling of Layout and Styles**: By separating layout engines (e.g., `poster-layout`, `radial-layout`) from presets, we lay the groundwork for a future Poster Studio where users can custom-style templates.
- **Deferred Visual Studio UI**: Groundwork in this phase is kept strictly architectural. No visual configuration controls (size selection, orientation, theme selectors) are exposed in the Vault UI until user feedback from the private beta is analyzed.

## Consequences
- The codebase gains a formal registry (`VISUAL_OUTPUT_DEFINITIONS`) mapping all visual templates, layout engines, and supported formats.
- Vault test suites can assert and verify output capabilities using the registered definitions.
- Future work on the Visual Publishing Studio has a stable domain layer to build upon.
