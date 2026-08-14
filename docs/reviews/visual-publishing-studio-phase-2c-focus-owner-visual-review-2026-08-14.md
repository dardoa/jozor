# Visual Publishing Studio Phase 2C - Focus Owner Visual Review

**Date:** August 14, 2026
**Evidence status:** Promoted (8 scenarios verified)
**Internal visual recommendation:** Pass with polish
**Owner visual status:** Pending Owner Confirmation
**Production approval:** No independent owner approval recorded

## Decision

The Focus Family poster path is technically complete and visually coherent enough for owner review. It receives an internal recommendation of **Pass with polish**.

The review does not grant production approval. Final approval remains with the owner after inspecting the promoted full-resolution PNG, SVG, PDF, and Studio screenshots.

## Reviewed Contract

Every successful scenario uses the same `PosterScene` geometry through the canonical SVG renderer and derives PNG and one-page raster PDF from that SVG. The review verifies:

- `focus-family` is the active scene engine.
- The focal card remains at the exact printable tree center.
- Ancestor and descendant depths are independent.
- Vertical and horizontal directions preserve the same relationship model.
- Spouses and siblings remain contextual companions around the focal person.
- No card overlaps or printable-boundary escapes occur.
- Person names remain at or above the 8pt print threshold.
- Masking removes living/private identity details.
- SVG content and filenames contain no raw IDs, session tokens, preview IDs, storage URLs, emails, or auth sentinels.
- Overcrowded A4 compositions stop before export and present a recovery route.

## Evaluation Matrix

| Scenario | Measured result | Technical gate | Visual recommendation |
|---|---|---|---|
| 1. Focal only, A4 portrait | 1 node, 0 connectors, focal offset 0.02 units, minimum name font 11.86pt, PNG 2400 x 3394 | Pass | Pass with polish |
| 2. Balanced family, A3 portrait, vertical | 12 nodes, 13 connectors, no overlaps or escapes, minimum name font 11.21pt | Pass | Pass |
| 3. Balanced family, A3 landscape, horizontal | 12 nodes, 13 connectors, exact focal center, no overlaps or escapes, minimum name font 11.21pt | Pass | Pass |
| 4. Arabic long names, A2 landscape | 12 nodes, 13 connectors, valid Arabic shaping, no mojibake or clipping, minimum name font 8.36pt | Pass | Pass |
| 5. Living/private masking, A3 portrait | 12 nodes, 13 connectors, protected people masked, private sentinels absent | Pass | Pass |
| 6. Ancestor-heavy 4/1, A2 portrait | 6 nodes, 5 connectors, exact focal center, asymmetric depth retained | Pass | Pass |
| 7. Descendant-heavy 1/4, A2 landscape | 6 nodes, 5 connectors, focal offset 0.02 units, asymmetric depth retained | Pass | Pass |
| 8. Dense Focus, A4 portrait | Controlled capacity message, disabled SVG/PNG/PDF actions, zero downloads | Expected blocked | Pass |

## Visual Findings

### Composition

- Balanced vertical and horizontal scenes make the focal person immediately identifiable.
- Ancestors and descendants occupy opposite sides of the focal card consistently.
- The A2 asymmetric fixtures demonstrate that a deep side does not displace the focal person from the scene center.
- Page frames, titles, ornaments, cards, and footer remain aligned across all exported formats.

### Arabic and Privacy

- Long Arabic names render as valid joined Arabic text with no replacement characters or mojibake.
- Mixed Arabic text and Latin year ranges remain readable.
- Masked people use neutral labels and omit identifying years and photo content.
- Exported filenames and artifacts contain no raw person identity or internal storage data.

### Capacity Recovery

- A dense Focus request on A4 fails as a controlled print-capacity state rather than producing overlapping or unreadable cards.
- The Studio keeps download actions disabled and offers larger paper, a denser product, or large-tree product routes.

## Non-Blocking Polish Backlog

1. **Single-person utilization:** a focal-only poster is geometrically correct but visually sparse. A later adaptive Focus composition may enlarge the single card or introduce a dedicated portrait treatment without moving the canonical focal center.
2. **Central connector density:** spouse, sibling, ancestor, and child connectors can cross near the focal card in balanced scenes. A later routing pass may assign connector lanes while preserving card geometry and relationship correctness.
3. **Default wording:** fixture outputs retain the generic `Ancestor Tree` title and direct-ancestor footer unless the owner customizes them. Product copy can later adapt automatically to Focus scope without changing the layout engine.

None of these findings causes clipping, overlap, privacy leakage, format divergence, or an invalid print artifact.

## Evidence

- Permanent E2E specification: [visual-studio-focus-owner-review.spec.ts](../../tests/e2e/visual-studio-focus-owner-review.spec.ts)
- Evidence manifest: [evidence-manifest.json](./evidence/visual-publishing-studio-phase-2c-focus-owner-review-2026-08-14/evidence-manifest.json)
- Arabic A2 poster: [04-arabic-long-names-a2.png](./evidence/visual-publishing-studio-phase-2c-focus-owner-review-2026-08-14/04-arabic-long-names-a2.png)
- Balanced vertical poster: [02-balanced-vertical-a3.png](./evidence/visual-publishing-studio-phase-2c-focus-owner-review-2026-08-14/02-balanced-vertical-a3.png)
- Balanced horizontal poster: [03-balanced-horizontal-a3.png](./evidence/visual-publishing-studio-phase-2c-focus-owner-review-2026-08-14/03-balanced-horizontal-a3.png)
- Capacity guidance: [08-dense-a4-capacity-preview.png](./evidence/visual-publishing-studio-phase-2c-focus-owner-review-2026-08-14/08-dense-a4-capacity-preview.png)

Evidence regeneration is explicit. Set `UPDATE_VISUAL_EVIDENCE=1` when running the Chromium review specification to replace promoted evidence. Normal test runs use temporary output and do not mutate the reviewed evidence pack.
