import React, { useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { FamilyTree } from './components/FamilyTree';
import { WelcomeScreen } from './components/WelcomeScreen';
import { HeaderContainer } from './components/HeaderContainer';
import { ModalManagerContainer } from './components/ModalManagerContainer';

import { useAppOrchestration } from './hooks/useAppOrchestration';
// Removed: import { useTranslation } from './context/TranslationContext';

import { X } from 'lucide-react';

const App: React.FC = () => {
  const {
    // Core Data
    people, focusId, setFocusId, updatePerson, deletePerson, activePerson,
    
    // Welcome Screen
    showWelcome, fileInputRef, handleStartNewTree, onFileUpload,

    // Modals & Sidebar
    sidebarOpen, setSidebarOpen, activeModal, setActiveModal, isPresentMode, setIsPresentMode,
    linkModal, setLinkModal, 
    handleOpenModal,

    // Grouped Props
    historyControls,
    themeLanguage, // Contains darkMode, setDarkMode, language, setLanguage
    auth,
    viewSettings,
    toolsActions,
    exportActions,
    searchProps,
    familyActions,
  } = useAppOrchestration();

  // Removed: const { t, language, setLanguage } = useTranslation();

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
    root.setAttribute('lang', themeLanguage.language);
  }, [viewSettings.treeSettings.theme, themeLanguage.darkMode, themeLanguage.language]);

  return (
    <div className={`flex flex-col h-screen font-sans transition-colors duration-300 bg-[var(--theme-bg)] text-[var(--card-text)] overflow-hidden`} >
      
      <input ref={fileInputRef} type="file" accept=".json,.ged,.jozor,.zip" className="hidden" onChange={onFileUpload} />

      {showWelcome ? (
          <WelcomeScreen 
              onStartNew={handleStartNewTree}
              onImport={() => fileInputRef.current?.click()}
              onLogin={auth.onLogin}
          />
      ) : (
          <>
            {!isPresentMode && (
                <HeaderContainer 
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
                     {auth.isDemoMode ? 'Saving locally...' : (themeLanguage.language === 'ar' ? 'جاري المزامنة...' : 'Syncing...')}
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
                            language={themeLanguage.language} // Use language from themeLanguage
                            isOpen={sidebarOpen}
                            onClose={() => setSidebarOpen(false)}
                            onOpenModal={handleOpenModal}
                            user={auth.user}
                            familyActions={familyActions}
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
                    people={people} language={themeLanguage.language} // Use language from themeLanguage
                    focusId={focusId} setFocusId={setFocusId} activePerson={activePerson}
                    user={auth.user}
                    familyActions={familyActions}
                />
            </div>
          </>
      )}
    </div>
  );
};

export default App;