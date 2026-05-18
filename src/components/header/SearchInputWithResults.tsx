import React, { memo } from 'react';
import { SearchInputWithResultsProps } from '../../types';
import { Search, X, Mic, MicOff } from 'lucide-react';
import { SearchResults } from './SearchResults';
import { useTranslation } from '../../context/TranslationContext';
import { useAppStore } from '../../store/useAppStore';
import { usePersonSearchController } from './usePersonSearchController';
import { useSpeechToText } from '../../hooks/utils/useSpeechToText';
import { toast } from 'sonner';

export const SearchInputWithResults: React.FC<SearchInputWithResultsProps> = memo(
  ({ people, onFocusPerson }) => {
    const { t, language } = useTranslation();
    const setSearchTarget = useAppStore((state) => state.setSearchTarget);
    const triggerPulse = useAppStore((state) => state.triggerPulse);

    const {
      searchQuery,
      searchResults,
      isSearchActive,
      activeResult,
      handleSearch,
      handleClearSearch,
      handleHighlight,
      handleInputKeyDown,
      handleInputBlur,
      focusResult,
      setIsSearchActive,
    } = usePersonSearchController({
      people,
      onFocusPerson: (id) => {
        onFocusPerson(id);
        triggerPulse(id);
      },
      onSetSearchTarget: setSearchTarget,
    });

    const { isListening, startListening, stopListening, isSupported: isVoiceSupported } = useSpeechToText({
      language: language === 'ar' ? 'ar-SA' : 'en-US',
      onResult: (text) => {
        handleSearch(text);
        setIsSearchActive(true);
        toast.success(language === 'ar' ? `سمعتك: "${text}"` : `Heard: "${text}"`);
      },
      onError: (err) => {
        console.error('Speech Error:', err);
        toast.error(language === 'ar' ? 'عذراً، لم أستطع فهم الصوت' : 'Sorry, I couldn\'t understand the voice');
      }
    });

    return (
      <div id="tree-search-input" className='relative group z-[var(--z-index-nav)] flex-1 lg:flex-none'>
        <div className={`ds-input-shell flex items-center gap-2.5 rounded-full px-4 py-2 w-full lg:w-56 xl:w-64 transition-all duration-300 ${isListening ? 'bg-[var(--danger-500)]/10 ring-2 ring-[var(--danger-500)]' : ''}`}>
          {isListening ? (
            <div className="flex gap-0.5 items-center w-4">
              <span className="w-1 h-2 bg-[var(--danger-500)] rounded-full animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1 h-3 bg-[var(--danger-500)] rounded-full animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1 h-2 bg-[var(--danger-500)] rounded-full animate-bounce" />
            </div>
          ) : (
            <Search className='w-4 h-4 text-[var(--text-dim)] group-focus-within:text-[var(--primary-500)]' />
          )}
          <input
            type='text'
            placeholder={t.searchPlaceholder}
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearch(e.target.value)}
            onFocus={() => setIsSearchActive(true)}
            onKeyDown={handleInputKeyDown}
            onBlur={handleInputBlur}
            className='bg-transparent border-none outline-none text-sm font-medium text-[var(--text-main)] placeholder-[var(--text-dim)] w-full'
            aria-label={t.searchPlaceholder}
            role='combobox'
            aria-autocomplete='list'
            aria-haspopup='listbox'
            aria-controls='search-results-list'
            aria-expanded={isSearchActive && !!searchQuery.trim()}
            aria-activedescendant={activeResult ? `search-result-option-${activeResult.id}` : undefined}
          />
          <div className="flex items-center gap-1.5">
            {searchQuery && (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleClearSearch}
                className='text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors'
                aria-label={t.clearSearch}
              >
                <X className='w-3.5 h-3.5' />
              </button>
            )}

            {isVoiceSupported && (
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`transition-all duration-300 ${isListening ? 'text-[var(--danger-500)]' : 'text-[var(--text-dim)] hover:text-[var(--primary-500)]'}`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>
        {isSearchActive && searchQuery.trim() && (
          <SearchResults
            query={searchQuery}
            results={searchResults}
            onFocus={focusResult}
            onClose={handleClearSearch}
            activeResultId={activeResult?.id ?? null}
            onHighlight={handleHighlight}
          />
        )}
      </div>
    );
  }
);
