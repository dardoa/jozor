import React, { useState, useEffect, useMemo, memo } from 'react';
import { Person, Gender, FamilyActionsProps } from '../../types';
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
  const { t } = useTranslation();

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