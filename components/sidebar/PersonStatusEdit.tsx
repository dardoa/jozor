import { memo } from 'react';
import { Person } from '../../types';
import { Card } from '../ui/Card';
import { useTranslation } from '../../context/TranslationContext';

interface PersonStatusEditProps {
  person: Person;
  onUpdate: (id: string, updates: Partial<Person>) => void;
}

export const PersonStatusEdit = memo<PersonStatusEditProps>(({ person, onUpdate }) => {
  const { t } = useTranslation();
  const handleChange = (field: keyof Person, value: any) => {
    onUpdate(person.id, { [field]: value });
  };

  return (
    <Card title={t.status}>
      <div className='flex items-center gap-3'>
        <div className='flex items-center gap-2'>
          <label className='flex items-center gap-1.5 cursor-pointer group'>
            <div
              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${person.gender === 'male' ? 'border-[var(--gender-male-text)] bg-[var(--gender-male-text)]' : 'border-[var(--border-main)] bg-[var(--card-bg)]'}`}
            >
              {person.gender === 'male' && (
                <div className='w-1.5 h-1.5 bg-white rounded-full'></div>
              )}
            </div>
            <input
              type='radio'
              name='gender'
              value='male'
              checked={person.gender === 'male'}
              onChange={() => handleChange('gender', 'male')}
              className='hidden'
            />
            <span className='text-sm font-medium text-[var(--text-main)] group-hover:text-[var(--gender-male-text)] transition-colors'>
              {t.male}
            </span>
          </label>
          <label className='flex items-center gap-1.5 cursor-pointer group'>
            <div
              className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${person.gender === 'female' ? 'border-[var(--gender-female-text)] bg-[var(--gender-female-text)]' : 'border-[var(--border-main)] bg-[var(--card-bg)]'}`}
            >
              {person.gender === 'female' && (
                <div className='w-1.5 h-1.5 bg-white rounded-full'></div>
              )}
            </div>
            <input
              type='radio'
              name='gender'
              value='female'
              checked={person.gender === 'female'}
              onChange={() => handleChange('gender', 'female')}
              className='hidden'
            />
            <span className='text-sm font-medium text-[var(--text-main)] group-hover:text-[var(--gender-female-text)] transition-colors'>
              {t.female}
            </span>
          </label>
        </div>
        <div className='h-6 w-px bg-[var(--border-main)] mx-2'></div>
        <div id="privacy-toggle-item" className="flex items-center gap-2">
          <label className='flex items-center gap-2 cursor-pointer'>
            <input
              type='checkbox'
              checked={!person.isDeceased}
              onChange={(e) => handleChange('isDeceased', !e.target.checked)}
              className='w-3.5 h-3.5 rounded text-[var(--primary-600)] focus:ring-0 cursor-pointer border-[var(--border-main)] bg-[var(--card-bg)]'
            />
            <span className='text-sm font-medium text-[var(--text-main)]'>
              {person.isDeceased ? t.deceased : t.living}
            </span>
          </label>
          <div className='h-4 w-px bg-[var(--border-main)] mx-1'></div>
          <label className='flex items-center gap-2 cursor-pointer group'>
            <input
              type='checkbox'
              checked={person.isPrivate}
              onChange={(e) => handleChange('isPrivate', e.target.checked)}
              className='w-3.5 h-3.5 rounded text-amber-500 focus:ring-0 cursor-pointer border-[var(--border-main)] bg-[var(--card-bg)] transition-colors'
            />
            <span className='text-sm font-medium text-[var(--text-main)] group-hover:text-amber-500 transition-colors'>
              {t.private || 'Private'}
            </span>
          </label>
        </div>
      </div>
    </Card>
  );
});
