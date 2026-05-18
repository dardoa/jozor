import { memo } from 'react';
import { Person } from '../../../../types';
import { FormField } from '../../../../components/ui/FormField';
import { Info } from 'lucide-react';
import { Card } from '../../../../components/ui/Card';
import { useTranslation } from '../../../../context/TranslationContext';

interface ContactTabProps {
  person: Person;
  isEditing: boolean;
  onUpdate: (id: string, updates: Partial<Person>) => void;
}

export const ContactTab = memo<ContactTabProps>(({ person, isEditing, onUpdate }) => {
  const { t } = useTranslation();
  const handleChange = (field: keyof Person, value: Person[keyof Person]) => {
    onUpdate(person.id, { [field]: value });
  };

  const hasContactInfo = person.email || person.website || person.blog || person.address;

  return (
    <Card title={t.contact} tone='flat'>
      {!hasContactInfo && !isEditing ? (
        <div className='ds-empty-state text-center py-4 text-[var(--text-muted)] flex flex-col items-center'>
          <Info className='w-8 h-8 mb-2 opacity-50' />
          <span className='text-sm'>{t.noContactInfo}</span>
        </div>
      ) : (
        <>
          <FormField
            label={t.email}
            value={person.email}
            onCommit={(v) => handleChange('email', v as string)}
            disabled={!isEditing}
            type='email'
            labelWidthClass='w-24'
          />

          <FormField
            label={t.website}
            value={person.website}
            onCommit={(v) => handleChange('website', v as string)}
            disabled={!isEditing}
            type='url'
            labelWidthClass='w-24'
          />

          <FormField
            label={t.blog}
            value={person.blog}
            onCommit={(v) => handleChange('blog', v as string)}
            disabled={!isEditing}
            type='url'
            labelWidthClass='w-24'
          />

          <FormField
            label={t.address}
            value={person.address}
            onCommit={(v) => handleChange('address', v as string)}
            disabled={!isEditing}
            isTextArea={true}
            rows={2}
            labelWidthClass='w-24'
          />
        </>
      )}
    </Card>
  );
});
