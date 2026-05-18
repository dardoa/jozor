import React from 'react';
import { Person } from '../../../types';
import { SmartAvatar } from '../SmartAvatar';
import { getYears } from '../../../utils/familyLogic';
import { normalizeArabic } from '../../../utils/search/arabicUtils';

interface PersonMiniCardProps {
    person: Person;
    query?: string;
    onClick: () => void;
    id?: string;
    role?: 'option';
    'aria-selected'?: boolean;
}

/**
 * A rich result card for the search engine.
 * Displays photo, name (with father's name logic), age, and highlights matches.
 */
export const PersonMiniCard: React.FC<PersonMiniCardProps> = ({
    person,
    query,
    onClick,
    id,
    role,
    'aria-selected': ariaSelected,
}) => {
    const years = getYears(person);
    const genderColor = person.gender === 'male' ? 'border-[var(--gender-male-text)]' : 'border-[var(--gender-female-text)]';
    
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
                <span className="rounded bg-[var(--color-warning-500)]/20 px-0.5 text-[var(--text-main)]">
                    {text.substring(index, index + q.length)}
                </span>
                {text.substring(index + q.length)}
            </>
        );
    };

    return (
        <button
            id={id}
            role={role}
            aria-selected={ariaSelected}
            aria-label={displayName}
            onClick={onClick}
            className="group/item flex w-full items-center rounded-xl border border-transparent p-3 text-start transition-all hover:border-[var(--border-soft)] hover:bg-[var(--surface-hover)]"
        >
            <div className={`w-12 h-12 rounded-full border-2 ${genderColor} overflow-hidden flex-shrink-0 mr-4 shadow-sm group-hover/item:scale-105 transition-transform`}>
                <SmartAvatar person={person} size={44} className="rounded-full" />
            </div>
            
            <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                    <span className="truncate text-sm font-bold text-[var(--text-main)] sm:text-base">
                        {highlightText(displayName, query)}
                    </span>
                    <span className="rounded bg-[var(--surface-subtle)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-tighter text-[var(--text-muted)]">
                        {person.gender}
                    </span>
                </div>
                
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs font-medium text-[var(--text-muted)]">
                        {years}
                    </span>
                    {person.profession && (
                        <>
                            <span className="h-1 w-1 rounded-full bg-[var(--border-main)]" />
                            <span className="truncate text-[10px] text-[var(--text-dim)]">
                                {person.profession}
                            </span>
                        </>
                    )}
                </div>
            </div>
        </button>
    );
};
