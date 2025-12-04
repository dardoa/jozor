import React, { memo, useState } from 'react';
import { Person, Gender } from '../../types';
import { PersonIdentityEdit } from './PersonIdentityEdit';
import { PersonStatusEdit } from './PersonStatusEdit';
import { PersonBirthDeathEdit } from './PersonBirthDeathEdit';
import { FamilyRelationshipsSection } from './FamilyRelationshipsSection';
import { Card } from '../ui/Card';
import { ChevronDown } from 'lucide-react';

interface InfoTabEditProps {
  person: Person;
  people: Record<string, Person>;
  onUpdate: (id: string, updates: Partial<Person>) => void;
  onSelect: (id: string) => void;
  t: any;
  onAddParent: (gender: Gender) => void;
  onAddSpouse: (gender: Gender) => void;
  onAddChild: (gender: Gender) => void;
  onRemoveRelationship?: (targetId: string, relativeId: string, type: 'parent' | 'spouse' | 'child') => void;
}

export const InfoTabEdit: React.FC<InfoTabEditProps> = memo(({
  person, people, onUpdate, onSelect, t,
  onAddParent, onAddSpouse, onAddChild, onRemoveRelationship
}) => {
  const [showFamilyRelationships, setShowFamilyRelationships] = useState(true);

  return (
    <div className="flex flex-col gap-4 animate-in fade-in duration-200">
      <PersonIdentityEdit
        person={person}
        onUpdate={onUpdate}
        t={t}
      />

      <PersonStatusEdit
        person={person}
        onUpdate={onUpdate}
        t={t}
      />

      <PersonBirthDeathEdit
        person={person}
        onUpdate={onUpdate}
        t={t}
      />
      
      <Card title={t.familyRelationships}>
        <button
          onClick={() => setShowFamilyRelationships(!showFamilyRelationships)}
          className="w-full flex items-center justify-between text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-teal-600 dark:hover:text-teal-400 py-1 px-0.5 -mx-0.5 rounded-md transition-colors"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showFamilyRelationships ? 'rotate-180' : ''}`} />
        </button>

        {showFamilyRelationships && (
          <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <FamilyRelationshipsSection
              person={person} people={people} isEditing={true} onUpdate={onUpdate} onSelect={onSelect} t={t}
              onAddParent={onAddParent} onAddSpouse={onAddSpouse} onAddChild={onAddChild} onRemoveRelationship={onRemoveRelationship}
            />
          </div>
        )}
      </Card>
    </div>
  );
});