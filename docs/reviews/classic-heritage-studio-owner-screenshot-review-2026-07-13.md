# Classic Heritage Studio Owner Screenshot Review

**Date:** 2026-07-13
**Status:** Pass as Owner Studio Integration / Sanitized Guest QA
**Owner Real-tree Review:** Pending
**Commit:** None

## Review Result

The Visual Publishing Studio now presents Classic Heritage as one coherent owner
workflow. The upper area is a dominant, responsive SVG poster preview; the side
panel contains only meaningful poster choices; and the PNG/PDF actions consume the
same canonical `PosterScene` and serialized SVG shown in the preview.

The screenshot review passes the Studio integration gate. It does not yet pass the
real-family visual gate because the application walkthrough used a sanitized guest
tree containing a single placeholder root.

## Verified Owner Experience

- Arabic owner-facing copy is intact and free from mojibake.
- A3, landscape page orientation, horizontal tree direction, and four generations
  are the default wall-poster configuration.
- The canonical SVG scales responsively inside the preview without calculating a
  second layout or changing scene geometry.
- The poster preview has visual priority over the configuration panel.
- Technical telemetry such as `sanitized-data`, `masked`, layout engine ids, and
  truncation debugging is absent from the owner interface.
- The configuration panel contains only output type, root, title, description,
  generations, tree direction, page size, page orientation, and privacy/photo
  choices.
- PNG and PDF are presented as the Studio download actions; no disabled shell
  actions or competing legacy poster controls appear inside the Studio.
- No raw person id, storage URL, or private metadata is visible in the reviewed DOM
  or screenshot.

## Screenshot Evidence

- `output/playwright/visual-studio-owner-ui/application-state.png`
- `output/playwright/visual-studio-owner-ui/classic-heritage-studio-desktop.png`

The reviewed Studio screenshot was captured from the real application flow in
Arabic after entering as a guest, creating a sanitized tree, opening The Vault, and
selecting Visual Outputs.

## Known Review Boundary

The guest fixture contains one visible person and no relationships. It confirms UI
hierarchy, responsive SVG framing, Arabic labels, defaults, and privacy-safe
integration, but it cannot establish poster density, real-photo composition, long
Arabic-name behavior, or four-generation balance for the owner's actual tree.

## Next Gate

Run a real-tree Classic Heritage owner visual review with representative photos and
two to four ancestor generations. Compare Studio preview, PNG, and raster PDF for:

- identical composition and geometry;
- readable Arabic names and mixed RTL/LTR years;
- balanced use of A3 landscape space;
- successful photo embedding and safe fallbacks;
- no clipped cards, orphan nodes, empty pages, or private source leakage.
