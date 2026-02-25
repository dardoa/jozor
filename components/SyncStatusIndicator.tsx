import React, { useState } from 'react';
import { CheckCircle, Loader2, AlertCircle, WifiOff } from 'lucide-react';
import {
    useFloating,
    autoUpdate,
    offset,
    flip,
    shift,
    arrow,
    useDismiss,
    useInteractions,
    useHover,
    useClick,
    safePolygon,
} from '@floating-ui/react';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { SyncStatusTooltip } from './SyncStatusTooltip';

export const SyncStatusIndicator: React.FC = () => {
    const { syncStatus, forceDriveSync, onClearSyncCache, resetError } = useSyncStatus();
    const [isOpen, setIsOpen] = useState(false);
    const [arrowElement, setArrowElement] = useState<HTMLElement | null>(null);

    const { refs, floatingStyles, context } = useFloating({
        open: isOpen,
        onOpenChange: setIsOpen,
        placement: 'bottom-end',
        whileElementsMounted: autoUpdate,
        middleware: [
            offset(8),
            flip({ fallbackAxisSideDirection: 'end' }),
            shift({ padding: 16 }),
            arrow({ element: arrowElement }),
        ],
    });

    const reference = refs.setReference;

    const hover = useHover(context, {
        handleClose: safePolygon(),
        enabled: true,
    });
    const click = useClick(context);
    const dismiss = useDismiss(context);

    const { getReferenceProps, getFloatingProps } = useInteractions([
        hover,
        click,
        dismiss,
    ]);

    const getStatusColor = () => {
        switch (syncStatus.state) {
            case 'synced':
                return 'text-green-500';
            case 'saving':
                return 'text-yellow-500';
            case 'error':
                return 'text-red-500';
            case 'offline':
                return 'text-gray-500';
            default:
                return 'text-gray-400';
        }
    };

    const getStatusIcon = () => {
        switch (syncStatus.state) {
            case 'synced':
                return <CheckCircle className="w-5 h-5" />;
            case 'saving':
                return <Loader2 className="w-5 h-5 animate-spin" />;
            case 'error':
                return <AlertCircle className="w-5 h-5" />;
            case 'offline':
                return <WifiOff className="w-5 h-5" />;
            default:
                return null;
        }
    };

    return (
        <>
            <button
                ref={reference}
                {...getReferenceProps()}
                className={`p-2 hover:bg-[var(--theme-hover)] rounded-lg transition-colors ${getStatusColor()}`}
                aria-label="Sync Status"
            >
                {getStatusIcon()}
            </button>

            {isOpen && (
                <SyncStatusTooltip
                    refs={refs}
                    setArrowElement={setArrowElement}
                    floatingStyles={floatingStyles}
                    getFloatingProps={getFloatingProps}
                    context={context}
                    syncStatus={syncStatus}
                    onForceSync={forceDriveSync}
                    onClearSyncCache={onClearSyncCache}
                    onResetError={resetError}
                    onClose={() => setIsOpen(false)}
                />
            )}
        </>
    );
};
