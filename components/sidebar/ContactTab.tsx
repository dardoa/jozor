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
    <div className="bg-white dark:bg-stone-800 pt-5 p-3 rounded-xl border border-stone-200/50 dark:border-stone-700/50 shadow-sm space-y-2 relative"> {/* Reduced pt-6 p-4 to pt-5 p-3 and space-y-3 to space-y-2 */}
        <div className="absolute top-0 start-3 z-10 bg-white dark:bg-stone-800 px-2 flex justify-between items-center">
            <h3 className="text-[9px] font-bold text-stone-400 uppercase tracking-wider">{t.contact}</h3> {/* Reduced text-[10px] to text-[9px] */}
            {!isEditing && <span className="text-[9px] text-stone-400 ms-2">{t.readOnly}</span>} {/* Reduced text-[10px] to text-[9px] */}
        </div>
        
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