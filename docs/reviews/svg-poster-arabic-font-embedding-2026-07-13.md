# SVG Poster Arabic Font Embedding

**Date:** 2026-07-13
**Status:** Implemented / Visual QA Pass
**Commit:** None

## Result

Visual Publishing Studio now resolves the bundled `Amiri-Regular.ttf` through a
controlled font asset boundary and embeds it as a base64 font data URI in the
canonical poster SVG. Preview, direct SVG, PNG, and raster PDF therefore use the
same Arabic font resource without depending on a font URL at export time.

## Runtime Flow

```text
Bundled /fonts/Amiri-Regular.ttf
  -> PosterFontAssetResolver
  -> TrueType signature and size validation
  -> cached data:font/ttf;base64 resource
  -> PosterScene SVG Renderer
  -> Preview / SVG / PNG / Raster PDF
```

## Safety Rules

- The resolver accepts application-relative bundled asset paths only.
- External, protocol-relative, traversal, and file-system paths are rejected.
- Empty, oversized, or invalid TrueType payloads are rejected.
- The resolved binary is cached so preview and export do not reload the font.
- Export-ready SVG contains the font bytes, not `/fonts/...`, a cloud URL, or an
  authentication-bearing resource.
- Export waits for a valid font resource and reports failure instead of silently
  producing an unverified Arabic artifact.

## Visual Evidence

The A3 landscape Arabic fixture was regenerated with the real bundled font:

- `hasEmbeddedFont: true`
- SVG size: `582155` bytes
- PNG size: `621870` bytes
- PDF size: `267416` bytes
- `sameSvgForPng: true`
- `sameSvgForPdf: true`
- PDF pages: `1`
- PDF physical size: `420 x 297 mm`

Visual inspection confirmed intact Arabic shaping and identical typography and
geometry in PNG and PDF.

Artifacts:

- `output/playwright/visual-studio-svg-default/arabic-ancestor-poster.svg`
- `output/playwright/visual-studio-svg-default/arabic-ancestor-poster.png`
- `output/playwright/visual-studio-svg-default/arabic-ancestor-poster-preview.png`
- `output/playwright/visual-studio-svg-default/arabic-ancestor-poster-pdf-page.png`
- `output/pdf/arabic-ancestor-poster-svg-default.pdf`
- `output/playwright/visual-studio-svg-default/metadata.json`

## Files

- `src/features/publishing/visualOutputs/posterFontAssetResolver.ts`
- `src/features/publishing/visualOutputs/studioPosterSvgRenderer.ts`
- `src/features/the-vault/components/visual-studio/VisualPublishingStudio.tsx`
- `src/features/the-vault/components/visual-studio/VisualOutputPreviewPane.tsx`
- `src/features/publishing/visualOutputs/__tests__/posterFontAssetResolver.test.ts`
- `src/features/the-vault/components/visual-studio/__tests__/VisualPublishingStudio.test.tsx`
- `scripts/visual-studio-svg-default-artifacts.mjs`

## Next Resource Boundary

The follow-up `PosterImageAssetResolver` phase is now implemented. Owner-authorized
media references are resolved without exposing storage URLs, normalized to embedded
image data, and rendered through the same canonical SVG with initials fallback.
