import React from 'react';
import { useTranslation } from '../../context/TranslationContext';

interface ToolsMenuProps {
  onOpenModal: (modalType: string) => void;
}

export const ToolsMenu: React.FC<ToolsMenuProps> = ({ onOpenModal }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col">
      <button onClick={() => onOpenModal('import')} className="block px-4 py-2 text-sm text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700">
        {t.importTree}
      </button>
      <button onClick={() => onOpenModal('settings')} className="block px-4 py-2 text-sm text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700">
        {t.settings}
      </button>
    </div>
  );
};