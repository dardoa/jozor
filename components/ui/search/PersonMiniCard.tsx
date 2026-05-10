import React from 'react';
import { Person } from '../../../types';
import { SmartAvatar } from '../SmartAvatar';
import { getYears } from '../../../utils/familyLogic';
import { normalizeArabic } from '../../../utils/search/arabicUtils';

interface PersonMiniCardProps {
    person: Person;
    query?: string;
    onClick: () => void;
}

/**
 * A rich result card for the search engine.
 * Displays photo, name (with father's name logic), age, and highlights matches.
 */
export const PersonMiniCard: React.FC<PersonMiniCardProps> = ({ person, query, onClick }) => {
    const years = getYears(person);
    const genderColor = person.gender === 'male' ? 'border-blue-400' : 'border-pink-400';
    
    // Logic for father's name disambiguation
    // If middle name exists, use it. Otherwise, if we have father's name (placeholder for logic)
    const displayName = `${person.firstName} ${person.middleName ? person.middleName + ' ' : ''}${person.lastName}`;

    const highlightText = (text: string, q?: string) => {
        if (!q || !q.trim()) return text;
        const normalizedQ = normalizeArabic(q);
        const normalizedText = normalizeArabic(text);
        
        const index = normalizedText.indexOf(normalizedQ);
        if (index === -1) return text;
        
        // This is a simple highlight. Real fuzzy highlight would use Fuse's indices.
        return (
            <>
                {text.substring(0, index)}
                <span className="bg-yellow-200 dark:bg-yellow-800/50 text-yellow-900 dark:text-yellow-100 px-0.5 rounded">
                    {text.substring(index, index + q.length)}
                </span>
                {text.substring(index + q.length)}
            </>
        );
    };

    return (
        <button
            onClick={onClick}
            className="w-full flex items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all group/item text-start border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
        >
            <div className={`w-12 h-12 rounded-full border-2 ${genderColor} overflow-hidden flex-shrink-0 mr-4 shadow-sm group-hover/item:scale-105 transition-transform`}>
                <SmartAvatar person={person} size={44} className="rounded-full" />
            </div>
            
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 dark:text-slate-100 truncate text-sm sm:text-base">
                        {highlightText(displayName, query)}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tighter">
                        {person.gender}
                    </span>
                </div>
                
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {years}
                    </span>
                    {person.profession && (
                        <>
                            <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                                {person.profession}
                            </span>
                        </>
                    )}
                </div>
            </div>
        </button>
    );
};
