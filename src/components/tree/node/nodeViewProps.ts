import type { Person } from '../../../types';

export interface NodeViewProps {
  // 1) Identity
  id: string;

  // 2) Layout + animation
  index: number;
  nodeWidth: number;
  nodeHeight: number;

  // 3) Render mode flags
  isLOD: boolean;
  isReference: boolean;
  showReferenceBadge: boolean;

  // 4) Visual state flags
  isFocused: boolean;
  isHighlighted: boolean;
  isDimmed: boolean;
  isPathHighlighted: boolean;
  isPulsing: boolean;
  isPulsingTarget: boolean;

  // 5) Status badges
  isNodeSyncing: boolean;
  hasErrors: boolean;
  validationErrors: string[];

  // 6) Appearance values
  borderColor: string;
  monogramBg: string;
  imageBlockHeightPx: number;
  dynamicTextSizePx: number;

  // 7) Photo + privacy
  person: Person;
  shouldRenderPhoto: boolean;
  photoSource: string | null;
  photoAlt: string;
  privacyMode: boolean;
  isDeceased: boolean;
  privacyPlaceholder: {
    Icon: React.ComponentType<{ className?: string; style?: React.CSSProperties; 'aria-label'?: string }>;
    ariaLabel: string;
  };

  // 8) Text content
  primaryNameLine: string;
  secondaryNameLine: string;
  nicknameAsPrimary: boolean;
  metaLines: string[];

  // 9) Presentation-only derived values (no raw settings)
  showGender: boolean;
  onFocusPerson: (id: string) => void;
  showParentNavigation: boolean;
}

export const areNodeViewPropsEqual = (prev: NodeViewProps, next: NodeViewProps) => (
  prev.id === next.id &&
  prev.index === next.index &&
  prev.nodeWidth === next.nodeWidth &&
  prev.nodeHeight === next.nodeHeight &&
  prev.isLOD === next.isLOD &&
  prev.isReference === next.isReference &&
  prev.showReferenceBadge === next.showReferenceBadge &&
  prev.isFocused === next.isFocused &&
  prev.isHighlighted === next.isHighlighted &&
  prev.isDimmed === next.isDimmed &&
  prev.isPathHighlighted === next.isPathHighlighted &&
  prev.isPulsing === next.isPulsing &&
  prev.isPulsingTarget === next.isPulsingTarget &&
  prev.isNodeSyncing === next.isNodeSyncing &&
  prev.hasErrors === next.hasErrors &&
  prev.validationErrors === next.validationErrors &&
  prev.borderColor === next.borderColor &&
  prev.monogramBg === next.monogramBg &&
  prev.imageBlockHeightPx === next.imageBlockHeightPx &&
  prev.dynamicTextSizePx === next.dynamicTextSizePx &&
  prev.person === next.person &&
  prev.shouldRenderPhoto === next.shouldRenderPhoto &&
  prev.photoSource === next.photoSource &&
  prev.photoAlt === next.photoAlt &&
  prev.privacyMode === next.privacyMode &&
  prev.isDeceased === next.isDeceased &&
  prev.privacyPlaceholder.Icon === next.privacyPlaceholder.Icon &&
  prev.privacyPlaceholder.ariaLabel === next.privacyPlaceholder.ariaLabel &&
  prev.primaryNameLine === next.primaryNameLine &&
  prev.secondaryNameLine === next.secondaryNameLine &&
  prev.nicknameAsPrimary === next.nicknameAsPrimary &&
  prev.metaLines === next.metaLines &&
  prev.showGender === next.showGender &&
  prev.onFocusPerson === next.onFocusPerson &&
  prev.showParentNavigation === next.showParentNavigation
);
