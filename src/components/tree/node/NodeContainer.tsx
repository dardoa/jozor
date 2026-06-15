import { memo, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { Person } from '../../../types';
import { useAppStore } from '../../../store/useAppStore';
import { NodeView } from './NodeView';
import { TOKENS } from '../../../utils/tokens';
import { type NodeContainerProps, areNodeContainerPropsEqual } from './nodeContainerProps';
import { useNodeLongPress } from './useNodeLongPress';
import { useNodeViewModel } from './useNodeViewModel';

const EMPTY_ARRAY: string[] = [];

export const NodeContainer = memo<NodeContainerProps>(({
  node,
  index,
  isFocused,
  isHighlighted,
  onSelect,
  onNodeContextMenu,
  settings,
  nodeWidth,
  nodeHeight,
  useLightweightLOD = false,
  isPulsing = false,
  isDimmed = false,
  isPathHighlighted = false,
  showParentNavigation = true,
}) => {
  const isLOD = useLightweightLOD;

  const {
    person,
    isNodeSyncing,
    isPulsingTarget,
    validationErrors,
  } = useAppStore(useShallow((state) => {
    const currentPerson = state.people[node.data.id] || (node.data as Person);

    return {
      person: currentPerson,
      isNodeSyncing: state.syncingNodes.has(currentPerson.id),
      isPulsingTarget: state.pulseTargetId === currentPerson.id,
      validationErrors: state.validationErrors[currentPerson.id] || EMPTY_ARRAY,
    };
  }));
  const hasErrors = validationErrors.length > 0;

  const {
    clearLongPressTimer,
    handlePointerDown,
    shouldSkipClick,
  } = useNodeLongPress({
    personId: person.id,
    onNodeContextMenu,
  });

  const handleSelect = useCallback((e: React.MouseEvent<SVGGElement>) => {
    e.stopPropagation();
    if (shouldSkipClick()) return;
    onSelect(person.id);
  }, [onSelect, person.id, shouldSkipClick]);

  const handleContextMenu = useCallback((e: React.MouseEvent<SVGGElement>) => {
    onNodeContextMenu(e, person.id);
  }, [onNodeContextMenu, person.id]);

  const viewProps = useNodeViewModel({
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
    onFocusPerson: onSelect,
    showParentNavigation,
  });

  return (
    <g
      transform={`translate(${node.x},${node.y})`}
      onClick={handleSelect}
      onContextMenu={handleContextMenu}
      onPointerDown={handlePointerDown}
      onPointerUp={clearLongPressTimer}
      onPointerCancel={clearLongPressTimer}
      onPointerLeave={clearLongPressTimer}
      onPointerMove={clearLongPressTimer}
      data-testid="tree-node"
      data-person-id={person.id}
      className={`cursor-pointer group transition-all ${isDimmed && !isPathHighlighted ? 'opacity-20 grayscale-[20%]' : 'opacity-100'}`}
      style={{
        transitionDuration: `${TOKENS.ANIMATIONS.long}ms`,
        transitionTimingFunction: TOKENS.EASING.outQuint,
      }}
    >
      <NodeView {...viewProps} />
    </g>
  );
}, areNodeContainerPropsEqual);

NodeContainer.displayName = 'NodeContainer';

