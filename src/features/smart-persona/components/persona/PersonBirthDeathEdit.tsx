import { memo, useEffect, useState } from 'react';
import { Person, PersonUpdateHandler } from '../../../../types';
import { DateSelect } from '../../../../components/DateSelect';
import { FormField } from '../../../../components/ui/FormField';
import { PlaceInput } from '../../../../components/ui/PlaceInput';
import { Card } from '../../../../components/ui/Card';
import { BookOpen, ChevronDown } from 'lucide-react';
import { useTranslation } from '../../../../context/TranslationContext';
import { checkVitalDateConsistency, describeSmartCheckIssue } from '../../../../domain/smartChecker';
import { showToast } from '../../../../utils/showToast';

interface PersonBirthDeathEditProps {
  person: Person;
  onUpdate: PersonUpdateHandler;
}

export const PersonBirthDeathEdit = memo<PersonBirthDeathEditProps>(({ person, onUpdate }) => {
  const { t, language } = useTranslation();
  const [showDeathDetails, setShowDeathDetails] = useState(true);
  const [birthDateDraft, setBirthDateDraft] = useState(person.birthDate);
  const [deathDateDraft, setDeathDateDraft] = useState(person.deathDate);

  useEffect(() => {
    setBirthDateDraft(person.birthDate);
    setDeathDateDraft(person.deathDate);
  }, [person.id, person.birthDate, person.deathDate]);

  const handleChange = (field: keyof Person, value: string) => {
    void onUpdate(person.id, { [field]: value });
  };


  const commitDateField = async (field: 'birthDate' | 'deathDate', value: string) => {
    const persistedValue = person[field] || '';
    if (value === persistedValue) {
      return;
    }

    const nextPerson = { ...person, [field]: value };
    const blockingIssues = checkVitalDateConsistency(nextPerson);

    if (blockingIssues.length > 0) {
      showToast.error(describeSmartCheckIssue(blockingIssues[0], language, person.firstName), {
        id: `smart-check:${blockingIssues[0].code}:${person.id}`,
      });
      if (field === 'birthDate') {
        setBirthDateDraft(person.birthDate);
      } else {
        setDeathDateDraft(person.deathDate);
      }
      return;
    }

    const result = await onUpdate(person.id, { [field]: value });
    if (result.success) {
      showToast.success('messages.success.personSaved', {
        id: `person-date-saved:${person.id}:${field}`,
      });
    }
  };

  return (
    <>
      {/* Birth Details */}
      <Card title={t.birthDetails} tone='flat'>
        <div className='space-y-2 mt-2 animate-in fade-in slide-in-from-top-1 duration-200'>
          <div className='flex items-center gap-2'>
            <label className='w-24 shrink-0 text-xs text-[var(--text-muted)] font-medium'>
              {t.birthDate}
            </label>
            <DateSelect
              value={birthDateDraft}
              onChange={setBirthDateDraft}
              onBlur={() => {
                void commitDateField('birthDate', birthDateDraft);
              }}
            />
          </div>
          <PlaceInput
            label={t.birthPlace}
            value={person.birthPlace}
            onCommit={(v: string) => handleChange('birthPlace', v)}
            labelWidthClass='w-24'
          />
          <div className='flex items-center gap-2'>
            <label className='w-24 shrink-0 text-xs text-[var(--text-muted)] font-medium'>
              {t.source}
            </label>
            <div className='flex-1 flex items-center gap-1.5'>
              <BookOpen className='w-3.5 h-3.5 text-[var(--text-dim)]' />
              <FormField
                label=''
                value={person.birthSource}
                onCommit={(v) => handleChange('birthSource', v as string)}
                placeholder={t.sourcePlaceholder}
                className='!h-7 !text-xs placeholder:italic'
                labelWidthClass='hidden'
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Death Details (Conditional) */}
      {person.isDeceased && (
        <Card title={t.deathDetails} tone='flat'>
          <button
            onClick={() => setShowDeathDetails(!showDeathDetails)}
            aria-label={showDeathDetails ? 'Hide death details' : 'Show death details'}
            className='w-full flex items-center justify-between text-xs font-medium text-[var(--text-muted)] hover:text-[var(--primary-600)] py-1 px-0.5 -mx-0.5 rounded-md transition-colors'
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${showDeathDetails ? 'rotate-180' : ''}`}
            />
          </button>
          {showDeathDetails && (
            <div className='space-y-2 mt-2 animate-in fade-in slide-in-from-top-1 duration-200'>
              <div className='flex items-center gap-2'>
                <label className='w-24 shrink-0 text-xs text-[var(--text-muted)] font-medium'>
                  {t.deathDate}
                </label>
                <DateSelect
                  value={deathDateDraft}
                  onChange={setDeathDateDraft}
                  onBlur={() => {
                    void commitDateField('deathDate', deathDateDraft);
                  }}
                />
              </div>
              <PlaceInput
                label={t.deathPlace}
                value={person.deathPlace}
                onCommit={(v: string) => handleChange('deathPlace', v)}
                labelWidthClass='w-24'
              />
              <div className='flex items-center gap-2'>
                <label className='w-24 shrink-0 text-xs text-[var(--text-muted)] font-medium'>
                  {t.source}
                </label>
                <div className='flex-1 flex items-center gap-1.5'>
                  <BookOpen className='w-3.5 h-3.5 text-[var(--text-dim)]' />
                  <FormField
                    label=''
                    value={person.deathSource}
                    onCommit={(v) => handleChange('deathSource', v as string)}
                    placeholder={t.sourcePlaceholder}
                    className='!h-7 !text-xs placeholder:italic'
                    labelWidthClass='hidden'
                  />
                </div>
              </div>
            </div>
          )}
        </Card>
      )}
    </>
  );
});
