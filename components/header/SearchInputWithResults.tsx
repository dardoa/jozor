import React, { useState, memo, useCallback } from 'react';
import { Person, SearchInputWithResultsProps } from '../../types';
import { Search, X } from 'lucide-react';
import { SearchResults } from './SearchResults';
import { useTranslation } from '../../context/TranslationContext';
import { useAppStore } from '../../store/useAppStore';
import { searchService } from '../../services/searchService';

export const SearchInputWithResults: React.FC<SearchInputWithResultsProps> = memo(
  ({ people, onFocusPerson }) => {
    const { t } = useTranslation();
    const setSearchTarget = useAppStore((state) => state.setSearchTarget); // Access internal store action
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<Person[]>([]);
    const [isSearchActive, setIsSearchActive] = useState(false);

    const handleSearch = useCallback(
      (query: string) => {
        setSearchQuery(query);
        if (!query.trim()) {
          setSearchResults([]);
          return;
        }
        const results = searchService.search(query);
        setSearchResults(results);
      },
      []
    );

    const handleClearSearch = useCallback(() => {
      setSearchQuery('');
      setSearchResults([]);
      setIsSearchActive(false);
    }, []);

    return (
      <div id="tree-search-input" className='relative group hidden lg:block z-[100]'>
        <div
          className={`flex items-center gap-2.5 bg-[var(--theme-bg)]/50 border border-[var(--border-main)] focus-within:bg-[var(--card-bg)] focus-within:border-[var(--primary-500)] focus-within:ring-4 focus-within:ring-[var(--primary-500)]/10 rounded-full px-4 py-2 transition-all w-64 hover:bg-[var(--theme-bg)]`}
        >
          <Search className='w-4 h-4 text-[var(--text-dim)] group-focus-within:text-[var(--primary-500)]' />
          <input
            type='text'
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearch(e.target.value)}
            onFocus={() => setIsSearchActive(true)}
            onBlur={() => setTimeout(() => setIsSearchActive(false), 200)}
            className='bg-transparent border-none outline-none text-xs font-medium text-[var(--text-main)] placeholder-[var(--text-dim)] w-full'
            aria-label={t.searchPlaceholder}
            role='combobox' // ARIA role for search with suggestions
            aria-autocomplete='list'
            aria-controls='search-results-list'
            aria-expanded={isSearchActive && searchResults.length > 0}
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className='text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors'
              aria-label={t.clearSearch}
            >
              <X className='w-3 h-3' />
            </button>
          )}
        </div>
        {isSearchActive && searchResults.length > 0 && (
          <SearchResults
            results={searchResults}
            onFocus={(id) => {
              onFocusPerson(id);
              setSearchTarget(id); // Trigger "Fly To" animation
              handleClearSearch();
            }}
            onClose={handleClearSearch}
          />
        )}
      </div>
    );
  }
);
