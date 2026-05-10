import React from 'react';

interface ZoomIndicatorProps {
    zoomScale: number;
}

/**
 * TreeInteractiveControls - NOW A PURE UI DISPLAY
 * 
 * This component has been stripped of all D3/Zoom logic.
 * The core interaction engine has been unified into useTreeInteraction.ts.
 * 
 * This component now only serves as a visual indicator for the current zoom level.
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

// Legacy Export for compatibility if needed (deprecated)
export const useTreeInteractiveControls = () => {
    console.warn('[Jozor] useTreeInteractiveControls is deprecated. Use useTreeInteraction instead.');
    return {
        handleZoomIn: () => {},
        handleZoomOut: () => {},
        handleResetZoom: () => {},
        zoomScale: 1,
    };
};
