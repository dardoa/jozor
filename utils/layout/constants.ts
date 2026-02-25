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
