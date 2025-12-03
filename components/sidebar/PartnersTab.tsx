import React, { memo } from 'react';
import { Person, RelationshipInfo } from '../../types';
import { DateSelect } from '../DateSelect';
import { ExternalLink, Heart, HeartCrack, Users, Gem, Calendar } from 'lucide-react';
import { FormField } from '../ui/FormField';

interface PartnersTabProps {
  person: Person;
  people: Record<string, Person>;
  isEditing: boolean;
  onUpdate: (id: string, updates: Partial<Person>) => void;
  onSelect: (id: string) => void;
  t: any;
}

export const PartnersTab: React.FC<PartnersTabProps> = memo(({ person, people, isEditing, onUpdate, onSelect, t }) => {
  
  const handlePartnerUpdate = (spouseId: string, field: keyof RelationshipInfo, value: any) => {
    const currentDetails = person.partnerDetails || {};
    const spouseDetails = currentDetails[spouseId] || { type: 'married', startDate: '' };
    
    const newDetails = {
        ...currentDetails,
        [spouseId]: {
            ...spouseDetails,
            [field]: value
        }
    };
    onUpdate(person.id, { partnerDetails: newDetails });
  };

  return (
    <div className="bg-white dark:bg-stone-900 p-2 rounded-xl border border-stone-200/50 dark:border-stone-800/50 shadow-sm space-y-4 animate-in slide-in-from-left-2 duration-200">
        <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-3">{t.spouses}</h3>
        
        {person.spouses.map((spouseId) => {
            const spouse = people[spouseId];
            if (!spouse) return null;
            
            const details: RelationshipInfo = person.partnerDetails?.[spouseId] || { type: 'married', startDate: '' };
            const isDivorced = details.type === 'divorced';

            return (
                <div key={spouseId} className="border border-stone-100 dark:border-stone-700 rounded-xl p-3 bg-stone-50/80 dark:bg-stone-800/30 hover:border-teal-200 dark:hover:border-teal-800 transition-colors">
                    {/* Partner Header */}
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm overflow-hidden ${spouse.gender === 'male' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'bg-pink-100 text-pink-600 dark:bg-pink-900 dark:text-pink-300'}`}> {/* Reduced from w-10 h-10 to w-8 h-8 */}
                                {spouse.photoUrl ? (
                                    <img src={spouse.photoUrl} alt="" className="w-full h-full object-cover" />
                                ) : spouse.firstName[0]}
                            </div>
                            <div>
                                <h4 className="font-bold text-stone-800 dark:text-stone-200 text-sm leading-tight mb-0.5">{spouse.firstName} {spouse.lastName}</h4>
                                <button onClick={() => onSelect(spouseId)} className="text-[10px] text-teal-500 hover:underline flex items-center gap-1">
                                    {t.viewProfile} <ExternalLink className="w-2.5 h-2.5" />
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    {/* Edit Controls */}
                    <div className="space-y-2 pt-3 border-t border-stone-200/60 dark:border-stone-700">
                        {/* Status Selector */}
                        <div className="flex items-center gap-3">
                                <div className="w-6 flex justify-center text-stone-400">
                                    {details.type === 'married' ? <Heart className="w-4 h-4 text-rose-500" /> : 
                                    details.type === 'engaged' ? <Gem className="w-4 h-4 text-yellow-500" /> :
                                    details.type === 'divorced' ? <HeartCrack className="w-4 h-4 text-stone-500" /> :
                                    <Users className="w-4 h-4" />}
                                </div>
                                <select 
                                disabled={!isEditing}
                                value={details.type}
                                onChange={(e) => handlePartnerUpdate(spouseId, 'type', e.target.value)}
                                className="flex-1 h-8 bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-lg text-sm px-2 outline-none focus:border-teal-500 disabled:bg-transparent disabled:border-transparent disabled:px-0 disabled:font-medium disabled:text-stone-700 dark:disabled:text-stone-300 text-stone-900 dark:text-stone-100"
                                >
                                    <option value="married">{t.married}</option>
                                    <option value="engaged">{t.engaged}</option>
                                    <option value="divorced">{t.divorced}</option>
                                    <option value="separated">{t.separated}</option>
                                </select>
                        </div>

                        {/* Date Inputs */}
                        <div className="space-y-2 mt-2">
                            <div className="flex items-center gap-3">
                                    <div className="w-6 flex justify-center text-stone-400">
                                        <Calendar className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-stone-500 w-12 shrink-0">
                                            {isDivorced ? t.married : t.since}:
                                            </span>
                                            <DateSelect disabled={!isEditing} value={details.startDate} onChange={(val) => handlePartnerUpdate(spouseId, 'startDate', val)} />
                                    </div>
                                        <FormField
                                            label=""
                                            value={details.startPlace || ''}
                                            onCommit={(v) => handlePartnerUpdate(spouseId, 'startPlace', v)}
                                            disabled={!isEditing}
                                            placeholder={t.place}
                                            className="!h-8 !text-sm"
                                            labelWidthClass="hidden"
                                        />
                                    </div>
                            </div>
                            
                            {isDivorced && (
                                <div className="flex items-center gap-3 animate-in slide-in-from-top-1">
                                        <div className="w-6 flex justify-center text-stone-400">
                                            <HeartCrack className="w-4 h-4" />
                                        </div>
                                        <div className="flex-1 flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-stone-500 w-12 shrink-0">{t.divorced}:</span>
                                                <DateSelect disabled={!isEditing} value={details.endDate || ''} onChange={(val) => handlePartnerUpdate(spouseId, 'endDate', val)} />
                                        </div>
                                            <FormField
                                                label=""
                                                value={details.endPlace || ''}
                                                onCommit={(v) => handlePartnerUpdate(spouseId, 'endPlace', v)}
                                                disabled={!isEditing}
                                                placeholder={t.place}
                                                className="!h-8 !text-sm"
                                                labelWidthClass="hidden"
                                            />
                                        </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        })}
    </div>
  );
});