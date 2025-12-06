import React, { useMemo, useState } from 'react';
import { Person, Language, TimelineEvent } from '../types';
import { X, Calendar, Baby, Heart, Ribbon } from 'lucide-react';
import { getDisplayDate } from '../utils/familyLogic';
import { useTranslation } from '../context/TranslationContext';

interface TimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  people: Record<string, Person>;
  onSelectPerson: (id: string) => void;
  language: Language;
}

export const TimelineModal: React.FC<TimelineModalProps> = ({ 
    isOpen, onClose, people, onSelectPerson, language 
}) => {
  const { t } = useTranslation();
  const [sortAsc, setSortAsc] = useState(true);

  const events = useMemo(() => {
      const list: TimelineEvent[] = [];
      
      (Object.values(people) as Person[]).forEach(person => {
          // Birth
          if (person.birthDate) {
              const y = parseInt(getDisplayDate(person.birthDate));
              if (!isNaN(y)) {
                  list.push({
                      year: y,
                      dateStr: person.birthDate,
                      type: 'birth',
                      personId: person.id,
                      label: `${t.born}: ${person.firstName} ${person.lastName}`,
                      subLabel: person.birthPlace
                  });
              }
          }

          // Death
          if (person.isDeceased && person.deathDate) {
              const y = parseInt(getDisplayDate(person.deathDate));
              if (!isNaN(y)) {
                  list.push({
                      year: y,
                      dateStr: person.deathDate,
                      type: 'death',
                      personId: person.id,
                      label: `${t.died}: ${person.firstName} ${person.lastName}`,
                      subLabel: person.deathPlace
                  });
              }
          }

          // Marriages
          if (person.partnerDetails) {
              Object.entries(person.partnerDetails).forEach(([spouseId, info]) => {
                  // Only add marriage event once (check ID comparison to avoid duplicates)
                  if (info.startDate && person.id < spouseId) { 
                      const y = parseInt(getDisplayDate(info.startDate));
                      if (!isNaN(y)) {
                          const spouse = people[spouseId];
                          list.push({
                              year: y,
                              dateStr: info.startDate,
                              type: 'marriage',
                              personId: person.id,
                              relatedId: spouseId,
                              label: `${t.marriage}: ${person.firstName} & ${spouse?.firstName}`,
                              subLabel: info.startPlace
                          });
                      }
                  }
              });
          }
      });

      return list.sort((a, b) => sortAsc ? a.year - b.year : b.year - a.year);
  }, [people, sortAsc, t]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-800 rounded-xl shadow-2xl max-w-2xl w-full flex flex-col h-[85vh] border border-stone-200 dark:border-stone-700">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/50">
          <div className="flex items-center gap-2">
             <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400">
                 <Calendar className="w-5 h-5" />
             </div>
             <h3 className="text-lg font-bold text-stone-800 dark:text-white">{t.familyTimeline}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button 
                onClick={() => setSortAsc(!sortAsc)} 
                className="text-xs font-medium text-stone-500 hover:text-blue-600 px-2 py-1 bg-stone-100 dark:bg-stone-700 rounded-md transition-colors"
            >
                {sortAsc ? t.oldestFirst : t.newestFirst}
            </button>
            <button onClick={onClose} className="p-2 hover:bg-stone-100 dark:hover:bg-stone-700 rounded-full transition-colors text-stone-400 hover:text-stone-600">
                <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-stone-50 dark:bg-stone-900 relative">
            {events.length === 0 ? (
                <div className="text-center py-20 text-stone-400">
                    <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>{t.noEvents}</p>
                </div>
            ) : (
                <div className="relative border-s-2 border-stone-200 dark:border-stone-700 ms-4 space-y-8">
                    {events.map((evt, idx) => (
                        <div key={idx} className="relative ps-6 group">
                            {/* Dot */}
                            <div className={`absolute -start-[9px] top-0 w-4 h-4 rounded-full border-2 border-white dark:border-stone-800 shadow-sm flex items-center justify-center 
                                ${evt.type === 'birth' ? 'bg-green-500' : evt.type === 'death' ? 'bg-stone-500' : 'bg-pink-500'}
                            `}>
                            </div>

                            <div 
                                onClick={() => { onSelectPerson(evt.personId); onClose(); }}
                                className="bg-white dark:bg-stone-800 p-3 rounded-lg border border-stone-200 dark:border-stone-700 shadow-sm hover:shadow-md transition-all cursor-pointer hover:border-blue-200 dark:hover:border-blue-700"
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xl font-bold text-stone-300 dark:text-stone-600">{evt.year}</span>
                                    <div className={`p-1 rounded-full ${evt.type === 'birth' ? 'bg-green-50 text-green-600' : evt.type === 'death' ? 'bg-stone-100 text-stone-500' : 'bg-pink-50 text-pink-500'}`}>
                                        {evt.type === 'birth' && <Baby className="w-3.5 h-3.5" />}
                                        {evt.type === 'death' && <Ribbon className="w-3.5 h-3.5" />}
                                        {evt.type === 'marriage' && <Heart className="w-3.5 h-3.5" />}
                                    </div>
                                </div>
                                
                                <h4 className="font-bold text-stone-800 dark:text-stone-200 text-sm">{evt.label}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-xs text-stone-500 font-mono bg-stone-100 dark:bg-stone-700 px-1.5 rounded">{evt.dateStr}</span>
                                    {evt.subLabel && <span className="text-xs text-stone-400 truncate max-w-[150px]">• {evt.subLabel}</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};