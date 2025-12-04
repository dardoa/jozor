import React, { memo } from 'react';
import { Person, Language, Gender, FamilyActionsProps } from '../../types'; // Added FamilyActionsProps
import { PersonHeaderView } from './PersonHeaderView';
import { FamilyRelationshipsSection } from './FamilyRelationshipsSection';
import { Card } from '../ui/Card';

interface InfoTabViewProps {
  person: Person;
  people: Record<string, Person>;
  onSelect: (id: string) => void;
  t: any;
  onOpenModal: (modalType: 'calculator' | 'stats' | 'chat' | 'consistency' | 'timeline' | 'share' | 'story' | 'map') => void;
  familyActions: FamilyActionsProps; // New grouped prop
}

export const InfoTabView: React.FC<InfoTabViewProps> = memo(({
  person, people, onSelect, t, onOpenModal,
  familyActions // Destructure new grouped prop
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
            familyActions={familyActions} // Pass new grouped prop
          />
        </div>
      </Card>
    </div>
  );
});