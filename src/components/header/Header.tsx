import React from 'react';
import { HeaderRightSection } from './HeaderRightSection';
import { useTranslation } from '../../context/TranslationContext';

export const Header: React.FC = () => {
  const { themeLanguage, t } = useTranslation();

  // Dummy props for HeaderRightSection to allow compilation
  const dummyAuth = {
    user: { photoURL: 'https://via.placeholder.com/150', displayName: 'John Doe', email: 'john.doe@example.com' },
    isDemoMode: true,
    onLogin: () => console.log('Login'),
    onLogout: () => console.log('Logout'),
  };
  const dummyViewSettings = {
    treeSettings: {},
    setTreeSettings: () => console.log('Set tree settings'),
    onPresent: () => console.log('Present view settings'),
  };
  const dummyToolsActions = {
    onOpenModal: (modalType: string) => console.log(`Open modal: ${modalType}`),
  };
  const dummyExportActions = {
    handleExport: (format: string) => console.log(`Export format: ${format}`),
  };
  const dummySearchProps = {
    people: {
      '1': { id: '1', name: 'John Doe', gender: 'male', parents: [], spouses: [], children: [] },
      '2': { id: '2', name: 'Jane Smith', gender: 'female', parents: [], spouses: [], children: [] },
    },
    onFocusPerson: (id: string) => console.log(`Focus person: ${id}`),
  };

  return (
    <header className="flex items-center justify-between p-4 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800">
      <div className="text-lg font-bold text-stone-900 dark:text-stone-100">Jozor App</div>
      <HeaderRightSection
        themeLanguage={themeLanguage}
        auth={dummyAuth}
        viewSettings={dummyViewSettings}
        toolsActions={dummyToolsActions}
        exportActions={dummyExportActions}
        searchProps={dummySearchProps}
      />
    </header>
  );
};