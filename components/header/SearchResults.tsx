import { memo } from 'react';
import { SearchResultsProps } from '../../types';
import { ArrowRightLeft, Info } from 'lucide-react'; // Import Info icon
import { DropdownContent, DropdownMenuItem } from '../ui/DropdownMenu';
import { useTranslation } from '../../context/TranslationContext';

export const SearchResults = memo(({ results, onFocus, onClose }: SearchResultsProps) => {
  const { t } = useTranslation();

  return (
    <DropdownContent
      className='absolute top-full mt-2 w-80 start-0 z-[100] max-h-[400px] overflow-y-auto scrollbar-thin shadow-2xl bg-[var(--card-bg)]/90 backdrop-blur-md border border-[var(--border-main)] rounded-2xl'
      id='search-results-list'
      role='listbox'
    >
      {results.length === 0 ? (
        <div className='p-4 text-center text-xs text-[var(--text-dim)] italic flex flex-col items-center'>
          <Info className='w-8 h-8 mx-auto mb-2 opacity-50' />
          {t.noResults}
        </div>
      ) : (
        results.map((p) => (
          <DropdownMenuItem
            key={p.id}
            onClick={() => {
              onFocus(p.id);
              onClose();
            }}
            className='group text-start'
            role='option' // ARIA role for list item
            aria-selected={false} // Can be dynamically set if needed
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shadow-sm shrink-0 ${p.gender === 'male' ? 'bg-[var(--gender-male-bg)] text-[var(--gender-male-text)]' : 'bg-[var(--gender-female-bg)] text-[var(--gender-female-text)]'}`}
            >
              {p.firstName[0]}
            </div>
            <div className='min-w-0'>
              <div className='text-sm font-semibold text-[var(--text-main)] group-hover:text-[var(--primary-600)] truncate'>
                {p.firstName} {p.lastName}
              </div>
              {p.birthDate && (
                <div className='text-[10px] text-[var(--text-dim)] font-mono'>b. {p.birthDate}</div>
              )}
            </div>
            <div className='ms-auto opacity-0 group-hover:opacity-100 transition-opacity'>
              <ArrowRightLeft className='w-3 h-3 text-[var(--text-dim)]' />
            </div>
          </DropdownMenuItem>
        ))
      )}
    </DropdownContent>
  );
});
