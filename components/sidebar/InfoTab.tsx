import React, { useState, useEffect, useMemo, memo } from 'react';
import { Person, Gender, FamilyActionsProps } from '../../types'; // Added FamilyActionsProps
import { InfoTabView } from './InfoTabView'; // New import
import { InfoTabEdit } from './InfoTabEdit'; // New import
import { useTranslation } from '../../context/TranslationContext'; // Import useTranslation

interface InfoTabProps {
  person: Person;
  people: Record<string, Person>;
  isEditing: boolean;
  onUpdate: (id: string, updates: Partial<Person>) => void;
  onSelect: (id: string) => void;
  // Removed t: any;
  onOpenModal: (modalType: 'calculator' | 'stats' | 'chat' | 'consistency' | 'timeline' | 'share' | 'story' | 'map') => void;
  familyActions: FamilyActionsProps; // New grouped prop
}

export const InfoTab: React.FC<InfoTabProps> = memo(({
    person, people, isEditing, onUpdate, onSelect,
    onOpenModal, familyActions // Destructure new grouped prop
}) => {
  const { t } = useTranslation(); // Use useTranslation hook directly

  if (!isEditing) {
      return (
        <InfoTabView
            person={person} people={people} onSelect={onSelect}
            onOpenModal={onOpenModal}
            familyActions={familyActions} // Pass new grouped prop
            // Removed t={t}
        />
      );
  }

  return (
    <InfoTabEdit
        person={person} people={people} onUpdate={onUpdate} onSelect={onSelect}
        familyActions={familyActions} // Pass new grouped prop
        // Removed t={t}
    />
  );
});