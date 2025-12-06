import React, { memo } from 'react';
import { Person } from '../../types';
import { FormField } from '../ui/FormField';
import { Info } from 'lucide-react';
import { Card } from '../ui/Card';
import { useTranslation } from '../../context/TranslationContext';

interface ContactTabProps {
  person: Person;
  isEditing: boolean;
  onUpdate: (id: string, updates: Partial<Person>) => void;
}

export const ContactTab: React.FC<ContactTabProps> = memo(({ person, isEditing, onUpdate }) => {
  const { t } = useTranslation();
  const handleChange = (field: keyof Person, value: any) => {
    onUpdate(person.id, { [field]: value });
  };

  const hasContactInfo = person.email || person.website || person.blog || person.address;

  return (
    <Card title={t.contact}>
        {(!hasContactInfo && !isEditing) ? (
            <div className="text-center py-4 text-stone-400 dark:text-stone-500 bg-stone-50 dark:bg-stone-800/50 rounded-xl border border-dashed border-stone-200 dark:border-stone-700 flex flex-col items-center">
                <Info className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-sm">{t.noContactInfo}</span>
            </div>
        ) : (
            <>
                <FormField
                    label={t.email}
                    value={person.email}
                    onCommit={(v) => handleChange('email', v)}
                    disabled={!isEditing}
                    type="email"
                    labelWidthClass="w-24"
                />

                <FormField
                    label={t.website}
                    value={person.website}
                    onCommit={(v) => handleChange('website', v)}
                    disabled={!isEditing}
                    type="url"
                    labelWidthClass="w-24"
                />

                <FormField
                    label={t.blog}
                    value={person.blog}
                    onCommit={(v) => handleChange('blog', v)}
                    disabled={!isEditing}
                    type="url"
                    labelWidthClass="w-24"
                />

                <FormField
                    label={t.address}
                    value={person.address}
                    onCommit={(v) => handleChange('address', v)}
                    disabled={!isEditing}
                    isTextArea={true}
                    rows={2}
                    labelWidthClass="w-24"
                />
            </>
        )}
    </Card>
  );
});