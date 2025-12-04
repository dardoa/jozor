// Node Dimensions
export const NODE_WIDTH_DEFAULT = 160;
export const NODE_WIDTH_COMPACT = 130;
export const NODE_HEIGHT_DEFAULT = 210;
export const NODE_HEIGHT_COMPACT = 170;
export const FORCE_NODE_RADIUS = 30;

// Layout Spacing
export const LEVEL_SEP_DEFAULT = 280; 
export const LEVEL_SEP_COMPACT = 240;
export const SIBLING_GAP_DEFAULT = 60;
export const SIBLING_GAP_COMPACT = 30;
export const SPOUSE_GAP = 20; 

// Collapse Point
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