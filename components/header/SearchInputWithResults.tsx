import React, { useState, memo, useCallback } from 'react';
import { Person, SearchInputWithResultsProps } from '../../types';
import { Search, X } from 'lucide-react';
import { SearchResults } from './SearchResults';
import { useTranslation } from '../../context/TranslationContext';

export const SearchInputWithResults: React.FC<SearchInputWithResultsProps> = memo(({
  people, onFocusPerson
}) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Person[]>([]);
  const [isSearchActive, setIsSearchActive] = useState(false);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const q = query.toLowerCase();
    const results = (Object.values(people) as Person[]).filter(p =>
      `${p.firstName} ${p.middleName} ${p.lastName} ${p.birthName}`.toLowerCase().includes(q)
    ).slice(0, 10);
    setSearchResults(results);
  }, [people]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearchActive(false);
  }, []);

  return (
    <div className="relative group hidden lg:block">
      <div className={`flex items-center gap-2.5 bg-stone-100/50 dark:bg-stone-800/50 border border-stone-200/50 dark:border-stone-700/50 focus-within:bg-white dark:focus-within:bg-stone-900 focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-500/10 rounded-full px-4 py-2 transition-all w-64 hover:bg-stone-100 dark:hover:bg-stone-800`}>
        <Search className="w-4 h-4 text-stone-400 group-focus-within:text-teal-500" />
        <input
          type="text"
          placeholder={t.searchPlaceholder}
          value={searchQuery}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearch(e.target.value)}
          onFocus={() => setIsSearchActive(true)}
          onBlur={() => setTimeout(() => setIsSearchActive(false), 200)}
          className="bg-transparent border-none outline-none text-xs font-medium text-stone-700 dark:text-stone-200 placeholder-stone-400 w-full"
          aria-label={t.searchPlaceholder}
          role="combobox" // ARIA role for search with suggestions
          aria-autocomplete="list"
          aria-controls="search-results-list"
          aria-expanded={isSearchActive && searchResults.length > 0}
        />
        {searchQuery && (
          <button onClick={handleClearSearch} className="text-stone-400 hover:text-stone-600" aria-label={t.clearSearch}>
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
      {isSearchActive && searchResults.length > 0 && (
        <SearchResults results={searchResults} onFocus={onFocusPerson} onClose={handleClearSearch} />
      )}
    </div>
  );
});