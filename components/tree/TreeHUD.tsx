import React from 'react';
import { ZoomControls } from '../ui/ZoomControls';
import { Minimap } from '../ui/Minimap';
import { ZoomIndicator } from '../TreeInteractiveControls';
import type { MinimapGraph } from '../../domain/minimapGraph';

interface TreeHUDProps {
    minimapGraph: MinimapGraph | null;
    showMinimap: boolean;
    isFanChart: boolean;
    isForce: boolean;
    isSidebarOpen: boolean;
    hasBlockingOverlay?: boolean;
    onOpenPreferences?: () => void;

    // Zoom controls props
    onZoomIn: () => void;
    onZoomOut: () => void;
    onResetZoom: () => void;
    onFitToScreen: () => void;
    zoomScale: number;
}

/**
 * TreeHUD - Heads-Up Display Component
 * 
 * Extracts all overlay UI elements (Minimap, Zoom Controls)
 * from FamilyTree.tsx to improve separation of concerns.
 * 
 * Key features:
 * - High z-index (z-50) to prevent hiding behind other elements
 * - Safe area insets for mobile/notch support
 * - Sidebar awareness for dynamic positioning
 */
export const TreeHUD: React.FC<TreeHUDProps> = ({
    minimapGraph,
    showMinimap,
    isFanChart,
    isForce,
    isSidebarOpen,
    hasBlockingOverlay = false,
    onOpenPreferences,
    onZoomIn,
    onZoomOut,
    onResetZoom,
    onFitToScreen,
    zoomScale,
}) => {
    const shouldRenderMinimap =
        showMinimap &&
        !isForce &&
        Boolean(minimapGraph) &&
        (!isFanChart || minimapGraph?.source === 'visible-tree');

    return (
        <>
            {/* Minimap (Bottom-Start) - Hidden on mobile md:block */}
            {shouldRenderMinimap && minimapGraph && (
                <div
                    className={`absolute z-20 transition-all duration-300
            bottom-5 start-5 hidden md:block
            pb-[env(safe-area-inset-bottom,0px)]
            ps-[env(safe-area-inset-left,0px)]
            ${isSidebarOpen ? 'translate-x-0' : ''}
          `}
                >
                    <Minimap graph={minimapGraph} />
                </div>
            )}
 
            {/* Zoom Controls (Bottom-End) - Adjusted for Mobile */}
            <div
                className={`absolute z-[calc(var(--z-index-nav)-2)] transition-all duration-300 print:hidden
          bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] md:bottom-6 end-3 md:end-4
          pb-[env(safe-area-inset-bottom,0px)]
          pe-[env(safe-area-inset-right,0px)]
          ${isSidebarOpen || hasBlockingOverlay ? 'opacity-0 pointer-events-none translate-y-10 md:opacity-100 md:pointer-events-auto md:translate-y-0' : 'opacity-100'}
        `}
            >
                <div className="flex flex-col items-end gap-3 scale-[0.82] sm:scale-90 md:scale-100 origin-bottom-right">
                    <ZoomIndicator zoomScale={zoomScale} />
                    <ZoomControls
                        onOpenPreferences={onOpenPreferences}
                        onZoomIn={onZoomIn}
                        onZoomOut={onZoomOut}
                        onReset={onResetZoom}
                        onFitToScreen={onFitToScreen}
                    />
                </div>
            </div>
        </>
    );
};
