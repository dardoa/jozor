interface NodeHighlightRingProps {
  nodeWidth: number;
  nodeHeight: number;
  isHighlighted: boolean;
  isPulsing: boolean;
}

export const NodeHighlightRing = ({
  nodeWidth,
  nodeHeight,
  isHighlighted,
  isPulsing,
}: NodeHighlightRingProps) => {
  if (!isHighlighted && !isPulsing) return null;

  return (
    <rect
      x={-nodeWidth / 2 - 8}
      y={-nodeHeight / 2 - 8}
      width={nodeWidth + 16}
      height={nodeHeight + 16}
      rx="16"
      className={`fill-none stroke-2 ${isPulsing ? 'animate-ping opacity-50' : 'animate-pulse'}`}
      style={{ stroke: '#C9952A' }}
    />
  );
};
