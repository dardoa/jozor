import { memo } from 'react';
import { type NodeViewProps, areNodeViewPropsEqual } from './nodeViewProps';
import { NodeCardFrame } from './parts/NodeCardFrame';
import { NodeHighlightRing } from './parts/NodeHighlightRing';
import { NodeImageBlock } from './parts/NodeImageBlock';
import { NodeReferenceBadge } from './parts/NodeReferenceBadge';
import { NodeTextContent } from './parts/NodeTextContent';
import { NodeStatusIcons } from './parts/NodeStatusIcons';

export const NodeView = memo((props: NodeViewProps) => <NodeViewInner {...props} />, areNodeViewPropsEqual);

NodeView.displayName = 'NodeView';

const NodeViewInner = ({
  id,
  index,
  nodeWidth,
  nodeHeight,
  isLOD,
  isReference,
  showReferenceBadge,
  isFocused,
  isHighlighted,
  isPathHighlighted,
  isPulsing,
  isPulsingTarget,
  isNodeSyncing,
  hasErrors,
  validationErrors,
  borderColor,
  monogramBg,
  imageBlockHeightPx,
  dynamicTextSizePx,
  person,
  shouldRenderPhoto,
  photoSource,
  photoAlt,
  privacyMode,
  isDeceased,
  privacyPlaceholder,
  primaryNameLine,
  secondaryNameLine,
  nicknameAsPrimary,
  metaLines,
  showGender,
  onFocusPerson,
  showParentNavigation,
}: NodeViewProps) => (
  <>
    <NodeHighlightRing
      nodeWidth={nodeWidth}
      nodeHeight={nodeHeight}
      isHighlighted={isHighlighted}
      isPulsing={isPulsing}
    />

    <foreignObject
      x={-nodeWidth / 2}
      y={-nodeHeight / 2}
      width={nodeWidth}
      height={nodeHeight + 96}
      className={`overflow-visible animate-fade-in-up delay-${Math.min((index % 5) + 1, 5)}00`}
    >
      <div className="relative flex w-full flex-col items-center p-[10px]">
        <NodeCardFrame
          borderColor={borderColor}
          isFocused={isFocused}
          isPathHighlighted={isPathHighlighted}
          isPulsingTarget={isPulsingTarget}
          isReference={isReference}
          isDeceased={isDeceased}
        >
          <NodeReferenceBadge isReference={isReference} />

          <div className="flex w-full flex-col justify-start gap-2">
            <NodeImageBlock
              isLOD={isLOD}
              imageBlockHeightPx={imageBlockHeightPx}
              borderColor={borderColor}
              monogramBg={monogramBg}
              person={person}
              shouldRenderPhoto={shouldRenderPhoto}
              photoAlt={photoAlt}
              photoSource={photoSource}
              privacyMode={privacyMode}
              isDeceased={isDeceased}
              showGender={showGender}
              onFocusPerson={onFocusPerson}
              showParentNavigation={showParentNavigation}
              privacyPlaceholder={privacyPlaceholder}
            />

            <NodeTextContent
              personId={id}
              isDeceased={isDeceased}
              dynamicTextSizePx={dynamicTextSizePx}
              primaryNameLine={primaryNameLine}
              secondaryNameLine={secondaryNameLine}
              nicknameAsPrimary={nicknameAsPrimary}
              metaLines={metaLines}
              showReferenceBadge={showReferenceBadge}
            />
          </div>

          <NodeStatusIcons
            isLOD={isLOD}
            isNodeSyncing={isNodeSyncing}
            hasErrors={hasErrors}
            validationErrors={validationErrors}
          />
        </NodeCardFrame>
      </div>
    </foreignObject>
  </>
);

export type { NodeViewProps } from './nodeViewProps';


