import React, { useState } from 'react';
import { useTranslation } from '../../../context/TranslationContext';
import type { DriveFile } from '../../../types';
import { ConfirmationModal } from '../../ConfirmationModal';
import { VersionCreateSnapshotCard } from './versions/VersionCreateSnapshotCard';
import { VersionSnapshotList } from './versions/VersionSnapshotList';
import { getVersionsPanelText } from './versions/versionsTabUtils';
import { useVersionsSnapshots } from './versions/useVersionsSnapshots';

interface VersionsTabProps {
  treeId: string;
  language: 'ar' | 'en';
  googleSync: {
    handleCreateSnapshot: (label: string) => Promise<void>;
    handleRestoreSnapshot: (snapshot: DriveFile) => Promise<void>;
  };
}

export const VersionsTab: React.FC<VersionsTabProps> = ({ treeId, language: _language, googleSync }) => {
  const { t, dateLocale } = useTranslation();
  const versionsText = getVersionsPanelText(t);
  const {
    snapshots,
    isLoading,
    newLabel,
    setNewLabel,
    isCreating,
    handleCreate,
    restoreSnapshot,
    handleTogglePin,
    deleteSnapshot,
  } = useVersionsSnapshots({ treeId, googleSync });
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const handleRestore = (snapshot: DriveFile) => {
    setConfirmConfig({
      isOpen: true,
      title: t.versions.restore,
      message: t.treeManager.confirmRestoreVersion,
      type: 'warning',
      onConfirm: () => void restoreSnapshot(snapshot),
    });
  };

  const handleDelete = (snapshotId: string) => {
    setConfirmConfig({
      isOpen: true,
      title: t.delete,
      message: t.treeManager.confirmDeleteVersion,
      type: 'danger',
      onConfirm: () => void deleteSnapshot(snapshotId),
    });
  };

  return (
    <div className="space-y-6">
      <VersionCreateSnapshotCard
        title={t.treeManager.createManualSnapshot}
        description={versionsText.createDescription || 'Capture a labeled restore point before risky edits or collaboration changes.'}
        placeholder={t.treeManager.snapshotLabelPlaceholder}
        saveLabel={t.versions.save}
        newLabel={newLabel}
        isCreating={isCreating}
        onLabelChange={setNewLabel}
        onCreate={() => void handleCreate()}
      />

      <VersionSnapshotList
        snapshots={snapshots}
        isLoading={isLoading}
        dateLocale={dateLocale}
        title={t.treeManager.previousVersions}
        description={versionsText.listDescription || 'Pinned versions stay protected while regular snapshots can be restored or cleaned up later.'}
        emptyLabel={t.treeManager.noSnapshotsYet}
        untitledLabel={t.versions.untitled}
        restoreLabel={t.versions.restore}
        deleteLabel={t.delete}
        versionsText={versionsText}
        onTogglePin={(snapshot) => void handleTogglePin(snapshot)}
        onRestore={handleRestore}
        onDelete={handleDelete}
      />

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
        <p className="text-xs leading-relaxed text-blue-800 dark:text-blue-200">
          <strong>{versionsText.infoPrefix || 'Note:'}</strong> <strong>{t.treeManager.aboutSnapshotsTitle}</strong><br />
          {t.treeManager.aboutSnapshotsBody}
        </p>
      </div>

      <ConfirmationModal
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig((previous) => ({ ...previous, isOpen: false }))}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
        overlayId="versions-tab-confirm"
      />
    </div>
  );
};
