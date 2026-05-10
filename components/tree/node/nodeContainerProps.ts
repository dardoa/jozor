import type { TreeSettings, TreeNode } from '../../../types';
import { shallowPickEqual } from '../../../utils/shallowPick';

export interface NodeContainerProps {
  node: TreeNode;
  index: number;
  isFocused: boolean;
  isHighlighted: boolean;
  onSelect: (id: string) => void;
  onNodeContextMenu: (e: React.MouseEvent, id: string) => void;
  settings: TreeSettings;
  zoomScale: number;
  nodeWidth: number;
  nodeHeight: number;
  isPulsing?: boolean;
  isDimmed?: boolean;
  isPathHighlighted?: boolean;
  showParentNavigation?: boolean;
}

/**
 * Keys in TreeSettings that are visually meaningful to a single Node.
 * TypeScript will error at compile time if a key is removed from TreeSettings.
 */
const NODE_RELEVANT_SETTINGS_KEYS = [
  'boxColorLogic',
  'showFirstName',
  'showMiddleName',
  'showLastName',
  'showNickname',
  'showSuffix',
  'showDates',
  'showBirthDate',
  'showDeathDate',
  'showMarriageDate',
  'showBirthPlace',
  'showResidence',
  'showMarriagePlace',
  'showBurialPlace',
  'showOccupation',
  'showPhotos',
  'privacyMode',
  'showGender',
  'textSize',
] as const satisfies ReadonlyArray<keyof TreeSettings>;

const areTreeSettingsEqualForNode = (prev: TreeSettings, next: TreeSettings) =>
  shallowPickEqual(prev, next, NODE_RELEVANT_SETTINGS_KEYS);

export const areNodeContainerPropsEqual = (prev: NodeContainerProps, next: NodeContainerProps) => (
  prev.index === next.index &&
  prev.isFocused === next.isFocused &&
  prev.isHighlighted === next.isHighlighted &&
  prev.onSelect === next.onSelect &&
  prev.onNodeContextMenu === next.onNodeContextMenu &&
  (prev.zoomScale < 0.5) === (next.zoomScale < 0.5) &&
  prev.nodeWidth === next.nodeWidth &&
  prev.nodeHeight === next.nodeHeight &&
  prev.isPulsing === next.isPulsing &&
  prev.isDimmed === next.isDimmed &&
  prev.isPathHighlighted === next.isPathHighlighted &&
  prev.showParentNavigation === next.showParentNavigation &&
  prev.node.id === next.node.id &&
  prev.node.x === next.node.x &&
  prev.node.y === next.node.y &&
  prev.node.isReference === next.node.isReference &&
  prev.node.data === next.node.data &&
  areTreeSettingsEqualForNode(prev.settings, next.settings)
);
