import { lazy, memo, Suspense, useEffect, useState } from 'react';
import { Person, FamilyActionsProps, PersonUpdateHandler, TreeSettings } from '../../../../types';
import { InfoTabView } from './InfoTabView';
import { Skeleton } from '../../../../components/ui/Skeleton';

const InfoTabEdit = lazy(() =>
  import('./InfoTabEdit').then((module) => ({ default: module.InfoTabEdit }))
);

interface InfoTabProps {
  person: Person;
  people: Record<string, Person>;
  isEditing: boolean;
  canEdit: boolean;
  onUpdate: PersonUpdateHandler;
  onSelect: (id: string) => void;
  onOpenModal: (
    modalType:
      | 'calculator'
      | 'stats'
      | 'chat'
      | 'consistency'
      | 'timeline'
      | 'map'
  ) => void;
  familyActions: FamilyActionsProps;
  settings: TreeSettings;
}

export const InfoTab = memo<InfoTabProps>(
  ({ person, people, isEditing, canEdit, onUpdate, onSelect, onOpenModal, familyActions, settings }) => {
    const [settledPersonId, setSettledPersonId] = useState(person.id);
    const isLoading = settledPersonId !== person.id;

    useEffect(() => {
      if (!isLoading) return;

      const personId = person.id;
      const timer = window.setTimeout(() => setSettledPersonId(personId), 220);
      return () => window.clearTimeout(timer);
    }, [isLoading, person.id]);

    if (isLoading && !isEditing) {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton variant="circular" width={80} height={80} />
            <div className="flex-1 space-y-2">
              <Skeleton width="60%" height={24} />
              <Skeleton width="40%" height={16} />
            </div>
          </div>
          <div className="space-y-3">
            <Skeleton variant="rectangular" height={120} />
            <Skeleton variant="rectangular" height={160} />
          </div>
        </div>
      );
    }

    if (!isEditing) {
      return (
        <InfoTabView
          person={person}
          people={people}
          canEdit={canEdit}
          onSelect={onSelect}
          onOpenModal={onOpenModal}
          familyActions={familyActions}
          settings={settings}
        />
      );
    }

    return (
      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton width="70%" height={28} />
            <Skeleton variant="rectangular" height={144} />
            <Skeleton variant="rectangular" height={120} />
          </div>
        }
      >
        <InfoTabEdit
          person={person}
          people={people}
          onUpdate={onUpdate}
          onSelect={onSelect}
          familyActions={familyActions}
        />
      </Suspense>
    );
  }
);
