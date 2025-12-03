import React, { memo } from 'react';
import { Person, Language, TreeSettings, UserProfile } from '../types';
import { getTranslation } from '../utils/translations';
// Removed lucide-react imports as they are now handled by sub-components

// Import sub-components
import { HeaderLeftSection } from './header/HeaderLeftSection';
import { HeaderRightSection } from './header/HeaderRightSection';

// New interfaces for grouped props
interface HistoryControlsProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

interface ThemeLanguageProps {
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  language: Language;
  setLanguage: (l: Language) => void;
}

interface AuthProps {
  user: UserProfile | null;
  isDemoMode: boolean;
  onLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
}

interface ViewSettingsProps {
  treeSettings: TreeSettings;
  setTreeSettings: (s: TreeSettings) => void;
  onPresent: () => void;
}

interface ToolsActionsProps {
  onOpenModal: (modalType: 'calculator' | 'stats' | 'chat' | 'consistency' | 'timeline' | 'share' | 'story' | 'map') => void;
}

interface ExportActionsProps {
  handleExport: (type: 'jozor' | 'json' | 'gedcom' | 'ics' | 'print') => Promise<void>;
}

// Update HeaderLeftSectionProps
interface HeaderLeftSectionProps {
  language: Language; // Still needed for dir attribute
  t: any;
  toggleSidebar: () => void;
  historyControls: HistoryControlsProps;
}

// Update HeaderRightSectionProps
interface HeaderRightSectionProps {
  people: Record<string, Person>;
  onFocusPerson: (id: string) => void;
  t: any;
  themeLanguage: ThemeLanguageProps;
  auth: AuthProps;
  viewSettings: ViewSettingsProps;
  toolsActions: ToolsActionsProps;
  exportActions: ExportActionsProps;
}

// Update HeaderProps
interface HeaderProps {
  people: Record<string, Person>; // Still needed for search
  onFocusPerson: (id: string) => void; // Still needed for search
  t: any; // Translations
  toggleSidebar: () => void;
  
  historyControls: HistoryControlsProps;
  themeLanguage: ThemeLanguageProps;
  auth: AuthProps;
  viewSettings: ViewSettingsProps;
  toolsActions: ToolsActionsProps;
  exportActions: ExportActionsProps;
}

export const Header: React.FC<HeaderProps> = memo(({
  people, onFocusPerson, t, toggleSidebar,
  historyControls, themeLanguage, auth, viewSettings, toolsActions, exportActions
}) => {
  return (
      <header className="h-16 bg-white/80 dark:bg-stone-950/80 backdrop-blur-md flex items-center px-4 md:px-6 justify-between border-b border-stone-200/50 dark:border-stone-800/50 z-30 print:hidden transition-all shadow-sm sticky top-0">
        
        {/* Left Section */}
        <HeaderLeftSection 
          language={themeLanguage.language} // Pass language from grouped props
          t={t}
          toggleSidebar={toggleSidebar}
          historyControls={historyControls}
        />
        
        {/* Right Section */}
        <HeaderRightSection
          people={people}
          onFocusPerson={onFocusPerson}
          t={t}
          themeLanguage={themeLanguage}
          auth={auth}
          viewSettings={viewSettings}
          toolsActions={toolsActions}
          exportActions={exportActions}
        />
      </header>
  );
});