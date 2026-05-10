import React from 'react';
import { useTranslation } from '../../context/TranslationContext';

interface SyncStatusRibbonProps {
  isSyncing: boolean;
  isDemoMode: boolean;
}

export const SyncStatusRibbon: React.FC<SyncStatusRibbonProps> = ({ isSyncing, isDemoMode }) => {
  const { t } = useTranslation();

  if (!isSyncing) return null;

  return (
    <div
      className={`absolute top-16 start-1/2 -translate-x-1/2 z-50 text-white text-xs px-3 py-1 rounded-b-lg shadow-lg flex items-center gap-2 ${isDemoMode ? 'bg-orange-500' : 'bg-[var(--primary-600)] animate-pulse'}`}
    >
      {isDemoMode ? t.syncStatus.savingLocally : t.syncStatus.syncing}
    </div>
  );
};
