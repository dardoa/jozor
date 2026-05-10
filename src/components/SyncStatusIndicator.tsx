import React, { Suspense, lazy, useRef, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { useTranslation } from '../context/TranslationContext';
import { getSyncStatusDotClass } from './syncStatusPresentation';

const SyncStatusFloatingLayer = lazy(() => import('./SyncStatusFloatingLayer'));

export const SyncStatusIndicator: React.FC<{
    onOpenVault?: () => void;
    title?: string;
}> = ({ onOpenVault, title = 'Open The Vault' }) => {
    const { t } = useTranslation();
    const { syncStatus, forceDriveSync, onClearSyncCache, resetError } = useSyncStatus();
    const [isOpen, setIsOpen] = useState(false);
    const referenceRef = useRef<HTMLButtonElement | null>(null);

    return (
        <>
            <button
                ref={referenceRef}
                type="button"
                onMouseEnter={() => setIsOpen(true)}
                onFocus={() => setIsOpen(true)}
                onClick={() => {
                    if (onOpenVault) {
                        onOpenVault();
                    } else {
                        setIsOpen(true);
                    }
                }}
                title={title}
                className="relative inline-flex h-8 w-8 items-center justify-center rounded-xl text-[var(--text-dim)] transition-all duration-200 hover:bg-[var(--primary-100)] hover:text-[var(--primary-600)] active:scale-95"
                aria-label={t.syncStatus.ariaLabel}
            >
                <ShieldCheck className="h-5 w-5" />
                <span
                    className={`absolute right-1 top-1 h-2 w-2 rounded-full ring-2 ring-[var(--card-bg)] transition-all duration-200 ${getSyncStatusDotClass(syncStatus.state)}`}
                    aria-hidden="true"
                />
            </button>

            {isOpen && (
                <Suspense fallback={null}>
                    <SyncStatusFloatingLayer
                        referenceElement={referenceRef.current}
                        syncStatus={syncStatus}
                        forceDriveSync={forceDriveSync}
                        onClearSyncCache={onClearSyncCache}
                        resetError={resetError}
                        onClose={() => setIsOpen(false)}
                    />
                </Suspense>
            )}
        </>
    );
};
