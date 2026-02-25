import { Person, TreeSettings, TreeNode, TreeLink } from '../types';
import { CollapsePoint } from './layout/constants';
import { calculateDescendantLayout } from './layout/descendantLayout';
import { calculatePedigreeLayout } from './layout/pedigreeLayout';
import { INITIAL_ROOT_ID } from '../constants';

// Re-export constants and types for compatibility
export * from './layout/constants';
export * from './layout/helpers';

/**
 * Main switch for calculating tree layouts based on the selected chart type.
 */
export const calculateTreeLayout = (
  people: Record<string, Person>,
  focusId: string,
  settings: TreeSettings,
  collapsedIds: Set<string> = new Set()
): { nodes: TreeNode[]; links: TreeLink[]; collapsePoints: CollapsePoint[] } => {
  const firstId = Object.keys(people)[0];
  const effectiveFocusId = (focusId && people[focusId]) ? focusId : (firstId || INITIAL_ROOT_ID);

  if (settings.chartType === 'descendant') {
    return calculateDescendantLayout(people, effectiveFocusId, settings, collapsedIds);
  } else if (settings.chartType === 'pedigree') {
    return calculatePedigreeLayout(people, effectiveFocusId, settings);
  }

  // Fallback
  return calculateDescendantLayout(people, effectiveFocusId, settings, collapsedIds);
};
