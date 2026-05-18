import React from 'react';
import { ActivityHistoryTab } from '../../../settings';
import { TreeControlPlaceholder, TreeControlSectionIntro } from '../TreeControlCenterShared';

type ActivityText = {
  sections: {
    activityTitle: string;
    activityDesc: string;
  };
  placeholders: {
    activityTitle: string;
    activityBody: string;
  };
};

export const TreeControlActivityPanel: React.FC<{
  text: ActivityText;
  treeId?: string | null;
  language: 'ar' | 'en';
}> = ({ text, treeId, language }) => {
  if (treeId) {
    return (
      <section className="space-y-4">
        <TreeControlSectionIntro title={text.sections.activityTitle} description={text.sections.activityDesc} />
        <ActivityHistoryTab treeId={treeId} language={language} />
      </section>
    );
  }

  return <TreeControlPlaceholder title={text.placeholders.activityTitle} body={text.placeholders.activityBody} />;
};
