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
  canManage?: boolean;
}> = ({ t, sectionText, ownerRow, collaborators, isLoading, onChangeRole, onRevoke, canManage = true }) => (
  <section className={accessSectionClassName}>
    <h4 className="mb-2 text-[15px] font-bold tracking-tight text-[var(--text-main)]">
      {t.treeManager.collaboratorsCount.replace('{count}', (collaborators.length + 1).toString())}
    </h4>
    <p className={accessDescriptionClassName}>{sectionText.collaboratorsDescription}</p>
    <p className="mb-3 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-2 text-xs leading-5 text-[var(--text-muted)]">
      {sectionText.ownerSummary}
    </p>

    {isLoading ? (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
      </div>
    ) : (
      <div className="divide-y divide-[var(--border-soft)] border-y border-[var(--border-soft)]">
        {[ownerRow, ...collaborators].map((collab) => {
          const isOwner = collab.role === 'owner';
          return (
            <div
              key={collab.id}
              className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-panel)] text-[var(--primary-600)]">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-bold text-[var(--text-main)]">{collab.email}</p>
                    {isOwner ? (
                      <span className="inline-flex items-center rounded-md bg-[var(--primary-600)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--primary-600)]">
                        {t.owner}
                      </span>
                    ) : null}
                  </div>
                  {!isOwner ? (
                    <p className="text-[11px] text-[var(--text-muted)]">
                      {t.treeManager.invitedOn.replace('{date}', new Date(collab.invited_at).toLocaleDateString())}
                    </p>
                  ) : null}
                </div>
              </div>

              {!isOwner ? (
                canManage ? (
                  <div className="flex flex-wrap items-center gap-2.5 gap-y-3">
                    <button
                      type="button"
                      onClick={() => void onChangeRole(collab, 'viewer')}
                      aria-pressed={collab.role === 'viewer'}
                      className={collab.role === 'viewer' ? activeChipClass : inactiveChipClass}
                    >
                      {t.viewer}
                    </button>
                    <button
                      type="button"
                      onClick={() => void onChangeRole(collab, 'editor')}
                      aria-pressed={collab.role === 'editor'}
                      className={collab.role === 'editor' ? activeChipClass : inactiveChipClass}
                    >
                      {t.editor}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRevoke(collab)}
                      aria-label={`${t.delete}: ${collab.email}`}
                      className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[var(--danger-500)]/20 bg-[var(--danger-500)]/10 text-[var(--danger-600)] transition-all duration-200 ease-in-out hover:bg-[var(--danger-500)]/15"
                      title={t.delete}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <span className="inline-flex items-center rounded-md bg-[var(--surface-panel)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)]">
                    {collab.role === 'editor' ? t.editor : t.viewer}
                  </span>
                )
              ) : null}
            </div>
          );
        })}
      </div>
    )}
  </section>
);
