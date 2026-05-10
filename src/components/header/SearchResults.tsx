import { memo } from 'react';
import { SearchResultsProps } from '../../types';
import { Search } from 'lucide-react';
import { DropdownContent } from '../ui/DropdownMenu';
import { useTranslation } from '../../context/TranslationContext';
import { EmptyState } from '../ui/EmptyState';
import { PersonMiniCard } from '../ui/search/PersonMiniCard';

export const SearchResults = memo(({ query, results, onFocus, onClose, activeResultId, onHighlight }: SearchResultsProps & { query: string }) => {
  const { t } = useTranslation();
  const statusMessage = results.length === 0
    ? t.noResults
    : `${results.length} results available`;

  return (
    <DropdownContent
      className='absolute top-full mt-2 w-80 max-w-[min(24rem,calc(100vw-2rem))] start-0 z-[var(--z-index-tips)] max-h-[440px] overflow-y-auto scrollbar-thin shadow-2xl bg-[var(--card-bg)]/95 backdrop-blur-xl border border-[var(--border-main)] rounded-2xl p-1.5'
      id='search-results-list'
      role='listbox'
    >
      <div className='sr-only' aria-live='polite' role='status'>
        {statusMessage}
      </div>
      {results.length === 0 ? (
        <EmptyState
          icon={<Search className='h-5 w-5' />}
          title={t.searchPlaceholder}
          description={t.noResults}
          tone='subtle'
          className='m-3 min-h-[168px] justify-center text-center'
        />
      ) : (
        <div className="space-y-0.5">
            {results.map((p) => (
                <div 
                    key={p.id}
                    onMouseEnter={() => onHighlight?.(p.id)}
                    className={`rounded-xl transition-all ${activeResultId === p.id ? 'bg-primary-50/50 dark:bg-primary-900/10' : ''}`}
                >
                    <PersonMiniCard
                        person={p}
                        query={query}
                        onClick={() => {
                            onFocus(p.id);
                            onClose();
                        }}
                    />
                </div>
            ))}
        </div>
      )}
    </DropdownContent>
  );
});
