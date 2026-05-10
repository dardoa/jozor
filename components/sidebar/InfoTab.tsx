import { lazy, memo, Suspense } from 'react';
import { Person, FamilyActionsProps, PersonUpdateHandler, TreeSettings } from '../../types';
import { InfoTabView } from './InfoTabView';
import { Skeleton } from '../ui/Skeleton';
import { useEffect, useRef, useState } from 'react';

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
    const [isLoading, setIsLoading] = useState(false);
    const prevPersonIdRef = useRef(person.id);

    useEffect(() => {
      if (prevPersonIdRef.current !== person.id) {
        prevPersonIdRef.current = person.id;
        setIsLoading(true);
      }
    }, [person.id]);

    useEffect(() => {
      if (isLoading) {
        const timer = setTimeout(() => setIsLoading(false), 220);
        return () => clearTimeout(timer);
      }
    }, [isLoading]);

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
