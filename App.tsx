import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { FamilyTree } from './components/FamilyTree';
import { WelcomeScreen } from './components/WelcomeScreen';
import { Header } from './components/Header';
import { ModalManager } from './components/ModalManager';

import { Gender, Language, TreeSettings } from './types';
import { useFamilyTree } from './hooks/useFamilyTree';
import { useGoogleSync } from './hooks/useGoogleSync';
import { useThemeSync } from './hooks/useThemeSync'; // New import
import { useLanguageSync } from './hooks/useLanguageSync'; // New import
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'; // New import

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

  // --- UI State ---
  const [showWelcome, setShowWelcome] = useState<boolean>(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'none' | 'calculator' | 'stats' | 'chat' | 'consistency' | 'timeline' | 'share' | 'story' | 'map'>('none');
  const [isPresentMode, setIsPresentMode] = useState(false);
  
  // Link Person Modal State
  const [linkModal, setLinkModal] = useState<{
    isOpen: boolean;
    type: 'parent' | 'spouse' | 'child' | null;
    gender: Gender | null;
  }>({ isOpen: false, type: null, gender: null });

  // Settings State
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

  // Local Preferences
  const [language, setLanguage] = useState<Language>('ar'); // Initialized by hook
  const [darkMode, setDarkMode] = useState(false); // Initialized by hook

  const fileInputRef = useRef<HTMLInputElement>(null);
  const activePerson = people[focusId];
  const t = getTranslation(language);

  // --- Custom Hooks for Side Effects ---
  useThemeSync(darkMode, setDarkMode, treeSettings.theme); // Using new hook
  useLanguageSync(language, setLanguage); // Using new hook
  useKeyboardShortcuts(history.length > 0, undo, future.length > 0, redo, showWelcome, isPresentMode, setIsPresentMode); // Using new hook

  useEffect(() => {
    const hasData = Object.keys(people).length > 1 || people[INITIAL_ROOT_ID].firstName !== 'Me';
    if (hasData) setShowWelcome(false);
  }, []);

  // --- Action Handlers ---

  const handleOpenLinkModal = useCallback((type: 'parent' | 'spouse' | 'child', gender: Gender) => {
    setLinkModal({ isOpen: true, type, gender });
  }, []);

  const handleCreateNewRelative = useCallback(() => {
     if (!linkModal.type || !linkModal.gender) return;
     const actions = { parent: addParent, spouse: addSpouse, child: addChild };
     actions[linkModal.type](linkModal.gender);
     setLinkModal({ isOpen: false, type: null, gender: null });
  }, [linkModal, addParent, addSpouse, addChild]);

  const handleSelectExistingRelative = useCallback((id: string) => {
    linkPerson(id, linkModal.type);
    setLinkModal({ isOpen: false, type: null, gender: null });
  }, [linkModal, linkPerson]);

  const handleStartNewTree = useCallback(() => {
    if (Object.keys(people).length > 2 && !confirm(t.newTreeConfirm)) return;
    startNewTree();
    stopSyncing();
    setShowWelcome(false);
  }, [people, t, startNewTree, stopSyncing]);

  const onFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (await handleImport(file)) setShowWelcome(false);
    e.target.value = '';
  };

  const handleLoginWrapper = async () => {
      const success = await handleLogin();
      if (success) setShowWelcome(false);
  };

  const handleLogoutWrapper = async () => {
      await handleLogout();
      setShowWelcome(true);
  };

  // New consolidated modal opener
  const handleOpenModal = useCallback((modalType: 'calculator' | 'stats' | 'chat' | 'consistency' | 'timeline' | 'share' | 'story' | 'map') => {
      setActiveModal(modalType);
  }, []);

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
                    onOpenModal={handleOpenModal} // Consolidated modal opener
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
                            onOpenModal={handleOpenModal} // Fixed: Changed from onChat to onOpenModal
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