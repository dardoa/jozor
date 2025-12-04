import React, { memo } from 'react';
import { Person, UserProfile, FamilyActionsProps } from '../../types'; // Import FamilyActionsProps
import { PersonHeaderView } from './PersonHeaderView';
import { PersonDetailsForm } from './PersonDetailsForm';
import { useTranslation } from '../../context/TranslationContext';

interface InfoTabProps {
  person: Person;
  people: Record<string, Person>;
  isEditing: boolean;
  onUpdate: (id: string, updates: Partial<Person>) => void;
  onSelect: (id: string) => void;
  onOpenModal: (modalType: 'calculator' | 'stats' | 'chat' | 'consistency' | 'timeline' | 'share' | 'story' | 'map') => void;
  familyActions: FamilyActionsProps; // Add familyActions prop
}

export const InfoTab: React.FC<InfoTabProps> = memo(({ person, people, isEditing, onUpdate, onSelect, onOpenModal, familyActions }) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <PersonHeaderView 
        person={person} 
        onSelect={onSelect} 
        onOpenModal={onOpenModal} 
        familyActions={familyActions} // Pass familyActions
      />
      <PersonDetailsForm 
        person={person} 
        people={people} 
        isEditing={isEditing} 
        onUpdate={onUpdate} 
        onSelect={onSelect} 
        // Removed t={t}
      />
    </div>
  );
});