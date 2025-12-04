import React from 'react';
import { Sidebar } from './components/Sidebar';
import { FamilyTree } from './components/FamilyTree';
import { WelcomeScreen } from './components/WelcomeScreen';
import { Header } from './components/Header';
import { ModalManager } from './components/ModalManager';

import { useAppOrchestration } from './hooks/useAppOrchestration'; // New orchestration hook

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
    themeLanguage,
    auth,
    viewSettings,
    toolsActions,
    exportActions,
    searchProps,
    familyActions, // Destructure new grouped prop
    t, // Destructure t here
  } = useAppOrchestration();

  return (
    <div className={`flex flex-col h-screen font-sans transition-colors duration-300 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden theme-${viewSettings.treeSettings.theme}`} dir={themeLanguage.language === 'ar' ? 'rtl' : 'ltr'}>
      
      <input ref={fileInputRef} type="file" accept=".json,.ged,.jozor,.zip" className="hidden" onChange={onFileUpload} />

      {showWelcome ? (
          <WelcomeScreen 
              onStartNew={handleStartNewTree}
              onImport={() => fileInputRef.current?.click()}
              onLogin={auth.onLogin}
              language={themeLanguage.language}
              setLanguage={themeLanguage.setLanguage}
          />
      ) : (
          <>
            {!isPresentMode && (
                <Header 
                    t={t}
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
                     {auth.isDemoMode ? 'Saving locally...' : t.syncing}
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
                            language={themeLanguage.language}
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
                <ModalManager 
                    activeModal={activeModal} setActiveModal={setActiveModal}
                    linkModal={linkModal} setLinkModal={setLinkModal}
                    people={people} language={themeLanguage.language}
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