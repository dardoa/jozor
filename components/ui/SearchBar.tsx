import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, Mic, MicOff, Command } from 'lucide-react';
import { Person } from '../../types';
import { searchService } from '../../services/searchService';
import { PersonMiniCard } from './search/PersonMiniCard';
import { useSpeechToText } from '../../hooks/useSpeechToText';
import { useTranslation } from '../../context/TranslationContext';
import { useAppStore } from '../../store/useAppStore';
import { toast } from 'sonner';

interface SearchBarProps {
    people: Record<string, Person>;
    onFocusPerson: (id: string) => void;
    className?: string;
}

/**
 * Jozor Search 2.0 - Conversational & Intent-Aware
 */
export const SearchBar = ({ people, onFocusPerson, className = '' }: SearchBarProps) => {
    const { language } = useTranslation();
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [results, setResults] = useState<Person[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);
    const searchRequestIdRef = useRef(0);

    const peopleArray = useMemo(() => Object.values(people), [people]);

    // Phase 1: Keep index updated (only if content version changed)
    const peopleHash = useMemo(() => {
        const keys = Object.keys(people);
        return `${keys.length}:${keys.slice(0, 5).join(',')}`; // Sample hash
    }, [people]);

    useEffect(() => {
        void searchService.updateSearchIndex(peopleArray);
    }, [peopleHash]); // Only re-index if structural keys changed

    // Phase 2: Perform search with intent awareness
    useEffect(() => {
        const requestId = searchRequestIdRef.current + 1;
        searchRequestIdRef.current = requestId;

        if (!query.trim()) {
            setResults([]);
            return;
        }

        const timeoutId = setTimeout(() => {
            void searchService.search(query, 10).then((nextResults) => {
                if (searchRequestIdRef.current !== requestId) return;
                setResults(nextResults);
            });
        }, 150); // Small debounce for typing

        return () => clearTimeout(timeoutId);
    }, [query]);

    // Voice Search Setup
    const { isListening, startListening, stopListening, isSupported: isVoiceSupported } = useSpeechToText({
        language: language === 'ar' ? 'ar-SA' : 'en-US',
        onResult: (text) => {
            setQuery(text);
            setIsOpen(true);
            toast.success(language === 'ar' ? `سمعتك: "${text}"` : `Heard: "${text}"`);
        },
        onError: (err) => {
            console.error('Speech Error:', err);
            toast.error(language === 'ar' ? 'عذراً، لم أستطع فهم الصوت' : 'Sorry, I couldn\'t understand the voice');
        }
    });

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

    const triggerPulse = useAppStore((state) => state.triggerPulse);

    const handleSelect = (personId: string) => {
        onFocusPerson(personId);
        triggerPulse(personId);
        setIsOpen(false);
        setQuery('');
    };

    return (
        <div className={`relative z-[var(--z-index-nav)] w-full max-w-[320px] sm:max-w-[400px] ${className}`}>
            <div className="relative group">
                <div className={`
          flex items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border rounded-2xl shadow-lg transition-all duration-300
          ${isOpen ? 'border-primary-500 ring-4 ring-primary-500/10' : 'border-slate-200 dark:border-slate-800'}
        `}>
                    <div className="pl-4 flex-shrink-0">
                        {isListening ? (
                            <div className="flex gap-0.5 items-center">
                                <span className="w-1 h-3 bg-primary-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                <span className="w-1 h-5 bg-primary-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                <span className="w-1 h-3 bg-primary-500 rounded-full animate-bounce" />
                            </div>
                        ) : (
                            <Search className="w-5 h-5 text-slate-400" />
                        )}
                    </div>

                    <input
                        ref={inputRef}
                        type="text"
                        className="w-full bg-transparent border-none focus:ring-0 py-3 px-3 text-sm sm:text-base text-slate-800 dark:text-slate-100 placeholder-slate-400 font-medium"
                        placeholder={language === 'ar' ? "ابحث عن اسم، طفل، أو نية..." : "Search name, child, or intent..."}
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                    />

                    <div className="flex items-center gap-1 pr-3">
                        {query ? (
                            <button
                                onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4 text-slate-400" />
                            </button>
                        ) : (
                            <div className="hidden sm:flex items-center gap-0.5 px-1.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
                                <Command className="w-3 h-3 text-slate-400" />
                                <span className="text-[10px] font-bold text-slate-400">F</span>
                            </div>
                        )}

                        {isVoiceSupported && (
                            <button
                                onClick={isListening ? stopListening : startListening}
                                className={`
                                    p-2 rounded-xl transition-all duration-300
                                    ${isListening 
                                        ? 'bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400 animate-pulse' 
                                        : 'hover:bg-primary-50 text-slate-400 hover:text-primary-500 dark:hover:bg-primary-900/20'}
                                `}
                            >
                                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                            </button>
                        )}
                    </div>
                </div>

                {/* Results Dropdown */}
                {isOpen && (results.length > 0 || query.trim() !== '') && (
                    <div
                        ref={resultsRef}
                        className="absolute mt-3 w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300"
                    >
                        <div className="max-h-[480px] overflow-y-auto p-2">
                            {results.length > 0 ? (
                                <div className="space-y-1">
                                    <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex justify-between">
                                        <span>{language === 'ar' ? 'النتائج المطابقة' : 'Top Matches'}</span>
                                        <span>{results.length}</span>
                                    </div>
                                    {results.map((person) => (
                                        <PersonMiniCard
                                            key={person.id}
                                            person={person}
                                            query={query}
                                            onClick={() => handleSelect(person.id)}
                                        />
                                    ))}
                                </div>
                            ) : query.trim() !== '' ? (
                                <div className="p-8 text-center">
                                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Search className="w-8 h-8 text-slate-300" />
                                    </div>
                                    <p className="text-slate-500 dark:text-slate-400 font-medium">
                                        {language === 'ar' ? 'لم نجد أحداً بهذا الاسم أو النية' : 'No one found with this name or intent'}
                                    </p>
                                </div>
                            ) : null}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
