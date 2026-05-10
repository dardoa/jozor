import type { ReactNode } from 'react';

interface NodeCardFrameProps {
  borderColor: string;
  isFocused: boolean;
  isPathHighlighted: boolean;
  isPulsingTarget: boolean;
  isReference: boolean;
  isDeceased: boolean;
  children: ReactNode;
}

export const NodeCardFrame = ({
  borderColor,
  isFocused,
  isPathHighlighted,
  isPulsingTarget,
  isReference,
  isDeceased,
  children,
}: NodeCardFrameProps) => (
  <div
    className={`
      relative flex w-full flex-col items-center border
      ${isPulsingTarget ? 'search-focus-pulse' : ''}
    `}
    style={{
      backgroundColor: 'var(--tree-node-bg)',
      color: 'var(--tree-text-primary)',
      borderColor: isPathHighlighted || isFocused ? '#C9952A' : isReference ? '#C9952A' : borderColor,
      borderStyle: isReference ? 'dashed' : 'solid',
      borderWidth: isPathHighlighted || isFocused ? '2px' : 'var(--tree-node-border-width)',
      borderRadius: 'var(--tree-node-radius)',
      boxShadow: isPathHighlighted || isFocused
        ? 'drop-shadow(0 0 8px rgba(201, 149, 42, 0.7))'
        : 'var(--tree-node-shadow)',
      opacity: (isDeceased || isReference) ? 0.72 : 1,
      padding: '10px 12px 16px',
    }}
  >
    {children}
  </div>
);
