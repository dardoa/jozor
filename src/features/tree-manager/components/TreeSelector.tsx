import React from 'react';
import { TreePine } from 'lucide-react';

import { TreeSelectionItem } from './treeSelector/TreeSelectionItem';
import { TreeSelectorHeader } from './treeSelector/TreeSelectorHeader';
import { TreeSelectorLoading, TreeSelectorEmpty } from './treeSelector/TreeSelectorStates';
import { useTreeSelectorController } from '../hooks/useTreeSelectorController';

interface TreeSelectorProps {
  ownerId: string;
  userEmail: string;
  currentTreeId: string | null;
  supabaseToken?: string;
  onTreeSelected: (treeId: string, role: 'owner' | 'editor' | 'viewer') => void;
  onLogout?: () => Promise<void>;
}

export const TreeSelector: React.FC<TreeSelectorProps> = ({
  ownerId,
  userEmail,
  currentTreeId,
  supabaseToken,
  onTreeSelected,
  onLogout,
}) => {
  const {
    t,
    trees,
    sharedTrees,
    loading,
    creating,
    importing,
    fileInputRef,
    handleOpenTree,
    handleCreateTree,
    handleImportClick,
    handleFileChange,
  } = useTreeSelectorController({
    ownerId,
    userEmail,
    supabaseToken,
    onTreeSelected,
  });

  return (
    <div className='min-h-screen bg-[var(--theme-bg)] flex flex-col items-center justify-center p-6 sm:p-12 transition-colors duration-500'>
      {/* Background Decoration */}
      <div className='fixed inset-0 pointer-events-none opacity-40 dark:opacity-20'>
        <div className='absolute top-0 -left-4 w-72 h-72 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob'></div>
        <div className='absolute top-0 -right-4 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000'></div>
        <div className='absolute -bottom-8 left-20 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000'></div>
      </div>

      <div className='relative w-full max-w-2xl bg-[var(--surface-app)]/80 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-[var(--border-main)] p-8 sm:p-12 overflow-hidden animate-in zoom-in-95 duration-500'>

        {/* Decorative Tree Icon Background */}
        <TreePine className='absolute -top-12 -right-12 w-48 h-48 text-emerald-500/5 dark:text-emerald-500/10 rotate-12 pointer-events-none' />

        <TreeSelectorHeader
           t={t}
           creating={creating}
           importing={importing}
           onLogout={onLogout}
           onCreateTree={handleCreateTree}
           onImportClick={handleImportClick}
        />

        {loading ? (
          <TreeSelectorLoading t={t} />
        ) : trees.length === 0 && sharedTrees.length === 0 ? (
          <TreeSelectorEmpty t={t} onCreateTree={handleCreateTree} />
        ) : (
          <div className='space-y-10'>
            {/* My Trees Section */}
            {trees.length > 0 && (
              <div className='space-y-4'>
                <div className='flex items-center gap-3 px-1'>
                  <div className='w-1 h-4 bg-emerald-500 rounded-full'></div>
                  <h2 className='text-xs font-black uppercase tracking-widest text-[var(--text-muted)]'>
                    {t.treeManager.myTrees}
                  </h2>
                </div>
                <div className='grid grid-cols-1 gap-4'>
                  {trees.map((tree) => (
                    <TreeSelectionItem
                      key={tree.id}
                      tree={tree}
                      currentTreeId={currentTreeId}
                      onSelect={handleOpenTree}
                      t={t}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Shared Trees Section */}
            {sharedTrees.length > 0 && (
              <div className='space-y-4'>
                <div className='flex items-center gap-3 px-1'>
                  <div className='w-1 h-4 bg-blue-500 rounded-full'></div>
                  <h2 className='text-xs font-black uppercase tracking-widest text-stone-400 dark:text-stone-600'>
                    {t.treeManager.sharedWithMe}
                  </h2>
                </div>
                <div className='grid grid-cols-1 gap-4'>
                  {sharedTrees.map((tree) => (
                    <TreeSelectionItem
                      key={tree.id}
                      tree={tree}
                      currentTreeId={currentTreeId}
                      onSelect={(id) => handleOpenTree(id, tree.role)}
                      isShared
                      role={tree.role}
                      t={t}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <input
          type='file'
          accept='.json,.jozor'
          ref={fileInputRef}
          className='hidden'
          onChange={handleFileChange}
        />
      </div>

      {/* Footer Branding */}
      <div className='mt-12 text-center'>
        <p className='text-[11px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-600'>
          Powered by <span className='text-emerald-500'>Jozor Premium Engine</span>
        </p>
      </div>
    </div>
  );
};
