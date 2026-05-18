import React from 'react';
import { FolderOpen, Plus, X } from 'lucide-react';
import { useTranslation } from '../../../context/TranslationContext';

interface GuestModeModalProps {
  onStartNew: () => void;
  onImport: () => void;
  onClose: () => void;
}

export const GuestModeModal: React.FC<GuestModeModalProps> = ({ onStartNew, onImport, onClose }) => {
  const { t } = useTranslation();

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative bg-[var(--theme-bg)] border border-[var(--border-soft)] rounded-[2rem] shadow-2xl p-8 max-w-md w-full animate-in zoom-in-95 duration-300">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 end-5 p-2 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)] transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-black text-[var(--text-main)] mb-2">
            {t.landingPage.guestModeTitle}
          </h2>
          <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
            {t.landingPage.guestModeSubtitle}
          </p>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-4">
          {/* Start New */}
          <button
            onClick={onStartNew}
            className="group relative flex items-start gap-5 p-6 rounded-2xl border-2 border-[var(--color-primary-500)]/30 bg-gradient-to-br from-[var(--color-primary-500)]/5 to-transparent hover:border-[var(--color-primary-500)]/70 hover:shadow-lg transition-all duration-300 text-start"
          >
            <div className="w-12 h-12 rounded-xl bg-[var(--color-primary-500)]/15 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
              <Plus className="h-6 w-6 text-[var(--color-primary-600)]" />
            </div>
            <div>
              <p className="font-black text-[var(--text-main)] text-lg mb-1">{t.landingPage.guestNewTree}</p>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{t.landingPage.guestNewTreeDesc}</p>
            </div>
          </button>

          {/* Import File */}
          <button
            onClick={onImport}
            className="group relative flex items-start gap-5 p-6 rounded-2xl border-2 border-[var(--border-soft)] bg-[var(--surface-panel)]/50 hover:border-[var(--color-primary-500)]/40 hover:shadow-lg transition-all duration-300 text-start"
          >
            <div className="w-12 h-12 rounded-xl bg-[var(--border-soft)]/50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
              <FolderOpen className="h-6 w-6 text-[var(--text-secondary)]" />
            </div>
            <div>
              <p className="font-black text-[var(--text-main)] text-lg mb-1">{t.landingPage.guestImport}</p>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{t.landingPage.guestImportDesc}</p>
            </div>
          </button>
        </div>

        {/* Disclaimer */}
        <p className="mt-6 text-center text-xs text-[var(--text-dim)] leading-relaxed">
          {t.landingPage.guestDisclaimer}
        </p>
      </div>
    </div>
  );
};
