import { memo } from 'react';
import { Person, Gender, FamilyActionsProps } from '../../types';
import { Heart, Users, UserRound, Baby } from 'lucide-react';
import { InlineAddButton } from './InlineAddButton';
import { FamilyMemberItem } from './FamilyMemberItem';
import { useTranslation } from '../../context/TranslationContext';
import { sortPeopleByBirthDate } from '../../utils/familyLogic'; // Import the new sorting utility

// --- Family Group Component (now internal to this file, or could be moved to its own file if needed elsewhere) ---
const FamilyGroup = memo(
  ({
    title,
    icon,
    ids,
    people,
    onAdd,
    onRemove,
    onSelect,
    placeholder,
    isEditing, // Removed 't' prop
    iconBgClass = 'bg-stone-100 dark:bg-stone-800', // Default background for icon
    iconTextColorClass = 'text-stone-500', // Default text color for icon
  }: {
    title: string;
    icon: React.ReactNode;
    ids: string[];
    people: Record<string, Person>;
    onAdd?: (g: Gender) => void;
    onRemove?: (id: string) => void;
    onSelect: (id: string) => void;
    placeholder: string;
    isEditing: boolean; // Removed 't' from prop type
    iconBgClass?: string; // New prop for icon background class
    iconTextColorClass?: string; // New prop for icon text color class
  }) => {
    // Removed useTranslation() hook here as 't' is now passed as a prop
    return (
      <div className='mb-3 last:mb-0'>
        <div className='flex items-center justify-between mb-2 px-1'>
          <div className='flex items-center gap-2 text-[var(--text-muted)]'>
            <div className={`p-1 rounded ${iconBgClass} ${iconTextColorClass}`}>{icon}</div>
            <span className='text-xs font-bold uppercase tracking-wider text-[var(--text-main)]'>
              {title} <span className='opacity-60'>({ids.length})</span>
            </span>
          </div>
          {isEditing && onAdd && (
            <div className='flex gap-1'>
              <InlineAddButton onClick={() => onAdd('male')} gender='male' />
              <InlineAddButton onClick={() => onAdd('female')} gender='female' />
            </div>
          )}
        </div>

        {ids.length === 0 && isEditing ? (
          <div className='text-[9px] text-[var(--text-dim)] italic px-2 py-2 bg-[var(--theme-bg)]/50 rounded-lg border border-dashed border-[var(--border-main)] text-center'>
            {placeholder}
          </div>
        ) : (
          <div className='grid grid-cols-2 gap-2'>
            {ids.map((id) => (
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
  }
);

// --- Main Component ---

interface FamilyRelationshipsSectionProps {
  person: Person;
  people: Record<string, Person>;
  isEditing: boolean;
  onUpdate: (id: string, updates: Partial<Person>) => void;
  onSelect: (id: string) => void;
  familyActions: FamilyActionsProps;
}

export const FamilyRelationshipsSection = memo<FamilyRelationshipsSectionProps>(
  ({ person, people, isEditing, onSelect, familyActions }) => {
    const { t } = useTranslation(); // 't' is now used here

    const handleRemoveParent = (id: string) =>
      familyActions.onRemoveRelationship?.(person.id, id, 'parent');
    const handleRemoveSpouse = (id: string) =>
      familyActions.onRemoveRelationship?.(person.id, id, 'spouse');
    const handleRemoveChild = (id: string) =>
      familyActions.onRemoveRelationship?.(person.id, id, 'child');

    // Calculate siblings based on common parents
    const siblingIds = Object.values(people)
      .filter(
        (p) => p.id !== person.id && p.parents.some((parentId) => person.parents.includes(parentId))
      )
      .map((p) => p.id);

    // Sort children and siblings by birth date if not in editing mode
    const sortedChildrenIds = isEditing
      ? person.children
      : sortPeopleByBirthDate(
        person.children.map((id) => people[id]).filter(Boolean) as Person[]
      ).map((p) => p.id);

    const sortedSiblingIds = isEditing
      ? siblingIds
      : sortPeopleByBirthDate(siblingIds.map((id) => people[id]).filter(Boolean) as Person[]).map(
        (p) => p.id
      );

    return (
      <div className='space-y-3 relative'>
        {(person.parents.length > 0 || isEditing) && (
          <FamilyGroup
            title={t.parents}
            icon={<UserRound className='w-3.5 h-3.5' />}
            ids={person.parents}
            people={people}
            onAdd={(g) => familyActions.onAddParent(g)}
            onRemove={handleRemoveParent}
            onSelect={onSelect}
            placeholder={t.noParents}
            isEditing={isEditing}
            iconBgClass='bg-amber-500/10'
            iconTextColorClass='text-amber-600 dark:text-amber-400'
          // Removed t={t}
          />
        )}

        {(person.spouses.length > 0 || isEditing) && (
          <FamilyGroup
            title={t.spouses}
            icon={<Heart className='w-3.5 h-3.5' />}
            ids={person.spouses}
            people={people}
            onAdd={(g) => familyActions.onAddSpouse(g)}
            onRemove={handleRemoveSpouse}
            onSelect={onSelect}
            placeholder={t.noPartners}
            isEditing={isEditing}
            iconBgClass='bg-rose-500/10'
            iconTextColorClass='text-rose-600 dark:text-rose-400'
          // Removed t={t}
          />
        )}

        {(sortedChildrenIds.length > 0 || isEditing) && (
          <FamilyGroup
            title={t.children}
            icon={<Baby className='w-3.5 h-3.5' />}
            ids={sortedChildrenIds}
            people={people}
            onAdd={(g) => familyActions.onAddChild(g)}
            onRemove={handleRemoveChild}
            onSelect={onSelect}
            placeholder={t.noChildren}
            isEditing={isEditing}
            iconBgClass='bg-emerald-500/10'
            iconTextColorClass='text-emerald-600 dark:text-emerald-400'
          // Removed t={t}
          />
        )}

        {(sortedSiblingIds.length > 0 || isEditing) && (
          <FamilyGroup
            title={t.siblings}
            icon={<Users className='w-3.5 h-3.5' />}
            ids={sortedSiblingIds}
            people={people}
            onRemove={isEditing ? handleRemoveChild : undefined}
            onSelect={onSelect}
            placeholder={t.noSiblings}
            isEditing={isEditing}
            iconBgClass='bg-indigo-500/10'
            iconTextColorClass='text-indigo-600 dark:text-indigo-400'
          // Removed t={t}
          />
        )}
      </div>
    );
  }
);
