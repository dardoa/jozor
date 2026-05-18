import React from 'react';
import { Loader2, Mail, UserPlus } from 'lucide-react';
import type { AccessRole, AccessSectionText, AccessText } from './accessControlTypes';
import { accessDescriptionClassName, accessSectionClassName, activeChipClass, inactiveChipClass } from './accessControlUtils';

export const AccessInviteSection: React.FC<{
  t: AccessText;
  sectionText: AccessSectionText;
  inviteEmail: string;
  inviteRole: AccessRole;
  isInviting: boolean;
  onEmailChange: (value: string) => void;
  onRoleChange: (role: AccessRole) => void;
  onInvite: () => void;
}> = ({ t, sectionText, inviteEmail, inviteRole, isInviting, onEmailChange, onRoleChange, onInvite }) => (
  <section className={accessSectionClassName}>
    <h4 className="mb-2 flex items-center gap-2 text-[15px] font-bold tracking-tight text-[var(--text-main)]">
      <UserPlus className="h-4 w-4 text-[var(--primary-600)]" />
      {t.treeManager.inviteNewCollaborator}
    </h4>
    <p className={accessDescriptionClassName}>{sectionText.inviteDescription}</p>
    <div className="flex flex-col gap-4">
      <div className="relative">
        <Mail className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          type="email"
          value={inviteEmail}
          onChange={(e) => onEmailChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void onInvite()}
          placeholder={t.treeManager.emailLabel}
          className="min-h-11 w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] ps-10 pe-3 py-3 text-sm text-[var(--text-main)] outline-none transition-all duration-200 ease-in-out placeholder:text-[var(--text-muted)] focus:border-[var(--primary-600)]/30 focus:bg-[var(--surface-panel)]"
        />
      </div>

      <div className="flex flex-wrap gap-2.5 gap-y-3">
        <button
          type="button"
          onClick={() => onRoleChange('viewer')}
          className={inviteRole === 'viewer' ? activeChipClass : inactiveChipClass}
        >
          {t.viewer}
        </button>
        <button
          type="button"
          onClick={() => onRoleChange('editor')}
          className={inviteRole === 'editor' ? activeChipClass : inactiveChipClass}
        >
          {t.editor}
        </button>
      </div>

      <button
        type="button"
        onClick={() => void onInvite()}
        disabled={isInviting || !inviteEmail.trim()}
        className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--primary-600)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition-all duration-200 ease-in-out hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isInviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
        {t.treeManager.inviteButton}
      </button>
    </div>
  </section>
);
