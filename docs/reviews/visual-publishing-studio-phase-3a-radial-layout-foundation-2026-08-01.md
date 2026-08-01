# Visual Publishing Studio Phase 3A — Radial Layout Foundation Architectural Review

**Date**: August 1, 2026
**Status**: APPROVED — Phase 3A Final Four-Finding Closure Completed
**Engine ID**: `radialGenerationsPosterLayoutEngine` (`engineId: 'radial-generations'`)

---

## Executive Summary

Phase 3A provides the isolated **Radial/Fan Generations Layout Engine** foundation. The engine consumes `SanitizedPreviewGraph` and `PosterRadialLayoutOptions` and produces canonical, vector-accurate `PosterScene` geometry.

**Capability Isolation**: Radial layout is **strictly hidden from Studio UI controls** and **rejected at runtime** (`isRuntimeSupported: false`) until Phase 3B.

---

## Architectural & Mathematical Specifications

### 1. Content and Layout Decoupling
- `PosterContentSpec.scope` accepts standard content scope values (`'selected-root-ancestors'` or `'selected-root-descendants'`).
- `PosterRadialLayoutOptions` defines layout parameters (`focalPreviewId`, `radialSpan`, `generationRings`, `ringSpacing`, `centerCardScale`, `labelOrientation`).
- Traversal direction is derived exclusively from `content.scope` (`selected-root-ancestors` $\rightarrow$ upward, `selected-root-descendants` $\rightarrow$ downward).
- `generationRings` ($3 \le g \le 6$) acts as the BFS graph traversal depth cap.

### 2. Strict Runtime Validation
- `generationRings`: Enforced as integer $3 \le g \le 6$.
- `radialSpan`: `'360-full-circle'` | `'180-half-fan'`.
- `ringSpacing`: `'compact'` | `'balanced'` | `'spacious'`.
- `centerCardScale`: `'compact'` | `'standard'` | `'large'`.
- `labelOrientation`: `'straight-unwarped'` (straight unwarped Arabic text). `'curved'` is rejected with a controlled unsupported-option error.

### 3. Branch-Aware Angular Sector Allocation
- Assigns contiguous angular sectors to first-generation branches (Ring 1).
- For ancestors: Father branch and Mother branch each receive contiguous angular sectors proportional to their subtree leaf weights.
- For descendants: Each child branch receives a contiguous angular sector proportional to its subtree leaf weight.
- Every node in outer rings ($k \ge 2$) is recursively assigned a sub-sector strictly within its parent's sector.
- **Topology & Connector Crossing Property**: Layout is **crossing-free for strict tree topology**; pedigree-collapse cross-links (complex loops) are deterministic but may cross.

### 4. Genuinely Adaptive Radial Geometry & Sparse Tree Auto-Scaling
- All calculations are performed in `PosterScene` units (pixels/scene units derived from `document.sceneSize`).
- **360° Full Circle**: Center is placed at center of `treeBounds`. Usable radius $R_{\max} = \min(\text{width}/2 - 20, \text{height}/2 - 20)$.
- **180° Half Fan**: Center is placed at bottom of `treeBounds` ($y_0 = \text{bounds.y} + \text{bounds.height} - 60$). Usable radius $R_{\max} = \min(\text{width}/2 - 20, y_0 - \text{bounds.y} - 40)$.
- **Adaptive Spacing Formula**:
  - `minSafeStep = ringCardH + 20` (52px minimum step for safe card gap).
  - `activeRingDivisor = Math.max(1, maxAssignedRing)`.
  - `remainingSpan = Math.max(0, maxAvailRadius - innerRadius - ringCardW / 2)`.
  - `minimumRequiredSpan = maxAssignedRing * minSafeStep`.
  - If `minimumRequiredSpan > remainingSpan`, the engine throws `RadialLayoutCapacityError` ('RADIAL_LAYOUT_CAPACITY_EXCEEDED').
  - `proportionalStep = (remainingSpan / activeRingDivisor) * spacingScale`.
  - `spacingStep = Math.max(minSafeStep, proportionalStep)`.
- **Sparse Tree Auto-Scaling**: By scaling against `activeRingDivisor` rather than reserving empty rings up to `generationRings`, sparse trees (e.g. 1 or 2 active rings) utilize available poster canvas space gracefully without artificial overcrowding or unpopulated whitespace.

### 5. Connector Perimeter Anchors & Deduplication
- Every connector calculates exact edge-intersection endpoints using `getCardPerimeterPoint()`.
- Every connector start and end point lands on the corresponding card perimeter within $\le 0.2$ pixel tolerance.
- Duplicate or reversed parent-child graph edges are deduplicated before emitting connectors.

---

## Test Evidence Suite (21 Comprehensive Integrity Tests)

1. **Focal Center Placement**: Verifies focal person sits at exact center of `treeBounds`.
2. **Ancestor & Descendant Scope Traversal**: Verifies upward and downward traversal derived from `content.scope`.
3. **180-Half-Fan vs 360-Full-Circle Geometry**: Asserts focal Y placement, upper-hemisphere placement for fan, 360-degree vertical spread, distinct polar angles, and bounds enclosure.
4. **Father/Mother Branch Sector Allocation**: Asserts Father and Mother subtrees stay within contiguous sectors (polar angle check) and have zero connector crossings for strict tree topology.
5. **Multi-Child Descendant Branch Allocation**: Asserts multi-child descendant subtrees stay within contiguous sectors and have zero connector crossings.
6. **Sparse Ancestor Graph Fixture**: Single path of ancestors.
7. **Missing One Parent Fixture**: Single parent present.
8. **Full Binary Ancestor Fixture**: 7-node 3-generation binary tree.
9. **Multiple Descendant Branches Fixture**: Multi-child descendants.
10. **Connector Perimeter & Finite Endpoints**: Asserts every connector start and end point lands on node perimeters within $\le 0.2$ tolerance with finite coordinates.
11. **Privacy Sentinel Leakage Prevention**: Injects secret sentinels (`rawId`, `email`, `phone`, `photoUrl`, `storagePath`, `authToken`, `notes`) and proves zero leakage into `PosterScene` JSON or rendered SVG string.
12. **Four-Page Geometry Comparison**: Compares A4 Portrait, A4 Landscape, A3 Portrait, A3 Landscape; computes $dR = \text{radius}_2 - \text{radius}_1 > 0$, proves A3 produces larger $dR$ than A4 for portrait and landscape.
13. **Dense Single-Ring Capacity Failure**: Asserts 50 children on single ring throw `RadialLayoutCapacityError`.
14. **Real Six-Level Deep Chain Capacity Failure**: Asserts 6 sequential rings (`ring0 -> ring1 -> ... -> ring6`) on tight tree bounds throw `RadialLayoutCapacityError`.
15. **Successful Sparse 6-Ring Chain**: Proves 6 rings succeed cleanly on A3 page.
16. **Arabic Text & Mixed Years**: Verifies long Arabic names and mixed RTL/LTR dates remain straight and unwarped.
17. **Duplicate/Reversed Edges & Cycles**: Verifies edge deduplication and cycle safety.
18. **Deterministic Output**: Confirms identical JSON output across repeated runs.
19. **Curved Label Rejection**: Confirms controlled error when `labelOrientation = 'curved'`.
20. **Scene Render & Export Parity**: Tests `createPosterScene` $\rightarrow$ `renderPosterSceneToSvg` $\rightarrow$ `exportStudioPoster` parity.
21. **Runtime Rejection Regression**: Proves Radial remains hidden from UI controls and rejected at runtime.
