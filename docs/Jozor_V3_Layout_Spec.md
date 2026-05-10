# Jozor V3 Layout Specification

Jozor V3 — Clean Family Layout Engine (Final Specification) Goal: Build a stable, family-first layout
engine with no duplication, no drift, and clear orthogonal edges. Core Principles: - Family is the
primary visual unit - One person = one node - Family center derived from parents only - Children do
not move parents - Collision is local and block-based - Reuse is a link, not duplication Pipeline: 1.
Assign generations 2. Place root 3. Layout families or parallel channels 4. Resolve reuse 5. Build
blocks 6. Resolve collisions 7. Generate edges Edge Types: - Partner - Family trunk - Child drop -
Reuse link (dashed) Invariants: - Family center = parents midpoint - Children under family - No
diagonal edges - No subtree-driven layout This document defines a stable and clean architecture
for family graph rendering.

