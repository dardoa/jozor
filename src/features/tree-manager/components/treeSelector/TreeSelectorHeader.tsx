import React from 'react';
import { Download, FolderTree, Loader2, Plus } from 'lucide-react';
import { useTranslation } from '../../../../context/TranslationContext';

interface TreeSelectorHeaderProps {
  t: ReturnType<typeof useTranslation>['t'];
  creating: boolean;
  importing: boolean;
  onLogout?: () => Promise<void>;
  onCreateTree: () => Promise<void>;
  onImportClick: () => void;
}

export const TreeSelectorHeader: React.FC<TreeSelectorHeaderProps> = ({
  t,
  creating,
  importing,
  onLogout,
  onCreateTree,
  onImportClick,
}) => {
  const importLabel = (t as any).vaultImportTree || t.load;
  const importHint = (t as any).vaultImportTreeHint;

  return (
    <div className='flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 mb-12'>
      <div>
        <div className='flex items-center gap-3 mb-2'>
          <div className='w-10 h-10 rounded-[var(--radius-lg)] bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20'>
            <FolderTree className='w-5 h-5' />
          </div>
          <h1 className='text-3xl font-black text-[var(--text-main)] tracking-tighter'>
            {t.manageTrees}
          </h1>
        </div>
        <p className='text-[var(--text-muted)] font-medium px-1'>
          {t.manageTreesDesc}
        </p>
        {importHint && (
          <p className='mt-2 max-w-xl px-1 text-xs font-semibold text-[var(--text-muted)]'>
            {importHint}
          </p>
        )}
      </div>

      <div className='flex gap-3 w-full sm:w-auto'>
        {onLogout && (
          <button
            onClick={() => {
              void onLogout();
            }}
            disabled={creating || importing}
            className='flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-[var(--surface-app)] hover:bg-[var(--theme-surface)] text-[var(--text-main)] rounded-[var(--radius-lg)] font-bold text-sm transition-all border border-[var(--border-main)] active:scale-95 disabled:opacity-50'
          >
            {t.signOut}
          </button>
        )}
        <button
          onClick={onCreateTree}
          disabled={creating || importing}
          className='flex-1 sm:flex-none group flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[var(--radius-lg)] font-black text-sm transition-all shadow-xl shadow-emerald-500/10 active:scale-95 disabled:opacity-50'
        >
          {creating ? <Loader2 className='w-4 h-4 animate-spin' /> : <Plus className='w-4 h-4 group-hover:rotate-90 transition-transform duration-300' />}
          {t.add}
        </button>
        <button
          onClick={onImportClick}
          disabled={creating || importing}
          className='flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-[var(--theme-surface)] hover:bg-[var(--surface-hover)] text-[var(--text-main)] rounded-[var(--radius-lg)] font-bold text-sm transition-all active:scale-95 disabled:opacity-50'
        >
          {importing ? <Loader2 className='w-4 h-4 animate-spin' /> : <Download className='w-4 h-4' />}
          {importLabel}
        </button>
      </div>
    </div>
  );
};
