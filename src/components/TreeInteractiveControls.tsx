import React from 'react';

interface ZoomIndicatorProps {
    zoomScale: number;
}

/**
 * TreeInteractiveControls - pure zoom display
 * 
 * The core interaction engine has been unified into useTreeInteraction.ts.
 */
export const ZoomIndicator: React.FC<ZoomIndicatorProps> = ({ zoomScale }) => {
    const percentage = Math.round(zoomScale * 100);

    return (
        <div 
            className="px-3 py-1.5 rounded-lg bg-[var(--surface-panel)]/80 backdrop-blur-sm border border-[var(--border-soft)] text-[11px] font-medium text-[var(--text-dim)] shadow-sm pointer-events-none select-none"
            style={{ isolation: 'isolate' }}
        >
            {percentage}%
        </div>
    );
};
