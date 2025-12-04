import React, { memo, useState } from 'react';
import { Person } from '../../types';
import { DateSelect } from '../DateSelect';
import { FormField } from '../ui/FormField';
import { Card } from '../ui/Card';
import { BookOpen, ChevronDown } from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext'; // Import useTranslation

interface PersonBirthDeathEditProps {
  person: Person;
  onUpdate: (id: string, updates: Partial<Person>) => void;
  // Removed t: any;
}

export const PersonBirthDeathEdit: React.FC<PersonBirthDeathEditProps> = memo(({ person, onUpdate }) => {
  const { t } = useTranslation(); // Use useTranslation hook directly
  const [showDeathDetails, setShowDeathDetails] = useState(true);

  const handleChange = (field: keyof Person, value: any) => {
    onUpdate(person.id, { [field]: value });
  };

  return (
    <>
      {/* Birth Details */}
      <Card title={t.birthDetails}>
        <div className="space-y-2 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-center gap-2">
            <label className="w-24 shrink-0 text-xs text-stone-600 dark:text-stone-400 font-medium">{t.birthDate}</label>
            <DateSelect value={person.birthDate} onChange={(val) => handleChange('birthDate', val)} />
          </div>
          <FormField label={t.birthPlace} value={person.birthPlace} onCommit={(v) => handleChange('birthPlace', v)} labelWidthClass="w-24" />
          <div className="flex items-center gap-2">
            <label className="w-24 shrink-0 text-xs text-stone-600 dark:text-stone-400 font-medium">{t.source}</label>
            <div className="flex-1 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-stone-400" />
              <FormField
                label=""
                value={person.birthSource}
                onCommit={(v) => handleChange('birthSource', v)}
                placeholder={t.sourcePlaceholder}
                className="!h-7 !text-xs placeholder:italic"
                labelWidthClass="hidden"
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
            className="w-full flex items-center justify-between text-xs font-medium text-stone-600 dark:text-stone-400 hover:text-teal-600 dark:hover:text-teal-400 py-1 px-0.5 -mx-0.5 rounded-md transition-colors"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDeathDetails ? 'rotate-180' : ''}`} />
          </button>
          {showDeathDetails && (
            <div className="space-y-2 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="flex items-center gap-2">
                <label className="w-24 shrink-0 text-xs text-stone-600 dark:text-stone-400 font-medium">{t.deathDate}</label>
                <DateSelect value={person.deathDate} onChange={(val) => handleChange('deathDate', val)} />
              </div>
              <FormField label={t.deathPlace} value={person.deathPlace} onCommit={(v) => handleChange('deathPlace', v)} labelWidthClass="w-24" />
              <div className="flex items-center gap-2">
                <label className="w-24 shrink-0 text-xs text-stone-600 dark:text-stone-400 font-medium">{t.source}</label>
                <div className="flex-1 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-stone-400" />
                  <FormField
                    label=""
                    value={person.deathSource}
                    onCommit={(v) => handleChange('deathSource', v)}
                    placeholder={t.sourcePlaceholder}
                    className="!h-7 !text-xs placeholder:italic"
                    labelWidthClass="hidden"
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