import React from 'react';
import { ConfirmationModal } from '../../../components/ConfirmationModal';
import { useTranslation } from '../../../context/TranslationContext';
import { TreeDangerZone } from './TreeDangerZone';
import { TreeInfoSection } from './treeSettings/TreeInfoSection';
import { TreeRenameSection } from './treeSettings/TreeRenameSection';
import { TreeRootSection } from './treeSettings/TreeRootSection';
import { TreeSettingsFlashMessages } from './treeSettings/TreeSettingsFlashMessages';
import { useTreeSettingsTabState } from './treeSettings/useTreeSettingsTabState';
import type { TreeSettingsTabProps } from './treeSettings/treeSettingsTypes';

export const TreeSettingsTab: React.FC<TreeSettingsTabProps> = ({
  treeId,
  treeName = 'My Family Tree',
  ownerId,
  ownerEmail,
  people = [],
  currentRootId,
  onTreeDeleted,
  onTreeRenamed,
  onRootChanged,
}) => {
  const { t } = useTranslation();
  const text = t.adminHub.treeSettings;
  const state = useTreeSettingsTabState({
    treeId,
    treeName,
    ownerId,
    ownerEmail,
    people,
    currentRootId,
    text,
    onTreeRenamed,
    onRootChanged,
  });

  return (
    <div className="space-y-6">
      <TreeSettingsFlashMessages error={state.error} success={state.success} />

      <TreeRenameSection
        text={text}
        value={state.newTreeName}
        canRename={state.canRename}
        isSaving={state.isSaving}
        onChange={state.setNewTreeName}
        onRename={state.handleRename}
      />

      <TreeRootSection
        text={text}
        people={people}
        currentRootId={currentRootId}
        unnamedPersonLabel={t.unnamedPerson}
        onRootChange={state.requestRootChange}
      />

      <TreeInfoSection
        text={text}
        treeId={treeId}
        peopleCount={people.length}
        currentRootLabel={state.currentRootLabel}
      />

      <TreeDangerZone
        treeId={treeId}
        ownerId={ownerId}
        ownerEmail={ownerEmail}
        peopleCount={people.length}
        onTreeDeleted={onTreeDeleted}
      />

      <ConfirmationModal
        isOpen={state.isConfirmRootChangeOpen}
        onClose={state.closeRootConfirmation}
        onConfirm={() => void state.confirmRootChange()}
        title={text.rootChangeConfirmTitle}
        message={text.rootChangeConfirmMessage}
        confirmText={text.rootChangeConfirmAction}
        type="warning"
        overlayId="tree-settings-root-confirm"
      />
    </div>
  );
};
