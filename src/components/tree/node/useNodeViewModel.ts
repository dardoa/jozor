import { useMemo } from 'react';
import type { Person, TreeSettings, TreeNode } from '../../../types';
import { useTranslation } from '../../../context/TranslationContext';
import { getPrivacyPlaceholderDescriptor } from '../../../utils/avatarUtils';
import { getPersonPhoto } from '../../../utils/mediaUtils';
import {
  buildNodeMetaLines,
  buildNodeNameLines,
  buildPhotoAlt,
  resolveGenderColor,
  resolveMonogramBg,
} from '../../node/nodeDisplayUtils';
import type { NodeViewProps } from './nodeViewProps';

interface UseNodeViewModelOptions {
  node: TreeNode;
  person: Person;
  index: number;
  settings: TreeSettings;
  nodeWidth: number;
  nodeHeight: number;
  isLOD: boolean;
  isFocused: boolean;
  isHighlighted: boolean;
  isDimmed: boolean;
  isPathHighlighted: boolean;
  isPulsing: boolean;
  isPulsingTarget: boolean;
  isNodeSyncing: boolean;
  hasErrors: boolean;
  validationErrors: string[];
  onFocusPerson: (id: string) => void;
  showParentNavigation: boolean;
}

export const useNodeViewModel = ({
  node,
  person,
  index,
  settings,
  nodeWidth,
  nodeHeight,
  isLOD,
  isFocused,
  isHighlighted,
  isDimmed,
  isPathHighlighted,
  isPulsing,
  isPulsingTarget,
  isNodeSyncing,
  hasErrors,
  validationErrors,
  onFocusPerson,
  showParentNavigation,
}: UseNodeViewModelOptions): NodeViewProps => {
  const { t } = useTranslation();

  const borderColor = useMemo(
    () => resolveGenderColor(settings, person),
    [person, settings],
  );
  const monogramBg = useMemo(
    () => resolveMonogramBg(settings, person),
    [person, settings],
  );
  const privacyPlaceholder = useMemo(
    () => getPrivacyPlaceholderDescriptor(person),
    [person],
  );
  const imageBlockHeightPx = useMemo(
    () => Math.max(96, Math.min(164, Math.round(nodeHeight * 0.54))),
    [nodeHeight],
  );
  const { primaryNameLine, secondaryNameLine, nicknameAsPrimary } = useMemo(
    () => buildNodeNameLines(person, settings, isLOD),
    [isLOD, person, settings],
  );
  const metaLines = useMemo(
    () => buildNodeMetaLines(person, settings, isLOD),
    [isLOD, person, settings],
  );
  const photoSource = useMemo(
    () => getPersonPhoto(person),
    [person],
  );
  const shouldRenderPhoto = settings.showPhotos && !settings.privacyMode && Boolean(photoSource) && !isLOD;
  const photoAlt = useMemo(
    () => buildPhotoAlt(person, t.unnamedPerson),
    [person, t.unnamedPerson],
  );
  const showReferenceBadge = Boolean(node.isReference && !isLOD);

  return useMemo<NodeViewProps>(() => ({
    id: person.id,
    index,
    nodeWidth,
    nodeHeight,
    isLOD,
    isReference: Boolean(node.isReference),
    showReferenceBadge,
    isFocused,
    isHighlighted,
    isDimmed,
    isPathHighlighted,
    isPulsing,
    isPulsingTarget,
    isNodeSyncing,
    hasErrors,
    validationErrors,
    borderColor,
    monogramBg,
    imageBlockHeightPx,
    dynamicTextSizePx: settings.textSize || 12,
    person,
    shouldRenderPhoto,
    photoSource,
    photoAlt,
    privacyMode: Boolean(settings.privacyMode),
    isDeceased: person.isDeceased,
    privacyPlaceholder: {
      Icon: privacyPlaceholder.Icon,
      ariaLabel: privacyPlaceholder.ariaLabel,
    },
    primaryNameLine,
    secondaryNameLine,
    nicknameAsPrimary,
    metaLines,
    showGender: Boolean(settings.showGender),
    onFocusPerson,
    showParentNavigation,
  }), [
    borderColor,
    hasErrors,
    imageBlockHeightPx,
    index,
    isDimmed,
    isFocused,
    isHighlighted,
    isLOD,
    isNodeSyncing,
    isPathHighlighted,
    isPulsing,
    isPulsingTarget,
    metaLines,
    monogramBg,
    nicknameAsPrimary,
    node.isReference,
    nodeHeight,
    nodeWidth,
    onFocusPerson,
    person,
    photoAlt,
    photoSource,
    primaryNameLine,
    privacyPlaceholder.Icon,
    privacyPlaceholder.ariaLabel,
    secondaryNameLine,
    settings,
    showParentNavigation,
    showReferenceBadge,
    shouldRenderPhoto,
    validationErrors,
  ]);
};
