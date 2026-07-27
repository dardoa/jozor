# Classic Heritage Large-format Runtime

**Date:** 2026-07-14
**Status:** Runtime Implemented / Large-format Owner Print Review Pending
**Commit:** None

## Implemented Formats

Classic Heritage now has physical document specifications for:

| Size | Portrait millimeters | Canonical portrait scene | Raster scale |
|---|---:|---:|---:|
| A4 | 210 x 297 | 1200 x 1697 | 2x |
| A3 | 297 x 420 | 1600 x 2263 | 2x |
| A2 | 420 x 594 | 2263 x 3200 | 1.5x |
| A1 | 594 x 841 | 3200 x 4525 | 1x |
| A0 | 841 x 1189 | 4525 x 6400 | 1x |

Portrait and landscape use the same physical specification with oriented dimensions.
Margins increase with paper size so large posters retain a useful print-safe frame.

## Memory Safety

The raster scale is part of the poster document policy and is shared by:

- `PrintQualityReport` memory and DPI calculations;
- PNG rasterization;
- raster PDF generation.

Large formats therefore do not silently inherit the A4/A3 2x bitmap multiplier.
At A0, the canonical 1x raster is approximately 116 MiB before encoding and produces
about 137 DPI. The quality gate reports this as a review warning instead of attempting
a roughly 463 MiB 2x canvas.

## Runtime Boundary

- A2/A1/A0 are available in the Classic Heritage page-size selector.
- Preview, PNG, and PDF still consume the same PosterScene and SVG geometry.
- Low DPI, small physical text, overlap, truncation, and excessive memory remain
  explicit quality signals.
- Modern Gallery large formats are still planned.

## Approval Boundary

The runtime and automated geometry are implemented. A2/A1/A0 are not included in the
existing A3 ancestor owner visual approval. Physical print or print-service proofing is
still required before promoting the large formats to Limited Beta.
