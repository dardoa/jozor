# ADR 015: SVG as the Default Poster Rendering Format

## Status

`Accepted`

## Date

2026-07-13

## Context

Visual Publishing Studio produces print-first family wall posters. Poster output
needs one visual source for the on-screen preview and every downloadable format,
especially as card themes, embedded photos, Arabic typography, and large physical
page sizes are added.

The previous Studio path rendered `PosterScene` as HTML/CSS for preview and then
captured that document for PNG and raster PDF. Although it shared geometry, the
browser document was still the visual source and made print fidelity dependent on
HTML layout and screenshot behavior.

## Decision

SVG is the canonical visual renderer for poster products:

```text
SanitizedPosterGraph
        |
        v
ancestor-tiered Layout Engine
        |
        v
PosterScene
        |
        v
PosterScene SVG Renderer
        |-------------------|-------------------|
        v                   v                   v
Studio Preview         SVG Download       SVG Rasterization
                                                |---------|
                                                v         v
                                               PNG   Raster PDF fallback
```

- `PosterScene` remains the sole geometry model.
- `renderPosterSceneToSvg` is the official default visual renderer.
- Studio preview displays that SVG directly.
- SVG download returns that same serialized visual document.
- PNG rasterizes the same SVG at the requested pixel ratio. Canvas is a raster
  sink only; it does not calculate layout or draw poster primitives independently.
- PDF currently embeds the SVG-derived PNG on a one-page physical document whose
  millimeter dimensions come from `PosterDocumentSpec`.
- Vector PDF may replace the fallback only after Arabic shaping, embedded fonts,
  images, clipping, and physical-size parity pass a dedicated quality gate.

The poster is a print artifact. Searchable or selectable PDF text is not a current
product requirement.

## Resource Boundary

The SVG renderer accepts sanitized scene data only. It must not receive raw person
entities, raw database IDs, storage URLs, authentication tokens, local media paths,
or synchronization metadata.

External font and image URLs are not permitted in export-ready SVG. Future resource
resolvers must provide normalized, owner-authorized embedded resources such as
base64 font data and image data/blob/bitmap assets. Failed assets must resolve to a
safe fallback before rendering.

## Runtime Capability Truth

- Poster registry definitions declare `svg` as `defaultRenderer`.
- Poster runtime targets are `svg`, `png`, and `pdf`.
- Tree Snapshot remains raster-only and is not included in this decision.
- A4 and A3 remain the current physical poster sizes.
- A2, A1, and A0 stay planned until memory and print-quality safeguards exist.

## Transitional State

- Raster PDF is an explicit fallback, not a vector-PDF claim.
- The bundled Amiri Arabic font is resolved, validated, cached, and embedded as a
  data URI by `PosterFontAssetResolver`; export no longer depends on a font URL or
  an installed client font.
- Owner-authorized profile photos are resolved through `PosterImageAssetResolver`
  and embedded as normalized JPEG/PNG/WebP data assets. Decorative assets remain
  future theme resources.
- The previous HTML poster renderer remains in the repository for historical tests,
  but the active Studio preview and Studio export adapter no longer import it.

## Consequences

Positive:

- Preview, SVG, PNG, and PDF share one serialized visual source.
- Geometry parity is structural rather than approximate.
- SVG creates a suitable foundation for print themes, connectors, images, and
  future large-format output.
- Arabic output is no longer dependent on a separate PDF text pipeline.

Costs:

- Export-ready fonts and images require controlled embedding resolvers.
- Very large SVG rasterization needs memory-aware tiling or scale limits.
- Vector PDF remains a separate compatibility investigation rather than an assumed
  capability.

## Superseded Guidance

ADR 014 remains authoritative for sanitized preview data boundaries. Its earlier
recommendation to keep preview and export renderers independent is superseded for
poster visuals by this decision: adapters and sanitizers remain isolated, while the
final sanitized `PosterScene` is rendered once through SVG for both preview and
export.

## Classic Heritage Implementation

The first production visual style on this path is `classic-heritage`. Its card
geometry, photo treatment, typography, and visual identity are declared by
`PosterCardPreset`; the SVG renderer applies the theme without recalculating scene
positions. The implementation includes embedded owner-authorized portraits, an
initials fallback, curved relationship paths, a warm print surface, a restrained
double frame, a ceremonial Arabic heading, and an integrated footer.

The former `classic-standard` card is retired as the Minimal Technical Tree
Baseline. `classic-heritage` is the current Classic poster direction for A4/A3
ancestor posters. Modern Gallery, Dense Genealogy, large formats, and additional
tree scopes remain separate gated work.
