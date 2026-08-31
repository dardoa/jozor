import React, { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { VisualStudioPosterRootOption } from './visualStudioPosterOptions';

interface VisualOutputPersonPickerProps {
  language: 'ar' | 'en';
  label: string;
  options: readonly VisualStudioPosterRootOption[];
  value: string;
  onChange: (token: string) => void;
  selectId: string;
  testId?: string;
}

const normalizeSearchText = (value: string): string => value.trim().toLocaleLowerCase();

export const VisualOutputPersonPicker: React.FC<VisualOutputPersonPickerProps> = ({
  language,
  label,
  options,
  value,
  onChange,
  selectId,
  testId,
}) => {
  const isAr = language === 'ar';
  const [query, setQuery] = useState('');
  const selectedOption = options.find((option) => option.token === value);
  const visibleOptions = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query);
    if (!normalizedQuery) return options;

    const matches = options.filter((option) => (
      normalizeSearchText(option.label).includes(normalizedQuery)
    ));
    if (selectedOption && !matches.some((option) => option.token === selectedOption.token)) {
      return [selectedOption, ...matches];
    }
    return matches;
  }, [options, query, selectedOption]);

  const resultCopy = query
    ? (isAr ? `${visibleOptions.length} نتيجة` : `${visibleOptions.length} results`)
    : (isAr ? `${options.length} شخصًا` : `${options.length} people`);

  return (
    <div className="space-y-1.5" data-testid={testId ? `${testId}-picker` : undefined}>
      <label htmlFor={selectId} className="block text-xs font-medium text-stone-400">
        {label}
      </label>
      {options.length > 8 && (
        <div className="relative">
          <Search
            className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-stone-500"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label={isAr ? `بحث في ${label}` : `Search ${label}`}
            placeholder={isAr ? 'ابحث بالاسم أو السنوات' : 'Search name or years'}
            className="min-h-9 w-full rounded-lg border border-stone-800 bg-stone-950 pe-9 ps-8 text-xs text-stone-200 outline-none placeholder:text-stone-600 focus:border-amber-500 focus:ring-2 focus:ring-amber-500"
            data-testid={testId ? `${testId}-search` : undefined}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label={isAr ? 'مسح البحث' : 'Clear search'}
              title={isAr ? 'مسح البحث' : 'Clear search'}
              className="absolute end-1.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-stone-500 hover:bg-stone-800 hover:text-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      )}
      <select
        id={selectId}
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-10 w-full rounded-lg border border-stone-800 bg-stone-950 px-3 py-2 text-xs text-stone-200 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500"
        data-testid={testId}
      >
        {visibleOptions.length > 0 ? visibleOptions.map((option) => (
          <option key={option.token} value={option.token}>
            {option.label}
          </option>
        )) : (
          <option value={value} disabled>
            {isAr ? 'لا توجد نتائج' : 'No matching people'}
          </option>
        )}
      </select>
      <p className="text-[10px] font-medium text-stone-500" aria-live="polite">
        {resultCopy}
      </p>
    </div>
  );
};
