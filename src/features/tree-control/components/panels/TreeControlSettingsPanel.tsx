import React from 'react';
import { TreeSettingsTab } from '../../../settings';
import { useTreePermissions } from '../../../../hooks/tree/useTreePermissions';
import { TreeControlPlaceholder, TreeControlSectionIntro } from '../TreeControlCenterShared';
import type { Person } from '../../../../types';

type SettingsText = {
  sections: {
    settingsTitle: string;
    settingsDesc: string;
  };
  placeholders: {
    settingsTitle: string;
    settingsBody: string;
  };
};

export const TreeControlSettingsPanel: React.FC<{
  text: SettingsText;
  treeId?: string | null;
  treeName: string;
  ownerId?: string | null;
  ownerEmail?: string | null;
  people: Person[];
  currentRootId?: string | null;
  onRootChanged?: (newRootId: string) => void;
  onTreeRenamed?: (newName: string) => void;
}> = ({ text, treeId, treeName, ownerId, ownerEmail, people, currentRootId, onRootChanged, onTreeRenamed }) => {
  const { canManageTreeSettings } = useTreePermissions();

  if (treeId && ownerId && ownerEmail) {
    return (
      <section className="space-y-4">
        <TreeControlSectionIntro title={text.sections.settingsTitle} description={text.sections.settingsDesc} />
        <TreeSettingsTab
          treeId={treeId}
          treeName={treeName}
          ownerId={ownerId}
          ownerEmail={ownerEmail}
          people={people}
          currentRootId={currentRootId ?? undefined}
          canManageTreeSettings={canManageTreeSettings}
          onRootChanged={onRootChanged}
          onTreeRenamed={onTreeRenamed}
        />
      </section>
    );
  }

  return <TreeControlPlaceholder title={text.placeholders.settingsTitle} body={text.placeholders.settingsBody} />;
};
