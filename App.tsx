import React, { useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { FamilyTree } from './components/FamilyTree';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ModalManagerContainer } from './components/ModalManagerContainer';
import { Header } from './components/Header';

import { useAppOrchestration } from './hooks/useAppOrchestration';

import { X } from 'lucide-react';

const App: React.FC = () => {
  const {
    appState,
    welcomeScreen,
    modals,
    googleSync,
    historyControls,
    themeLanguage,
    viewSettings,
    toolsActions,
    exportActions,
    searchProps,
    familyActions,
    isPresentMode,
    setIsPresentMode,
    sidebarOpen,
    setSidebarOpen,
    auth, // <--- Destructure auth here
  } = useAppOrchestration();

  // Centralized application of theme class, dark mode class, and language attributes to the html element
  useEffect(() => {
    const root = document.documentElement;

    // Handle theme class
    root.classList.remove('theme-modern', 'theme-vintage', 'theme-blueprint');
    root.classList.add(`theme-${viewSettings.treeSettings.theme}`);

    // Handle dark mode class
    root.classList.toggle('dark', themeLanguage.darkMode);

    // Handle language attributes
    const dir = themeLanguage.language === 'ar' ? 'rtl' : 'ltr';
    root.setAttribute('dir', dir);
    root.setAttribute('lang', themeLanguage.language); // This line sets the lang attribute
  }, [viewSettings.treeSettings.theme, themeLanguage.darkMode, themeLanguage.language]);

  return (
    <div 
      className={`flex flex-col h-screen font-sans transition-colors duration-300 text-[var(--card-text)] overflow-hidden bg-[var(--theme-bg)]`} 
    >
      
      <input ref={welcomeScreen.fileInputRef} type="file" accept=".json,.ged,.jozor,.zip" className="hidden" onChange={welcomeScreen.onFileUpload} />

      {welcomeScreen.showWelcome ? (
          <WelcomeScreen 
              onStartNew={welcomeScreen.handleStartNewTree}
              onImport={welcomeScreen.onTriggerImportFile}
              onLogin={googleSync.onLogin}
          />
      ) : (
          <>
            {!isPresentMode && (
                <Header 
                    toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                    historyControls={historyControls}
                    themeLanguage={themeLanguage}
                    auth={auth} // <--- Pass auth here
                    viewSettings={viewSettings}
                    toolsActions={toolsActions}
                    exportActions={exportActions}
                    searchProps={searchProps}
                />
            )}
            
            {/* Present Mode Exit Button */}
            {isPresentMode && (
                <button 
                    onClick={() => setIsPresentMode(false)}
                    className="fixed top-4 right-4 z-[100] bg-black/50 text-white px-4 py-2 rounded-full backdrop-blur hover:bg-black/70 flex items-center gap-2"
                >
                    <X className="w-4 h-4"/> Exit Present Mode
                </button>
            )}
            
            {/* Cloud Status */}
            {!isPresentMode && googleSync.isSyncing && (
                <div className={`absolute top-16 start-1/2 -translate-x-1/2 z-50 text-white text-xs px-3 py-1 rounded-b-lg shadow-lg flex items-center gap-2 ${googleSync.isDemoMode ? 'bg-orange-500' : 'bg-blue-600 animate-pulse'}`}>
                     {googleSync.isDemoMode ? 'Saving locally...' : (themeLanguage.language === 'ar' ? 'جاري المزامنة...' : 'Syncing...')}
                </div>
            )}

            <div className="flex flex-1 overflow-hidden relative">
                {/* Sidebar */}
                {appState.activePerson && !isPresentMode && (
                    <div className="print:hidden h-full z-20 shadow-xl border-e border-gray-200 dark:border-gray-800">
                        <Sidebar
                            person={appState.activePerson}
                            people={appState.people}
                            onUpdate={appState.updatePerson}
                            onDelete={appState.deletePerson}
                            onSelect={appState.setFocusId}
                            isOpen={sidebarOpen}
                            onClose={() => setSidebarOpen(false)}
                            onOpenModal={modals.handleOpenModal}
                            user={googleSync.user}
                            familyActions={familyActions}
                            onOpenCleanTreeOptions={modals.onOpenCleanTreeOptions}
                            onTriggerImportFile={welcomeScreen.onTriggerImportFile}
                        />
                    </div>
                )}

                {/* Main Tree Visualization */}
                <FamilyTree
                    people={appState.people}
                    focusId={appState.focusId}
                    onSelect={appState.setFocusId}
                    settings={viewSettings.treeSettings}
                />

                {/* Modals Layer */}
                <ModalManagerContainer 
                    activeModal={modals.activeModal} setActiveModal={modals.setActiveModal}
                    linkModal={modals.linkModal} setLinkModal={modals.setLinkModal}
                    cleanTreeOptionsModal={modals.cleanTreeOptionsModal} setCleanTreeOptionsModal={modals.setCleanTreeOptionsModal}
                    googleSyncChoiceModal={modals.googleSyncChoiceModal} setGoogleSyncChoiceModal={modals.setGoogleSyncChoiceModal}
                    driveFileManagerModal={modals.driveFileManagerModal} setDriveFileManagerModal={modals.setDriveFileManagerModal}
                    people={appState.people} 
                    focusId={appState.focusId} setFocusId={appState.setFocusId} activePerson={appState.activePerson}
                    user={googleSync.user}
                    familyActions={familyActions}
                    language={themeLanguage.language}
                    onStartNewTree={welcomeScreen.handleStartNewTree}
                    onTriggerImportFile={welcomeScreen.onTriggerImportFile}
                    onLoadCloudData={googleSync.onLoadCloudData}
                    onSaveNewCloudFile={googleSync.onSaveNewCloudFile}
                    driveFiles={googleSync.driveFiles}
                    currentActiveDriveFileId={googleSync.currentActiveDriveFileId}
                    handleLoadDriveFile={googleSync.handleLoadDriveFile}
                    handleSaveAsNewDriveFile={googleSync.handleSaveAsNewDriveFile}
                    handleOverwriteExistingDriveFile={googleSync.handleOverwriteExistingDriveFile}
                    handleDeleteDriveFile={googleSync.handleDeleteDriveFile}
                    isSavingDriveFile={googleSync.isSavingDriveFile}
                    isDeletingDriveFile={googleSync.isDeletingDriveFile}
                    isListingDriveFiles={googleSync.isListingDriveFiles}
                />
            </div>
          </>
      )}

      {/* Compliance Footer */}
      <footer className="bg-white dark:bg-stone-950/80 backdrop-blur-md text-xs text-stone-500 dark:text-stone-400 py-3 px-6 flex justify-center items-center gap-4 border-t border-stone-200/50 dark:border-stone-800/50 print:hidden">
        <a href="/privacy-policy.html" target="_blank" rel="noopener noreferrer" className="hover:underline">Privacy Policy</a>
        <span aria-hidden="true">•</span>
        <a href="/terms-of-service.html" target="_blank" rel="noopener noreferrer" className="hover:underline">Terms of Service</a>
      </footer>
    </div>
  );
};

export default App;