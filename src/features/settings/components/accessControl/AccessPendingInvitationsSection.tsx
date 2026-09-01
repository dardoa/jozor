import React from 'react';
import { Mail, Trash2 } from 'lucide-react';
import type { TreeInvitation } from '../../../../features/sharing';
import type { AccessSectionText, AccessText } from './accessControlTypes';
import { accessDescriptionClassName, accessSectionClassName } from './accessControlUtils';

export const AccessPendingInvitationsSection: React.FC<{
  t: AccessText;
  sectionText: AccessSectionText;
  pendingInvitations: TreeInvitation[];
  onRevokeInvitation: (invitation: TreeInvitation) => void;
}> = ({ t, sectionText, pendingInvitations, onRevokeInvitation }) => (
  <section className={accessSectionClassName}>
    <h4 className="mb-2 text-[15px] font-bold tracking-tight text-[var(--text-main)]">
      {t.treeManager.pendingInvitations} ({pendingInvitations.length})
    </h4>
    <p className={accessDescriptionClassName}>{sectionText.pendingDescription}</p>

    {pendingInvitations.length === 0 ? (
      <p className="border-y border-dashed border-[var(--border-soft)] py-3 text-center text-xs text-[var(--text-muted)]">
        {t.treeManager.noPendingInvitations}
      </p>
    ) : (
      <div className="divide-y divide-[var(--border-soft)] border-y border-[var(--border-soft)]">
        {pendingInvitations.map((invitation) => (
          <div
            key={invitation.id}
            className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-panel)] text-[var(--primary-600)]">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--text-main)]">{invitation.invited_email}</p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {new Date(invitation.created_at).toLocaleDateString()} - {invitation.role}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void onRevokeInvitation(invitation)}
              aria-label={`${t.delete}: ${invitation.invited_email}`}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[var(--danger-500)]/20 bg-[var(--danger-500)]/10 text-[var(--danger-600)] transition-all duration-200 ease-in-out hover:bg-[var(--danger-500)]/15"
              title={t.delete}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    )}
  </section>
);
