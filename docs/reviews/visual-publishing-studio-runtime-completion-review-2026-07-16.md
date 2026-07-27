# Visual Publishing Studio Runtime Completion Review

**Date:** 2026-07-16
**Status:** Runtime Foundation Pass / Visual Product Review Continues
**Commit:** None

## Product Boundary

The Studio is now the owner-facing poster runtime. Legacy poster PDF generation is
not used by the Studio. The canonical path is:

```text
Owner tree selector
-> production sanitizer
-> SanitizedPreviewGraph
-> layout engine
-> PosterScene
-> SVG renderer
-> Studio preview / SVG package / PNG / raster PDF
```

Preview and export consume the same `PosterScene` geometry. PNG and raster PDF are
derived from the canonical SVG rather than receiving separate layout logic.

## Implemented Runtime

- SVG-first poster rendering with embedded Arabic font resources.
- Owner-controlled profile photos resolved into normalized embedded image assets.
- Owner-selectable circular, square, and soft-corner photo/fallback geometry shared by
  preview, PNG, raster PDF, tiled scenes, and branch poster scenes.
- No storage URLs, authentication tokens, raw project IDs, or contact fields enter
  the poster scene or exported SVG artifacts.
- Ancestor, descendant, and full-tree scopes.
- One through four generations plus all available generations.
- Vertical and horizontal tree directions.
- A4, A3, A2, A1, and A0 document specifications.
- Shared preview, high-resolution PNG, and one-page raster PDF geometry.
- Direct canonical SVG download for resolution-independent print handoff.
- Print-quality blocking for unreadable single-sheet combinations.
- Tiled Wall Poster ZIP export with print marks, overlap, assembly metadata, and a
  lower-cost grid recommendation.
- Branch Collection ZIP export with overview, ordered SVG branch posters, manifest,
  localized instructions, direct spouse inclusion, and privacy-safe embedded photos.
- Classic Heritage, Modern Gallery, and Dense Genealogy runtime style directions.

## Real-tree Evidence

### Single-sheet poster

- A real descendant poster was generated at A0 landscape from the signed-in owner
  tree.
- The scene contained 51 visible people and six embedded photos.
- PNG and raster PDF were generated from the same SVG scene.
- The PDF was one physical A0 page and visually matched the PNG.
- Arabic text remained readable with no mojibake.
- The result confirmed that Classic Heritage becomes too diagram-like at this
  density; Dense Genealogy or a large-tree product is the correct recommendation.

### Branch Collection

- Actual package: 10 ordered branch posters plus overview, manifest, and README.
- 84 unique people are represented across the branch set.
- Direct spouses are retained in their partner's generation without importing an
  unrelated external branch.
- The photo-enabled package contains eight embedded photo occurrences.
- SVG scan found zero external image links and zero storage/token references.
- Dense Genealogy at A0 landscape packaged successfully.
- An invalid Classic/A3 combination is now detected before download; the Studio asks
  for a larger page or Dense Genealogy instead of exposing a silent failed action.

### Tiled Wall Poster

- The existing real-tree proof contains 30 valid A2 landscape sheets in a 6x5 grid.
- The Studio recommends a lower-cost 4x4 alternative while preserving readable text.
- Digital assembly checks passed. Physical print, trim, and wall-alignment proof is
  still pending.

## Direction Status

### Classic Heritage

Operational for small and medium ancestor/descendant scopes. Single-sheet large-tree
use remains blocked by the print-quality gate. It still needs final wall-art polish
before beta positioning as the flagship visual product.

### Modern Gallery

Runtime theme, registry entry, privacy-safe photos, and real-tree preview ingestion
are implemented. The previous "dark ancestor" wording was removed because it no
longer represents the product direction. A real-tree A3 landscape descendant poster
was exported to PNG and one-page raster PDF. The owner review found and corrected an
SVG `currentColor` inheritance defect that made secondary text dark on the dark
surface. Regenerated PNG/PDF artifacts preserve readable Arabic, privacy masking,
embedded photos, and shared geometry. Modern Gallery now has an Owner Digital Export
Pass; physical print proof and wider density fixtures remain open.

### Dense Genealogy

Runtime theme and compact card preset are implemented. It is the practical direction
for large branch packages and high-density posters. A real-tree A3 landscape
descendant poster was exported to PNG and one-page raster PDF. Review first exposed
a below-floor name size, then an avatar/name collision after the typography correction.
The Dense preset now keeps names at or above eight physical points and reserves clear
space between compact avatars and text. Regenerated PNG/PDF artifacts passed Arabic,
privacy, image, and shared-geometry inspection. The actual 90-person complete owner
tree was then reviewed at A0 landscape: A3 was correctly blocked, while A0 produced a
single `6400 x 4525` PNG and one-page raster PDF with 155 relationships, five
generations, intact masking, and no mojibake or blank pages. Dense Genealogy now has
an Owner Digital Export Pass and Real-tree A0 Overview Pass; physical print proof
remains open.

## Remaining Gates

1. Physical print proof for Modern Gallery and Dense Genealogy, plus physical assembly
   proof for Tiled Wall Poster. Dense A0 currently renders at approximately `137 DPI`
   and is correctly presented with a print-density warning.
2. Continue richer owner controls from the long-term vision. Birth/death-year,
   safe relationship, sanitized birthplace, and sanitized occupation controls are
   implemented, together with subtle/classic/bold connector presets, safe footer
   identity composition, coordinated print palettes, constrained custom background,
   card, accent, and connector colors, and safe SVG-native clean/paper/lineage-grid
   background treatments, balanced/larger-name/compact typography-density presets,
   small/standard/large person-card sizes, flat/soft/elevated card depth effects, and
   minimal/classic/lightly-ornate card frames, square/soft/rounded card corners, and
   none/minimal/heritage/gallery page
   frames, plus straight/stepped/curved generation-connector paths and
   compact/balanced/generous print margins, plus compact/balanced/airy tree-spacing
   presets. Three embedded Arabic font families are now available: Amiri, Noto Sans
   Arabic, and Noto Kufi Arabic. A privacy-sanitized, owner-controlled short
   descriptive line is also available and remains off by default. Externally
   governed decorative assets, background imagery, and advanced freeform spacing
   remain.
3. Vector PDF remains optional future work. Raster PDF is the truthful current PDF
   contract. Direct SVG download now provides the vector print path without claiming
   that the PDF itself is vector or searchable.

## 2026-07-17 Follow-up

The Branch Collection overview was replaced with a dedicated branch index. It now
shows the collection anchor plus numbered direct branches and represented-person
counts, matching the ordered files in `branches/`. It intentionally excludes photos
and life-year detail. The package manifest declares `overviewKind: branch-index`, and
the localized README explains the mapping. A ten-branch A0 fixture passes without
card overlap. The real-tree owner package was regenerated and visually reviewed with
a dedicated `branch-index-grid` layout (`4 + 4 + 2` branch cards); the digital redesign
gate passed while owner physical print review remains required.

Modern Gallery was then reviewed through actual owner-tree A3 landscape PNG and PDF
exports. A shared SVG foreground inheritance defect was corrected and covered by a
regression test. Regenerated artifacts passed Arabic legibility, privacy masking,
photo embedding, one-page PDF sizing, and preview/export geometry review. See
`modern-gallery-owner-export-review-2026-07-17.md`.

Dense Genealogy was reviewed through the same owner-tree A3 landscape delivery path.
The compact preset was corrected to satisfy the physical name-size floor and to keep
the avatar ring clear of Arabic names. Regenerated PNG and one-page PDF artifacts
passed digital review. See `dense-genealogy-owner-export-review-2026-07-17.md`.

The first cross-theme card customization is also active: the owner can select circular,
square, or soft-corner photo geometry. The choice is stored in PosterScene and drives
the same SVG clipping and fallback geometry in preview, PNG, and PDF. A real-tree A3
PNG/PDF soft-corner export passed digital review. See
`poster-photo-shape-owner-control-2026-07-17.md`.

The complete owner visual-control layer was then reviewed in the signed-in runtime.
Card detail controls, connector weight, footer identity, and all four coordinated
palettes were exercised on the real Arabic tree. A 74-person all-generation descendant
selection correctly triggered the A3 print-quality block; a two-generation selection
rendered normally. SVG inspection found no raw IDs, storage URLs, or private fields.
See `poster-owner-visual-controls-review-2026-07-17.md`.

The single-sheet quality gate now includes direct, reversible recovery routes. An
owner can switch to Dense Genealogy, try A0 landscape, or prepare the full large-tree
workspace. The latter selects the full-tree overview, all generations, Dense
Genealogy, and A0 landscape, exposing Branch Collection and Tiled Wall without
starting a download or bypassing quality checks. See
`poster-large-tree-routing-pass-2026-07-17.md`.

The owner can now fine-tune four safe color roles above the authored palette. Values
are normalized at the PosterScene boundary, foreground contrast is derived separately
for the poster and cards, and Branch Collection/Tiled Wall reuse the same scene tokens.
See `poster-theme-fine-tuning-owner-controls-2026-07-17.md`.

The owner can also select Clean, Heritage Paper, or Subtle Lineage Grid treatments,
or retain the authored style default. These are internal SVG patterns stored on the
canonical PosterScene, so preview and every derived artifact share the treatment
without geometry changes or remote assets. The real-tree Arabic runtime review passed.
See `poster-background-decoration-owner-controls-2026-07-17.md`.

Typography hierarchy now has three export-safe density presets: Balanced, Larger
Names, and Compact. The scene builder applies the preset before long-name fitting,
the shared SVG applies it to the poster heading, and PrintQualityReport evaluates the
resulting card names. Compact mode does not bypass blocked large-tree output. See
`poster-typography-hierarchy-owner-controls-2026-07-17.md`.

Person-card size is now a canonical layout input with Small, Standard, and Large
choices. The scene builder scales card and photo geometry before layout, and the
shared renderer consumes the resulting rectangles without a second calculation. The
real-tree review confirmed that a large-card 90-person full tree remains blocked as a
single sheet. See `poster-person-card-size-owner-controls-2026-07-17.md`.

Card depth is now a canonical SVG-native effect with Flat, Soft Shadow, and Elevated
choices plus authored style defaults. Classic defaults to Soft, Modern to Elevated,
and Dense or Branch Index to Flat. The effect changes no scene geometry and carries
through all SVG-derived output. See `poster-card-depth-owner-controls-2026-07-17.md`.

Card frames now support Minimal, Classic, and Lightly Ornate treatments plus authored
style defaults. The ornate choice adds one internal SVG frame while preserving scene
geometry; Modern and Dense remain Minimal by default. See
`poster-card-frame-owner-controls-2026-07-17.md`.

The overall poster frame can now be removed or selected as Minimal, Heritage, or
Modern Gallery independently of the person-card frame. All variants are SVG-native
and preserve tree geometry. See `poster-page-frame-owner-controls-2026-07-17.md`.

Generation connectors can now use Straight, Stepped Corners, or Curved paths while
preserving the same scene endpoints. Spouse and relative lines remain straight for
semantic clarity. Classic defaults to Curved, Modern to Straight, and Dense or Branch
Index to Stepped Corners. See
`poster-connector-path-owner-controls-2026-07-17.md`.

Person cards can now use Square, Soft, or Rounded corners while preserving card
dimensions and tree geometry. Classic defaults to Soft, Modern to Rounded, Dense to
Square, and Branch Index to Soft. Automated runtime verification passed; signed-in
owner visual review remains pending because the local browser surface was unavailable
for this pass. See `poster-card-corner-owner-controls-2026-07-17.md`.

Print margins now have Compact, Balanced, and Generous presets. The selected physical
margin is converted into canonical scene insets before layout, and print quality is
re-evaluated against the resulting bounds. Branch Collection receives the same
document contract; Tiled Wall retains separate sheet assembly margins. See
`poster-print-margin-owner-controls-2026-07-18.md`.

Tree spacing now has Compact, Balanced, and Airy presets plus authored style defaults.
The tiered, family-network, full-tree, and branch-index engines consume the selected
preset before SVG rendering, and PrintQualityReport evaluates the resulting geometry.
See `poster-tree-spacing-owner-controls-2026-07-18.md`.

Person-card content layout now supports Standard, Photo-focused, and Text-minimal
compositions plus authored style defaults. The builder changes card and portrait
geometry before layout, the SVG renderer omits the portrait region entirely in
Text-minimal mode, and all derived outputs consume the same reflowed scene. See
`poster-card-layout-owner-controls-2026-07-18.md`.

Arabic poster typography now offers three genuinely bundled families rather than CSS
aliases: Amiri Heritage, Noto Sans Arabic, and Noto Kufi Arabic. PosterScene records
the choice, the resolver validates and caches the matching local TrueType asset, and
the shared SVG embeds only that asset for preview and every derived format. See
`poster-arabic-font-family-owner-controls-2026-07-18.md`.

The poster now has an SVG-native ornament layer separate from background and frame
treatments. Owners can remove ornamentation or choose a lineage medallion, modern
gallery marks, or quiet corner branches. The choice changes no tree geometry and is
preserved through single-sheet, Branch Collection, and Tiled Wall output. See
`poster-ornament-owner-controls-2026-07-19.md`.

Person cards now offer an optional short descriptive line. The store biography is
read only inside the raw selector boundary; the production sanitizer removes control
characters, caps the result to 90 Unicode characters, and withholds it from living or
private profiles. PosterScene receives only `descriptionLabel`, and Dense cards adapt
their name treatment when all optional details are enabled. See
`poster-person-description-owner-control-2026-07-19.md`.

Poster title composition now has three canonical scene presets. Classic Heritage
defaults to a centered Ceremonial title, Modern Gallery to a high-contrast Gallery
Rail, and Dense Genealogy or Branch Index to a Compact Registry with localized people
and generation counts. The owner can override the style default without moving tree
geometry. See `poster-header-composition-owner-controls-2026-07-19.md`.

The complete-tree overview now reserves header space according to its compact product
composition instead of inheriting the larger detailed-poster ratio. The signed-in
90-person A0 scene uses the recovered space for the graph while preserving the shared
PosterScene/SVG geometry, all 155 relationships, and the detailed ancestor/descendant
layout contract. See `dense-genealogy-owner-export-review-2026-07-17.md`.

The owner can now download that canonical SVG directly from the Studio. The real-tree
Dense A0 artifact declares the correct physical A0 landscape size, embeds its Arabic
font, and contains no external asset links, storage references, scripts, or raw IDs.
PNG and raster PDF remain derived alternatives. See
`studio-svg-print-delivery-2026-07-22.md`.

## Decision

The Studio runtime foundation is complete enough for continued owner review and
controlled product iteration. It is not yet a final visual-product pass. Classic,
Modern, Dense, Branch Collection, and Tiled Wall Poster must retain their individual
review gates rather than receiving one blanket beta status.
