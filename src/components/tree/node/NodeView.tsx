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
}: NodeViewProps) => {
  if (isLOD) {
    // For extreme far zoom (LOD / low detail), render a simple pure SVG rectangle and text
    // to bypass foreignObject completely! This dramatically improves browser paint times.
    return (
      <>
        {/* Simple card background */}
        <rect
          x={-nodeWidth / 2}
          y={-nodeHeight / 2}
          width={nodeWidth}
          height={nodeHeight}
          rx={8}
          ry={8}
          fill={person.gender === 'female' ? '#fff1f2' : '#f0f9ff'}
          stroke={borderColor}
          strokeWidth={isFocused ? 3 : 1.5}
        />
        {/* Focus ring if focused */}
        {isFocused && (
          <rect
            x={-nodeWidth / 2 - 4}
            y={-nodeHeight / 2 - 4}
            width={nodeWidth + 8}
            height={nodeHeight + 8}
            rx={12}
            ry={12}
            fill="none"
            stroke="#2563eb"
            strokeWidth={2}
          />
        )}
        {/* Lightweight SVG Text */}
        <text
          x={0}
          y={-nodeHeight / 2 + 55}
          textAnchor="middle"
          fill="#1e293b"
          style={{ fontSize: '20px', fontWeight: 'bold', fontFamily: 'system-ui' }}
        >
          {primaryNameLine}
        </text>
        {secondaryNameLine && (
          <text
            x={0}
            y={-nodeHeight / 2 + 85}
            textAnchor="middle"
            fill="#64748b"
            style={{ fontSize: '15px', fontFamily: 'system-ui' }}
          >
            {secondaryNameLine}
          </text>
        )}
        {/* Gender dot */}
        <circle
          cx={-nodeWidth / 2 + 20}
          cy={nodeHeight / 2 - 20}
          r={8}
          fill={person.gender === 'female' ? '#ec4899' : '#3b82f6'}
        />
      </>
    );
  }

  return (
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
};

export type { NodeViewProps } from './nodeViewProps';


