# Jozor V3 Execution Rules Addendum v1

Jozor V3 — Execution Rules Addendum v1
This document defines strict execution rules for the layout engine.
1) X Authority
finalX = placementX
// No other layer may modify X
2) Collision Priority
LOCK_ROOT = 6
LOCK_SHARED_PARENT = 5
LOCK_CANONICAL_FAMILY = 4
LOCK_OWNED_BRANCH = 3
LOCK_REUSED_BRANCH = 2
LOCK_FREE = 1
3) Geometry Constants
PERSON_WIDTH = 120
PERSON_HEIGHT = 80
PARTNER_GAP = 160
SIBLING_GAP = 180
CHANNEL_GAP = 280
MIN_BLOCK_GAP = 40
GENERATION_GAP = 260
TRUNK_DROP = 80
FAMILY_TO_BAR_GAP = 70
BAR_TO_CHILD_GAP = 60
CARD_CLEARANCE = 20
4) Vertical Safety Rules
Trunk must drop at least TRUNK_DROP
Sibling bar must be below parents
Child connections must start from bar
5) Multi-Spouse Rules
shared parent = spine
families = parallel channels
familyX = midpoint(parentX, spouseX)
6) Edge Rules
No diagonal edges
Use orthogonal paths only
7) Rendering Order
reuse -> trunk -> bars -> child -> partner -> nodes
8) Block Rules
Move blocks, not nodes
No subtree influence on X
9) Test Cases
simple family
multi generations
siblings
cousin marriage
multi spouse
10) Forbidden

subtreeWidth control
row offsets
projection fixes
duplication
diagonal edges

