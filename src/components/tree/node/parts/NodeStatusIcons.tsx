import { memo } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export interface NodeStatusIconsProps {
  isLOD: boolean;
  isNodeSyncing: boolean;
  hasErrors: boolean;
  validationErrors: string[];
}

export const NodeStatusIcons = memo<NodeStatusIconsProps>(({
  isLOD,
  isNodeSyncing,
  hasErrors,
  validationErrors,
}) => {
  if (isLOD) return null;

  return (
    <>
      {isNodeSyncing && (
        <div className="absolute top-1.5 left-1.5 animate-spin opacity-80 drop-shadow-sm" style={{ color: '#C9952A' }}>
          <RefreshCw className="w-3.5 h-3.5" />
        </div>
      )}

      {hasErrors && (
        <div
          className="absolute top-1.5 left-1.5 cursor-help rounded-[4px] p-0.5 shadow-sm animate-pulse"
          style={{ backgroundColor: '#B03A2A' }}
          title={validationErrors.join('\n')}
        >
          <AlertTriangle className="w-3 h-3 text-white" />
        </div>
      )}
    </>
  );
});

NodeStatusIcons.displayName = 'NodeStatusIcons';

