import { memo } from 'react';
import { NodeContainer } from './NodeContainer';
import { type NodeContainerProps, areNodeContainerPropsEqual } from './nodeContainerProps';

export const NodeComponent = memo<NodeContainerProps>(({
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
    useLightweightLOD,
    isPulsing,
    isDimmed,
    isPathHighlighted,
    showParentNavigation,
}) => (
    <NodeContainer
        node={node}
        index={index}
        isFocused={isFocused}
        isHighlighted={isHighlighted}
        onSelect={onSelect}
        onNodeContextMenu={onNodeContextMenu}
        settings={settings}
        zoomScale={zoomScale}
        nodeWidth={nodeWidth}
        nodeHeight={nodeHeight}
        useLightweightLOD={useLightweightLOD}
        isPulsing={isPulsing}
        isDimmed={isDimmed}
        isPathHighlighted={isPathHighlighted}
        showParentNavigation={showParentNavigation}
    />
), areNodeContainerPropsEqual);

NodeComponent.displayName = 'NodeComponent';
