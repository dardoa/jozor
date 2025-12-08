import React, { memo } from 'react';
import { Person, FamilyActionsProps } from '../../types';
import { InfoTabView } from './InfoTabView';
import { InfoTabEdit } from './InfoTabEdit';
import { useTranslation } from '../../context/TranslationContext';

interface InfoTabProps {
  person: Person;
  people: Record<string, Person>;
  isEditing: boolean;
  onUpdate: (id: string, updates: Partial<Person>) => void;
  onSelect: (id: string) => void;
  onOpenModal: (modalType: 'calculator' | 'stats' | 'chat' | 'consistency' | 'timeline' | 'share' | 'story' | 'map') => void;
  familyActions: FamilyActionsProps;
}

export const InfoTab: React.FC<InfoTabProps> = memo(({
    person, people, isEditing, onUpdate, onSelect,
    onOpenModal, familyActions
}) => {
  // const { t } = useTranslation(); // Removed as 't' is not directly used here

  if (!isEditing) {
      return (
        <InfoTabView
            person={person} people={people} onSelect={onSelect}
            onOpenModal={onOpenModal}
            familyActions={familyActions}
        />
      );
  }

  return (
    <InfoTabEdit
        person={person} people={people} onUpdate={onUpdate} onSelect={onSelect}
        familyActions={familyActions}
    />
  );
});