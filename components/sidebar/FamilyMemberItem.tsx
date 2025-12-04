import React, { memo } from 'react';
import { Person } from '../../types';
import { getDisplayDate } from '../../utils/familyLogic';
import { User, Ribbon, ChevronRight, Trash2 } from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';

interface FamilyMemberItemProps {
  id: string;
  person?: Person;
  onSelect: (id: string) => void;
  onRemove?: (id: string) => void;
}

export const FamilyMemberItem = memo(({ id, person, onSelect, onRemove }: FamilyMemberItemProps) => {
    const { t } = useTranslation();
    if (!person) return null;
    return (
        <div 
            onClick={() => onSelect(id)} 
            className="group/item flex items-center justify-between p-1 bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-sm rounded-xl cursor-pointer transition-all"
        >
            <div className="flex items-center gap-1.5 flex-1 min-w-0"> {/* Reduced gap */}
                {/* Avatar */}
                <div className={`relative w-6 h-6 shrink-0 rounded-full p-0.5 ${person.gender === 'male' ? 'bg-blue-100 dark:bg-blue-900' : 'bg-pink-100 dark:bg-pink-900'}`}>
                    {person.photoUrl ? (
                        <img src={person.photoUrl} alt="" className={`w-full h-full rounded-full object-cover ${person.isDeceased ? 'grayscale' : ''}`} />
                    ) : (
                        <div className="w-full h-full rounded-full bg-white dark:bg-stone-800 flex items-center justify-center">
                            <span className={`text-[8px] font-bold ${person.gender === 'male' ? 'text-blue-600' : 'text-pink-600'}`}> {/* Reduced font size */}
                                {person.firstName[0]}
                            </span>
                        </div>
                    )}
                    {person.isDeceased && (
                        <div className="absolute -bottom-0.5 -end-0.5 bg-white dark:bg-stone-800 rounded-full p-[1px] shadow-sm">
                            <Ribbon className="w-1.5 h-1.5 text-stone-500 fill-current" /> {/* Reduced icon size */}
                        </div>
                    )}
                </div>

                {/* Text Info */}
                <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-semibold text-stone-800 dark:text-stone-100 truncate group-hover/item:text-blue-600 dark:group-hover/item:text-blue-400 transition-colors"> {/* Reduced font size */}
                        {person.firstName} {person.lastName}
                    </span>
                    <div className="flex items-center gap-1 text-[7px] text-stone-400 dark:text-stone-500 font-medium"> {/* Reduced font size and gap */}
                        {person.birthDate && <span>{getDisplayDate(person.birthDate)}</span>}
                        {person.title && <span className="uppercase tracking-wide opacity-75">• {person.title}</span>}
                    </div>
                </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center ps-1.5"> {/* Reduced padding */}
                {onRemove ? (
                    <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            if(confirm(t.confirmUnlink || 'Remove relationship?')) {
                                onRemove(id);
                            }
                        }}
                        className="w-5 h-5 flex items-center justify-center rounded-lg text-stone-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover/item:opacity-100 transition-all scale-90 hover:scale-100"
                        title={t.removeRelation}
                    >
                        <Trash2 className="w-2.5 h-2.5" /> {/* Reduced icon size */}
                    </button>
                ) : null /* Removed ChevronRight when not in editing mode */}
            </div>
        </div>
    );
});