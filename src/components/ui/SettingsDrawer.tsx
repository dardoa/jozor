import React, { memo } from 'react';
import { RotateCcw, Settings, X } from 'lucide-react';
import { OverlayPrimitive } from '../../context/OverlayContext';
import { useTranslation } from '../../context/TranslationContext';
import { useAppStore } from '../../store/useAppStore';
import { ConfirmationModal } from '../ConfirmationModal';
import { AppearanceLabPanel } from './settingsDrawer/AppearanceLabPanel';
import { useGlobalReset } from '../../hooks/sync/useGlobalReset';

export const SettingsDrawer = memo(() => {
    const isSettingsDrawerOpen = useAppStore(state => state.isSettingsDrawerOpen);
    const setSettingsDrawerOpen = useAppStore(state => state.setSettingsDrawerOpen);
    const people = useAppStore(state => state.people);
    const { t, language } = useTranslation();
    const isRtl = language === 'ar';

    const { isConfirmOpen, requestReset, cancelReset, confirmReset } = useGlobalReset();
    const [isMobile, setIsMobile] = React.useState(false);

    React.useEffect(() => {
        if (typeof window === 'undefined') return;
        const mediaQuery = window.matchMedia('(max-width: 767px)');
        const handleChange = (event: MediaQueryList | MediaQueryListEvent) => {
            setIsMobile(event.matches);
        };

        handleChange(mediaQuery);

        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }

        mediaQuery.addListener(handleChange);
        return () => mediaQuery.removeListener(handleChange);
    }, []);

    React.useEffect(() => {
        if (typeof document === 'undefined') return;
        if (!(isMobile && isSettingsDrawerOpen)) return;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [isMobile, isSettingsDrawerOpen]);

    if (!isSettingsDrawerOpen) return null;

    const contentProps = { t };

    return (
        <OverlayPrimitive id="settings-drawer" isOpen={isSettingsDrawerOpen} onClose={() => setSettingsDrawerOpen(false)} withBackdrop={false}>
            {isMobile ? (
                <div
                    className="fixed inset-0 z-[var(--z-index-drawer)] bg-[color:rgba(15,12,10,0.42)] transition-opacity"
                    style={{ backdropFilter: 'blur(4px)' }}
                    onClick={() => setSettingsDrawerOpen(false)}
                />
            ) : null}
            <div className={`fixed inset-0 z-[calc(var(--z-index-drawer)+1)] flex items-stretch pointer-events-none ${isRtl ? 'justify-start' : 'justify-end'}`}>
                <div
                    className={`pointer-events-auto flex min-h-0 w-full flex-col overflow-hidden transition-all transition-[height,transform] duration-300 ease-in-out md:max-w-[420px] ${isMobile ? 'fixed inset-0 h-[100dvh] rounded-none' : 'h-full'} ${isSettingsDrawerOpen ? 'translate-x-0' : isRtl ? '-translate-x-full' : 'translate-x-full'}`}
                    style={{
                        backgroundColor: 'var(--surface-app)',
                        borderInlineStart: !isMobile && !isRtl ? '1px solid var(--border-soft)' : 'none',
                        borderInlineEnd: !isMobile && isRtl ? '1px solid var(--border-soft)' : 'none',
                        boxShadow: 'var(--shadow-lg)',
                        height: isMobile ? '100dvh' : '100%',
                        isolation: isMobile ? 'isolate' : undefined,
                        backdropFilter: 'none',
                        WebkitBackdropFilter: 'none',
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                            e.stopPropagation();
                            setSettingsDrawerOpen(false);
                        }
                    }}
                    tabIndex={-1}
                >
                    <div
                        className="flex flex-none items-center justify-between gap-3 px-4 py-4 sm:p-6"
                        style={{ borderBottom: '1px solid var(--border-soft)', backgroundColor: 'var(--surface-panel)' }}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className="rounded-[10px] p-2"
                                style={{ backgroundColor: 'var(--surface-subtle)', color: 'var(--color-accent-500)', border: '1px solid var(--border-soft)' }}
                            >
                                <Settings className="h-5 w-5" />
                            </div>
                            <h2 className="text-[18px] font-medium" style={{ color: 'var(--text-main)' }}>
                                {t.settings.appearanceLab || t.settings.title}
                            </h2>
                        </div>
                        <button
                            onClick={() => setSettingsDrawerOpen(false)}
                            aria-label={t.settings.close}
                            className="min-h-12 min-w-12 rounded-full border p-3"
                            style={{ color: 'var(--text-dim)', borderColor: 'var(--border-soft)', backgroundColor: 'var(--surface-app)' }}
                        >
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-5 pt-4 sm:p-6" style={{ backgroundColor: 'var(--surface-app)', WebkitOverflowScrolling: 'touch' }}>
                        <div className="space-y-12">
                            <AppearanceLabPanel
                                {...contentProps}
                                people={people}
                                unnamedPersonLabel={t.unnamedPerson}
                                onSectionOpen={() => {}}
                            />
                        </div>
                    </div>

                    <div className="p-6 pt-4" style={{ borderTop: '0.5px solid var(--border-soft)', backgroundColor: 'var(--surface-app)' }}>
                        <button
                            onClick={requestReset}
                            className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200/70 py-3 text-sm font-medium text-red-500 transition-colors hover:border-red-300 hover:text-red-600"
                            style={{ backgroundColor: 'transparent' }}
                        >
                            <RotateCcw className="h-3.5 w-3.5" /> {t.settings.resetAll}
                        </button>
                    </div>
                </div>

                <ConfirmationModal
                    isOpen={isConfirmOpen}
                    onClose={cancelReset}
                    onConfirm={confirmReset}
                    title={t.settings.resetAll}
                    message={t.settings.resetConfirm}
                    type="danger"
                    overlayId="reset-settings-confirm"
                />

                <style>{`
                input[type=range]::-webkit-slider-thumb {
                    appearance: none; height: 12px; width: 12px;
                    border-radius: 50%; background: var(--color-accent-500);
                    cursor: pointer; margin-top: -4px;
                    border: 2px solid var(--surface-app);
                    box-shadow: 0 0 0 1px var(--border-soft);
                }
                input[type=range]::-webkit-slider-runnable-track {
                    width: 100%; height: 4px;
                    background: var(--border-soft);
                    border-radius: 2px;
                }
            `}</style>
            </div>
        </OverlayPrimitive>
    );
});
