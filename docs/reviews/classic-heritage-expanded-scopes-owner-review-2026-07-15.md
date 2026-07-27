# Classic Heritage Expanded Scopes Owner Review

**Date:** 2026-07-15
**Status:** Descendants Pass / Full-tree Overview Foundation Implemented
**Commit:** None

## Review Scope

The owner review used the signed-in real tree through the local application. No tree
export, screenshot artifact, person record, image, or storage URL is committed with
this report.

## Descendant Poster

Configuration:

- scope: descendants;
- generation depth: four;
- document: A0 landscape;
- canonical engine: `descendant-tiered`;
- canonical rendering path: PosterScene -> SVG -> preview / PNG / raster PDF.

Observed result:

- 51 people were visible;
- 55 relationships were visible;
- no preview truncation notice appeared;
- PNG and PDF actions remained enabled.

The previous 15-person result was a false product boundary caused by applying the
binary ancestor formula to descendant branches. Descendants can have arbitrary child
counts, so their selection cap now follows the available sanitized source graph.

**Decision:** Pass for the expanded-scope runtime. A downloaded artifact still needs a
separate print-scale visual review before broad beta exposure.

## Full-tree Poster

Configuration:

- scope: full tree;
- document: A0 landscape;
- canonical engine: `family-network-tiered`.

Observed result:

- all 90 people were retained;
- all 155 supported relationships were retained;
- no silent data truncation occurred;
- the print-quality gate marked the scene unsuitable;
- PNG and PDF actions were disabled.

The Classic card layout cannot turn this density into a readable wall poster, even on
A0. Allowing the download would produce a visually misleading result.

**Decision at review time:** The full-tree selector and privacy boundary passed while
Classic full-tree export remained blocked.

## Follow-up Implementation

The full-tree path no longer uses Classic detail cards. It now selects the dedicated
`full-tree-overview` engine and `dense-overview` preset:

- compact name/year cards;
- no profile photos in overview nodes;
- all supported relationships retained;
- the same PosterScene-derived SVG used by preview and derived exports.

The A0 raster action remains blocked when the effective raster DPI is below the print
minimum. This is separate from layout density and will be resolved through a trusted
vector SVG/PDF path or the Tiled Wall Poster product, not by lowering the quality gate.

## Quality-gate Change

`PrintQualityReport` now receives connector count and layout-engine identity. A
`family-network-tiered` scene is blocked above either of these conservative limits:

- 48 visible people;
- 80 connectors.

The warning key is `poster.quality.network-too-dense` and no raw person identifiers are
included in it.

## Verification

- Targeted Vitest: 42 tests passed.
- TypeScript: passed.
- Scoped ESLint: passed with zero warnings.
- Real-tree browser review: completed.
- Commit: not created.

## Next Product Step

Visually review the new Overview composition on the real tree, then implement Branch
Collection. Tiled Wall Poster remains the third committed large-tree product. Do not
weaken the raster quality gate.
