import type { Language, UserProfile } from '../../../types';
import { Settings as SettingsIcon } from 'lucide-react';
import { OverlayPrimitive } from '../../../context/OverlayContext';
import { useAppStore } from '../../../store/useAppStore';
import { Button } from '../../../components/ui/Button';
import { ShareInvitePanel } from './share/ShareInvitePanel';
import { ShareLinkPanel } from './share/ShareLinkPanel';
import { ShareModalHeader } from './share/ShareModalHeader';
import { useShareModalState } from './share/useShareModalState';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  user: UserProfile | null;
  driveFileId: string | null;
  treeId: string | null;
}

export const ShareModal = ({
  isOpen,
  onClose,
  language: _language,
  user,
  driveFileId,
  treeId,
}: ShareModalProps) => {
  const state = useShareModalState({ user, driveFileId, treeId });
  const setTreeControlCenterOpen = useAppStore((store) => store.setTreeControlCenterOpen);
  const { t } = state;

  if (!isOpen) return null;

  const handleOpenAdvanced = () => {
    setTreeControlCenterOpen(true);
    onClose();
  };

  return (
    <OverlayPrimitive
      id="share-modal"
      isOpen={isOpen}
      onClose={onClose}
      backdropClassName="ds-overlay-backdrop fixed inset-0 z-50 flex items-end justify-center p-0 animate-in fade-in duration-200 sm:items-center sm:p-4"
      contentClassName="ds-overlay-card w-full sm:max-w-lg overflow-hidden flex flex-col"
    >
      <div>
        <ShareModalHeader
          title={t.shareLink}
          closeLabel={t.close}
          onClose={onClose}
        />

        <div className="ds-modal-body space-y-6 bg-[var(--surface-app)]/45">
          <ShareInvitePanel
            t={state.t}
            email={state.email}
            setEmail={state.setEmail}
            role={state.role}
            setRole={state.setRole}
            isInviting={state.isInviting}
            handleInvite={state.handleInvite}
            canInvite={Boolean(treeId)}
          />

          <ShareLinkPanel
            t={state.t}
            shareLink={state.shareLink}
            isCopied={state.isCopied}
            copyLink={state.copyLink}
          />

          <div className="ds-panel-subtle flex items-center justify-between gap-3 p-3 rounded-[var(--radius-lg)] border border-[var(--border-soft)]">
            <Button
              onClick={handleOpenAdvanced}
              variant="secondary"
              size="sm"
              className="w-full sm:w-auto"
              leftIcon={<SettingsIcon className="w-3.5 h-3.5" />}
            >
              {t.adminHub.tabs.access} & {t.adminHub.tabs.settings}
            </Button>
          </div>
        </div>
      </div>
    </OverlayPrimitive>
  );
};
