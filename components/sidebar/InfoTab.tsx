import React, { memo, useState } from 'react';
import { Person, Gender } from '../../types';
import { InfoTabView } from './InfoTabView'; // New import
import { InfoTabEdit } from './InfoTabEdit'; // New import

interface InfoTabProps {
  person: Person;
  people: Record<string, Person>;
  isEditing: boolean;
  onUpdate: (id: string, updates: Partial<Person>) => void;
  onSelect: (id: string) => void;
  t: any;
  onAddParent: (gender: Gender) => void;
  onAddSpouse: (gender: Gender) => void;
  onAddChild: (gender: Gender) => void;
  onRemoveRelationship?: (targetId: string, relativeId: string, type: 'parent' | 'spouse' | 'child') => void;
  onOpenModal: (modalType: 'calculator' | 'stats' | 'chat' | 'consistency' | 'timeline' | 'share' | 'story' | 'map') => void;
}

export const InfoTab: React.FC<InfoTabProps> = memo(({
    person, people, isEditing, onUpdate, onSelect, t,
    onAddParent, onAddSpouse, onAddChild, onRemoveRelationship, onOpenModal
}) => {
  if (!isEditing) {
      return (
        <InfoTabView
            person={person} people={people} onSelect={onSelect} t={t}
            onAddParent={onAddParent} onAddSpouse={onAddSpouse} onAddChild={onAddChild} onRemoveRelationship={onRemoveRelationship}
            onOpenModal={onOpenModal}
        />
      );
  }

  return (
    <InfoTabEdit
        person={person} people={people} onUpdate={onUpdate} onSelect={onSelect} t={t}
        onAddParent={onAddParent} onAddSpouse={onAddSpouse} onAddChild={onAddChild} onRemoveRelationship={onRemoveRelationship}
    />
  );
});