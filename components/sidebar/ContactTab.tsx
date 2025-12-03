import React, { memo } from 'react';
import { Person } from '../../types';
import { FormField } from '../ui/FormField';

interface ContactTabProps {
  person: Person;
  isEditing: boolean;
  onUpdate: (id: string, updates: Partial<Person>) => void;
  t: any;
}

export const ContactTab: React.FC<ContactTabProps> = memo(({ person, isEditing, onUpdate, t }) => {
  const handleChange = (field: keyof Person, value: any) => {
    onUpdate(person.id, { [field]: value });
  };

  return (
    <div className="bg-white dark:bg-stone-800 pt-5 p-3 rounded-xl border border-stone-200/50 dark:border-stone-700/50 shadow-sm space-y-2 relative">
        <h3 className="mb-3 ps-3 border-s-4 border-teal-500 text-sm font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">{t.contact}</h3>
        
        <FormField
            label={t.email}
            value={person.email}
            onCommit={(v) => handleChange('email', v)}
            disabled={!isEditing}
            type="email"
            labelWidthClass="w-16" /* Reduced w-20 to w-16 */
        />

        <FormField
            label={t.website}
            value={person.website}
            onCommit={(v) => handleChange('website', v)}
            disabled={!isEditing}
            type="url"
            labelWidthClass="w-16" /* Reduced w-20 to w-16 */
        />

        <FormField
            label={t.blog}
            value={person.blog}
            onCommit={(v) => handleChange('blog', v)}
            disabled={!isEditing}
            type="url"
            labelWidthClass="w-16" /* Reduced w-20 to w-16 */
        />

        <FormField
            label={t.address}
            value={person.address}
            onCommit={(v) => handleChange('address', v)}
            disabled={!isEditing}
            isTextArea={true}
            rows={2} /* Reduced rows from 3 to 2 */
            labelWidthClass="w-16" /* Reduced w-20 to w-16 */
        />
    </div>
  );
});