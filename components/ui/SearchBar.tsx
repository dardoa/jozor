import { useState, useMemo, useRef, useEffect } from 'react';
import Fuse from 'fuse.js';
import { Search, X, User } from 'lucide-react';
import { Person } from '../../types';
import { getYears } from '../../utils/familyLogic';

interface SearchBarProps {
    people: Record<string, Person>;
    onFocusPerson: (id: string) => void;
    className?: string;
}

export const SearchBar = ({ people, onFocusPerson, className = '' }: SearchBarProps) => {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    const peopleArray = useMemo(() => Object.values(people), [people]);

    const fuse = useMemo(() => new Fuse(peopleArray, {
        keys: ['firstName', 'lastName', 'middleName', 'title'],
        threshold: 0.3,
        distance: 100,
    }), [peopleArray]);

    const results = useMemo(() => {
        if (!query) return [];
        return fuse.search(query).map(r => r.item).slice(0, 8);
    }, [fuse, query]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey && e.key === 'f') || e.key === '/') {
                e.preventDefault();
                inputRef.current?.focus();
                setIsOpen(true);
            }
            if (e.key === 'Escape') {
                setIsOpen(false);
                setQuery('');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (resultsRef.current && !resultsRef.current.contains(e.target as Node) && !inputRef.current?.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (personId: string) => {
        onFocusPerson(personId);
        setIsOpen(false);
        setQuery('');
    };

    return (
        <div className={`relative z-[100] w-full max-w-[320px] ${className}`}>
            <div className="relative group">
                <div className={`
          flex items-center bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border rounded-full shadow-sm transition-all duration-300
          ${isOpen ? 'border-primary-500 ring-2 ring-primary-500/10 w-[320px]' : 'border-slate-200 dark:border-slate-800'}
        `}>
                    <Search className="ml-4 w-5 h-5 text-slate-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        className="w-full bg-transparent border-none focus:ring-0 py-2 px-3 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-500 font-medium"
                        placeholder="Search... (/)"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                    />
                    {query && (
                        <button
                            onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                            className="mr-3 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                        >
                            <X className="w-4 h-4 text-slate-400" />
                        </button>
                    )}
                </div>

                {/* Results Dropdown */}
                {isOpen && results.length > 0 && (
                    <div
                        ref={resultsRef}
                        className="absolute mt-2 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-scale-in"
                    >
                        <div className="max-h-96 overflow-y-auto p-2">
                            {results.map((person) => {
                                const initials = [person.firstName?.[0], person.lastName?.[0]].filter(Boolean).join('').toUpperCase();
                                const genderColor = person.gender === 'male' ? 'border-blue-400' : 'border-pink-400';

                                return (
                                    <button
                                        key={person.id}
                                        onClick={() => handleSelect(person.id)}
                                        className="w-full flex items-center p-3 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all group/item text-left"
                                    >
                                        <div className={`w-10 h-10 rounded-full border-2 ${genderColor} overflow-hidden flex-shrink-0 mr-3`}>
                                            {person.photoUrl ? (
                                                <img src={person.photoUrl} alt={person.firstName} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center relative">
                                                    <User className="absolute w-1/2 h-1/2 text-slate-300 opacity-50" />
                                                    <span className="relative z-10 text-slate-400 text-xs font-bold">{initials}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between">
                                                <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                                                    {person.firstName} {person.lastName}
                                                </span>
                                                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                                                    {person.gender}
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center mt-0.5">
                                                {getYears(person)}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
