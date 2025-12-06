import React from 'react';
import { useTranslation } from '../../context/TranslationContext';

interface UserMenuProps {
  user: { displayName: string; email: string; photoURL: string; }; // Placeholder for actual user type
  isDemoMode: boolean;
  onLogout: () => void;
}

export const UserMenu: React.FC<UserMenuProps> = ({ user, isDemoMode, onLogout }) => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col">
      <div className="px-4 py-2 text-sm text-stone-700 dark:text-stone-200 border-b border-stone-100 dark:border-stone-700">
        <p className="font-medium">{user.displayName}</p>
        <p className="text-stone-500 dark:text-stone-400 text-xs">{user.email}</p>
      </div>
      {isDemoMode && (
        <div className="px-4 py-2 text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20">
          {t.demoModeActive}
        </div>
      )}
      <button onClick={onLogout} className="block px-4 py-2 text-sm text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700">
        {t.logout}
      </button>
    </div>
  );
};