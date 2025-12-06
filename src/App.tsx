import React, { useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { FamilyTree } from './components/FamilyTree';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ModalManagerContainer } from './components/ModalManagerContainer';
import { Header } from './components/Header'; // Direct import of Header

import { useAppOrchestration } from './hooks/useAppOrchestration';
import { useTranslation } from './context/TranslationContext'; // Import useTranslation

import { X } from 'lucide-react';

const App: React.FC = () => {
  const {
    // Core Data
    people, focusId, setFocusId, updatePerson, deletePerson, activePerson,
    
    // Welcome Screen
    showWelcome, fileInputRef, handleStartNewTree, onFileUpload,

    // Modals & Sidebar
    sidebarOpen, setSidebarOpen, activeModal, setActiveModal, isPresentMode, setIsPresentMode,
    linkModal, setLinkModal, cleanTreeOptionsModal, setCleanTreeOptionsModal, // New modal state
    handleOpenLinkModal, handleOpenModal, onOpenCleanTreeOptions, // New function
    
    // Grouped Props
    historyControls,
    themeLanguage, // Contains darkMode, setDarkMode, language, setLanguage
    auth,
    viewSettings,
    toolsActions,
    exportActions,
    searchProps,
    familyActions,
    startNewTree, // Destructure startNewTree
    onTriggerImportFile, // Destructure onTriggerImportFile
  } = useAppOrchestration();

  const { themeLanguage: contextThemeLanguage } = useTranslation(); // Get themeLanguage from context

  // Centralized application of theme class and dark mode class to the html element
  useEffect(() => {
    const root = document.documentElement;

    // Handle theme class
    root.classList.remove('theme-modern', 'theme-vintage', 'theme-blueprint');
    root.classList.add(`theme-${viewSettings.treeSettings.theme}`);

    // The 'dark' class and 'lang'/'dir' attributes are now managed by TranslationContext.tsx
    // No need to duplicate logic here.
  }, [viewSettings.treeSettings.theme]); // Only depend on theme setting here

  return (
    <div 
      className={`flex flex-col h-screen font-sans transition-colors duration-300 text-[var(--card-text)] overflow-hidden bg-[var(--theme-bg)]`} // Use theme-bg here
    >
      
      <input ref={fileInputRef} type="file" accept=".json,.ged,.jozor,.zip" className="hidden" onChange={onFileUpload} />

      {showWelcome ? (
          <WelcomeScreen 
              onStartNew={handleStartNewTree}
              onImport={onTriggerImportFile} // Use onTriggerImportFile here
              onLogin={auth.onLogin}
          />
      ) : (
          <>
            {!isPresentMode && (
                <Header 
                    toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                    historyControls={historyControls}
                    themeLanguage={themeLanguage}
                    auth={auth}
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
            {!isPresentMode && auth.isSyncing && (
                <div className={`absolute top-16 start-1/2 -translate-x-1/2 z-50 text-white text-xs px-3 py-1 rounded-b-lg shadow-lg flex items-center gap-2 ${auth.isDemoMode ? 'bg-orange-500' : 'bg-blue-600 animate-pulse'}`}>
                     {auth.isDemoMode ? 'Saving locally...' : (contextThemeLanguage.language === 'ar' ? 'جاري المزامنة...' : 'Syncing...')}
                </div>
            )}

            <div className="flex flex-1 overflow-hidden relative">
                {/* Sidebar */}
                {activePerson && !isPresentMode && (
                    <div className="print:hidden h-full z-20 shadow-xl border-e border-gray-200 dark:border-gray-800">
                        <Sidebar
                            person={activePerson}
                            people={people}
                            onUpdate={updatePerson}
                            onDelete={deletePerson}
                            onSelect={setFocusId}
                            isOpen={sidebarOpen}
                            onClose={() => setSidebarOpen(false)}
                            onOpenModal={handleOpenModal}
                            user={auth.user}
                            familyActions={familyActions}
                            onOpenCleanTreeOptions={onOpenCleanTreeOptions} // Pass new prop
                            onTriggerImportFile={onTriggerImportFile} // Pass new prop
                        />
                    </div>
                )}

                {/* Main Tree Visualization */}
                <FamilyTree
                    people={people}
                    focusId={focusId}
                    onSelect={setFocusId}
                    settings={viewSettings.treeSettings}
                />

                {/* Modals Layer */}
                <ModalManagerContainer 
                    activeModal={activeModal} setActiveModal={setActiveModal}
                    linkModal={linkModal} setLinkModal={setLinkModal}
                    cleanTreeOptionsModal={cleanTreeOptionsModal} setCleanTreeOptionsModal={setCleanTreeOptionsModal} // Pass new modal state
                    people={people} 
                    focusId={focusId} setFocusId={setFocusId} activePerson={activePerson}
                    user={auth.user}
                    familyActions={familyActions}
                    language={themeLanguage.language}
                    onStartNewTree={handleStartNewTree} // Pass to CleanTreeOptionsModal
                    onTriggerImportFile={onTriggerImportFile} // Pass to CleanTreeOptionsModal
                />
            </div>
          </>
      )}
    </div>
  );
};

export default App;