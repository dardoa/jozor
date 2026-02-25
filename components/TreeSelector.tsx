import React, { useEffect, useState } from 'react';
import { fetchTreesForUser, createTree, type TreeSummary, fetchTree, fetchSharedTrees, type SharedTreeSummary } from '../services/supabaseTreeService';
import { useAppStore, loadFullState } from '../store/useAppStore';
import { useTranslation } from '../context/TranslationContext';
import { Plus, Download, TreePine, Shield, Eye, Loader2, ArrowRight, FolderTree } from 'lucide-react';
import { showSuccess, showError } from '../utils/toast';

interface TreeSelectorProps {
  ownerId: string;
  userEmail: string;
  currentTreeId: string | null;
  supabaseToken?: string;
  onTreeSelected: (treeId: string, role: 'owner' | 'editor' | 'viewer') => void;
}

export const TreeSelector: React.FC<TreeSelectorProps> = ({ ownerId, userEmail, currentTreeId, supabaseToken, onTreeSelected }) => {
  const { t } = useTranslation();
  const [trees, setTrees] = useState<TreeSummary[]>([]);
  const [sharedTrees, setSharedTrees] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [creating, setCreating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState<boolean>(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const [owned, shared] = await Promise.all([
          fetchTreesForUser(ownerId, userEmail, supabaseToken).catch(e => {
            console.error('fetchTreesForUser failed', e);
            showError(`Failed to load owned trees: ${e.message}`);
            return [] as TreeSummary[];
          }),
          fetchSharedTrees(ownerId, userEmail, supabaseToken).catch(e => {
            console.error('fetchSharedTrees failed', e);
            showError(`Failed to load shared trees: ${e.message}`);
            return [] as SharedTreeSummary[];
          })
        ]);
        if (!cancelled) {
          setTrees(owned);
          setSharedTrees(shared);
        }
      } catch (e) {
        console.error('Failed to load trees', e);
        if (!cancelled) setError('Failed to load trees');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [ownerId, userEmail]);

  const handleOpenTree = async (treeId: string, role: 'owner' | 'editor' | 'viewer' = 'owner') => {
    try {
      setLoading(true);
      const full = await fetchTree(treeId, ownerId, userEmail, supabaseToken);

      // Persist session
      localStorage.setItem('lastActiveTreeId', treeId);

      loadFullState({
        version: 1,
        people: full.people,
        settings: full.settings || {},
        focusId: full.focusId,
      });
      onTreeSelected(treeId, role);
      showSuccess(t.success || 'Tree loaded successfully');
    } catch (e) {
      console.error('Failed to open tree', e);
      showError('Failed to open tree');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTree = async () => {
    try {
      setCreating(true);
      const newTreeId = await createTree(ownerId, userEmail, t.newTreeName || 'New Family Tree', supabaseToken);
      await handleOpenTree(newTreeId);
    } catch (e) {
      console.error('Failed to create tree:', e);
      showError('Failed to create tree');
    } finally {
      setCreating(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);
      const text = await file.text();
      const { importTreeFromJSONItem } = await import('../services/importTreeService');

      const newTreeId = await importTreeFromJSONItem(ownerId, userEmail, text, supabaseToken);
      await handleOpenTree(newTreeId);
    } catch (e) {
      console.error('Failed to import tree:', e);
      showError(`Import failed: ${e instanceof Error ? e.message : 'Unknown error'}`);
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset input
      }
    }
  };

  return (
    <div className='min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col items-center justify-center p-6 sm:p-12'>
      {/* Background Decoration */}
      <div className='fixed inset-0 pointer-events-none opacity-40 dark:opacity-20'>
        <div className='absolute top-0 -left-4 w-72 h-72 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob'></div>
        <div className='absolute top-0 -right-4 w-72 h-72 bg-blue-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000'></div>
        <div className='absolute -bottom-8 left-20 w-72 h-72 bg-amber-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000'></div>
      </div>

      <div className='relative w-full max-w-2xl bg-white/80 dark:bg-stone-900/60 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-stone-200 dark:border-stone-800 p-8 sm:p-12 overflow-hidden animate-in zoom-in-95 duration-500'>
        {/* Decorative Tree Icon Background */}
        <TreePine className='absolute -top-12 -right-12 w-48 h-48 text-emerald-500/5 dark:text-emerald-500/10 rotate-12 pointer-events-none' />

        <div className='flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6 mb-12'>
          <div>
            <div className='flex items-center gap-3 mb-2'>
              <div className='w-10 h-10 rounded-2xl bg-emerald-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20'>
                <FolderTree className='w-5 h-5' />
              </div>
              <h1 className='text-3xl font-black text-stone-900 dark:text-white tracking-tighter'>
                {t.manageTrees || 'Family Tree Dashboard'}
              </h1>
            </div>
            <p className='text-stone-500 dark:text-stone-400 font-medium px-1'>
              {t.selectTreeDesc || 'Select an existing tree or start a new heritage journey.'}
            </p>
          </div>

          <div className='flex gap-3 w-full sm:w-auto'>
            <button
              onClick={handleCreateTree}
              disabled={creating || importing}
              className='flex-1 sm:flex-none group flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-sm transition-all shadow-xl shadow-emerald-500/10 active:scale-95 disabled:opacity-50'
            >
              {creating ? <Loader2 className='w-4 h-4 animate-spin' /> : <Plus className='w-4 h-4 group-hover:rotate-90 transition-transform duration-300' />}
              {t.newTree || 'New Tree'}
            </button>
            <button
              onClick={handleImportClick}
              disabled={creating || importing}
              className='flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 rounded-2xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50'
            >
              {importing ? <Loader2 className='w-4 h-4 animate-spin' /> : <Download className='w-4 h-4' />}
              {t.import || 'Import'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className='flex flex-col items-center justify-center py-20 text-stone-400'>
            <Loader2 className='w-12 h-12 animate-spin mb-6 text-emerald-500 opacity-80' />
            <p className='text-sm font-black uppercase tracking-widest opacity-50'>{t.loadingFiles || 'Scanning Repository...'}</p>
          </div>
        ) : trees.length === 0 && sharedTrees.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-20 bg-stone-50/50 dark:bg-stone-800/20 rounded-[2rem] border-2 border-dashed border-stone-200 dark:border-stone-800'>
            <TreePine className='w-16 h-16 text-stone-200 dark:text-stone-800 mb-4' />
            <p className='text-stone-500 dark:text-stone-400 font-bold mb-2'>{t.noTreesFound || "You don't have any trees yet."}</p>
            <button onClick={handleCreateTree} className='text-emerald-500 font-black text-sm hover:underline'>{t.getStarted || 'Start your first tree here'}</button>
          </div>
        ) : (
          <div className='space-y-10'>
            {/* My Trees Section */}
            {trees.length > 0 && (
              <div className='space-y-4'>
                <div className='flex items-center gap-3 px-1'>
                  <div className='w-1 h-4 bg-emerald-500 rounded-full'></div>
                  <h2 className='text-xs font-black uppercase tracking-widest text-stone-400 dark:text-stone-600'>
                    {t.myTrees || 'My Heritage Repositories'}
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
                    {t.sharedWithMe || 'Collaborative Trees'}
                  </h2>
                </div>
                <div className='grid grid-cols-1 gap-4'>
                  {sharedTrees.map((tree) => (
                    <TreeSelectionItem
                      key={tree.id}
                      tree={tree}
                      currentTreeId={currentTreeId}
                      onSelect={(id) => handleOpenTree(id, tree.role as any)}
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
        <p className='text-[10px] font-black uppercase tracking-widest text-stone-400 dark:text-stone-600'>
          Powered by <span className='text-emerald-500'>Jozor Premium Engine</span>
        </p>
      </div>
    </div>
  );
};

interface TreeSelectionItemProps {
  tree: TreeSummary;
  currentTreeId: string | null;
  onSelect: (id: string) => void;
  isShared?: boolean;
  role?: string;
  t: any;
}

const TreeSelectionItem: React.FC<TreeSelectionItemProps> = ({ tree, currentTreeId, onSelect, isShared, role, t }) => {
  const isActive = currentTreeId === tree.id;

  return (
    <div
      onClick={() => onSelect(tree.id)}
      className={`group relative flex items-center justify-between p-6 rounded-[1.5rem] cursor-pointer transition-all duration-300 border
        ${isActive
          ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800 ring-2 ring-emerald-500/20'
          : 'bg-white dark:bg-stone-800/40 border-stone-100 dark:border-stone-800 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-1'
        }`}
    >
      <div className='flex items-center gap-5 min-w-0 flex-1'>
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-300
          ${isActive
            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
            : 'bg-stone-50 dark:bg-stone-800 text-stone-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30 group-hover:text-emerald-500'
          }`}
        >
          <TreePine className={`w-7 h-7 ${isActive ? 'animate-pulse' : ''}`} />
        </div>

        <div className='min-w-0 flex-1'>
          <div className='flex items-center gap-3 mb-1'>
            <h3 className={`text-lg font-black truncate tracking-tight transition-colors
              ${isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-stone-900 dark:text-white dark:group-hover:text-emerald-400'}
            `}>
              {tree.name}
            </h3>
            {isShared && (
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider
                ${role === 'editor'
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                  : 'bg-stone-100 text-stone-500 dark:bg-stone-700 dark:text-stone-400 border border-stone-200 dark:border-stone-600'
                }`}
              >
                {role === 'editor' ? <Shield className='w-2.5 h-2.5' /> : <Eye className='w-2.5 h-2.5' />}
                {role}
              </div>
            )}
            {isActive && (
              <span className='w-2 h-2 rounded-full bg-emerald-500 animate-pulse'></span>
            )}
          </div>
          <p className='text-[10px] text-stone-400 dark:text-stone-500 font-bold uppercase tracking-widest'>
            Updated: {new Date(tree.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className='flex items-center gap-3'>
        <div className={`p-3 rounded-xl transition-all duration-300
          ${isActive
            ? 'bg-emerald-500 text-white'
            : 'bg-stone-50 dark:bg-stone-800 text-stone-400 group-hover:bg-emerald-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-emerald-500/20'
          }`}
        >
          <ArrowRight className='w-5 h-5' />
        </div>
      </div>
    </div>
  );
};
