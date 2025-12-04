import { Person, TreeNode, TreeLink, TreeSettings } from '../types';

// Import modular layout functions
import { calculateDescendantLayout } from './descendantLayout';
import { calculatePedigreeLayout } from './pedigreeLayout';

// Import constants from a dedicated file
import { CollapsePoint } from './layoutConstants';

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