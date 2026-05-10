export const NODE_WIDTH_DEFAULT = 160;
export const NODE_WIDTH_COMPACT = 130;
export const NODE_HEIGHT_DEFAULT = 210;
export const NODE_HEIGHT_COMPACT = 170;
export const FORCE_NODE_RADIUS = 30;
export const FORCE_NODE_RADIUS_COMPACT = 20;

export const LEVEL_SEP_DEFAULT = 400;
export const LEVEL_SEP_COMPACT = 320;
export const SIBLING_GAP_DEFAULT = 120;
export const SIBLING_GAP_COMPACT = 60;
export const SPOUSE_GAP = 40;

export interface CollapsePoint {
    id: string;
    spouseId: string;
    uniqueKey: string;
    x: number;
    y: number;
    originX: number;
    originY: number;
    isCollapsed: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// V3 Placement Engine — Constitution-Locked Constants
// Source : Jozor_V3_Execution_Rules_Addendum_v1.md
// Amendment §5: PERSON_HEIGHT = 210 (matches actual NodeComponent), GENERATION_GAP = 500
//
// ⚠️  IMMUTABLE — No placement layer, projection, or edge module may override
//     these values.  Any deviation is a Constitution violation.
// ─────────────────────────────────────────────────────────────────────────────

// ── Card dimensions (Amendment §5: height matches actual rendered card) ──────
/** Width of a rendered person card in pixels. (Updated to 160 to match NODE_WIDTH_DEFAULT) */
export const V3_PERSON_WIDTH        = 160;

/** Height of a rendered person card in pixels.
 *  APPROVED as 210 to match current NodeComponent. (Addendum originally 80.) */
export const V3_PERSON_HEIGHT       = 210;

/** Extra rendered height consumed by the card foreignObject buffer. */
export const V3_PERSON_VISUAL_BUFFER_Y = 96;

/** Visual height the renderer actually paints, including extra buffer. */
export const V3_PERSON_VISUAL_HEIGHT = V3_PERSON_HEIGHT + V3_PERSON_VISUAL_BUFFER_Y;

/** Half-width — used for left/right anchor computation. */
export const V3_HALF_CARD_W         = V3_PERSON_WIDTH  / 2;   // 80 px

/** Half-height — used for top/bottom anchor computation. */
export const V3_HALF_CARD_H         = V3_PERSON_HEIGHT / 2;   // 105 px

/** Half of the actual painted visual card height. */
export const V3_HALF_VISUAL_CARD_H  = V3_PERSON_VISUAL_HEIGHT / 2;   // 153 px

// ── Horizontal spacing (from Addendum §3) ────────────────────────────────────
/** Center-to-center distance between two spouses in the same marriage unit. 
 *  Card width (160) + spouse gap (20) = 180 */
export const V3_PARTNER_GAP         = 180;   // px

/** Center-to-center distance between siblings under the same family. 
 *  Card width (160) + sibling gap (10) = 170 */
export const V3_SIBLING_GAP         = 170;   // px

/** Center-to-center distance between parallel marriage channels (multi-spouse). */
export const V3_CHANNEL_GAP         = 280;   // px
export const V3_MIN_BLOCK_GAP       = 40;    // px
/** Extra gap enforced between blocks belonging to different families to ensure visual clustering. */
export const V3_INTER_FAMILY_GAP    = 60;   // px

// ── Vertical spacing (Amendment §5: GENERATION_GAP = 500) ───────────────────
/** Center-to-center vertical distance between a parent row and its child row.
 *  Chosen so sibling-bar clears the child card top by ≥ 80 px. */
export const V3_GENERATION_GAP      = 500;   // px

/** Pixels from the card center down to the family dot.
 *  Set to 0 to place the dot directly on the marriage line. */
export const V3_TRUNK_DROP          = 0;     // px

/** Pixels from the family dot down to the sibling bar.
 *  Tuned so the bar stays above the child cards while the marriage axis sits below the parent cards. */
export const V3_FAMILY_TO_BAR_GAP   = 200;   // px

/** Vertical offset from parent center for the horizontal routing (Z-routing) of family trunks.
 *  Must clear the parent card bottom edge (153) and stay above the sibling bar (200). */
export const V3_TRUNK_ROUTE_OFFSET  = 165;   // px

/** Pixels from the sibling bar down to the TOP edge of the child card. */
export const V3_BAR_TO_CHILD_GAP    = 60;    // px

/** Minimum visual clearance around any card edge. */
export const V3_CARD_CLEARANCE      = 20;    // px

// ── Derived vertical offsets (relative to parent card center Y) ──────────────
// These are pre-computed so every module uses identical math.
//
//   parent center        Y = 0
//   parent bottom edge   Y = +105   (V3_HALF_CARD_H)
//   family dot           Y = +185   (+V3_TRUNK_DROP 80)        ← orange dot
//   sibling bar          Y = +255   (+V3_FAMILY_TO_BAR_GAP 70)  ← horizontal rail
//   child card top       Y = +315   (+V3_BAR_TO_CHILD_GAP 60)
//   child center         Y = +500   (V3_GENERATION_GAP)
//   child card top-edge  Y = +395   (500 − 105) → 80 px above sibling bar ✓
//
/** Pixel offset from parent-center Y to the family dot Y. (0 = centered) */
export const V3_FAMILY_DOT_OFFSET   = V3_TRUNK_DROP;                                        // 0 px

/** Pixel offset from parent-center Y to the sibling bar Y. */
export const V3_SIBLING_BAR_OFFSET  = V3_FAMILY_DOT_OFFSET  + V3_FAMILY_TO_BAR_GAP;         // 120 px

/** Pixel offset from parent-center Y to the child card top-anchor Y. */
export const V3_CHILD_TOP_OFFSET    = V3_GENERATION_GAP - V3_HALF_CARD_H;                   // 395 px

// ── Collision resolution ──────────────────────────────────────────────────────
/** Maximum passes for the multi-pass collision resolver (Amendment §2).
 *  Loop exits early when zero overlaps remain. */
export const V3_COLLISION_MAX_PASSES = 50;

// ── Lock priority (Addendum §2) ──────────────────────────────────────────────
/** Collision lock levels.  Higher value = cannot be pushed by lower-level node. */
export const V3_LOCK = {
  ROOT:              6,   // The focus person — never moves
  SHARED_PARENT:     5,   // Person shared between two canonical families (cousin marriage)
  CANONICAL_FAMILY:  4,   // Primary canonical family of its branch owner
  OWNED_BRANCH:      3,   // Any node in a canonical descendant branch
  REUSED_BRANCH:     2,   // A node referenced (reused) from another branch
  FREE:              1,   // Unclaimed — moves freely
} as const;
