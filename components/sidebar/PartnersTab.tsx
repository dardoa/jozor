import React from 'react';
import { Person, RelationshipInfo } from '../../types';
import { DateSelect } from '../DateSelect';
import { ExternalLink, Heart, HeartCrack, Users, Gem, Calendar } from 'lucide-react';
import { SmartInput } from '../ui/SmartInput';

interface PartnersTabProps {
  person: Person;
  people: Record<string, Person>;
  isEditing: boolean;
  onUpdate: (id: string, updates: Partial<Person>) => void;
  onSelect: (id: string) => void;
  t: any;
}

export const PartnersTab: React.FC<PartnersTabProps> = ({ person, people, isEditing, onUpdate, onSelect, t }) => {
  
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

  const inputBaseClass = "flex-1 h-6 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-[10px] px-1 outline-none focus:border-blue-500 disabled:bg-transparent disabled:border-transparent disabled:px-0 disabled:text-gray-600 dark:disabled:text-gray-400 text-gray-900 dark:text-gray-100";

  return (
    <div className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 shadow-sm space-y-3 animate-in slide-in-from-left-2 duration-200">
        <div className="flex justify-between items-center mb-0.5">
            <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{t.spouses}</h3>
        </div>
        
        {person.spouses.map((spouseId) => {
            const spouse = people[spouseId];
            if (!spouse) return null;
            
            const details: RelationshipInfo = person.partnerDetails?.[spouseId] || { type: 'married', startDate: '' };
            const isDivorced = details.type === 'divorced';

            return (
                <div key={spouseId} className="border border-gray-100 dark:border-gray-700 rounded-lg p-2 bg-gray-50/80 dark:bg-gray-700/30 hover:border-blue-200 dark:hover:border-blue-800 transition-colors">
                    {/* Partner Header */}
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-sm overflow-hidden ${spouse.gender === 'male' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'bg-pink-100 text-pink-600 dark:bg-pink-900 dark:text-pink-300'}`}>
                                {spouse.photoUrl ? (
                                    <img src={spouse.photoUrl} alt="" className="w-full h-full object-cover" />
                                ) : spouse.firstName[0]}
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-800 dark:text-gray-200 text-[11px] leading-tight mb-0.5">{spouse.firstName} {spouse.lastName}</h4>
                                <button onClick={() => onSelect(spouseId)} className="text-[9px] text-blue-500 hover:underline flex items-center gap-0.5">
                                    {t.viewProfile} <ExternalLink className="w-2 h-2" />
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    {/* Edit Controls */}
                    <div className="space-y-1.5 pt-1.5 border-t border-gray-200/60 dark:border-gray-600">
                        {/* Status Selector */}
                        <div className="flex items-center gap-1.5">
                                <div className="w-5 flex justify-center text-gray-400">
                                    {details.type === 'married' ? <Heart className="w-3 h-3 text-rose-500" /> : 
                                    details.type === 'engaged' ? <Gem className="w-3 h-3 text-yellow-500" /> :
                                    details.type === 'divorced' ? <HeartCrack className="w-3 h-3 text-gray-500" /> :
                                    <Users className="w-3 h-3" />}
                                </div>
                                <select 
                                disabled={!isEditing}
                                value={details.type}
                                onChange={(e) => handlePartnerUpdate(spouseId, 'type', e.target.value)}
                                className="flex-1 h-6 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded text-[10px] px-1 outline-none focus:border-blue-500 disabled:bg-transparent disabled:border-transparent disabled:px-0 disabled:font-medium disabled:text-gray-700 dark:disabled:text-gray-300 text-gray-900 dark:text-gray-100"
                                >
                                    <option value="married">{t.married}</option>
                                    <option value="engaged">{t.engaged}</option>
                                    <option value="divorced">{t.divorced}</option>
                                    <option value="separated">{t.separated}</option>
                                </select>
                        </div>

                        {/* Date Inputs */}
                        <div className="space-y-1.5 mt-1.5">
                            <div className="flex items-center gap-1.5">
                                    <div className="w-5 flex justify-center text-gray-400">
                                        <Calendar className="w-3 h-3" />
                                    </div>
                                    <div className="flex-1 flex flex-col gap-1.5">
                                    <div className="flex items-center gap-1.5">
                                            <span className="text-[9px] text-gray-500 w-10 shrink-0">
                                            {isDivorced ? t.married : t.since}:
                                            </span>
                                            <DateSelect disabled={!isEditing} value={details.startDate} onChange={(val) => handlePartnerUpdate(spouseId, 'startDate', val)} />
                                    </div>
                                        <SmartInput 
                                            disabled={!isEditing}
                                            type="text"
                                            placeholder={t.place}
                                            value={details.startPlace || ''}
                                            onCommit={(v) => handlePartnerUpdate(spouseId, 'startPlace', v)}
                                            className={inputBaseClass}
                                        />
                                    </div>
                            </div>
                            
                            {isDivorced && (
                                <div className="flex items-center gap-1.5 animate-in slide-in-from-top-1">
                                        <div className="w-5 flex justify-center text-gray-400">
                                            <HeartCrack className="w-3 h-3" />
                                        </div>
                                        <div className="flex-1 flex flex-col gap-1.5">
                                        <div className="flex items-center gap-1.5">
                                                <span className="text-[9px] text-gray-500 w-10 shrink-0">{t.divorced}:</span>
                                                <DateSelect disabled={!isEditing} value={details.endDate || ''} onChange={(val) => handlePartnerUpdate(spouseId, 'endDate', val)} />
                                        </div>
                                            <SmartInput 
                                                disabled={!isEditing}
                                                type="text"
                                                placeholder={t.place}
                                                value={details.endPlace || ''}
                                                onCommit={(v) => handlePartnerUpdate(spouseId, 'endPlace', v)}
                                                className={inputBaseClass}
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
};