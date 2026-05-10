import React from 'react';

import type {
  FamilyActionsProps,
  Person,
  PersonUpdateHandler,
  TreeSettings,
} from '../../../types';
import { Skeleton } from '../../ui/Skeleton';
import type { AboutSectionId } from './aboutTypes';

type AboutModalType = 'calculator' | 'stats' | 'chat' | 'consistency' | 'timeline' | 'map';

const InfoTab = React.lazy(() =>
  import('../../sidebar/InfoTab').then((module) => ({ default: module.InfoTab }))
);

const BioTab = React.lazy(() =>
  import('../../sidebar/BioTab').then((module) => ({ default: module.BioTab }))
);

const ContactTab = React.lazy(() =>
  import('../../sidebar/ContactTab').then((module) => ({ default: module.ContactTab }))
);

interface AboutSectionContentProps {
  section: AboutSectionId;
  person: Person;
  people: Record<string, Person>;
  isEditing: boolean;
  canEdit: boolean;
  onUpdate: PersonUpdateHandler;
  onSelect: (id: string) => void;
  onOpenModal: (modalType: AboutModalType) => void;
  familyActions: FamilyActionsProps;
  settings: TreeSettings;
  padded?: boolean;
}

export const AboutSectionContent: React.FC<AboutSectionContentProps> = ({
  section,
  person,
  people,
  isEditing,
  canEdit,
  onUpdate,
  onSelect,
  onOpenModal,
  familyActions,
  settings,
  padded = false,
}) => {
  const sectionLoader = (
    <div className="space-y-3">
      <Skeleton width="46%" height={20} />
      <Skeleton width="100%" height={72} />
      <Skeleton width="72%" height={16} />
    </div>
  );

  const content = (() => {
    if (section === 'overview') {
      return (
        <InfoTab
          person={person}
          people={people}
          isEditing={isEditing}
          canEdit={canEdit}
          onUpdate={onUpdate}
          onSelect={onSelect}
          onOpenModal={onOpenModal}
          familyActions={familyActions}
          settings={settings}
        />
      );
    }

    if (section === 'workBio') {
      return (
        <BioTab
          person={person}
          people={people}
          isEditing={isEditing}
          onUpdate={onUpdate}
        />
      );
    }

    return (
      <ContactTab
        person={person}
        isEditing={isEditing}
        onUpdate={onUpdate}
      />
    );
  })();

  const wrappedContent = (
    <React.Suspense fallback={sectionLoader}>
      {content}
    </React.Suspense>
  );

  return padded ? <div className="p-3">{wrappedContent}</div> : wrappedContent;
};
