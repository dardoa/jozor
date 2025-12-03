import React, { memo } from 'react';
import { Person } from '../../types';
import { ArrowRightLeft } from 'lucide-react';
import { DropdownMenuContainer, DropdownMenuItem } from '../ui/DropdownMenu';

export const SearchResults = memo(({
    results, onFocus, onClose
}: {
    results: Person[], onFocus: (id: string) => void, onClose: () => void
}) => (
    <DropdownMenuContainer className="w-80 start-0 max-h-96 overflow-y-auto scrollbar-thin">
        {results.length === 0 && <div className="p-4 text-center text-xs text-stone-400 italic">No results found</div>}
        {results.map(p => (
            <DropdownMenuItem key={p.id} onClick={() => { onFocus(p.id); onClose(); }} className="group text-start">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shadow-sm shrink-0 ${p.gender === 'male' ? 'bg-teal-100 text-teal-600 dark:bg-teal-900 dark:text-teal-300' : 'bg-pink-100 text-pink-600 dark:bg-pink-900 dark:text-pink-300'}`}>
                    {p.firstName[0]}
                </div>
                <div className="min-w-0">
                    <div className="text-sm font-semibold text-stone-700 dark:text-stone-200 group-hover:text-teal-600 dark:group-hover:text-teal-400 truncate">
                        {p.firstName} {p.lastName}
                    </div>
                    {p.birthDate && <div className="text-[10px] text-stone-400 font-mono">b. {p.birthDate}</div>}
                </div>
                <div className="ms-auto opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRightLeft className="w-3 h-3 text-stone-400" />
                </div>
            </DropdownMenuItem>
        ))}
    </DropdownMenuContainer>
));