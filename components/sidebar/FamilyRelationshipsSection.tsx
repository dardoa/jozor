import React, { memo } from 'react';
import { Person, Gender, FamilyActionsProps } from '../../types';
import { ArrowUp, Heart, ArrowDown, Users } from 'lucide-react'; // Added Users icon for siblings
import { InlineAddButton } from './InlineAddButton';
import { FamilyMemberItem } from './FamilyMemberItem';
import { useTranslation } from '../../context/TranslationContext';

// --- Family Group Component (now internal to this file, or could be moved to its own file if needed elsewhere) ---
const FamilyGroup = memo(({ 
    title, icon, ids, people, onAdd, onRemove, onSelect, placeholder, isEditing
}: { 
    title: string, icon: React.ReactNode, ids: string[], people: Record<string, Person>, onAdd?: (g: Gender) => void, onRemove?: (id: string) => void, onSelect: (id: string) => void, placeholder: string, isEditing: boolean
}) => { // Made onAdd optional
    const { t } = useTranslation();
    return (
        <div className="mb-3 last:mb-0">
             <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400">
                    <div className="p-1 rounded bg-stone-100 dark:bg-stone-800">{icon}</div>
                    <span className="text-[9px] font-bold uppercase tracking-wider">{title} <span className="opacity-60">({ids.length})</span></span>
                </div>
                {isEditing && onAdd && ( // Only show add buttons if in editing mode AND onAdd is provided
                    <div className="flex gap-1">
                        <InlineAddButton onClick={() => onAdd('male')} gender="male" />
                        <InlineAddButton onClick={() => onAdd('female')} gender="female" />
                    </div>
                )}
            </div>
            
            {ids.length === 0 && isEditing ? ( // Only show placeholder if editing and no IDs
                 <div className="text-[9px] text-stone-400 italic px-2 py-2 bg-stone-50/50 dark:bg-stone-800/30 rounded-lg border border-dashed border-stone-100 dark:border-stone-700 text-center">
                    {placeholder}
                 </div>
            ) : (
                <div className="grid grid-cols-2 gap-2">
                    {ids.map(id => (
                        <FamilyMemberItem 
                            key={id} 
                            id={id} 
                            person={people[id]} 
                            onSelect={onSelect} 
                            onRemove={isEditing ? onRemove : undefined}
                        />
                    ))} 
                </div>
            )}
        </div>
    );
});

// --- Main Component ---

interface FamilyRelationshipsSectionProps {
  person: Person;
  people: Record<string, Person>;
  isEditing: boolean;
  onUpdate: (id: string, updates: Partial<Person>) => void;
  onSelect: (id: string) => void;
  familyActions: FamilyActionsProps;
}

export const FamilyRelationshipsSection: React.FC<FamilyRelationshipsSectionProps> = memo(({
    person, people, isEditing, onSelect, onUpdate,
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
                    icon={<ArrowUp className="w-3.5 h-3.5 text-stone-500" />} 
                    ids={person.parents} 
                    people={people}
                    onAdd={(g) => familyActions.onAddParent(g)}
                    onRemove={handleRemoveParent}
                    onSelect={onSelect}
                    placeholder={t.noParents}
                    isEditing={isEditing}
                />
            )}
            
            {(person.spouses.length > 0 || isEditing) && (
                <FamilyGroup 
                    title={t.spouses} 
                    icon={<Heart className="w-3.5 h-3.5 text-stone-500" />} 
                    ids={person.spouses} 
                    people={people}
                    onAdd={(g) => familyActions.onAddSpouse(g)}
                    onRemove={handleRemoveSpouse}
                    onSelect={onSelect}
                    placeholder={t.noPartners}
                    isEditing={isEditing}
                />
            )}

            {(siblingIds.length > 0 || isEditing) && ( // Only show siblings if there are any or in editing mode
                <FamilyGroup 
                    title={t.siblings} 
                    icon={<Users className="w-3.5 h-3.5 text-stone-500" />} 
                    ids={siblingIds} 
                    people={people}
                    // No onAdd prop for siblings as per request
                    onRemove={isEditing ? handleRemoveChild : undefined} // Siblings can be unlinked by removing parent-child relationship
                    onSelect={onSelect}
                    placeholder={t.noSiblings}
                    isEditing={isEditing}
                />
            )}
            
            {(person.children.length > 0 || isEditing) && (
                <FamilyGroup 
                    title={t.children} 
                    icon={<ArrowDown className="w-3.5 h-3.5 text-stone-500" />} 
                    ids={person.children} 
                    people={people}
                    onAdd={(g) => familyActions.onAddChild(g)}
                    onRemove={handleRemoveChild}
                    onSelect={onSelect}
                    placeholder={t.noChildren}
                    isEditing={isEditing}
                />
            )}
        </div>
    );
});