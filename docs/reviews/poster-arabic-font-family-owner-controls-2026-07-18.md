# Poster Arabic Font Family Owner Controls

**Status:** Runtime Automated Pass / Owner Visual Review Pending

## Delivered Families

- Amiri Heritage, using the existing bundled `Amiri-Regular.ttf`.
- Noto Sans Arabic, using bundled `NotoSansArabic-Variable.ttf`.
- Noto Kufi Arabic, using bundled `NotoKufiArabic-Variable.ttf`.

Noto assets were sourced from the official Google Fonts repository and their SIL
Open Font License 1.1 files are stored beside the font assets. The application does
not call Google Fonts or any external font service at preview or export time.

## Canonical Flow

`Studio font choice -> PosterScene.fontFamily -> PosterFontAssetResolver -> embedded SVG font`

Style Default resolves to Amiri for Classic Heritage and Noto Sans Arabic for Modern
Gallery and Dense Genealogy. An owner can explicitly choose any of the three families.
The chosen TrueType file is loaded from the application origin, validated, cached per
family, converted to a data URI, and embedded into the canonical SVG. PNG, raster PDF,
Branch Collection, and Tiled Wall therefore inherit the same selected font.

## Safety

- Only allowlisted bundled paths are accepted.
- Empty, oversized, non-TrueType, external, traversal, and file-system paths are rejected.
- The SVG renderer rejects an identified font resource that does not match the scene.
- The exported markup contains no source font URL.
- Only the selected family is loaded and embedded.

## Verification

- Both new files have the TrueType `00 01 00 00` signature.
- Noto Sans Arabic: 844,676 bytes.
- Noto Kufi Arabic: 434,204 bytes.
- Both bundled license files declare SIL Open Font License 1.1.
- 125 targeted tests pass across resolver, scene, SVG, Branch Collection, and Studio.

Owner visual review remains required for representative long Arabic names, mixed
Arabic/year lines, and actual PNG/PDF output before visual signoff.

## Upstream

- https://github.com/google/fonts/tree/main/ofl/notosansarabic
- https://github.com/google/fonts/tree/main/ofl/notokufiarabic
