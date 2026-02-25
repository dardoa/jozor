import { memo, useState } from 'react';
import { Person } from '../../types';
import { DateSelect } from '../DateSelect';
import { FormField } from '../ui/FormField';
import { Card } from '../ui/Card';
import { BookOpen, ChevronDown } from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';

interface PersonBirthDeathEditProps {
  person: Person;
  onUpdate: (id: string, updates: Partial<Person>) => void;
}

export const PersonBirthDeathEdit = memo<PersonBirthDeathEditProps>(({ person, onUpdate }) => {
  const { t } = useTranslation();
  const [showDeathDetails, setShowDeathDetails] = useState(true);

  const handleChange = (field: keyof Person, value: any) => {
    onUpdate(person.id, { [field]: value });
  };

  return (
    <>
      {/* Birth Details */}
      <Card title={t.birthDetails}>
        <div className='space-y-2 mt-2 animate-in fade-in slide-in-from-top-1 duration-200'>
          <div className='flex items-center gap-2'>
            <label className='w-24 shrink-0 text-xs text-[var(--text-muted)] font-medium'>
              {t.birthDate}
            </label>
            <DateSelect
              value={person.birthDate}
              onChange={(val: string) => handleChange('birthDate', val)}
            />
          </div>
          <FormField
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
                onCommit={(v: string) => handleChange('birthSource', v)}
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
        <Card title={t.deathDetails}>
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
                  value={person.deathDate}
                  onChange={(val: string) => handleChange('deathDate', val)}
                />
              </div>
              <FormField
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
                    onCommit={(v: string) => handleChange('deathSource', v)}
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
