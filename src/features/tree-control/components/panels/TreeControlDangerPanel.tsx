import React from 'react';
import { TreeDangerZone } from '../../../settings';
import { TreeControlPlaceholder, TreeControlSectionIntro } from '../TreeControlCenterShared';
import type { Person } from '../../../../types';

type DangerText = {
  sections: {
    dangerTitle: string;
    dangerDesc: string;
  };
  placeholders: {
    dangerTitle: string;
    dangerBody: string;
  };
};

export const TreeControlDangerPanel: React.FC<{
  text: DangerText;
  treeId?: string | null;
  ownerId?: string | null;
  ownerEmail?: string | null;
  people: Person[];
}> = ({ text, treeId, ownerId, ownerEmail, people }) => {
  if (treeId && ownerId && ownerEmail) {
    return (
      <section className="space-y-4">
        <TreeControlSectionIntro title={text.sections.dangerTitle} description={text.sections.dangerDesc} />
        <TreeDangerZone treeId={treeId} ownerId={ownerId} ownerEmail={ownerEmail} peopleCount={people.length} />
      </section>
    );
  }

  return <TreeControlPlaceholder title={text.placeholders.dangerTitle} body={text.placeholders.dangerBody} />;
};
