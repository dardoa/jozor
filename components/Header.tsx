import React, { memo } from 'react';
// Removed: import { HeaderProps } from '../types'; // Import HeaderProps

// Import sub-components
import { HeaderLeftSection } from './header/HeaderLeftSection';
import { HeaderRightSection } from './header/HeaderRightSection';
import { HistoryControlsProps, ThemeLanguageProps, AuthProps, ViewSettingsProps, ToolsActionsProps, ExportActionsProps, SearchProps } from '../types'; // Import necessary types

// Define HeaderProps directly here
interface HeaderProps {
  toggleSidebar: () => void;
  historyControls: HistoryControlsProps;
  themeLanguage: ThemeLanguageProps;
  auth: AuthProps;
  viewSettings: ViewSettingsProps;
  toolsActions: ToolsActionsProps;
  exportActions: ExportActionsProps;
  searchProps: SearchProps;
}

export const Header: React.FC<HeaderProps> = memo(({
  // Removed t,
  toggleSidebar,
  historyControls, themeLanguage, auth, viewSettings, toolsActions, exportActions,
  searchProps // Destructure searchProps directly
}) => {
  return (
      <header className="h-16 bg-white/80 dark:bg-stone-950/80 backdrop-blur-md flex items-center px-4 md:px-6 justify-between border-b border-stone-200/50 dark:border-stone-800/50 z-30 print:hidden transition-all shadow-sm sticky top-0">
        
        {/* Left Section */}
        <HeaderLeftSection 
          language={themeLanguage.language} // Pass language from grouped props
          // Removed t={t}
          toggleSidebar={toggleSidebar}
          historyControls={historyControls}
        />
        
        {/* Right Section */}
        <HeaderRightSection
          // Removed t={t}
          themeLanguage={themeLanguage}
          auth={auth}
          viewSettings={viewSettings}
          toolsActions={toolsActions}
          exportActions={exportActions}
          searchProps={searchProps} // Pass grouped search props
        />
      </header>
  );
});