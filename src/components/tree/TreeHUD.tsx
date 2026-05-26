import { ZoomControls } from '../ui/ZoomControls';
import { ZoomIndicator } from '../TreeInteractiveControls';
import { MessageSquare } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../context/TranslationContext';

interface TreeHUDProps {
    isFanChart: boolean;
    isForce: boolean;
    isDetailsPanelOpen: boolean;
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
 * Extracts overlay UI elements (Zoom Controls)
 * from FamilyTree.tsx to improve separation of concerns.
 * 
 * Key features:
 * - High z-index (z-50) to prevent hiding behind other elements
 * - Safe area insets for mobile/notch support
 * - Details panel awareness for dynamic positioning
 */
export const TreeHUD: React.FC<TreeHUDProps> = ({
    isDetailsPanelOpen,
    hasBlockingOverlay = false,
    onOpenPreferences,
    onZoomIn,
    onZoomOut,
    onResetZoom,
    onFitToScreen,
    zoomScale,
}) => {
    const { t } = useTranslation();
    const isDiscussionOpen = useAppStore((state) => state.isDiscussionOpen);
    const setDiscussionOpen = useAppStore((state) => state.setDiscussionOpen);
    const currentTreeId = useAppStore((state) => state.currentTreeId);
    const unreadCount = useAppStore((state) => state.unreadCounts[currentTreeId || ''] || 0);

    return (
        <>
            {/* Zoom Controls (Bottom-End) - Adjusted for Mobile */}
            <div
                className={`absolute z-[calc(var(--z-index-nav)-2)] transition-all duration-300 print:hidden
          bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] md:bottom-6 end-3 md:end-4
          pb-[env(safe-area-inset-bottom,0px)]
          pe-[env(safe-area-inset-right,0px)]
          ${isDetailsPanelOpen || hasBlockingOverlay ? 'opacity-0 pointer-events-none translate-y-10 md:opacity-100 md:pointer-events-auto md:translate-y-0' : 'opacity-100'}
        `}
            >
                <div className="flex flex-col items-end gap-3 scale-[0.82] sm:scale-90 md:scale-100 origin-bottom-right">
                    {/* Discussion Button */}
                    {currentTreeId && (
                        <button
                            type="button"
                            onClick={() => setDiscussionOpen(!isDiscussionOpen)}
                            className={`relative rounded-2xl border p-2.5 shadow-lg transition-all hover:-translate-y-1 active:translate-y-0 active:scale-95 ${
                                isDiscussionOpen 
                                    ? 'bg-[var(--color-primary-600)] text-white border-[var(--color-primary-500)]' 
                                    : 'bg-[var(--surface-panel)] text-[var(--text-default)] border-[var(--border-soft)] hover:border-[var(--color-primary-500)] hover:text-[var(--color-primary-600)]'
                            }`}
                            title={(t as any).discussionDrawer?.title || 'Tree Discussion'}
                        >
                            <MessageSquare className="w-5 h-5" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[var(--card-bg)] shadow-lg z-50 animate-bounce">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </button>
                    )}

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
