import React, { memo } from 'react';
import { Person } from '../../types';
import { Card } from '../ui/Card';
import { Ribbon } from 'lucide-react';

interface PersonStatusEditProps {
  person: Person;
  onUpdate: (id: string, updates: Partial<Person>) => void;
  t: any;
}

export const PersonStatusEdit: React.FC<PersonStatusEditProps> = memo(({ person, onUpdate, t }) => {
  const handleChange = (field: keyof Person, value: any) => {
    onUpdate(person.id, { [field]: value });
  };

  return (
    <Card title={t.status}>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer group">
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${person.gender === 'male' ? 'border-blue-500 bg-blue-500' : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700'}`}>
              {person.gender === 'male' && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
            </div>
            <input type="radio" name="gender" value="male" checked={person.gender === 'male'} onChange={() => handleChange('gender', 'male')} className="hidden" />
            <span className="text-sm font-medium text-stone-700 dark:text-stone-300 group-hover:text-blue-600 transition-colors">{t.male}</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer group">
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${person.gender === 'female' ? 'border-pink-500 bg-pink-500' : 'border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700'}`}>
              {person.gender === 'female' && <div className="w-1.5 h-1.5 bg-white rounded-full"></div>}
            </div>
            <input type="radio" name="gender" value="female" checked={person.gender === 'female'} onChange={() => handleChange('gender', 'female')} className="hidden" />
            <span className="text-sm font-medium text-stone-700 dark:text-stone-300 group-hover:text-pink-600 transition-colors">{t.female}</span>
          </label>
        </div>
        <div className="h-6 w-px bg-stone-300 dark:bg-stone-600 mx-2"></div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={!person.isDeceased} onChange={(e) => handleChange('isDeceased', !e.target.checked)} className="w-3.5 h-3.5 rounded text-emerald-600 focus:ring-0 cursor-pointer border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-700" />
          <span className="text-sm font-medium text-stone-700 dark:text-stone-300">{person.isDeceased ? t.deceased : t.living}</span>
        </label>
      </div>
    </Card>
  );
});