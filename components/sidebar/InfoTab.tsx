import React, { memo, useState } from 'react';
import { Person, Gender } from '../../types';
import { FamilyRelationshipsSection } from './FamilyRelationshipsSection';
import { Card } from '../ui/Card';
import { PersonHeaderView } from './PersonHeaderView'; // New import
import { PersonIdentityEdit } from './PersonIdentityEdit'; // New import
import { PersonStatusEdit } from './PersonStatusEdit'; // New import
import { PersonBirthDeathEdit } from './PersonBirthDeathEdit'; // New import
import { ChevronDown } from 'lucide-react'; // Keep ChevronDown for relationships section

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
  const [showFamilyRelationships, setShowFamilyRelationships] = useState(true);

  if (!isEditing) {
      // --- VIEW MODE ---
      return (
        <div className="space-y-4 pb-4">
            <PersonHeaderView
                person={person}
                onSelect={onSelect}
                onOpenModal={onOpenModal}
                t={t}
            />

            {/* Family Relationships Section (No longer collapsible in view mode) */}
            <Card title={t.familyRelationships} contentClassName="p-3 space-y-2">
                <div className="mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                    <FamilyRelationshipsSection
                        person={person} people={people} isEditing={isEditing} onUpdate={onUpdate} onSelect={onSelect} t={t}
                        onAddParent={onAddParent} onAddSpouse={onAddSpouse} onAddChild={onAddChild} onRemoveRelationship={onRemoveRelationship}
                    />
                </div>
            </Card>
        </div>
      );
  }

  // --- EDIT MODE ---
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
        
        {/* Collapsible Family Relationships Section */}
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
                        person={person} people={people} isEditing={isEditing} onUpdate={onUpdate} onSelect={onSelect} t={t}
                        onAddParent={onAddParent} onAddSpouse={onAddSpouse} onAddChild={onAddChild} onRemoveRelationship={onRemoveRelationship}
                    />
                </div>
            )}
        </Card>
    </div>
  );
});