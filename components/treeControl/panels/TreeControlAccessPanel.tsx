import React from 'react';
import { AccessControlTab } from '../../modals/tabs/AccessControlTab';
import { TreeControlPlaceholder, TreeControlSectionIntro } from '../TreeControlCenterShared';

type AccessText = {
  sections: {
    accessTitle: string;
    accessDesc: string;
  };
  placeholders: {
    accessTitle: string;
    accessBody: string;
  };
};

export const TreeControlAccessPanel: React.FC<{
  text: AccessText;
  treeId?: string | null;
  ownerId?: string | null;
  ownerEmail?: string | null;
  language: 'ar' | 'en';
}> = ({ text, treeId, ownerId, ownerEmail, language }) => {
  if (treeId && ownerId && ownerEmail) {
    return (
      <section className="space-y-4">
        <TreeControlSectionIntro title={text.sections.accessTitle} description={text.sections.accessDesc} />
        <AccessControlTab treeId={treeId} ownerId={ownerId} ownerEmail={ownerEmail} language={language} />
      </section>
    );
  }

  return <TreeControlPlaceholder title={text.placeholders.accessTitle} body={text.placeholders.accessBody} />;
};

