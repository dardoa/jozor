# SVG Poster Image Asset Resolver

**Date:** 2026-07-13
**Status:** Runtime Implemented / Sanitized Visual QA Pass
**Owner Real-tree Review:** Pending
**Commit:** None

## Result

Visual Publishing Studio can now resolve owner-authorized person photos through a
controlled resource boundary and embed normalized image bytes in the canonical SVG.
Preview, PNG, and raster PDF consume the same embedded image assets and never receive
raw storage URLs as output markup.

This phase proved the secure photo pipeline. The follow-up Classic Heritage SVG
implementation now consumes it with larger overlapping portraits and a print-oriented
card treatment.

## Runtime Flow

```text
Owner tree person media reference
  -> private source resolver closure
  -> previewId + private source request
  -> PosterImageAssetResolver
  -> protocol / count / byte / image-signature validation
  -> data:image/...;base64 asset keyed by previewId
  -> PosterScene SVG Renderer
  -> Preview / SVG / PNG / Raster PDF
```

The media reference is used only while loading bytes. It is not copied into the
sanitized graph, `PosterScene`, SVG, DOM attributes, metadata, or exported files.

## Owner Controls

- `Show person photos` is enabled by default.
- `Hide photos of living people` is enabled by default.
- Existing privacy masking remains authoritative: masked/private nodes cannot obtain
  an image asset.
- Disabling photos removes image requests and returns all cards to initials.
- A failed or unsupported image falls back to initials without blocking the poster.

## Resolver Guardrails

- Only JPEG, PNG, and WebP signatures are accepted.
- HTTPS, same-origin HTTP, image data URIs, and browser blob sources are accepted.
- Insecure remote protocols are rejected.
- Default maximum image size is `5 MiB` per image.
- Default maximum image count is `31`.
- Only session `preview-node-N` identifiers are accepted.
- Duplicate sources are loaded once through an in-memory cache.
- Fetch uses omitted credentials and a no-referrer policy.
- Resolver results contain embedded data and preview IDs only.

## Sanitized Visual Evidence

The A3 landscape fixture was regenerated with the bundled Arabic font and six local,
sanitized portrait assets:

- Embedded images: `6`
- Failed images: `0`
- Raw/private image source in SVG: `false`
- `sameSvgForPng: true`
- `sameSvgForPdf: true`
- PDF pages: `1`
- PDF physical size: `420 x 297 mm`

Visual inspection confirmed circular image clipping, initials fallback for the masked
person, intact Arabic, and matching preview/PNG/PDF geometry.

Artifacts:

- `output/playwright/visual-studio-svg-default/arabic-ancestor-poster.svg`
- `output/playwright/visual-studio-svg-default/arabic-ancestor-poster.png`
- `output/playwright/visual-studio-svg-default/arabic-ancestor-poster-preview.png`
- `output/playwright/visual-studio-svg-default/arabic-ancestor-poster-pdf-page.png`
- `output/pdf/arabic-ancestor-poster-svg-default.pdf`
- `output/playwright/visual-studio-svg-default/metadata.json`

## Files

- `src/features/publishing/visualOutputs/posterImageAssetResolver.ts`
- `src/features/publishing/visualOutputs/studioPosterSvgRenderer.ts`
- `src/features/publishing/visualOutputs/ancestorTieredPosterLayout.ts`
- `src/features/the-vault/components/visual-studio/useVisualStudioStorePreviewSource.ts`
- `src/features/the-vault/components/visual-studio/VisualPublishingStudio.tsx`
- `src/features/the-vault/components/visual-studio/VisualOutputConfigPanel.tsx`
- `src/features/the-vault/components/visual-studio/visualStudioPosterOptions.ts`
- focused resolver, SVG, scene, privacy, and Studio tests

## Follow-up Status

Classic Heritage SVG is implemented and visually verified on A4 and A3 fixtures.
Photo visibility variants and additional card presets remain future product work.
