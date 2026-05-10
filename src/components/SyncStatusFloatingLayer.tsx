import React, { useEffect, useState } from 'react';
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
import type { SyncStatus } from '../types';
import { SyncStatusTooltip } from './SyncStatusTooltip';

interface SyncStatusFloatingLayerProps {
    referenceElement: HTMLElement | null;
    syncStatus: SyncStatus;
    forceDriveSync: () => void;
    onClearSyncCache: () => void;
    resetError: () => void;
    onClose: () => void;
}

const SyncStatusFloatingLayer: React.FC<SyncStatusFloatingLayerProps> = ({
    referenceElement,
    syncStatus,
    forceDriveSync,
    onClearSyncCache,
    resetError,
    onClose,
}) => {
    const [arrowElement, setArrowElement] = useState<SVGSVGElement | null>(null);
    const [isOpen, setIsOpen] = useState(true);

    const { refs: floatingElements, floatingStyles, context } = useFloating({
        open: isOpen,
        onOpenChange: (open) => {
            setIsOpen(open);
            if (!open) onClose();
        },
        placement: 'bottom-end',
        whileElementsMounted: autoUpdate,
        middleware: [
            offset(8),
            flip({ fallbackAxisSideDirection: 'end' }),
            shift({ padding: 16 }),
            arrow({ element: arrowElement }),
        ],
    });

    useEffect(() => {
        floatingElements.setReference(referenceElement);
    }, [floatingElements, referenceElement]);

    const hover = useHover(context, {
        handleClose: safePolygon(),
        enabled: true,
    });
    const click = useClick(context);
    const dismiss = useDismiss(context);

    const { getFloatingProps } = useInteractions([
        hover,
        click,
        dismiss,
    ]);

    return (
        <SyncStatusTooltip
            setFloating={floatingElements.setFloating}
            setArrowElement={setArrowElement}
            floatingStyles={floatingStyles}
            getFloatingProps={getFloatingProps}
            context={context}
            syncStatus={syncStatus}
            onForceSync={forceDriveSync}
            onClearSyncCache={onClearSyncCache}
            onResetError={resetError}
            onClose={onClose}
        />
    );
};

export default SyncStatusFloatingLayer;
