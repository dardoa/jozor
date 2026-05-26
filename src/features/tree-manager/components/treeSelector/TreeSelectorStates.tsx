import React from 'react';
import { Loader2, TreePine } from 'lucide-react';
import type { TranslationSchema } from '../../../../utils/translationLoader';

export const TreeSelectorLoading: React.FC<{ t: TranslationSchema }> = ({ t }) => (
  <div className='flex flex-col items-center justify-center py-20 text-[var(--text-muted)]'>
    <Loader2 className='w-12 h-12 animate-spin mb-6 text-emerald-500 opacity-80' />
    <p className='text-sm font-black uppercase tracking-widest opacity-50'>{t.loadingFiles}</p>
  </div>
);

export const TreeSelectorEmpty: React.FC<{ t: TranslationSchema, onCreateTree: () => void }> = ({ t, onCreateTree }) => (
  <div className='flex flex-col items-center justify-center py-20 bg-[var(--theme-bg)]/50 rounded-[2rem] border-2 border-dashed border-[var(--border-main)]'>
    <TreePine className='w-16 h-16 text-[var(--border-main)] mb-4' />
    <p className='text-[var(--text-muted)] font-bold mb-2'>{t.noTreesFound}</p>
    <button onClick={onCreateTree} className='text-emerald-500 font-black text-sm hover:underline'>{t.getStarted}</button>
  </div>
);
