import { memo } from 'react';
import { Person } from '../../../../types';
import { Trash2, Check, Edit2 } from 'lucide-react';
import { useTranslation } from '../../../../context/TranslationContext';

interface PersonaFooterProps {
  person: Person;
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;
  onDelete: (id: string) => void;
  canEdit: boolean;
}

export const PersonaFooter = memo<PersonaFooterProps>(
  ({ person, isEditing, setIsEditing, onDelete, canEdit }) => {
    const { t } = useTranslation();
    if (!canEdit) return null;

    const iconButtonClass =
      'flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-soft)] shadow-[var(--shadow-sm)] transition-all active:scale-95 disabled:opacity-30';

    const handleDelete = () => {
      onDelete(person.id);
    };

    return (
      <div className='ds-persona-footer flex items-center justify-between relative z-10 p-3'>
        {/* Group for person-scoped destructive action */}
        <div className='flex items-center gap-2 ds-toolbar-group'>
          <button
            type='button'
            onClick={handleDelete}
            className={`${iconButtonClass} bg-[var(--surface-panel)] text-[var(--danger-600)] hover:border-[var(--danger-500)]/20 hover:bg-[color:rgba(179,92,75,0.12)] disabled:grayscale`}
            title={t.deletePerson}
            aria-label={t.deletePerson}
          >
            <Trash2 className='w-5 h-5' />
          </button>
        </div>

        {/* Edit / Done Buttons */}
        {isEditing ? (
          <button
            type='button'
            onClick={() => setIsEditing(false)}
            className={`${iconButtonClass} border-transparent bg-brand-600 text-white hover:bg-brand-700 shadow-md`}
            title={t.doneTooltip}
            aria-label={t.doneTooltip}
          >
            <Check className='w-5 h-5 stroke-[3]' />
          </button>
        ) : (
          <button
            type='button'
            onClick={() => setIsEditing(true)}
            className={`${iconButtonClass} bg-[var(--surface-panel)] text-[var(--text-main)] hover:border-[var(--primary-600)] hover:text-[var(--primary-600)]`}
            title={t.editDetails}
            aria-label={t.editDetails}
          >
            <Edit2 className='w-5 h-5' />
          </button>
        )}
      </div>
    );
  }
);

