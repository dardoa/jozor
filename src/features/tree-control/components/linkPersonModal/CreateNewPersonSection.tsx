import React, { memo } from 'react';
import { UserPlus } from 'lucide-react';
import { useTranslation } from '../../../../context/TranslationContext';
import { CreateNewPersonSectionProps } from '../../../../types';
import { showToast } from '../../../../utils/showToast';

export const CreateNewPersonSection: React.FC<CreateNewPersonSectionProps> = memo(
  ({ type, gender, familyActions, relatedPersonId, requiresRelatedPerson = false, onClose }) => {
    const { t } = useTranslation();



    const handleCreateNew = async () => {
      let result = null;

      if (type === 'parent' && gender) result = await familyActions.onAddParent(gender, relatedPersonId);
      else if (type === 'spouse' && gender) result = await familyActions.onAddSpouse(gender);
      else if (type === 'child' && gender) result = await familyActions.onAddChild(gender, relatedPersonId);

      if (result?.success) {
        showToast.success('messages.success.personAdded', {
          id: `family-action-create:${type ?? 'unknown'}:${gender ?? 'unknown'}`,
        });
        onClose();
      }
    };

    return (
      <div className='ds-panel-subtle relative space-y-3 p-4 pt-5'>
        <h3 className='absolute top-[-12px] start-3 z-10 bg-[var(--surface-app)] px-2 ds-label'>
          {t.createNewProfile}
        </h3>
        <button
          onClick={handleCreateNew}
          disabled={requiresRelatedPerson && !relatedPersonId}
          className='group flex w-full items-center gap-4 rounded-2xl bg-white/55 p-4 text-start transition-all duration-200 ease-in-out hover:bg-white disabled:cursor-not-allowed disabled:opacity-50'
        >
          <div className='flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-panel)] text-[var(--primary-600)] shadow-[var(--shadow-sm)] transition-transform group-hover:scale-110'>
            <UserPlus className='w-5 h-5' />
          </div>
          <div>
            <div className='font-semibold text-[var(--text-main)]'>{t.createNewProfile}</div>
          </div>
        </button>
      </div>
    );
  }
);
