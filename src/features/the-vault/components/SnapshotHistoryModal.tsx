import React from 'react';
import type { GoogleSyncStateAndActions, ThemeLanguageProps } from '../../../types';
import { OverlayPrimitive } from '../../../context/OverlayContext';
import { useTranslation } from '../../../context/TranslationContext';
import { ConfirmationModal } from '../../../components/ConfirmationModal';
import { SnapshotHistoryCreateSection } from './snapshotHistory/SnapshotHistoryCreateSection';
import { SnapshotHistoryHeader } from './snapshotHistory/SnapshotHistoryHeader';
import { SnapshotHistoryList } from './snapshotHistory/SnapshotHistoryList';
import { useSnapshotHistoryModalState } from './snapshotHistory/useSnapshotHistoryModalState';

interface SnapshotHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  googleSync: GoogleSyncStateAndActions;
  themeLanguage: ThemeLanguageProps;
}

export const SnapshotHistoryModal: React.FC<SnapshotHistoryModalProps> = ({
  isOpen,
  onClose,
  googleSync,
  themeLanguage: _themeLanguage,
}) => {
  const { t, dateLocale, language } = useTranslation();
  const {
    snapshots,
    isLoading,
    newLabel,
    setNewLabel,
    isCreating,
    isRestoreConfirmOpen,
    setRestoreConfirmOpen,
    handleCreate,
    handleRestore,
    confirmRestore,
  } = useSnapshotHistoryModalState({ isOpen, onClose, googleSync });

  return (
    <OverlayPrimitive
      isOpen={isOpen}
      onClose={onClose}
      id="snapshot-history-modal"
    >
      <div
        className="bg-[var(--theme-bg)] rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col border border-[var(--border-main)] animate-in fade-in zoom-in-95 duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        <SnapshotHistoryHeader
          title={t.versions.title}
          closeLabel={t.common?.close}
          onClose={onClose}
        />

        <SnapshotHistoryCreateSection
          label={t.versions.create}
          placeholder={(t as any).versions?.snapshotLabelPlaceholder}
          saveLabel={t.versions.save}
          newLabel={newLabel}
          isCreating={isCreating}
          onLabelChange={setNewLabel}
          onCreate={() => void handleCreate()}
        />

        <SnapshotHistoryList
          snapshots={snapshots}
          isLoading={isLoading}
          dateLocale={dateLocale}
          loadingLabel={t.versions.loadingHistory}
          emptyLabel={t.versions.noSnapshots}
          untitledLabel={t.versions.untitled}
          restoreLabel={t.versions.restore}
          onRestore={handleRestore}
        />
      </div>

      <ConfirmationModal
        isOpen={isRestoreConfirmOpen}
        onClose={() => setRestoreConfirmOpen(false)}
        onConfirm={confirmRestore}
        title={t.versions.restore}
        message={t.versions.restoreConfirm}
        type="warning"
        overlayId="snapshot-history-restore-confirm"
        requiredConfirmText={language === 'ar' ? 'استعادة' : 'RESTORE'}
      />
    </OverlayPrimitive>
  );
};
