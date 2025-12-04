import React, { memo } from 'react';
import { Person, Language, Gender } from '../../types';
import { PersonHeaderView } from './PersonHeaderView';
import { FamilyRelationshipsSection } from './FamilyRelationshipsSection';
import { Card } from '../ui/Card';

interface InfoTabViewProps {
  person: Person;
  people: Record<string, Person>;
  onSelect: (id: string) => void;
  t: any;
  onAddParent: (gender: Gender) => void; // Still needed for potential quick-add in future or if relationships are editable from view
  onAddSpouse: (gender: Gender) => void;
  onAddChild: (gender: Gender) => void;
  onRemoveRelationship?: (targetId: string, relativeId: string, type: 'parent' | 'spouse' | 'child') => void;
  onOpenModal: (modalType: 'calculator' | 'stats' | 'chat' | 'consistency' | 'timeline' | 'share' | 'story' | 'map') => void;
}

export const InfoTabView: React.FC<InfoTabViewProps> = memo(({
  person, people, onSelect, t, onAddParent, onAddSpouse, onAddChild, onRemoveRelationship, onOpenModal
}) => {
  return (
    <div className="space-y-4 pb-4">
      <PersonHeaderView
        person={person}
        onSelect={onSelect}
        onOpenModal={onOpenModal}
        t={t}
      />

      <Card title={t.familyRelationships} contentClassName="p-3 space-y-2">
        <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <FamilyRelationshipsSection
            person={person} people={people} isEditing={false} onUpdate={() => {}} onSelect={onSelect} t={t}
            onAddParent={onAddParent} onAddSpouse={onAddSpouse} onAddChild={onAddChild} onRemoveRelationship={onRemoveRelationship}
          />
        </div>
      </Card>
    </div>
  );
});