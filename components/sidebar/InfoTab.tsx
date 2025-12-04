import React, { memo, useState } from 'react';
import { Person, Gender, FamilyActionsProps } from '../../types'; // Added FamilyActionsProps
import { InfoTabView } from './InfoTabView'; // New import
import { InfoTabEdit } from './InfoTabEdit'; // New import

interface InfoTabProps {
  person: Person;
  people: Record<string, Person>;
  isEditing: boolean;
  onUpdate: (id: string, updates: Partial<Person>) => void;
  onSelect: (id: string) => void;
  t: any;
  onOpenModal: (modalType: 'calculator' | 'stats' | 'chat' | 'consistency' | 'timeline' | 'share' | 'story' | 'map') => void;
  familyActions: FamilyActionsProps; // New grouped prop
}

export const InfoTab: React.FC<InfoTabProps> = memo(({
    person, people, isEditing, onUpdate, onSelect, t,
    onOpenModal, familyActions // Destructure new grouped prop
}) => {
  if (!isEditing) {
      return (
        <InfoTabView
            person={person} people={people} onSelect={onSelect} t={t}
            onOpenModal={onOpenModal}
            familyActions={familyActions} // Pass new grouped prop
        />
      );
  }

  return (
    <InfoTabEdit
        person={person} people={people} onUpdate={onUpdate} onSelect={onSelect} t={t}
        familyActions={familyActions} // Pass new grouped prop
    />
  );
});