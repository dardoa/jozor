import React from 'react';
import { Copy, Lock, Users } from 'lucide-react';

import type { UserProfile } from '../../types';
import { useTranslation } from '../../context/TranslationContext';
import { showToast } from '../../utils/showToast';
import { AccessControlTab } from '../modals/tabs/AccessControlTab';

interface CollaborationPanelProps {
  treeId: string | null;
  currentUser: UserProfile | null;
  canManageMembers: boolean;
}

export const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  treeId,
  currentUser,
  canManageMembers,
}) => {
  const { t } = useTranslation();
  const canonicalTreeLink = treeId ? `${window.location.origin}/tree/${treeId}` : '';

  if (!treeId || !currentUser?.email) {
    return (
      <section className="rounded-[14px] bg-[#f9f7f3] p-4 shadow-none">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-white/70 p-2 text-slate-500">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-[16px] font-bold tracking-tight text-slate-800">{t.vaultCollaborationTitle}</h3>
            <p className="mt-2 text-[12px] text-slate-500">
              {t.vaultCollaborationOpenTreeFirst}
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!canManageMembers) {
    return (
      <section className="space-y-4">
        <div className="rounded-[14px] bg-[#f9f7f3] p-4 shadow-none">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-white/70 p-2 text-slate-500">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-[16px] font-bold tracking-tight text-slate-800">{t.vaultMembersCollaborationTitle}</h3>
              <p className="mt-2 text-[12px] text-slate-500">
                {t.vaultMembersOwnerOnly}
              </p>
            </div>
          </div>
        </div>

        <section className="rounded-[14px] bg-[#f9f7f3] p-4 shadow-none">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.05em] text-slate-400">{t.vaultCanonicalShareLink}</p>
              <p className="mt-2 truncate text-[12px] text-slate-600">{canonicalTreeLink}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(canonicalTreeLink);
                showToast.success('vaultShareLinkCopied');
              }}
              className="rounded-xl border border-black/[0.04] bg-white/40 px-3 py-2 text-sm font-semibold text-slate-600 transition-all duration-200 ease-in-out hover:bg-white"
            >
              <span className="inline-flex items-center gap-2">
                <Copy className="h-4 w-4" />
                {t.copyLink}
              </span>
            </button>
          </div>
        </section>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <AccessControlTab
        treeId={treeId}
        ownerId={currentUser.uid}
        ownerEmail={currentUser.email || ''}
      />
    </div>
  );
};
