import React, { memo } from 'react';
import { Person, Gender } from '../../types';
import { getDisplayDate } from '../../utils/familyLogic';
import { User, Ribbon, ChevronRight, Plus, BookOpen, Baby, ArrowUp, Heart, ArrowDown, Trash2 } from 'lucide-react';

// --- Optimized Sub-Components (moved from InfoTab) ---

const InlineAddBtn = memo(({ onClick, gender, t }: { onClick: () => void, gender: 'male' | 'female', t: any }) => (
    <button 
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`w-5 h-5 rounded-md flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${gender === 'male' 
          ? 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400' 
          : 'bg-pink-50 text-pink-600 hover:bg-pink-100 dark:bg-pink-900/30 dark:text-pink-400'}`}
      title={t.add}
    > {/* Reduced w-6 h-6 to w-5 h-5 */}
        <Plus className="w-3 h-3" strokeWidth={3} /> {/* Reduced w-3.5 h-3.5 to w-3 h-3 */}
    </button>
));

const FamilyMemberItem = memo(({ id, person, onSelect, onRemove, t }: { id: string, person?: Person, onSelect: (id: string) => void, onRemove?: (id: string) => void, t?: any }) => {
    if (!person) return null;
    return (
        <div 
            onClick={() => onSelect(id)} 
            className="group/item flex items-center justify-between p-1.5 mb-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-sm rounded-xl cursor-pointer transition-all"
        > {/* Reduced p-2 mb-1.5 to p-1.5 mb-1 */}
            <div className="flex items-center gap-2 flex-1 min-w-0"> {/* Reduced gap-3 to gap-2 */}
                {/* Avatar */}
                <div className={`relative w-7 h-7 shrink-0 rounded-full p-0.5 ${person.gender === 'male' ? 'bg-blue-100 dark:bg-blue-900' : 'bg-pink-100 dark:bg-pink-900'}`}> {/* Reduced w-8 h-8 to w-7 h-7 */}
                    {person.photoUrl ? (
                        <img src={person.photoUrl} alt="" className={`w-full h-full rounded-full object-cover ${person.isDeceased ? 'grayscale' : ''}`} />
                    ) : (
                        <div className="w-full h-full rounded-full bg-white dark:bg-gray-800 flex items-center justify-center">
                            <span className={`text-[9px] font-bold ${person.gender === 'male' ? 'text-blue-600' : 'text-pink-600'}`}> {/* Reduced text-[10px] to text-[9px] */}
                                {person.firstName[0]}
                            </span>
                        </div>
                    )}
                    {person.isDeceased && (
                        <div className="absolute -bottom-0.5 -end-0.5 bg-white dark:bg-gray-800 rounded-full p-[1px] shadow-sm">
                            <Ribbon className="w-2 h-2 text-gray-500 fill-current" /> {/* Reduced w-2.5 h-2.5 to w-2 h-2 */}
                        </div>
                    )}
                </div>

                {/* Text Info */}
                <div className="flex flex-col min-w-0">
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-100 truncate group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 transition-colors"> {/* Reduced text-sm to text-xs */}
                        {person.firstName} {person.lastName}
                    </span>
                    <div className="flex items-center gap-1.5 text-[8px] text-gray-400 dark:text-gray-500 font-medium"> {/* Reduced text-[9px] to text-[8px] */}
                        {person.birthDate && <span>{getDisplayDate(person.birthDate)}</span>}
                        {person.title && <span className="uppercase tracking-wide opacity-75">• {person.title}</span>}
                    </div>
                </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center ps-2">
                {onRemove ? (
                    <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            if(confirm(t?.confirmUnlink || 'Remove relationship?')) {
                                onRemove(id);
                            }
                        }}
                        className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover/item:opacity-100 transition-all scale-90 hover:scale-100"
                        title={t?.removeRelation}
                    > {/* Reduced w-7 h-7 to w-6 h-6 */}
                        <Trash2 className="w-3 h-3" /> {/* Reduced w-3.5 h-3.5 to w-3 h-3 */}
                    </button>
                ) : (
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover/item:text-blue-400 rtl:rotate-180 transition-colors"/>
                )}
            </div>
        </div>
    );
});

const FamilyGroup = memo(({ 
    title, icon, ids, people, onAdd, onRemove, onSelect, placeholder, isEditing, t 
}: { 
    title: string, icon: React.ReactNode, ids: string[], people: Record<string, Person>, onAdd: (g: Gender) => void, onRemove?: (id: string) => void, onSelect: (id: string) => void, placeholder: string, isEditing: boolean, t: any 
}) => {
    return (
        <div className="mb-3 last:mb-0"> {/* Reduced mb-4 to mb-3 */}
             <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <div className="p-1 rounded bg-gray-100 dark:bg-gray-800">{icon}</div>
                    <span className="text-[9px] font-bold uppercase tracking-wider">{title} <span className="opacity-60">({ids.length})</span></span> {/* Reduced text-[10px] to text-[9px] */}
                </div>
                {isEditing && (
                    <div className="flex gap-1"> {/* Reduced gap-1.5 to gap-1 */}
                        <InlineAddBtn onClick={() => onAdd('male')} gender="male" t={t} />
                        <InlineAddBtn onClick={() => onAdd('female')} gender="female" t={t} />
                    </div>
                )}
            </div>
            
            {ids.length === 0 ? (
                 <div className="text-[9px] text-gray-400 italic px-2 py-2 bg-gray-50/50 dark:bg-gray-800/30 rounded-lg border border-dashed border-gray-100 dark:border-gray-700 text-center"> {/* Reduced text-[10px] to text-[9px] and py-3 to py-2 */}
                    {placeholder}
                 </div>
            ) : (
                <div className="space-y-0.5">
                    {ids.map(id => (
                        <FamilyMemberItem 
                            key={id} 
                            id={id} 
                            person={people[id]} 
                            onSelect={onSelect} 
                            onRemove={isEditing ? onRemove : undefined}
                            t={t}
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
  onUpdate: (id: string, updates: Partial<Person>) => void; // Added onUpdate prop
  onSelect: (id: string) => void;
  t: any;
  onAddParent: (gender: Gender) => void;
  onAddSpouse: (gender: Gender) => void;
  onAddChild: (gender: Gender) => void;
  onRemoveRelationship?: (targetId: string, relativeId: string, type: 'parent' | 'spouse' | 'child') => void;
}

export const FamilyRelationshipsSection: React.FC<FamilyRelationshipsSectionProps> = memo(({
    person, people, isEditing, onSelect, t, onUpdate, // Destructure onUpdate here
    onAddParent, onAddSpouse, onAddChild, onRemoveRelationship
}) => {
    const handleRemoveParent = (id: string) => onRemoveRelationship?.(person.id, id, 'parent');
    const handleRemoveSpouse = (id: string) => onRemoveRelationship?.(person.id, id, 'spouse');
    const handleRemoveChild = (id: string) => onRemoveRelationship?.(person.id, id, 'child');

    return (
        <div className="pt-5 space-y-3 relative"> {/* Changed pt-3 to pt-5, added relative */}
            <h3 className="absolute top-[-12px] start-3 z-10 bg-white dark:bg-stone-900 px-2 text-[9px] font-bold text-stone-400 uppercase tracking-wider">{t.familyRelationships}</h3>
            
            <FamilyGroup 
                title={t.parents} 
                icon={<ArrowUp className="w-3.5 h-3.5 text-gray-500" />} 
                ids={person.parents} 
                people={people}
                onAdd={onAddParent}
                onRemove={handleRemoveParent}
                onSelect={onSelect}
                placeholder={t.noRelatives}
                isEditing={isEditing}
                t={t}
            />
            
            <FamilyGroup 
                title={t.spouses} 
                icon={<Heart className="w-3.5 h-3.5 text-gray-500" />} 
                ids={person.spouses} 
                people={people}
                onAdd={onAddSpouse}
                onRemove={handleRemoveSpouse}
                onSelect={onSelect}
                placeholder={t.noRelatives}
                isEditing={isEditing}
                t={t}
            />
            
            <FamilyGroup 
                title={t.children} 
                icon={<ArrowDown className="w-3.5 h-3.5 text-gray-500" />} 
                ids={person.children} 
                people={people}
                onAdd={onAddChild}
                onRemove={handleRemoveChild}
                onSelect={onSelect}
                placeholder={t.noRelatives}
                isEditing={isEditing}
                t={t}
            />
        </div>
    );
});