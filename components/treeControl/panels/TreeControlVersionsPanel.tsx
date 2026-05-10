import React from 'react';
import { VersionsTab } from '../../modals/tabs/VersionsTab';
import { TreeControlPlaceholder, TreeControlSectionIntro } from '../TreeControlCenterShared';
import type { DriveFile } from '../../../types';

type VersionsText = {
  sections: {
    versionsTitle: string;
    versionsDesc: string;
  };
  placeholders: {
    versionsTitle: string;
    versionsBody: string;
  };
};

export const TreeControlVersionsPanel: React.FC<{
  text: VersionsText;
  treeId?: string | null;
  language: 'ar' | 'en';
  googleSync: {
    handleCreateSnapshot: (label: string) => Promise<void>;
    handleRestoreSnapshot: (snapshot: DriveFile) => Promise<void>;
  };
}> = ({ text, treeId, language, googleSync }) => {
  if (treeId) {
    return (
      <section className="space-y-4">
        <TreeControlSectionIntro title={text.sections.versionsTitle} description={text.sections.versionsDesc} />
        <VersionsTab treeId={treeId} language={language} googleSync={googleSync} />
      </section>
    );
  }

  return <TreeControlPlaceholder title={text.placeholders.versionsTitle} body={text.placeholders.versionsBody} />;
};

