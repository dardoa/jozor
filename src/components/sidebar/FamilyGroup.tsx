import React, { memo } from 'react';
import { Person, Gender } from '../../types';
import { InlineAddButton } from './InlineAddButton';
import { FamilyMemberItem } from './FamilyMemberItem';
// Removed: import { useTranslation } from '../../context/TranslationContext';

interface FamilyGroupProps {
    title: string;
    icon: React.ReactNode;
    ids: string[];
    people: Record<string, Person>;
    onAdd?: (g: Gender) => void;
    onRemove?: (id: string) => void;
    onSelect: (id: string) => void;
    placeholder: string;
    isEditing: boolean;
    iconBgClass?: string;
    iconTextColorClass?: string;
}

export const FamilyGroup: React.FC<FamilyGroupProps> = memo(({ 
    title, icon, ids, people, onAdd, onRemove, onSelect, placeholder, isEditing,
    iconBgClass = 'bg-stone-100 dark:bg-stone-800',
    iconTextColorClass = 'text-stone-500'
}) => {
    // const { t } = useTranslation(); // Removed unused 't'
    return (
        <div className="mb-3 last:mb-0">
             <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400">
                    <div className={`p-1 rounded ${iconBgClass} ${iconTextColorClass}`}>{icon}</div>
                    <span className="text-[9px] font-bold uppercase tracking-wider">{title} <span className="opacity-60">({ids.length})</span></span>
                </div>
                {isEditing && onAdd && (
                    <div className="flex gap-1">
                        <InlineAddButton onClick={() => onAdd('male')} gender="male" />
                        <InlineAddButton onClick={() => onAdd('female')} gender="female" />
                    </div>
                )}
            </div>
            
            {ids.length === 0 && isEditing ? (
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