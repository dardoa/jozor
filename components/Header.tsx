import React, { useState, memo, useCallback } from 'react';
import { Person, Language, TreeSettings, UserProfile } from '../types';
import { exportToGEDCOM } from '../utils/gedcomLogic';
import { exportToJozorArchive } from '../utils/archiveLogic';
import { generateICS } from '../utils/calendarLogic';
import { getTranslation } from '../utils/translations';
import { downloadFile } from '../utils/fileUtils'; // New import
import { 
  Undo, Redo, Search, Moon, Sun, X, Menu, ChevronDown, Share2,
  Hammer, SlidersHorizontal
} from 'lucide-react';
import { Logo } from './Logo';
import { LoginButton } from './LoginButton';

// Import sub-components
import { ExportMenu } from './header/ExportMenu';
import { ToolsMenu } from './header/ToolsMenu';
import { ViewSettingsMenu } from './header/ViewSettingsMenu';
import { UserMenu } from './header/UserMenu';
import { SearchResults } from './header/SearchResults';
import { HeaderLeftSection } from './header/HeaderLeftSection'; // New import
import { HeaderRightSection } from './header/HeaderRightSection'; // New import

// --- Main Header ---

interface HeaderProps {
  people: Record<string, Person>;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  onFocusPerson: (id: string) => void;
  language: Language;
  setLanguage: (l: Language) => void;
  treeSettings: TreeSettings;
  setTreeSettings: (s: TreeSettings) => void;
  toggleSidebar: () => void;
  onOpenModal: (modalType: 'calculator' | 'stats' | 'chat' | 'consistency' | 'timeline' | 'share' | 'story' | 'map') => void;
  onPresent: () => void;
  user: UserProfile | null;
  isDemoMode?: boolean;
  onLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
  handleExport: (type: 'jozor' | 'json' | 'gedcom' | 'ics' | 'print') => Promise<void>; // Added handleExport
}

export const Header: React.FC<HeaderProps> = ({
  people, onUndo, onRedo, canUndo, canRedo,
  darkMode, setDarkMode, onFocusPerson, language, setLanguage,
  treeSettings, setTreeSettings, toggleSidebar, 
  onOpenModal, onPresent,
  user, isDemoMode = false, onLogin, onLogout,
  handleExport // Destructure handleExport
}) => {
  const t = getTranslation(language);

  // Consolidated Export Handler (moved to useAppOrchestration, but kept here for type consistency)
  // This function is now passed as a prop, so the local definition is removed.

  return (
      <header className="h-16 bg-white/80 dark:bg-stone-950/80 backdrop-blur-md flex items-center px-4 md:px-6 justify-between border-b border-stone-200/50 dark:border-stone-800/50 z-30 print:hidden transition-all shadow-sm sticky top-0">
        
        {/* Left Section */}
        <HeaderLeftSection 
          language={language}
          t={t}
          toggleSidebar={toggleSidebar}
          onUndo={onUndo}
          onRedo={onRedo}
          canUndo={canUndo}
          canRedo={canRedo}
        />
        
        {/* Right Section */}
        <HeaderRightSection
          people={people}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          onFocusPerson={onFocusPerson}
          language={language}
          setLanguage={setLanguage}
          treeSettings={treeSettings}
          setTreeSettings={setTreeSettings}
          onOpenModal={onOpenModal}
          onPresent={onPresent}
          user={user}
          isDemoMode={isDemoMode}
          onLogin={onLogin}
          onLogout={onLogout}
          t={t}
          handleExport={handleExport}
        />
      </header>
  );
};