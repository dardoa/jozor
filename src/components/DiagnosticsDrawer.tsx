import React, { memo } from 'react';
import { Activity, X } from 'lucide-react';

import { useTranslation } from '../context/TranslationContext';
import { useAppStore } from '../store/useAppStore';
import { OverlayPrimitive } from '../context/OverlayContext';
import { DiagnosticsPanels } from './DiagnosticsPanels';

export const DiagnosticsDrawer = memo(() => {
  const { t } = useTranslation();
  const isOpen = useAppStore((state) => state.isDiagnosticsDrawerOpen);
  const setOpen = useAppStore((state) => state.setDiagnosticsDrawerOpen);

  if (!isOpen) return null;

  return (
    <OverlayPrimitive id="diagnostics-drawer" isOpen={isOpen} onClose={() => setOpen(false)} withBackdrop={false}>
      <div className="fixed inset-0 z-[var(--z-index-drawer)] flex justify-end pointer-events-none">
        <div className="ds-overlay-backdrop absolute inset-0 pointer-events-auto" onClick={() => setOpen(false)} />

        <div className="ds-drawer-shell w-full max-w-[100vw] sm:max-w-[420px] h-full pointer-events-auto overflow-hidden flex flex-col">
          <div className="ds-modal-header flex-none">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-[var(--primary-600)]/10 p-2 text-[var(--primary-600)]">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold tracking-wide text-[var(--text-main)]">
                  {t.settings.diagnostics}
                </h2>
                <p className="text-xs font-medium text-[var(--text-dim)]">
                  {t.settings.performance}
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label={t.settings.close}
              className="p-2.5 hover:bg-[var(--theme-bg)] rounded-full transition-all text-[var(--text-muted)] hover:text-[var(--text-main)]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-[var(--surface-app)]/70">
            <DiagnosticsPanels includeTelemetry includeMaintenance />
          </div>
        </div>
      </div>
    </OverlayPrimitive>
  );
});

DiagnosticsDrawer.displayName = 'DiagnosticsDrawer';
