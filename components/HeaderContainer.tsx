import React, { memo } from 'react';
import { Header } from './Header';
import { HistoryControlsProps, ThemeLanguageProps, AuthProps, ViewSettingsProps, ToolsActionsProps, ExportActionsProps, SearchProps } from '../types';

interface HeaderContainerProps {
  toggleSidebar: () => void;
  historyControls: HistoryControlsProps;
  themeLanguage: ThemeLanguageProps;
  auth: AuthProps;
  viewSettings: ViewSettingsProps;
  toolsActions: ToolsActionsProps;
  exportActions: ExportActionsProps;
  searchProps: SearchProps;
}

export const HeaderContainer: React.FC<HeaderContainerProps> = memo(({
  toggleSidebar,
  historyControls,
  themeLanguage,
  auth,
  viewSettings,
  toolsActions,
  exportActions,
  searchProps,
}) => {
  return (
    <Header
      toggleSidebar={toggleSidebar}
      historyControls={historyControls}
      themeLanguage={themeLanguage}
      auth={auth}
      viewSettings={viewSettings}
      toolsActions={toolsActions}
      exportActions={exportActions}
      searchProps={searchProps}
    />
  );
});