# Visual Poster Outputs Structural Spot Check - Evidence Notes

**Review Date:** July 7, 2026  
**Status:** `Spot Check Pass for Limited Beta - structural/sanitized verification`

---

## 1. Context and Method

- **Review Method**: The visual layout coordinates and document compositions were inspected programmatically using a Vitest execution environment. A mock tree containing parents and root nodes was composited using `PublishingPipeline` to test the templates `classic-ancestor-poster` and `modern-ancestor-poster`.
- **RTL Arabic Placement**: Verified that Arabic text (e.g. `أحمد العربي`) is preserved without character distortion in the node display names.
- **Data Protection**: No private family images or screenshots are committed to this repository.

---

## 2. Verified Metrics

- **Classic Ancestor Poster:**
  - Width x Height: `1000 x 800`
  - Node count: `3` (Root: `x=440`, `y=720`; Father: `x=215`, `y=120`; Mother: `x=665`, `y=120`)
  - Edges count: `2` (connectors computed successfully)
- **Modern Ancestor Poster:**
  - Width x Height: `1000 x 800`
  - Node count: `3` (Root: `x=440`, `y=710`; Father: `x=220`, `y=130`; Mother: `x=660`, `y=130`)
  - Edges count: `2` (connectors computed successfully)
