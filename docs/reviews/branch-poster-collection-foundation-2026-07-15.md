# Branch Poster Collection Foundation

**Date:** 2026-07-15
**Status:** Digital Branch Index Pass / Physical Print Review Pending
**Commit:** None

## Delivered

- `BranchPosterCollectionRequest` defines the sanitized graph, anchor, shared title,
  document, direction, language, and theme.
- `BranchPosterCollectionManifest` provides deterministic ordering and collection
  telemetry.
- Each direct descendant of the anchor becomes one branch poster.
- Descendants are traversed without a binary-tree assumption.
- Generations are normalized relative to each branch root.
- Every item receives a canonical descendant-tiered PosterScene.
- Direct spouses are included beside their partners at the same generation. Other
  cross-branch relative or descendant links remain manifest references rather than
  invalid connectors inside another branch poster.
- A canonical branch-index scene accompanies the branch scenes. It contains only the
  collection anchor and numbered direct branches, with the represented-person count
  for each branch and no photos or life-year detail.
- The index uses a dedicated `branch-index-grid` layout instead of inheriting the
  full-tree network or descendant-tier spacing. The owner proof arranges ten branches
  as a compact `4 + 4 + 2` grid around one collection anchor.
- The Studio exposes the collection action only for full-tree scope when at least one
  descendant branch exists.
- The downloadable ZIP contains `overview.svg`, ordered `branches/*.svg`, a public
  `manifest.json`, and a localized `README.txt`.
- The ZIP SVG files reuse the same embedded font and normalized image resources as the
  Studio preview; storage URLs and raw identifiers are not written to the package.

## Privacy Boundary

The builder accepts `SanitizedPreviewGraph` only and rejects anchors that are not
session-isolated `preview-node-*` identifiers. It does not accept raw people, storage
URLs, contact fields, notes, or synchronization metadata.

## Current Delivery Boundary

The real-tree package was generated successfully with Dense Genealogy on A0 landscape:
10 branch posters, 84 represented people, and eight embedded photo occurrences. The
package contains no external image links or storage/token references. Invalid page and
preset combinations are now blocked before download.

The regenerated owner package `(5)` contains 14 files and a dedicated branch-index
overview. The index has one anchor card, ten numbered branch cards, no photos, no
external hrefs, and no storage/token/raw-ID indicators. Arabic text and README encoding
are intact. The browser visual review found the index balanced and materially clearer
than the previous technical overview; physical-size legibility remains an owner print
gate.

The following remain for later product phases:

- owner-facing branch selection and quality summaries;
- optional multi-page PDF and PNG-per-branch delivery;
- richer cover composition and assembly guidance;
- owner print review of Dense typography and connector density.

## Verification

- Branch Collection tests: 7 passed, including a printable ten-branch A0 index.
- Studio integration tests: 18 passed.
- Full visual-output engine suite: 139 passed.
- Studio and export-panel suites: 49 passed.
- TypeScript: passed.
- Scoped ESLint: passed with zero warnings.
- No commit was created.

## Next Step

Run a physical print review of the Dense branch posters and the new branch index,
then consider multi-page PDF and PNG-per-branch delivery. The digital branch-index
redesign gate is closed.
