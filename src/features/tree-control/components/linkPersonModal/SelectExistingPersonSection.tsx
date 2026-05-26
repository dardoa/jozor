import React, { useEffect, useRef, useState, memo } from 'react';
import { Search, Info } from 'lucide-react';
import { useTranslation } from '../../../../context/TranslationContext';
import { SelectExistingPersonSectionProps, Person } from '../../../../types';
import { showToast } from '../../../../utils/showToast';

export const SelectExistingPersonSection: React.FC<SelectExistingPersonSectionProps> = memo(
  ({ people, type, gender, currentPersonId, familyActions, relatedPersonId, requiresRelatedPerson = false, autoFocusSearch = false, onClose }) => {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');
    const searchInputRef = useRef<HTMLInputElement | null>(null);


    useEffect(() => {
      if (!autoFocusSearch) return;

      const frameId = window.requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });

      return () => window.cancelAnimationFrame(frameId);
    }, [autoFocusSearch]);

    // Filter candidates
    const candidates = (Object.values(people) as Person[]).filter((p) => {
      // Cannot link to self
      if (p.id === currentPersonId) return false;
      // Gender filter if specified
      if (gender && p.gender !== gender) return false;

      // Basic search
      const fullName = `${p.firstName} ${p.middleName} ${p.lastName}`.toLowerCase();
      return fullName.includes(searchTerm.toLowerCase());
    });

    return (
      <div className='ds-panel-subtle relative space-y-3 p-4 pt-5'>
        <h3 className='absolute top-[-12px] start-3 z-10 bg-[var(--surface-app)] px-2 ds-label'>
          {t.selectExisting}
        </h3>

        <div className='relative'>
          <Search className='absolute start-3 top-3 w-4 h-4 text-[var(--text-muted)]' />
          <input
            ref={searchInputRef}
            type='text'
            placeholder={t.searchByName}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='ds-input w-full ps-10 pe-4 py-3 text-sm'
          />
        </div>

        <div className='max-h-48 overflow-y-auto divide-y divide-[var(--border-soft)] rounded-2xl border border-[var(--border-soft)] bg-white/55'>
          {candidates.length === 0 ? (
            <div className='p-4 text-center'>
              <Info className='mx-auto mb-2 h-8 w-8 text-[var(--text-muted)]/40' />
              <p className='text-sm italic text-[var(--text-muted)]'>{t.noMatches}</p>
            </div>
          ) : (
            candidates.map((p) => (
              <button
                key={p.id}
                onClick={async () => {
                  const result = await familyActions.onLinkPerson(p.id, type, relatedPersonId);
                  if (result?.success) {
                    showToast.success('messages.success.personLinked', {
                      id: `family-action-link:${type ?? 'unknown'}:${p.id}`,
                    });
                    onClose();
                  }
                }}
                disabled={requiresRelatedPerson && !relatedPersonId}
                className='group flex w-full items-center gap-3 p-3 text-start transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50'
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold shadow-sm ${p.gender === 'male' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'bg-pink-100 text-pink-600 dark:bg-pink-900 dark:text-pink-300'}`}
                >
                  {p.firstName[0]}
                </div>
                <div>
                  <div className='text-sm font-semibold text-[var(--text-main)] group-hover:text-[var(--primary-600)]'>
                    {p.firstName} {p.lastName}
                  </div>
                  <div className='text-xs text-[var(--text-muted)]'>
                    {p.birthDate ? `${t.born}: ${p.birthDate}` : ''}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }
);
