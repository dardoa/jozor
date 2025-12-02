import React, { memo } from 'react';
import { Person } from '../../types';
import { ArrowRightLeft } from 'lucide-react';

// --- Shared Styles ---
const DROPDOWN_CONTAINER = "absolute top-full mt-2 w-64 p-1.5 bg-white/95 dark:bg-stone-950/95 backdrop-blur-xl border border-stone-200/50 dark:border-stone-700/50 rounded-2xl shadow-float z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right ring-1 ring-black/5";

export const SearchResults = memo(({
    results, onFocus, onClose
}: {
    results: Person[], onFocus: (id: string) => void, onClose: () => void
}) => (
    <div className={`${DROPDOWN_CONTAINER} w-80 start-0 max-h-96 overflow-y-auto scrollbar-thin`}>
        {results.length === 0 && <div className="p-4 text-center text-xs text-stone-400 italic">No results found</div>}
        {results.map(p => (
            <button key={p.id} onClick={() => { onFocus(p.id); onClose(); }} className="w-full flex items-center gap-3 p-2 hover:bg-teal-50 dark:hover:bg-stone-800 rounded-xl transition-colors group text-start">
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
            </button>
        ))}
    </div>
));