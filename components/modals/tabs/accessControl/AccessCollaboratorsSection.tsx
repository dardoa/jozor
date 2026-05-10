import React from 'react';
import { Loader2, Mail, Trash2 } from 'lucide-react';
import type { Collaborator } from '../../../../services/supabaseTreeTypes';
import type { AccessRole, AccessSectionText, AccessText, CollaboratorRow } from './accessControlTypes';
import { accessDescriptionClassName, accessSectionClassName, activeChipClass, inactiveChipClass } from './accessControlUtils';

export const AccessCollaboratorsSection: React.FC<{
  t: AccessText;
  sectionText: AccessSectionText;
  ownerRow: CollaboratorRow;
  collaborators: Collaborator[];
  isLoading: boolean;
  onChangeRole: (collaborator: Collaborator, role: AccessRole) => void;
  onRevoke: (collaborator: Collaborator) => void;
}> = ({ t, sectionText, ownerRow, collaborators, isLoading, onChangeRole, onRevoke }) => (
  <section className={accessSectionClassName}>
    <h4 className="mb-2 text-[15px] font-bold tracking-tight text-slate-800">
      {t.treeManager.collaboratorsCount.replace('{count}', collaborators.length.toString())}
    </h4>
    <p className={accessDescriptionClassName}>{sectionText.collaboratorsDescription}</p>
    <p className="mb-3 rounded-xl bg-white/45 px-3 py-2 text-xs leading-5 text-slate-500">
      {sectionText.ownerSummary}
    </p>

    {isLoading ? (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    ) : collaborators.length === 0 ? (
      <div className="flex items-center justify-center rounded-2xl bg-white/45 py-6 text-center text-xs italic text-slate-400">
        {t.treeManager.noCollaboratorsYet}
      </div>
    ) : (
      <div className="space-y-3">
        {[ownerRow, ...collaborators].map((collab) => {
          const isOwner = collab.role === 'owner';
          return (
            <div
              key={collab.id}
              className="flex flex-col gap-3 rounded-2xl bg-white/55 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-[#a67c37]">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-slate-800">{collab.email}</p>
                    {isOwner ? (
                      <span className="inline-flex items-center rounded-md bg-[#a67c37]/10 px-2 py-0.5 text-[11px] font-semibold text-[#a67c37]">
                        {t.owner}
                      </span>
                    ) : null}
                  </div>
                  {!isOwner ? (
                    <p className="text-[11px] text-slate-500">
                      {t.treeManager.invitedOn.replace('{date}', new Date(collab.invited_at).toLocaleDateString())}
                    </p>
                  ) : null}
                </div>
              </div>

              {!isOwner ? (
                <div className="flex flex-wrap items-center gap-2.5 gap-y-3">
                  <button
                    type="button"
                    onClick={() => void onChangeRole(collab, 'viewer')}
                    className={collab.role === 'viewer' ? activeChipClass : inactiveChipClass}
                  >
                    {t.viewer}
                  </button>
                  <button
                    type="button"
                    onClick={() => void onChangeRole(collab, 'editor')}
                    className={collab.role === 'editor' ? activeChipClass : inactiveChipClass}
                  >
                    {t.editor}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRevoke(collab)}
                    className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-black/[0.04] bg-white/40 text-red-500 transition-all duration-200 ease-in-out hover:bg-red-50"
                    title={t.delete}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    )}
  </section>
);
