import React, { memo } from 'react';
import { Person, HistoryControlsProps, ThemeLanguageProps, AuthProps, ViewSettingsProps, ToolsActionsProps, ExportActionsProps, HeaderLeftSectionProps, HeaderRightSectionProps } from '../types';
import { getTranslation } from '../utils/translations';
// Removed lucide-react imports as they are now handled by sub-components

// Import sub-components
import { HeaderLeftSection } from './header/HeaderLeftSection';
import { HeaderRightSection } from './header/HeaderRightSection';

// Update HeaderProps
interface HeaderProps {
  t: any; // Translations
  toggleSidebar: () => void;
  
  historyControls: HistoryControlsProps;
  themeLanguage: ThemeLanguageProps;
  auth: AuthProps;
  viewSettings: ViewSettingsProps;
  toolsActions: ToolsActionsProps;
  exportActions: ExportActionsProps;

  // New props to pass directly to HeaderRightSection
  peopleForSearch: Record<string, Person>;
  onFocusPersonForSearch: (id: string) => void;
}

export const Header: React.FC<HeaderProps> = memo(({
  t, toggleSidebar,
  historyControls, themeLanguage, auth, viewSettings, toolsActions, exportActions,
  peopleForSearch, onFocusPersonForSearch // Destructure new props
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
          t={t}
          themeLanguage={themeLanguage}
          auth={auth}
          viewSettings={viewSettings}
          toolsActions={toolsActions}
          exportActions={exportActions}
          peopleForSearch={peopleForSearch} // Pass directly for search
          onFocusPersonForSearch={onFocusPersonForSearch} // Pass directly for search
        />
      </header>
  );
});