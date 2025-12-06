import React, { memo } from 'react';
import { Person, FamilyActionsProps } from '../../types';
import { Heart, Users, UserRound, Baby } from 'lucide-react';
// Removed: import { InlineAddButton } from './InlineAddButton';
// Removed: import { FamilyMemberItem } from './FamilyMemberItem';
import { useTranslation } from '../../context/TranslationContext';
import { FamilyGroup } from './FamilyGroup'; // Import the new FamilyGroup component

// --- Main Component ---

interface FamilyRelationshipsSectionProps {
  person: Person;
  people: Record<string, Person>;
  isEditing: boolean;
  // onUpdate: (id: string, updates: Partial<Person>) => void; // Removed unused prop
  onSelect: (id: string) => void;
  familyActions: FamilyActionsProps;
}

export const FamilyRelationshipsSection: React.FC<FamilyRelationshipsSectionProps> = memo(({
    person, people, isEditing, onSelect, // Removed onUpdate
    familyActions
}) => {
    const { t } = useTranslation();

    const handleRemoveParent = (id: string) => familyActions.onRemoveRelationship?.(person.id, id, 'parent');
    const handleRemoveSpouse = (id: string) => familyActions.onRemoveRelationship?.(person.id, id, 'spouse');
    const handleRemoveChild = (id: string) => familyActions.onRemoveRelationship?.(person.id, id, 'child');

    // Calculate siblings based on common parents
    const siblingIds = Object.values(people)
        .filter(p => p.id !== person.id && p.parents.some(parentId => person.parents.includes(parentId)))
        .map(p => p.id);

    return (
        <div className="space-y-3 relative">
            
            {(person.parents.length > 0 || isEditing) && (
                <FamilyGroup 
                    title={t.parents} 
                    icon={<UserRound className="w-3.5 h-3.5" />} 
                    ids={person.parents} 
                    people={people}
                    onAdd={(g) => familyActions.onAddParent(g)}
                    onRemove={handleRemoveParent}
                    onSelect={onSelect}
                    placeholder={t.noParents}
                    isEditing={isEditing}
                    iconBgClass="bg-amber-100 dark:bg-amber-900/20"
                    iconTextColorClass="text-amber-600 dark:text-amber-400"
                />
            )}
            
            {(person.spouses.length > 0 || isEditing) && (
                <FamilyGroup 
                    title={t.spouses} 
                    icon={<Heart className="w-3.5 h-3.5" />} 
                    ids={person.spouses} 
                    people={people}
                    onAdd={(g) => familyActions.onAddSpouse(g)}
                    onRemove={handleRemoveSpouse}
                    onSelect={onSelect}
                    placeholder={t.noPartners}
                    isEditing={isEditing}
                    iconBgClass="bg-rose-100 dark:bg-rose-900/20"
                    iconTextColorClass="text-rose-600 dark:text-rose-400"
                />
            )}

            {(siblingIds.length > 0 || isEditing) && (
                <FamilyGroup 
                    title={t.siblings} 
                    icon={<Users className="w-3.5 h-3.5" />} 
                    ids={siblingIds} 
                    people={people}
                    onRemove={isEditing ? handleRemoveChild : undefined}
                    onSelect={onSelect}
                    placeholder={t.noSiblings}
                    isEditing={isEditing}
                    iconBgClass="bg-indigo-100 dark:bg-indigo-900/20"
                    iconTextColorClass="text-indigo-600 dark:text-indigo-400"
                />
            )}
            
            {(person.children.length > 0 || isEditing) && (
                <FamilyGroup 
                    title={t.children} 
                    icon={<Baby className="w-3.5 h-3.5" />} 
                    ids={person.children} 
                    people={people}
                    onAdd={(g) => familyActions.onAddChild(g)}
                    onRemove={handleRemoveChild}
                    onSelect={onSelect}
                    placeholder={t.noChildren}
                    isEditing={isEditing}
                    iconBgClass="bg-emerald-100 dark:bg-emerald-900/20"
                    iconTextColorClass="text-emerald-600 dark:text-emerald-400"
                />
            )}
        </div>
    );
});