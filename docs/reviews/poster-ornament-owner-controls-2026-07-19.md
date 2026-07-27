# Poster Ornament Owner Controls

**Status:** Runtime Automated Pass / Owner Visual Review Pending

## Scope

This pass adds a dedicated ornament layer that is independent from the poster
background treatment and page frame:

- None.
- Lineage Medallion.
- Modern Gallery Marks.
- Corner Branches.

Style Default resolves to Lineage Medallion for Classic Heritage, Modern Gallery
Marks for Modern Gallery, and None for Dense Genealogy or Branch Index.

## Canonical Rendering

`Studio choice -> PosterScene.ornament -> SVG renderer -> Preview/PNG/PDF/packages`

All motifs are local SVG geometry. They contain no external image, URL, script, or
foreign object. They are composed within the existing scene coordinate system and do
not alter cards, connectors, page bounds, or PrintQualityReport.

Branch Collection receives the selected ornament for its index and detail scenes.
Tiled Wall derives cropped sheets from the same decorated source scene, preserving
assembly parity rather than repainting each sheet independently.

## Verification

- Builder tests verify authored defaults and unchanged tree geometry.
- Renderer tests verify all motifs and absence of external resources.
- Studio tests verify live owner selection through the canonical SVG preview.
- Branch Collection tests verify propagation through packaged scenes.
- 123 targeted tests pass.

Owner visual review remains required across Classic, Modern, Dense, and a tiled crop
before visual signoff. Particular attention should be paid to title clearance, corner
balance, and whether motifs remain subtle on A4 and A3.
