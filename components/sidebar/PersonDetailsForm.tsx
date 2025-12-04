import React, { memo } from 'react';
import { Person } from '../../types';
import { useTranslation } from '../../context/TranslationContext';

interface PersonDetailsFormProps {
  person: Person;
  people: Record<string, Person>;
  isEditing: boolean;
  onUpdate: (id: string, updates: Partial<Person>) => void;
  onSelect: (id: string) => void;
}

export const PersonDetailsForm: React.FC<PersonDetailsFormProps> = memo(({
  person,
  people,
  isEditing,
  onUpdate,
  onSelect,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100">{t.details}</h3>
      <p className="text-sm text-stone-500 dark:text-stone-400">
        {isEditing ? t.editDetailsPrompt : t.viewDetailsPrompt}
      </p>
      {/* Placeholder for actual form fields */}
      <div className="p-4 border border-stone-200 dark:border-stone-700 rounded-lg bg-stone-50 dark:bg-stone-800">
        <p className="text-stone-700 dark:text-stone-300">{t.firstName}: {person.firstName || t.unknown}</p>
        <p className="text-stone-700 dark:text-stone-300">{t.lastName}: {person.lastName || t.unknown}</p>
        <p className="text-stone-700 dark:text-stone-300">{t.birthDate}: {person.birthDate || t.unknown}</p>
        {/* More details can be added here */}
      </div>
    </div>
  );
});