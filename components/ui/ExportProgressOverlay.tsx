import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../context/TranslationContext';

export const ExportProgressOverlay: React.FC = () => {
  const isExporting = useAppStore((state) => state.exportStatus?.isExporting);
  const { t } = useTranslation();

  if (!isExporting) return null;

  return (
    <div className='fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300'>
      <div className='bg-[var(--theme-bg)] p-8 rounded-2xl shadow-2xl border border-[var(--border-main)] flex flex-col items-center gap-4 max-w-sm text-center'>
        <div className='w-12 h-12 border-4 border-[var(--primary-600)]/20 border-t-[var(--primary-600)] rounded-full animate-spin' />
        <div>
          <h3 className='font-bold text-lg mb-1'>
            {t.general.exportStatus.generating}
          </h3>
          <p className='text-sm text-[var(--text-dim)]'>
            {t.general.exportStatus.capturingLabel}
          </p>
        </div>
      </div>
    </div>
  );
};
