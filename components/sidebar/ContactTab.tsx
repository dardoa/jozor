import React from 'react';
import { Person } from '../../types';
import { FormField } from '../ui/FormField'; // New import

interface ContactTabProps {
  person: Person;
  isEditing: boolean;
  onUpdate: (id: string, updates: Partial<Person>) => void;
  t: any;
}

export const ContactTab: React.FC<ContactTabProps> = ({ person, isEditing, onUpdate, t }) => {
  const handleChange = (field: keyof Person, value: any) => {
    onUpdate(person.id, { [field]: value });
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 shadow-sm space-y-1">
        <div className="flex justify-between items-center mb-1">
            <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{t.contact}</h3>
            {!isEditing && <span className="text-[9px] text-gray-400">{t.readOnly}</span>}
        </div>
        
        <FormField
            label={t.email}
            value={person.email}
            onCommit={(v) => handleChange('email', v)}
            disabled={!isEditing}
            type="email"
        />

        <FormField
            label={t.website}
            value={person.website}
            onCommit={(v) => handleChange('website', v)}
            disabled={!isEditing}
            type="url"
        />

        <FormField
            label={t.blog}
            value={person.blog}
            onCommit={(v) => handleChange('blog', v)}
            disabled={!isEditing}
            type="url"
        />

        <FormField
            label={t.address}
            value={person.address}
            onCommit={(v) => handleChange('address', v)}
            disabled={!isEditing}
            isTextArea={true}
            rows={3}
        />
    </div>
  );
};