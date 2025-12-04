import React, { memo } from 'react';
import { Person, Language, Gender, FamilyActionsProps } from '../../types'; // Added FamilyActionsProps
import { PersonHeaderView } from './PersonHeaderView';
import { FamilyRelationshipsSection } from './FamilyRelationshipsSection';
import { Card } from '../ui/Card';
import { useTranslation } from '../../context/TranslationContext'; // Import useTranslation

interface InfoTabViewProps {
  person: Person;
  people: Record<string, Person>;
  onSelect: (id: string) => void;
  // Removed t: any;
  onOpenModal: (modalType: 'calculator' | 'stats' | 'chat' | 'consistency' | 'timeline' | 'share' | 'story' | 'map') => void;
  familyActions: FamilyActionsProps; // New grouped prop
}

export const InfoTabView: React.FC<InfoTabViewProps> = memo(({
  person, people, onSelect, onOpenModal,
  familyActions // Destructure new grouped prop
}) => {
  const { t } = useTranslation(); // Use useTranslation hook directly
  return (
    <div className="space-y-4 pb-4">
      <PersonHeaderView
        person={person}
        onSelect={onSelect}
        onOpenModal={onOpenModal}
        // Removed t={t}
      />

      <Card title={t.familyRelationships} contentClassName="p-3 space-y-2">
        <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <FamilyRelationshipsSection
            person={person} people={people} isEditing={false} onUpdate={() => {}} onSelect={onSelect}
            familyActions={familyActions} // Pass new grouped prop
            // Removed t={t}
          />
        </div>
      </Card>
    </div>
  );
});