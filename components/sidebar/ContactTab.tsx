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
    <div className="bg-white dark:bg-stone-800 p-4 rounded-xl border border-stone-200/50 dark:border-stone-700/50 shadow-sm space-y-3">
        <div className="flex justify-between items-center mb-1">
            <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{t.contact}</h3>
            {!isEditing && <span className="text-[10px] text-stone-400">{t.readOnly}</span>}
        </div>
        
        <FormField
            label={t.email}
            value={person.email}
            onCommit={(v) => handleChange('email', v)}
            disabled={!isEditing}
            type="email"
            labelWidthClass="w-20"
        />

        <FormField
            label={t.website}
            value={person.website}
            onCommit={(v) => handleChange('website', v)}
            disabled={!isEditing}
            type="url"
            labelWidthClass="w-20"
        />

        <FormField
            label={t.blog}
            value={person.blog}
            onCommit={(v) => handleChange('blog', v)}
            disabled={!isEditing}
            type="url"
            labelWidthClass="w-20"
        />

        <FormField
            label={t.address}
            value={person.address}
            onCommit={(v) => handleChange('address', v)}
            disabled={!isEditing}
            isTextArea={true}
            rows={3}
            labelWidthClass="w-20"
        />
    </div>
  );
});