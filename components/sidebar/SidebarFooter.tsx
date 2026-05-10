import { memo } from 'react';
import { Person } from '../../types';
import { Trash2, Check, Edit2 } from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';

interface SidebarFooterProps {
  person: Person;
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;
  onDelete: (id: string) => void;
  canEdit: boolean;
  isOwner: boolean;
}

export const SidebarFooter = memo<SidebarFooterProps>(
  ({ person, isEditing, setIsEditing, onDelete, canEdit, isOwner }) => {
    const { t } = useTranslation();
    const iconButtonClass =
      'flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-soft)] shadow-[var(--shadow-sm)] transition-all active:scale-95 disabled:opacity-30';

    const handleDelete = () => {
      onDelete(person.id);
    };

    return (
      <div className='ds-sidebar-footer flex items-center justify-between relative z-10 p-3'>
        {/* Group for person-scoped destructive action */}
        <div className='flex items-center gap-2 ds-toolbar-group'>
          <button
            type='button'
            onClick={handleDelete}
            className={`${iconButtonClass} bg-[var(--surface-panel)] text-[var(--danger-600)] hover:border-[var(--danger-500)]/20 hover:bg-[color:rgba(179,92,75,0.12)] disabled:grayscale`}
            title={isOwner ? t.deletePerson : t.readOnly}
            aria-label={isOwner ? t.deletePerson : t.readOnly}
            disabled={!isOwner}
          >
            <Trash2 className='w-5 h-5' />
          </button>
        </div>

        {!canEdit && (
          <div
            role='status'
            className='rounded-full border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-muted)] shadow-[var(--shadow-sm)]'
          >
            {t.readOnly}
          </div>
        )}

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
            disabled={!canEdit}
            className={`${iconButtonClass} bg-[var(--surface-panel)] text-[var(--text-main)] hover:border-[var(--primary-600)] hover:text-[var(--primary-600)]`}
            title={canEdit ? t.editDetails : t.readOnly}
            aria-label={canEdit ? t.editDetails : t.readOnly}
          >
            <Edit2 className='w-5 h-5' />
          </button>
        )}
      </div>
    );
  }
);

