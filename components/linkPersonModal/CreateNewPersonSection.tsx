import React, { memo } from 'react';
import { UserPlus } from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';
import { CreateNewPersonSectionProps } from '../../types';

export const CreateNewPersonSection: React.FC<CreateNewPersonSectionProps> = memo(({
  type,
  gender,
  familyActions,
  onClose,
}) => {
  const { t } = useTranslation();

  const handleCreateNew = () => {
    if (type === 'parent' && gender) familyActions.onAddParent(gender);
    else if (type === 'spouse' && gender) familyActions.onAddSpouse(gender);
    else if (type === 'child' && gender) familyActions.onAddChild(gender);
    onClose();
  };

  return (
    <div className="bg-white dark:bg-stone-800 pt-5 p-3 rounded-xl border border-stone-200 dark:border-stone-700 shadow-sm space-y-2 relative">
      <h3 className="absolute top-[-12px] start-3 z-10 bg-white dark:bg-stone-800 px-2 text-[9px] font-bold text-stone-400 uppercase tracking-wider">{t.createNewProfile}</h3>
      <button
        onClick={handleCreateNew}
        className="w-full flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:border-blue-200 dark:hover:border-blue-700 transition-all group text-start"
      >
        <div className="w-10 h-10 bg-white dark:bg-blue-800 rounded-full flex items-center justify-center shadow-sm text-blue-600 dark:text-blue-200 group-hover:scale-110 transition-transform">
          <UserPlus className="w-5 h-5" />
        </div>
        <div>
          <div className="font-bold text-blue-900 dark:text-blue-200">{t.createNewProfile}</div>
          <div className="text-sm text-blue-600/80 dark:text-blue-300/80">{t.startBlank}</div>
        </div>
      </button>
    </div>
  );
});