import React, { useState, memo, useCallback } from 'react';
import { Person, Language, TreeSettings, UserProfile } from '../types';
import { getTranslation } from '../utils/translations';
import { 
  Undo, Redo, Search, Moon, Sun, X, Menu, ChevronDown, Share2,
  Hammer, SlidersHorizontal
} from 'lucide-react';
import { Logo } from './Logo';
import { LoginButton } from './LoginButton';

// Import sub-components
// Removed: ExportMenu, ToolsMenu, ViewSettingsMenu, UserMenu, SearchResults
import { HeaderLeftSection } from './header/HeaderLeftSection';
import { HeaderRightSection } from './header/HeaderRightSection';

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
  handleExport: (type: 'jozor' | 'json' | 'gedcom' | 'ics' | 'print') => Promise<void>;
}

export const Header: React.FC<HeaderProps> = ({
  people, onUndo, onRedo, canUndo, canRedo,
  darkMode, setDarkMode, onFocusPerson, language, setLanguage,
  treeSettings, setTreeSettings, toggleSidebar, 
  onOpenModal, onPresent,
  user, isDemoMode = false, onLogin, onLogout,
  handleExport
}) => {
  const t = getTranslation(language);

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