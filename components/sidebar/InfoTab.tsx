import { memo } from 'react';
import { Person, FamilyActionsProps, TreeSettings } from '../../types';
import { InfoTabView } from './InfoTabView';
import { InfoTabEdit } from './InfoTabEdit';
import { Skeleton } from '../ui/Skeleton';
import { useEffect, useState } from 'react';

interface InfoTabProps {
  person: Person;
  people: Record<string, Person>;
  isEditing: boolean;
  onUpdate: (id: string, updates: Partial<Person>) => void;
  onSelect: (id: string) => void;
  onOpenModal: (
    modalType:
      | 'calculator'
      | 'stats'
      | 'chat'
      | 'consistency'
      | 'timeline'
      | 'share'
      | 'story'
      | 'map'
  ) => void;
  familyActions: FamilyActionsProps;
  settings: TreeSettings;
}

export const InfoTab = memo<InfoTabProps>(
  ({ person, people, isEditing, onUpdate, onSelect, onOpenModal, familyActions, settings }) => {
    const [isLoading, setIsLoading] = useState(false);

    // Simulate a brief loading state when switching people for a professional feel
    useEffect(() => {
      setIsLoading(true);
      const timer = setTimeout(() => setIsLoading(false), 400);
      return () => clearTimeout(timer);
    }, [person.id]);

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
          onSelect={onSelect}
          onOpenModal={onOpenModal}
          familyActions={familyActions}
          settings={settings}
        />
      );
    }

    return (
      <InfoTabEdit
        person={person}
        people={people}
        onUpdate={onUpdate}
        onSelect={onSelect}
        familyActions={familyActions}
      />
    );
  }
);
