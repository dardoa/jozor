import React from 'react';
import { ArrowRight, Eye, Shield, TreePine, Users } from 'lucide-react';
import type { SharedTreeSummary, TreeSummary } from '../../../../services/supabaseTreeTypes';
import { useTranslation } from '../../../../context/TranslationContext';

interface TreeSelectionItemProps {
  tree: TreeSummary | SharedTreeSummary;
  currentTreeId: string | null;
  onSelect: (id: string) => void;
  isShared?: boolean;
  role?: 'editor' | 'viewer';
  t: ReturnType<typeof useTranslation>['t'];
}

export const TreeSelectionItem: React.FC<TreeSelectionItemProps> = ({ tree, currentTreeId, onSelect, isShared, role, t }) => {
  const isActive = currentTreeId === tree.id;
  const resolvedRole: 'owner' | 'editor' | 'viewer' = isShared ? (role || 'viewer') : 'owner';
  const roles = (t as any).roles || {};
  const roleLabel = resolvedRole === 'owner'
    ? (roles.owner || (t as any).owner || 'Owner')
    : resolvedRole === 'editor'
      ? (roles.editor || (t as any).editor || 'Editor')
      : (roles.viewer || (t as any).viewer || 'Viewer');
  const updatedLabel = (t as any).vaultTreeUpdated || 'Updated';
  const justNowLabel = (t as any).vaultTreeJustNow || 'Just now';
  const memberLabel = (t as any).statistics?.members || (t as any).treeControlCenter?.overviewCards?.people || 'Members';
  const updatedAtLabel = tree.updatedAt || tree.createdAt
    ? new Date(tree.updatedAt || tree.createdAt).toLocaleDateString()
    : justNowLabel;

  return (
    <div
      onClick={() => onSelect(tree.id)}
      className={`group relative flex items-center justify-between p-6 rounded-[var(--radius-lg)] cursor-pointer transition-all duration-300 border
        ${isActive
          ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800 ring-2 ring-emerald-500/20'
          : 'bg-[var(--surface-app)] border-[var(--border-main)] hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-1'
        }`}
    >
      <div className='flex items-center gap-5 min-w-0 flex-1'>
        <div className={`w-14 h-14 rounded-[var(--radius-lg)] flex items-center justify-center transition-colors duration-300
          ${isActive
            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
            : 'bg-[var(--theme-bg)] text-[var(--text-muted)] group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30 group-hover:text-emerald-500'
          }`}
        >
          <TreePine className={`w-7 h-7 ${isActive ? 'animate-pulse' : ''}`} />
        </div>

        <div className='min-w-0 flex-1'>
          <div className='flex items-center gap-3 mb-1'>
            <h3 className={`text-lg font-black truncate tracking-tight transition-colors
              ${isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-[var(--text-main)] dark:group-hover:text-emerald-400'}
            `}>
              {tree.name}
            </h3>
            {resolvedRole && (
              <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-black uppercase tracking-wider
                ${resolvedRole === 'owner'
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : resolvedRole === 'editor'
                  ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                  : 'bg-stone-100 text-stone-500 dark:bg-stone-700 dark:text-stone-400 border border-stone-200 dark:border-stone-600'
                }`}
              >
                {resolvedRole === 'viewer' ? <Eye className='w-2.5 h-2.5' /> : <Shield className='w-2.5 h-2.5' />}
                {roleLabel}
              </div>
            )}
            {isActive && (
              <span className='w-2 h-2 rounded-full bg-emerald-500 animate-pulse'></span>
            )}
          </div>
          <div className='flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--text-muted)] font-bold uppercase tracking-widest'>
            <span>
              {updatedLabel} {updatedAtLabel}
            </span>
            {typeof tree.peopleCount === 'number' && (
              <span className='inline-flex items-center gap-1.5'>
                <Users className='w-3.5 h-3.5' />
                {tree.peopleCount} {memberLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className='flex items-center gap-3'>
        <div className={`p-3 rounded-xl transition-all duration-300
          ${isActive
            ? 'bg-emerald-500 text-white'
            : 'bg-[var(--theme-bg)] text-[var(--text-muted)] group-hover:bg-emerald-600 group-hover:text-white group-hover:shadow-lg group-hover:shadow-emerald-500/20'
          }`}
        >
          <ArrowRight className='w-5 h-5 rtl:rotate-180' />
        </div>
      </div>
    </div>
  );
};
