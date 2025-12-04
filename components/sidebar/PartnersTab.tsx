import React, { memo } from 'react';
import { Person, RelationshipInfo } from '../../types';
import { DateSelect } from '../DateSelect';
import { ExternalLink, Heart, HeartCrack, Users, Gem, Calendar, MapPin } from 'lucide-react';
import { FormField } from '../ui/FormField';
import { getDisplayDate } from '../../utils/familyLogic';
import { Card } from '../ui/Card'; // Import Card component

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

  // Helper to get translated relationship type
  const getRelationshipTypeLabel = (type: RelationshipInfo['type']) => {
    switch (type) {
      case 'married': return t.married;
      case 'engaged': return t.engaged;
      case 'divorced': return t.divorced;
      case 'separated': return t.separated;
      default: return t.unknown;
    }
  };

  return (
    <Card title={t.spouses} contentClassName="p-3 space-y-3 animate-in slide-in-from-left-2 duration-200">
        {(!person.spouses.length && !isEditing) ? (
            <div className="text-center py-4 text-stone-400 dark:text-stone-500 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-dashed border-stone-200 dark:border-stone-700 flex flex-col items-center">
                <Users className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-sm">{t.noPartners}</span>
            </div>
        ) : (
            person.spouses.map((spouseId) => {
                const spouse = people[spouseId];
                if (!spouse) return null;
                
                const details: RelationshipInfo = person.partnerDetails?.[spouseId] || { type: 'married', startDate: '' };
                const isDivorced = details.type === 'divorced';

                return (
                    <div key={spouseId} className="border border-stone-100 dark:border-stone-700 rounded-xl p-2 bg-stone-50/80 dark:bg-stone-800/30 hover:border-teal-200 dark:hover:border-teal-800 transition-colors">
                        {/* Partner Header */}
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-sm overflow-hidden ${spouse.gender === 'male' ? 'bg-blue-100 dark:bg-blue-900 dark:text-blue-300' : 'bg-pink-100 dark:bg-pink-900 dark:text-pink-300'}`}>
                                    {spouse.photoUrl ? (
                                        <img src={spouse.photoUrl} alt="" className="w-full h-full object-cover" />
                                    ) : spouse.firstName[0]}
                                </div>
                                <div>
                                    <h4 className="font-bold text-stone-800 dark:text-stone-200 text-xs leading-tight mb-0.5">{spouse.firstName} {spouse.lastName}</h4>
                                    <button onClick={() => onSelect(spouseId)} className="text-[9px] text-teal-500 hover:underline flex items-center gap-1">
                                        {t.viewProfile} <ExternalLink className="w-2.5 h-2.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        {/* Edit Controls */}
                        {isEditing ? (
                            <div className="space-y-1.5 pt-2 border-t border-stone-200/60 dark:border-stone-700">
                                {/* Status Selector */}
                                <div className="flex items-center gap-2">
                                        <div className="w-5 flex justify-center text-stone-400">
                                            {details.type === 'married' ? <Heart className="w-3.5 h-3.5 text-rose-500" /> : 
                                            details.type === 'engaged' ? <Gem className="w-3.5 h-3.5 text-yellow-500" /> :
                                            details.type === 'divorced' ? <HeartCrack className="w-3.5 h-3.5 text-stone-500" /> :
                                            <Users className="w-3.5 h-3.5" />}
                                        </div>
                                        <select 
                                        disabled={!isEditing}
                                        value={details.type}
                                        onChange={(e) => handlePartnerUpdate(spouseId, 'type', e.target.value as RelationshipInfo['type'])}
                                        className="flex-1 h-7 bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-lg text-xs px-2 outline-none focus:border-teal-500 disabled:bg-transparent disabled:border-transparent disabled:px-0 disabled:font-medium disabled:text-stone-700 dark:disabled:text-stone-300 text-stone-900 dark:text-stone-100"
                                        >
                                            <option value="married">{t.married}</option>
                                            <option value="engaged">{t.engaged}</option>
                                            <option value="divorced">{t.divorced}</option>
                                            <option value="separated">{t.separated}</option>
                                        </select>
                                </div>

                                {/* Date Inputs */}
                                <div className="space-y-1.5 mt-1.5">
                                    <div className="flex items-center gap-2">
                                        <label className="w-16 shrink-0 text-[9px] text-stone-600 dark:text-stone-400 font-medium">{isDivorced ? t.married : t.since}</label>
                                        <DateSelect disabled={!isEditing} value={details.startDate} onChange={(val) => handlePartnerUpdate(spouseId, 'startDate', val)} />
                                    </div>
                                    <FormField
                                        label={t.place}
                                        value={details.startPlace || ''}
                                        onCommit={(v) => handlePartnerUpdate(spouseId, 'startPlace', v)}
                                        disabled={!isEditing}
                                        placeholder={t.place}
                                        className="!h-7 !text-xs"
                                        labelWidthClass="w-16"
                                    />
                                    
                                    {isDivorced && (
                                        <div className="space-y-1.5 mt-1.5 animate-in slide-in-from-top-1">
                                            <div className="flex items-center gap-2">
                                                <label className="w-16 shrink-0 text-[9px] text-stone-600 dark:text-stone-400 font-medium">{t.divorced}</label>
                                                <DateSelect disabled={!isEditing} value={details.endDate || ''} onChange={(val) => handlePartnerUpdate(spouseId, 'endDate', val)} />
                                            </div>
                                            <FormField
                                                label={t.place}
                                                value={details.endPlace || ''}
                                                onCommit={(v) => handlePartnerUpdate(spouseId, 'endPlace', v)}
                                                disabled={!isEditing}
                                                placeholder={t.place}
                                                className="!h-7 !text-xs"
                                                labelWidthClass="w-16"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            // View Mode
                            <div className="space-y-1.5 pt-2 border-t border-stone-200/60 dark:border-stone-700 text-sm text-stone-700 dark:text-stone-300">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold">{getRelationshipTypeLabel(details.type)}</span>
                                    {details.startDate && (
                                        <span className="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400">
                                            <Calendar className="w-3 h-3" /> {getDisplayDate(details.startDate)}
                                        </span>
                                    )}
                                    {details.startPlace && (
                                        <span className="flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400">
                                            <MapPin className="w-3 h-3" /> {details.startPlace}
                                        </span>
                                    )}
                                </div>
                                {isDivorced && details.endDate && (
                                    <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400">
                                        <HeartCrack className="w-3 h-3" /> {t.divorced}: <Calendar className="w-3 h-3" /> {getDisplayDate(details.endDate)}
                                        {details.endPlace && <MapPin className="w-3 h-3" />}{details.endPlace}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                );
            })
        )}
    </Card>
  );
});