# Studio SVG Print Delivery

**Date:** 2026-07-22
**Status:** Owner Runtime Pass
**Commit:** None

## Purpose

Expose the canonical poster SVG as an owner download instead of limiting the Studio
to raster PNG and raster PDF. This gives print shops a resolution-independent A0
artifact without adding another renderer or layout path.

## Runtime Path

```text
SanitizedPreviewGraph
-> PosterScene
-> canonical SVG renderer
-> Studio preview / direct SVG download / PNG rasterization / raster PDF
```

SVG download calls the existing `exportStudioPoster` adapter with `format: svg`.
It does not invoke Canvas, the PNG runtime, the PDF runtime, or legacy poster code.
The same print-quality block that protects PNG/PDF also protects SVG when scene
geometry or typography is unreadable.

## Owner-tree Review

The signed-in owner runtime was reviewed with Dense Genealogy, complete-tree scope,
all available generations, and A0 landscape.

- Visible graph: `90` people and `155` relationships.
- Downloaded file: `1,225,086` bytes.
- SVG scene size: `6400 x 4525` units.
- Declared physical size: `1189 x 841 mm` (A0 landscape).
- Embedded Arabic font resources: `1`.
- External asset links: `0`.
- Storage URLs, tokens, raw IDs, and media paths: not present.
- Scripts and `foreignObject`: not present.
- Mojibake markers: not present.
- The owner-facing Arabic SVG button, PNG button, and PDF button remain distinct and
  readable in the action bar.
- A concise bilingual format guide recommends SVG for large-format vector printing,
  identifies PDF as the current raster fallback, and identifies PNG as the
  high-resolution image option. Each download button references this guide for
  accessibility.

No private owner artifact was added to the repository.

## Product Contract

- SVG is the preferred print handoff when a printer accepts it.
- PNG remains the convenient high-resolution image output.
- PDF remains a one-page raster PDF fallback and is not presented as vector or
  searchable.
- Physical print proof is still required before premium wall-print quality receives
  final approval.

## Verification

- Visual Publishing Studio tests: `41` passed.
- Visual Output Action Bar tests: `4` passed.
- Studio Poster Export Adapter tests: `5` passed.
- Total targeted tests: `50` passed across the combined delivery suite.
- Owner runtime download and privacy scan: passed.
- Commit: not created.

## Decision

Studio SVG delivery receives **Owner Runtime Pass**. The Studio now exposes the
canonical vector artifact directly, closing the missing UI link between the SVG-first
architecture and print delivery.
