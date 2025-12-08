import React, { useState, memo } from 'react';
import { Search, Info } from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';
import { SelectExistingPersonSectionProps, Person } from '../../types';

export const SelectExistingPersonSection: React.FC<SelectExistingPersonSectionProps> = memo(({
  people,
  type,
  gender,
  currentPersonId,
  familyActions,
  onClose,
}) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');

  // Filter candidates
  const candidates = (Object.values(people) as Person[]).filter(p => {
    // Cannot link to self
    if (p.id === currentPersonId) return false;
    // Gender filter if specified
    if (gender && p.gender !== gender) return false;
    
    // Basic search
    const fullName = `${p.firstName} ${p.middleName} ${p.lastName}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="bg-white dark:bg-stone-800 pt-5 p-3 rounded-xl border border-stone-200 dark:border-stone-700 shadow-sm space-y-3 relative">
      <h3 className="absolute top-[-12px] start-3 z-10 bg-white dark:bg-stone-800 px-2 text-[9px] font-bold text-stone-400 uppercase tracking-wider">{t.selectExisting}</h3>
      
      <div className="relative">
        <Search className="absolute start-3 top-2.5 w-4 h-4 text-stone-400" />
        <input
          type="text"
          placeholder={t.searchByName}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full ps-10 pe-4 py-2 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-stone-900 dark:text-white"
        />
      </div>
      
      <div className="border border-stone-200 dark:border-stone-700 rounded-lg max-h-48 overflow-y-auto divide-y divide-stone-50 dark:divide-stone-700 bg-white dark:bg-stone-800 scrollbar-thin scrollbar-thumb-stone-200 dark:scrollbar-thumb-600">
        {candidates.length === 0 ? (
          <div className="p-4 text-center">
            <Info className="w-8 h-8 text-stone-200 dark:text-stone-600 mx-auto mb-2" />
            <p className="text-sm text-stone-500 dark:text-stone-400">{t.noMatches}</p>
          </div>
        ) : (
          candidates.map(p => (
            <button
              key={p.id}
              onClick={() => { familyActions.onLinkPerson(p.id, type); onClose(); }}
              className="w-full flex items-center gap-3 p-3 hover:bg-stone-50 dark:hover:bg-stone-700 text-start transition-colors group"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${p.gender === 'male' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'bg-pink-100 text-pink-600 dark:bg-pink-900 dark:text-pink-300'}`}>
                {p.firstName[0]}
              </div>
              <div>
                <div className="text-sm font-semibold text-stone-700 dark:text-stone-200 group-hover:text-blue-700 dark:group-hover:text-blue-400">{p.firstName} {p.lastName}</div>
                <div className="text-xs text-stone-400 dark:text-stone-500">
                  {p.birthDate ? `${t.born}: ${p.birthDate}` : ''}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
});