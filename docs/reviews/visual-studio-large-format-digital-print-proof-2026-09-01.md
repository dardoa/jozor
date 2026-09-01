# Visual Studio Large-format Digital Print Proof

**Date:** 2026-09-01
**Status:** Digital print proof pass
**Physical printer status:** Pending representative sheets printed at 100%

## Scope

The proof runs through the real Studio controls and download events. It uses a
sanitized Arabic three-branch fixture, Classic Heritage vNext, embedded test photos,
and owner-full display. Raw fixture identifiers, private email, storage URL, and
authentication sentinels are scanned out of exported SVG and package content.

The executable gate is:

`tests/e2e/visual-studio-large-format-print-proof.spec.ts`

Run artifacts and the measured manifest are written to the ignored directory:

`output/playwright/visual-studio-large-format-print-proof/`

The representative files and print-provider checklist are bundled in:

`output/print-proof-handoff/visual-studio-physical-print-handoff-2026-09-01.zip`

See `docs/reviews/visual-studio-physical-print-handoff-2026-09-01.md` for the
physical acceptance procedure and truthful workstation-printer limitation.

## Single-sheet Results

| Size | PDF physical size | SVG embedded font | Embedded images | Result |
|---|---:|---|---:|---|
| A2 landscape | 594 x 420 mm | Yes | 10 | Pass |
| A1 landscape | 841 x 594 mm | Yes | 10 | Pass |
| A0 landscape | 1189 x 841 mm | Yes | 10 | Pass |

A2 also produced a valid 6400 x 4526 PNG. Every format used the same Classic
Heritage `photo-focused` SVG scene. No external image or font href was present.

## Package Results

- Branch Collection: 3 branch posters, 9 represented people, 6 archive files
  including the overview, manifest, and instructions.
- Tiled Wall: 3 x 3 A3 sheets, 9 ordered SVG tiles, 11 archive files, and an
  assembled trimmed size of 1184 x 815 mm.
- Both ZIP files were reopened during the test. Their manifests, sheet ordering,
  expected file counts, and privacy boundaries passed.

## Resource Race Closed

The first proof exposed that a download could begin while the bundled Arabic font
resolver was still running. That first SVG omitted the embedded font. Studio now
tracks poster font and image preparation explicitly, disables single-sheet and ZIP
downloads while resources are pending, allows failed photos to use initials, and
keeps Arabic export blocked if its print font cannot be prepared.

The regenerated A2/A1/A0 SVG files all contain `@font-face`, a base64 font data URI,
and zero external href values.

## Remaining Physical Gate

Digital evidence cannot substitute for paper. Before broad beta clearance, print:

1. One A2 Classic Heritage sheet at 100% and measure its trim dimensions.
2. Two adjacent Tiled Wall sheets at 100%, then verify crop marks, the 8 mm overlap,
   connector continuity, and Arabic baseline continuity.
3. The Branch Collection overview plus one dense branch sheet and review text size
   from normal wall-viewing distance.

Until those checks are signed by the owner or print provider, classification remains
`Digital Pass / Physical Printer Proof Pending`.
