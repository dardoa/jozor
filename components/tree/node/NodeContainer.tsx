import { memo, useCallback } from 'react';
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
  zoomScale,
  nodeWidth,
  nodeHeight,
  isPulsing = false,
  isDimmed = false,
  isPathHighlighted = false,
  showParentNavigation = true,
}) => {
  const isLOD = zoomScale < 0.5;

  const person = useAppStore((state) => state.people[node.data.id]) || (node.data as Person);
  const isNodeSyncing = useAppStore((state) => state.syncingNodes.has(person.id));
  const isPulsingTarget = useAppStore((state) => state.pulseTargetId === person.id);
  const validationErrors = useAppStore((state) => state.validationErrors[person.id] || EMPTY_ARRAY);
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

