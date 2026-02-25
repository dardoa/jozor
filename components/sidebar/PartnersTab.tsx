import { memo } from 'react';
import { Person, RelationshipInfo } from '../../types';
import { DateSelect } from '../DateSelect';
import { ExternalLink, Heart, HeartCrack, Users, Gem, Calendar, MapPin } from 'lucide-react';
import { FormField } from '../ui/FormField';
import { getDisplayDate } from '../../utils/familyLogic';
import { Card } from '../ui/Card';
import { useTranslation } from '../../context/TranslationContext';

interface PartnersTabProps {
  person: Person;
  people: Record<string, Person>;
  isEditing: boolean;
  onUpdate: (id: string, updates: Partial<Person>) => void;
  onSelect: (id: string) => void;
}

export const PartnersTab = memo<PartnersTabProps>(
  ({ person, people, isEditing, onUpdate, onSelect }) => {
    const { t } = useTranslation();

    const handlePartnerUpdate = (spouseId: string, field: keyof RelationshipInfo, value: any) => {
      const currentDetails = person.partnerDetails || {};
      const spouseDetails = currentDetails[spouseId] || { type: 'married', startDate: '' };

      const newDetails = {
        ...currentDetails,
        [spouseId]: {
          ...spouseDetails,
          [field]: value,
        },
      };
      onUpdate(person.id, { partnerDetails: newDetails });
    };

    // Helper to get translated relationship type
    const getRelationshipTypeLabel = (type: RelationshipInfo['type']) => {
      switch (type) {
        case 'married':
          return t.married;
        case 'engaged':
          return t.engaged;
        case 'divorced':
          return t.divorced;
        case 'separated':
          return t.separated;
        default:
          return t.unknown;
      }
    };

    return (
      <Card
        title={t.spouses}
        contentClassName='p-3 space-y-3 animate-in slide-in-from-left-2 duration-200'
      >
        {!person.spouses.length && !isEditing ? (
          <div className='text-center py-4 text-[var(--text-muted)] bg-[var(--theme-bg)]/50 rounded-xl border border-dashed border-[var(--border-main)] flex flex-col items-center'>
            <Users className='w-8 h-8 mb-2 opacity-50' />
            <span className='text-sm'>{t.noPartners}</span>
          </div>
        ) : (
          person.spouses.map((spouseId) => {
            const spouse = people[spouseId];
            if (!spouse) return null;

            const details: RelationshipInfo = person.partnerDetails?.[spouseId] || {
              type: 'married',
              startDate: '',
            };
            const isDivorced = details.type === 'divorced';

            return (
              <div
                key={spouseId}
                className='border border-[var(--border-main)] rounded-xl p-2 bg-[var(--theme-bg)]/50 hover:border-[var(--primary-500)]/30 transition-colors'
              >
                {/* Partner Header */}
                <div className='flex items-start justify-between mb-2'>
                  <div className='flex items-center gap-2'>
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shadow-sm overflow-hidden ${spouse.gender === 'male' ? 'bg-[var(--gender-male-bg)] text-[var(--gender-male-text)]' : 'bg-[var(--gender-female-bg)] text-[var(--gender-female-text)]'}`}
                    >
                      {spouse.photoUrl ? (
                        <img src={spouse.photoUrl} alt='' className='w-full h-full object-cover' />
                      ) : (
                        spouse.firstName[0]
                      )}
                    </div>
                    <div>
                      <h4 className='font-bold text-[var(--text-main)] text-xs leading-tight mb-0.5'>
                        {spouse.firstName} {spouse.lastName}
                      </h4>
                      <button
                        onClick={() => onSelect(spouseId)}
                        className='text-[9px] text-[var(--primary-600)] hover:underline flex items-center gap-1'
                      >
                        {t.viewProfile} <ExternalLink className='w-2.5 h-2.5' />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Edit Controls */}
                {isEditing ? (
                  <div className='space-y-1.5 pt-2 border-t border-[var(--border-main)]'>
                    {/* Status Selector */}
                    <div className='flex items-center gap-2'>
                      <div className='w-5 flex justify-center text-[var(--text-dim)]'>
                        {details.type === 'married' ? (
                          <Heart className='w-3.5 h-3.5 text-rose-500' />
                        ) : details.type === 'engaged' ? (
                          <Gem className='w-3.5 h-3.5 text-yellow-500' />
                        ) : details.type === 'divorced' ? (
                          <HeartCrack className='w-3.5 h-3.5 text-stone-500' />
                        ) : (
                          <Users className='w-3.5 h-3.5' />
                        )}
                      </div>
                      <select
                        disabled={!isEditing}
                        value={details.type}
                        onChange={(e) =>
                          handlePartnerUpdate(
                            spouseId,
                            'type',
                            e.target.value as RelationshipInfo['type']
                          )
                        }
                        aria-label={t.relationshipType || 'Relationship Type'}
                        className='flex-1 h-7 bg-[var(--card-bg)] border border-[var(--border-main)] rounded-lg text-xs px-2 outline-none focus:border-[var(--primary-500)] disabled:bg-transparent disabled:border-transparent disabled:px-0 disabled:font-medium text-[var(--text-main)]'
                      >
                        <option value='married'>{t.married}</option>
                        <option value='engaged'>{t.engaged}</option>
                        <option value='divorced'>{t.divorced}</option>
                        <option value='separated'>{t.separated}</option>
                      </select>
                    </div>

                    {/* Date Inputs */}
                    <div className='space-y-1.5 mt-1.5'>
                      <div className='flex items-center gap-2'>
                        <label className='w-16 shrink-0 text-xs text-[var(--text-muted)] font-medium'>
                          {isDivorced ? t.married : t.since}
                        </label>
                        <DateSelect
                          disabled={!isEditing}
                          value={details.startDate}
                          onChange={(val: string) =>
                            handlePartnerUpdate(spouseId, 'startDate', val)
                          }
                        />
                      </div>
                      <FormField
                        label={t.place}
                        value={details.startPlace || ''}
                        onCommit={(v: string) => handlePartnerUpdate(spouseId, 'startPlace', v)}
                        disabled={!isEditing}
                        placeholder={t.place}
                        className='!h-7 !text-xs'
                        labelWidthClass='w-16'
                      />

                      {isDivorced && (
                        <div className='space-y-1.5 mt-1.5 animate-in slide-in-from-top-1'>
                          <div className='flex items-center gap-2'>
                            <label className='w-16 shrink-0 text-xs text-[var(--text-muted)] font-medium'>
                              {t.divorced}
                            </label>
                            <DateSelect
                              disabled={!isEditing}
                              value={details.endDate || ''}
                              onChange={(val: string) =>
                                handlePartnerUpdate(spouseId, 'endDate', val)
                              }
                            />
                          </div>
                          <FormField
                            label={t.place}
                            value={details.endPlace || ''}
                            onCommit={(v: string) => handlePartnerUpdate(spouseId, 'endPlace', v)}
                            disabled={!isEditing}
                            placeholder={t.place}
                            className='!h-7 !text-xs'
                            labelWidthClass='w-16'
                          />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className='space-y-1.5 pt-2 border-t border-[var(--border-main)] text-sm text-[var(--text-main)]'>
                    <div className='flex items-center gap-2'>
                      <span className='font-bold'>{getRelationshipTypeLabel(details.type)}</span>
                      {details.startDate && (
                        <span className='flex items-center gap-1 text-xs text-[var(--text-muted)]'>
                          <Calendar className='w-3 h-3' /> {getDisplayDate(details.startDate)}
                        </span>
                      )}
                      {details.startPlace && (
                        <span className='flex items-center gap-1 text-xs text-[var(--text-muted)]'>
                          <MapPin className='w-3 h-3' /> {details.startPlace}
                        </span>
                      )}
                    </div>
                    {isDivorced && details.endDate && (
                      <div className='flex items-center gap-2 text-xs text-[var(--text-muted)]'>
                        <HeartCrack className='w-3 h-3' /> {t.divorced}:{' '}
                        <Calendar className='w-3 h-3' /> {getDisplayDate(details.endDate)}
                        {details.endPlace && <MapPin className='w-3 h-3' />}
                        {details.endPlace}
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
  }
);
