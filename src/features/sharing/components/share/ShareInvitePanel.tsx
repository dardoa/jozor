import { Mail, UserPlus } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';
import type { ShareModalState, ShareRole } from './useShareModalState';

type ShareInvitePanelProps = Pick<
  ShareModalState,
  't' | 'email' | 'setEmail' | 'role' | 'setRole' | 'isInviting' | 'handleInvite'
> & {
  canInvite: boolean;
};

export const ShareInvitePanel = ({
  t,
  email,
  setEmail,
  role,
  setRole,
  isInviting,
  handleInvite,
  canInvite,
}: ShareInvitePanelProps) => (
  <div className="ds-panel pt-6 p-4 space-y-3 relative">
    <h3 className="absolute top-[-10px] start-4 z-10 bg-[var(--surface-app)] px-2.5 ds-label">
      {t.inviteCollaborator}
    </h3>
    <form onSubmit={handleInvite} className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
      <div className="flex-1 relative">
        <Mail className="absolute start-3 top-2.5 w-4 h-4 text-[var(--text-muted)]" />
        <input
          type="email"
          required
          placeholder={t.emailPlaceholder}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={!canInvite}
          className="ds-input w-full ps-10 pe-3 py-2 disabled:opacity-60 disabled:cursor-not-allowed"
        />
      </div>
      <select
        value={role}
        onChange={(event) => setRole(event.target.value as ShareRole)}
        aria-label={t.role}
        disabled={!canInvite}
        className="ds-input px-3 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <option value="viewer">{t.viewer}</option>
        <option value="editor">{t.editor}</option>
      </select>
      <Button
        type="submit"
        disabled={isInviting || !canInvite}
        size="md"
        className="w-full sm:w-auto"
        leftIcon={<UserPlus className="w-4 h-4 rtl:-scale-x-100" />}
      >
        {isInviting ? t.loading : t.sendInvite}
      </Button>
    </form>
  </div>
);
