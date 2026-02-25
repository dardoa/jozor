import React from 'react';
import { TreeSettings, TreeNode, TreeLink } from '../../types';
import { ZoomControls } from '../ui/ZoomControls';
import { Minimap } from '../ui/Minimap';
import { Dropdown } from '../ui/Dropdown';
import { ViewSettingsMenu } from '../header/ViewSettingsMenu';
import { useAppStore } from '../../store/useAppStore';

interface TreeHUDProps {
    // Minimap props
    nodes: TreeNode[];
    links: TreeLink[];
    focusId: string;
    showMinimap: boolean;
    isFanChart: boolean;
    isForce: boolean;
    isSidebarOpen: boolean;

    // Zoom controls props
    onZoomIn: () => void;
    onZoomOut: () => void;
    onResetZoom: () => void;
    onFitToScreen: () => void;

    // View settings props
    settings: TreeSettings;
    onPresent: () => void;
    onOpenSnapshotHistory?: () => void;
    onOpenModal: (type: any, data?: any) => void;
}

/**
 * TreeHUD - Heads-Up Display Component
 * 
 * Extracts all overlay UI elements (Minimap, Zoom Controls, Floating View Settings)
 * from FamilyTree.tsx to improve separation of concerns.
 * 
 * Key features:
 * - High z-index (z-50) to prevent hiding behind other elements
 * - Safe area insets for mobile/notch support
 * - Sidebar awareness for dynamic positioning
 */
export const TreeHUD: React.FC<TreeHUDProps> = ({
    nodes,
    links,
    focusId,
    showMinimap,
    isFanChart,
    isForce,
    isSidebarOpen,
    onZoomIn,
    onZoomOut,
    onResetZoom,
    onFitToScreen,
    settings,
    onPresent,
    onOpenSnapshotHistory,
    onOpenModal,
}) => {
    const { setSettingsDrawerOpen, isSettingsDrawerOpen } = useAppStore();
    return (
        <>
            {/* Minimap (Bottom-Start) */}
            {!isFanChart && !isForce && showMinimap && (
                <div
                    className={`absolute z-20 transition-all duration-300
            bottom-5 start-5
            pb-[env(safe-area-inset-bottom,0px)]
            ps-[env(safe-area-inset-left,0px)]
            ${isSidebarOpen ? 'md:translate-x-0' : ''}
          `}
                >
                    <Minimap nodes={nodes} links={links} focusId={focusId} />
                </div>
            )}

            {/* Zoom Controls (Bottom-End) */}
            <div
                className={`absolute z-50 transition-all duration-300 print:hidden
          bottom-6 end-4
          pb-[env(safe-area-inset-bottom,0px)]
          pe-[env(safe-area-inset-right,0px)]
        `}
            >
                <ZoomControls
                    onZoomIn={onZoomIn}
                    onZoomOut={onZoomOut}
                    onReset={onResetZoom}
                    onFitToScreen={onFitToScreen}
                    onOpenAdvanced={() => setSettingsDrawerOpen(true)}
                />
            </div>

            {/* Floating View Settings Menu (Top-End corner - with Safe Area and Sidebar awareness) */}
            <div
                className={`absolute z-50 transition-all duration-300 print:hidden
          top-6 end-4
          pt-[env(safe-area-inset-top,0px)]
          pe-[env(safe-area-inset-right,0px)]
          ${isSidebarOpen ? 'md:translate-x-0' : ''}
        `}
            >
                <button
                    onClick={() => setSettingsDrawerOpen(!isSettingsDrawerOpen)}
                    className={`p-2.5 backdrop-blur-md border rounded-full shadow-sm active:scale-95 transition-all group flex items-center justify-center w-10 h-10 ${isSettingsDrawerOpen ? 'bg-amber-500 border-amber-500 text-slate-900 shadow-amber-500/20 shadow-lg' : 'bg-white/70 dark:bg-slate-900/70 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:text-amber-600'}`}
                    title="View Settings"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="20" height="20"
                        viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2"
                        strokeLinecap="round" strokeLinejoin="round"
                        className={`${isSettingsDrawerOpen ? '' : 'group-hover:rotate-12'} transition-transform`}
                    >
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                        <circle cx="12" cy="12" r="3" />
                    </svg>
                </button>
            </div>
        </>
    );
};
