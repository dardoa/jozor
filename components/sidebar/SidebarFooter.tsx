import { memo } from 'react';
import { Person } from '../../types';
import { Trash2, Check, Edit2, Eraser } from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';
import { showSuccess } from '../../utils/toast'; // Import toast utilities

interface SidebarFooterProps {
  person: Person;
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;
  onDelete: (id: string) => void;
  onOpenCleanTreeOptions: () => void;
  canEdit: boolean;
  isOwner: boolean;
}

export const SidebarFooter = memo<SidebarFooterProps>(
  ({ person, isEditing, setIsEditing, onDelete, onOpenCleanTreeOptions, canEdit, isOwner }) => {
    const { t } = useTranslation();

    const handleDelete = () => {
      if (window.confirm(t.personDeleteConfirm)) {
        onDelete(person.id);
        showSuccess('Person deleted successfully!'); // Toast success
      }
    };

    const handleCleanTree = () => {
      onOpenCleanTreeOptions();
    };

    return (
      <div className='bg-[var(--theme-bg)] border-t border-[var(--border-main)] flex items-center justify-between shadow-sm relative z-10 p-3'>
        {/* Group for Delete Person and Clean Tree Buttons */}
        <div className='flex items-center gap-2'>
          {/* Delete Person Button */}
          <button
            type='button'
            onClick={handleDelete}
            className='w-10 h-10 flex items-center justify-center rounded-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30 disabled:grayscale transition-colors active:scale-95'
            title={t.deletePerson}
            aria-label={t.deletePerson}
            disabled={!isOwner}
          >
            <Trash2 className='w-5 h-5' />
          </button>

          {/* Clean Tree Button */}
          <button
            type='button'
            onClick={handleCleanTree}
            className='w-10 h-10 flex items-center justify-center rounded-full text-[var(--text-muted)] hover:text-[var(--primary-600)] hover:bg-[var(--primary-600)]/10 disabled:opacity-30 transition-colors active:scale-95'
            title={t.cleanTree}
            aria-label={t.cleanTree}
            disabled={!isOwner}
          >
            <Eraser className='w-5 h-5' />
          </button>
        </div>

        {/* Edit / Save Buttons */}
        {isEditing ? (
          <button
            type='button'
            onClick={() => {
              setIsEditing(false);
              showSuccess('Changes saved successfully!'); // Toast success
            }}
            className='w-10 h-10 flex items-center justify-center bg-[var(--primary-600)] text-[var(--primary-text)] rounded-full shadow-md hover:bg-[var(--primary-700)] transition-colors active:scale-95'
            title={t.saveChanges}
            aria-label={t.saveChanges}
          >
            <Check className='w-5 h-5 stroke-[3]' />
          </button>
        ) : (
          <button
            type='button'
            onClick={() => setIsEditing(true)}
            disabled={!canEdit}
            className='w-10 h-10 flex items-center justify-center bg-[var(--theme-bg)] border border-[var(--border-main)] text-[var(--text-main)] rounded-full shadow-sm hover:border-[var(--primary-600)] hover:text-[var(--primary-600)] disabled:opacity-30 transition-colors active:scale-95'
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
