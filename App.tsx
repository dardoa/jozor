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
    people, focusId, setFocusId, updatePerson, deletePerson, removeRelationship, activePerson,

    // History
    undo, redo, canUndo, canRedo,

    // Sync & Auth
    user, isSyncing, isDemoMode, handleLoginWrapper, handleLogoutWrapper,

    // UI Preferences
    language, setLanguage, treeSettings, setTreeSettings, darkMode, setDarkMode, t,

    // Welcome Screen
    showWelcome, fileInputRef, handleStartNewTree, onFileUpload,

    // Modals & Sidebar
    sidebarOpen, setSidebarOpen, activeModal, setActiveModal, isPresentMode, setIsPresentMode,
    linkModal, setLinkModal, handleOpenLinkModal, handleCreateNewRelative, handleSelectExistingRelative,
    handleOpenModal,

    // Actions
    handleExport,
  } = useAppOrchestration();

  return (
    <div className={`flex flex-col h-screen font-sans transition-colors duration-300 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-hidden theme-${treeSettings.theme}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      
      <input ref={fileInputRef} type="file" accept=".json,.ged,.jozor,.zip" className="hidden" onChange={onFileUpload} />

      {showWelcome ? (
          <WelcomeScreen 
              onStartNew={handleStartNewTree}
              onImport={() => fileInputRef.current?.click()}
              onLogin={handleLoginWrapper}
              language={language}
              setLanguage={setLanguage}
          />
      ) : (
          <>
            {!isPresentMode && (
                <Header 
                    people={people}
                    onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo}
                    darkMode={darkMode} setDarkMode={setDarkMode}
                    onFocusPerson={setFocusId}
                    language={language} setLanguage={setLanguage}
                    treeSettings={treeSettings} setTreeSettings={setTreeSettings}
                    toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                    onOpenModal={handleOpenModal}
                    onPresent={() => setIsPresentMode(true)}
                    user={user} isDemoMode={isDemoMode}
                    onLogin={handleLoginWrapper} onLogout={handleLogoutWrapper}
                    handleExport={handleExport}
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
            {!isPresentMode && isSyncing && (
                <div className={`absolute top-16 start-1/2 -translate-x-1/2 z-50 text-white text-xs px-3 py-1 rounded-b-lg shadow-lg flex items-center gap-2 ${isDemoMode ? 'bg-orange-500' : 'bg-blue-600 animate-pulse'}`}>
                     {isDemoMode ? 'Saving locally...' : t.syncing}
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
                            onAddParent={(g) => handleOpenLinkModal('parent', g)}
                            onAddSpouse={(g) => handleOpenLinkModal('spouse', g)}
                            onAddChild={(g) => handleOpenLinkModal('child', g)}
                            onRemoveRelationship={removeRelationship}
                            onDelete={deletePerson}
                            onSelect={setFocusId}
                            language={language}
                            isOpen={sidebarOpen}
                            onClose={() => setSidebarOpen(false)}
                            onOpenModal={handleOpenModal}
                            user={user}
                        />
                    </div>
                )}

                {/* Main Tree Visualization */}
                <FamilyTree
                    people={people}
                    focusId={focusId}
                    onSelect={setFocusId}
                    settings={treeSettings}
                />

                {/* Modals Layer */}
                <ModalManager 
                    activeModal={activeModal} setActiveModal={setActiveModal}
                    linkModal={linkModal} setLinkModal={setLinkModal}
                    people={people} language={language}
                    focusId={focusId} setFocusId={setFocusId} activePerson={activePerson}
                    handleCreateNewRelative={handleCreateNewRelative}
                    handleSelectExistingRelative={handleSelectExistingRelative}
                    user={user}
                />
            </div>
          </>
      )}
    </div>
  );
};

export default App;