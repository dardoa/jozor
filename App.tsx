import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { FamilyTree } from './components/FamilyTree';
import { WelcomeScreen } from './components/WelcomeScreen';
import { Header } from './components/Header';
import { ModalManager } from './components/ModalManager';

import { Gender, Language, TreeSettings } from './types';
import { useFamilyTree } from './hooks/useFamilyTree';
import { useGoogleSync } from './hooks/useGoogleSync';
import { useThemeSync } from './hooks/useThemeSync';
import { useLanguageSync } from './hooks/useLanguageSync';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useAppUI } from './hooks/useAppUI'; // New import

import { INITIAL_ROOT_ID } from './constants';
import { getTranslation } from './utils/translations';
import { X } from 'lucide-react';

const App: React.FC = () => {
  // --- Data & Logic ---
  const {
    people, focusId, setFocusId, history, future, undo, redo,
    updatePerson, deletePerson, addParent, addSpouse, addChild, removeRelationship, linkPerson,
    handleImport, startNewTree, loadCloudData
  } = useFamilyTree();

  // --- Sync & Auth ---
  const { user, isSyncing, isDemoMode, handleLogin, handleLogout, stopSyncing } = useGoogleSync(people, loadCloudData);

  // --- UI State (now managed by useAppUI) ---
  // Settings State (still local to App as it's a global setting)
  const [treeSettings, setTreeSettings] = useState<TreeSettings>({
    showPhotos: true,
    showDates: true,
    showMiddleName: false,
    showLastName: true,
    showMinimap: true, // Default enabled
    layoutMode: 'vertical',
    isCompact: false,
    chartType: 'descendant',
    theme: 'modern', // Default theme
    enableForcePhysics: true // Default enabled
  });

  // Local Preferences (now managed by their respective hooks)
  const { language, setLanguage } = useLanguageSync();
  const { darkMode, setDarkMode } = useThemeSync(treeSettings.theme);

  const t = getTranslation(language);
  const activePerson = people[focusId];

  // --- useAppUI Hook ---
  const {
    showWelcome,
    sidebarOpen, setSidebarOpen,
    activeModal, setActiveModal,
    isPresentMode, setIsPresentMode,
    linkModal, setLinkModal,
    fileInputRef,
    handleOpenLinkModal,
    handleCreateNewRelative,
    handleSelectExistingRelative,
    handleStartNewTree,
    onFileUpload,
    handleLoginWrapper,
    handleLogoutWrapper,
    handleOpenModal,
  } = useAppUI({
    people, t, startNewTree, stopSyncing, handleImport, 
    handleLogin: handleLogin, // Pass handleLogin from useGoogleSync
    handleLogout: handleLogout, // Pass handleLogout from useGoogleSync
    addParent, addSpouse, addChild, linkPerson, setFocusId
  });

  // --- Custom Hooks for Side Effects ---
  // Corrected: Use destructured values from useAppUI instead of calling it again
  useKeyboardShortcuts(history.length > 0, undo, future.length > 0, redo, showWelcome, isPresentMode, setIsPresentMode);

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
                    onUndo={undo} onRedo={redo} canUndo={history.length > 0} canRedo={future.length > 0}
                    darkMode={darkMode} setDarkMode={setDarkMode}
                    onFocusPerson={setFocusId}
                    language={language} setLanguage={setLanguage}
                    treeSettings={treeSettings} setTreeSettings={setTreeSettings}
                    toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                    onOpenModal={handleOpenModal}
                    onPresent={() => setIsPresentMode(true)}
                    user={user} isDemoMode={isDemoMode}
                    onLogin={handleLoginWrapper} onLogout={handleLogoutWrapper}
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