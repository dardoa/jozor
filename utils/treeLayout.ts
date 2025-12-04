import { Person, TreeNode, TreeLink, TreeSettings } from '../types';

// Import modular layout functions
import { calculateDescendantLayout } from './descendantLayout';
import { calculatePedigreeLayout } from './pedigreeLayout';

// Exported Node Dimensions
export const NODE_WIDTH_DEFAULT = 160;
export const NODE_WIDTH_COMPACT = 130;
export const NODE_HEIGHT_DEFAULT = 210;
export const NODE_HEIGHT_COMPACT = 170;
export const FORCE_NODE_RADIUS = 30; // New constant for force chart node radius

// Layout Constants (used by descendantLayout.ts)
export const LEVEL_SEP_DEFAULT = 280; 
export const LEVEL_SEP_COMPACT = 240;
export const SIBLING_GAP_DEFAULT = 60;
export const SIBLING_GAP_COMPACT = 30;
export const SPOUSE_GAP = 20; 

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

/**
 * Main function to calculate the tree layout based on settings.
 * Acts as an orchestrator for different layout algorithms.
 */
export const calculateTreeLayout = (
    people: Record<string, Person>,
    focusId: string,
    settings: TreeSettings,
    collapsedIds: Set<string> = new Set()
): { nodes: TreeNode[], links: TreeLink[], collapsePoints: CollapsePoint[] } => {
    
    if (settings.chartType === 'descendant') {
        return calculateDescendantLayout(people, focusId, settings, collapsedIds);
    } else if (settings.chartType === 'pedigree') {
        return calculatePedigreeLayout(people, focusId, settings);
    }
    
    // Fallback to descendant layout if chartType is unknown or not specified
    return calculateDescendantLayout(people, focusId, settings, collapsedIds);
};