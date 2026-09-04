import { memo, useState } from 'react';
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

interface DateDraftState {
  personId: string;
  sourceBirthDate: string;
  sourceDeathDate: string;
  birthDate: string;
  deathDate: string;
}

const createDateDraftState = (person: Person): DateDraftState => ({
  personId: person.id,
  sourceBirthDate: person.birthDate,
  sourceDeathDate: person.deathDate,
  birthDate: person.birthDate,
  deathDate: person.deathDate,
});

const isDateDraftCurrent = (draft: DateDraftState, person: Person): boolean => (
  draft.personId === person.id
  && draft.sourceBirthDate === person.birthDate
  && draft.sourceDeathDate === person.deathDate
);

export const PersonBirthDeathEdit = memo<PersonBirthDeathEditProps>(({ person, onUpdate }) => {
  const { t, language } = useTranslation();
  const [showDeathDetails, setShowDeathDetails] = useState(true);
  const [dateDraft, setDateDraft] = useState<DateDraftState>(() => createDateDraftState(person));
  const currentDateDraft = isDateDraftCurrent(dateDraft, person)
    ? dateDraft
    : createDateDraftState(person);
  const birthDateDraft = currentDateDraft.birthDate;
  const deathDateDraft = currentDateDraft.deathDate;

  const updateDateDraft = (field: 'birthDate' | 'deathDate', value: string) => {
    setDateDraft((previous) => {
      const current = isDateDraftCurrent(previous, person)
        ? previous
        : createDateDraftState(person);
      return { ...current, [field]: value };
    });
  };

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
        updateDateDraft('birthDate', person.birthDate);
      } else {
        updateDateDraft('deathDate', person.deathDate);
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
    <div
      data-smart-persona-field="vitalDates"
      tabIndex={-1}
      className="space-y-4 scroll-mt-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]/50"
    >
      {/* Birth Details */}
      <Card title={t.birthDetails} tone='flat'>
        <div className='space-y-2 mt-2 animate-in fade-in slide-in-from-top-1 duration-200'>
          <div
            data-smart-persona-field="birthDate"
            tabIndex={-1}
            className='flex scroll-mt-4 items-center gap-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]/50'
          >
            <label className='w-24 shrink-0 text-xs text-[var(--text-muted)] font-medium'>
              {t.birthDate}
            </label>
            <DateSelect
              value={birthDateDraft}
              onChange={(value) => updateDateDraft('birthDate', value)}
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
                focusTarget="birthSource"
                ariaLabel={t.birthSource}
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
            aria-label={showDeathDetails ? t.hideDeathDetails : t.showDeathDetails}
            className='w-full flex items-center justify-between text-xs font-medium text-[var(--text-muted)] hover:text-[var(--primary-600)] py-1 px-0.5 -mx-0.5 rounded-md transition-colors'
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform ${showDeathDetails ? 'rotate-180' : ''}`}
            />
          </button>
          {showDeathDetails && (
            <div className='space-y-2 mt-2 animate-in fade-in slide-in-from-top-1 duration-200'>
              <div
                data-smart-persona-field="deathDate"
                tabIndex={-1}
                className='flex scroll-mt-4 items-center gap-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]/50'
              >
                <label className='w-24 shrink-0 text-xs text-[var(--text-muted)] font-medium'>
                  {t.deathDate}
                </label>
                <DateSelect
                  value={deathDateDraft}
                  onChange={(value) => updateDateDraft('deathDate', value)}
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
                    focusTarget="deathSource"
                    ariaLabel={t.deathSource}
                  />
                </div>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
});
