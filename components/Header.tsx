import React, { memo } from 'react';
import { HeaderProps } from '../types'; // Import HeaderProps

// Import sub-components
import { HeaderLeftSection } from './header/HeaderLeftSection';
import { HeaderRightSection } from './header/HeaderRightSection';

export const Header: React.FC<HeaderProps> = memo(({
  t, toggleSidebar,
  historyControls, themeLanguage, auth, viewSettings, toolsActions, exportActions,
  searchProps // Destructure searchProps directly
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
          searchProps={searchProps} // Pass grouped search props
        />
      </header>
  );
});