import React from 'react';
import { Person } from '../../types';
import { SmartInput, SmartTextarea } from '../ui/SmartInput';

interface ContactTabProps {
  person: Person;
  isEditing: boolean;
  onUpdate: (id: string, updates: Partial<Person>) => void;
  inputClass: string;
  t: any;
}

export const ContactTab: React.FC<ContactTabProps> = ({ person, isEditing, onUpdate, inputClass, t }) => {
  const handleChange = (field: keyof Person, value: any) => {
    onUpdate(person.id, { [field]: value });
  };

  const textareaClass = `flex-1 px-1.5 py-1 border border-gray-300 dark:border-gray-600 rounded text-[10px] focus:border-blue-500 outline-none resize-none transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:bg-transparent disabled:border-transparent disabled:px-0 disabled:cursor-default disabled:font-medium disabled:text-gray-800 dark:disabled:text-gray-200`;

  return (
    <div className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 shadow-sm space-y-1">
        <div className="flex justify-between items-center mb-1">
            <h3 className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{t.contact}</h3>
            {!isEditing && <span className="text-[9px] text-gray-400">{t.readOnly}</span>}
        </div>
        
        <div className="flex items-center gap-1.5">
            <label className="w-16 text-[10px] text-gray-600 dark:text-gray-400 font-medium">{t.email}</label>
            <SmartInput disabled={!isEditing} type="email" value={person.email} onCommit={(v) => handleChange('email', v)} className={inputClass} />
        </div>

        <div className="flex items-center gap-1.5">
            <label className="w-16 text-[10px] text-gray-600 dark:text-gray-400 font-medium">{t.website}</label>
            <SmartInput disabled={!isEditing} type="text" value={person.website} onCommit={(v) => handleChange('website', v)} className={inputClass} />
        </div>

        <div className="flex items-center gap-1.5">
            <label className="w-16 text-[10px] text-gray-600 dark:text-gray-400 font-medium">{t.blog}</label>
            <SmartInput disabled={!isEditing} type="text" value={person.blog} onCommit={(v) => handleChange('blog', v)} className={inputClass} />
        </div>

        <div className="flex items-start gap-1.5">
            <label className="w-16 text-[10px] text-gray-600 dark:text-gray-400 font-medium mt-1">{t.address}</label>
            <SmartTextarea disabled={!isEditing} rows={3} value={person.address} onCommit={(v) => handleChange('address', v)} className={textareaClass} />
        </div>
    </div>
  );
};