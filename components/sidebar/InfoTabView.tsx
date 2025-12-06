import React, { memo } from 'react';
import { Person, Language, Gender, FamilyActionsProps } from '../../types';
import { PersonHeaderView } from './PersonHeaderView';
import { FamilyRelationshipsSection } from './FamilyRelationshipsSection';
import { Card } from '../ui/Card';
import { useTranslation } from '../../context/TranslationContext';

interface InfoTabViewProps {
  person: Person;
  people: Record<string, Person>;
  onSelect: (id: string) => void;
  onOpenModal: (modalType: 'calculator' | 'stats' | 'chat' | 'consistency' | 'timeline' | 'share' | 'story' | 'map') => void;
  familyActions: FamilyActionsProps;
}

export const InfoTabView: React.FC<InfoTabViewProps> = memo(({
  person, people, onSelect, onOpenModal,
  familyActions
}) => {
  const { t } = useTranslation();
  return (
    <div className="space-y-4 pb-4">
      <PersonHeaderView
        person={person}
        onSelect={onSelect}
        onOpenModal={onOpenModal}
        familyActions={familyActions}
      />

      <Card title={t.familyRelationships} contentClassName="p-3 space-y-2">
        <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <FamilyRelationshipsSection
            person={person} people={people} isEditing={false} onUpdate={() => {}} onSelect={onSelect}
            familyActions={familyActions}
          />
        </div>
      </Card>
    </div>
  );
});