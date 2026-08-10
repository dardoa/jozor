# Visual Publishing Studio Phase 3C - Radial Owner Visual Review

**Date:** 2026-08-03
**Evidence status:** Technical Evidence Pass
**Owner visual status:** Blocked
**Production approval:** No

## Decision

The corrected evidence pack is reproducible and technically trustworthy. The Radial renderer produces real SVG, PNG, and single-page PDF artifacts from the Studio runtime, preserves privacy boundaries, distinguishes ancestor and descendant scopes, and blocks an unsupported six-ring A4 composition without emitting downloads.

The visual product is not ready for owner approval. Full-resolution poster inspection found text collisions inside person cards, excessive unused page area in the 360-degree A2 compositions, and weak Arabic card readability. Phase 3C therefore closes as an evidence correction pass, not as a visual signoff.

## Corrected Matrix

| Scenario | Measured result | Technical gate | Visual gate |
|---|---:|---|---|
| Ancestors 180 degree, A3 | 7 nodes, 6 connectors, 135 degree coverage | Pass | Blocked |
| Ancestors 360 degree, A2 | 10 nodes, 9 connectors, 270 degree coverage | Pass | Blocked |
| Descendants 180 degree, A3 | 7 nodes, 6 connectors, 135 degree coverage | Pass | Blocked |
| Descendants 360 degree, A2 | 10 nodes, 9 connectors, 300 degree coverage | Pass | Blocked |
| Arabic long names, A3 | Arabic title, embedded font, 7 nodes | Pass | Blocked |
| Masked privacy, A3 | Living identity masked; private sentinel absent | Pass | Blocked |
| Sparse asymmetric, A3 | 5 nodes, 4 connectors, distinct artifact hash | Pass | Blocked |
| Six rings, A4 | Radial-specific capacity guidance; zero downloads | Expected blocked | Pass |

The authoritative measurements and SHA-256 artifact hashes are in [evidence-manifest.json](./evidence/visual-publishing-studio-phase-3c-radial-2026-08-03/evidence-manifest.json).

## Blocking Visual Findings

1. Person names and year lines overlap in several English cards, including the center and second-ring cards.
2. Arabic cards preserve Unicode and font shaping, but long names and years remain crowded and visibly collide in at least one outer card.
3. The 360-degree A2 scenes occupy too little of the printable area. The family structure reads as a small technical diagram centered on a large decorative sheet.
4. Sparse layouts are deterministic but do not rebalance their composition strongly enough to feel intentionally art-directed.
5. The current radial treatment remains closer to a technical baseline than a finished wall-poster layout.

## Verified Technical Properties

- The permanent Playwright suite runs eight mandatory scenarios with no optional visibility guards.
- Scenarios 1-7 download SVG, PNG, and PDF through real Studio actions.
- PNG signatures and dimensions are validated; exported raster size is approximately 274 DPI for the selected physical page sizes.
- PDFs have a valid header and one page.
- SVG node and connector counts are parsed from exported artifacts rather than inferred from fixture declarations.
- Full-resolution PNG crops cover title, center card, outer card, and connector regions.
- Scenario 6 proves masked output and absence of the injected private identity sentinel.
- Scenario 8 proves the error belongs to the Radial layout, disables SVG/PNG/PDF actions, and emits no downloads.
- Scenario 1 and Scenario 7 produce distinct SVG hashes, closing the prior duplicate-evidence defect.

## Runtime Corrections Made During Evidence Closure

- Radial capacity errors are now read only while Radial is active; stale Focus errors cannot label a Radial failure.
- Capacity guidance names the active layout and recommends reducing rings or selecting a larger page.
- The poster token catalog survives React Strict Mode's development effect cycle without disposing the active session.
- Privacy selectors expose their pressed state to accessibility tooling.
- Three-ring A3/A2 radial cards receive a larger readable geometry baseline; deeper layouts remain conservative.

These corrections improve the baseline but do not resolve the visual blockers above.

## Required Next Pass

Run **Radial Card Typography & Page Utilization Pass** before another owner visual review:

- reserve independent vertical zones for avatar, name, years, and privacy status;
- calculate card height from visible field count and wrapped line count;
- prevent renderer text from crossing the years/status baseline;
- scale radial radius and ring distribution to use the safe printable area;
- introduce an explicit minimum readable card/font gate based on final scene geometry;
- regenerate the same eight scenarios and repeat owner review without changing the fixtures.

## Evidence Locations

- Permanent test: [visual-studio-radial-owner-review.spec.ts](../../tests/e2e/visual-studio-radial-owner-review.spec.ts)
- Evidence root: [visual-publishing-studio-phase-3c-radial-2026-08-03](./evidence/visual-publishing-studio-phase-3c-radial-2026-08-03)
- Arabic full-resolution poster: [scenario 5 poster](./evidence/visual-publishing-studio-phase-3c-radial-2026-08-03/scenario-5-arabic-long-names-180-a3/poster.png)
- A2 full-circle poster: [scenario 2 poster](./evidence/visual-publishing-studio-phase-3c-radial-2026-08-03/scenario-2-ancestors-360-a2/poster.png)
- Capacity guidance: [scenario 8 Studio](./evidence/visual-publishing-studio-phase-3c-radial-2026-08-03/scenario-8-radial-capacity-blocked-a4/studio.png)

No commit or push is part of this review pass.
