import React from 'react';
import { useTranslation } from '../../context/TranslationContext';

interface ExportMenuProps {
  onExport: (format: string) => void;
}

export const ExportMenu: React.FC<ExportMenuProps> = ({ onExport }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col">
      <button onClick={() => onExport('gedcom')} className="block px-4 py-2 text-sm text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700">
        {t.exportGedcom}
      </button>
      <button onClick={() => onExport('jozor')} className="block px-4 py-2 text-sm text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700">
        {t.exportJozor}
      </button>
    </div>
  );
};