import React, { useState, memo } from 'react';
import { Person, Language, TreeSettings, UserProfile } from '../../types';
import { 
  Search, X, Moon, Sun, ChevronDown, Share2, Hammer, SlidersHorizontal
} from 'lucide-react';
import { LoginButton } from '../LoginButton';
import { ExportMenu } from './ExportMenu';
import { ToolsMenu } from './ToolsMenu';
import { ViewSettingsMenu } from './ViewSettingsMenu';
import { UserMenu } from './UserMenu';
import { SearchResults } from './SearchResults';

interface HeaderRightSectionProps {
  people: Record<string, Person>;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  onFocusPerson: (id: string) => void;
  language: Language;
  setLanguage: (l: Language) => void;
  treeSettings: TreeSettings;
  setTreeSettings: (s: TreeSettings) => void;
  onOpenModal: (modalType: 'calculator' | 'stats' | 'chat' | 'consistency' | 'timeline' | 'share' | 'story' | 'map') => void;
  onPresent: () => void;
  user: UserProfile | null;
  isDemoMode?: boolean;
  onLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
  t: any;
  handleExport: (type: 'jozor' | 'json' | 'gedcom' | 'ics' | 'print') => void;
}

export const HeaderRightSection: React.FC<HeaderRightSectionProps> = memo(({
  people, darkMode, setDarkMode, onFocusPerson, language, setLanguage,
  treeSettings, setTreeSettings, onOpenModal, onPresent,
  user, isDemoMode = false, onLogin, onLogout, t, handleExport
}) => {
  const [activeMenu, setActiveMenu] = useState<'none' | 'export' | 'settings' | 'tools' | 'search' | 'user'>('none');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Person[]>([]);

  const handleSearch = (query: string) => {
      setSearchQuery(query);
      if (!query.trim()) { setSearchResults([]); return; }
      const q = query.toLowerCase();
      const results = (Object.values(people) as Person[]).filter(p => 
          `${p.firstName} ${p.middleName} ${p.lastName} ${p.birthName}`.toLowerCase().includes(q)
      ).slice(0, 10);
      setSearchResults(results);
      setActiveMenu('search');
  };

  return (
    <div className="flex items-center gap-2 md:gap-3">
      {/* Search */}
      <div className="relative group hidden lg:block">
        <div className={`flex items-center gap-2.5 bg-stone-100/50 dark:bg-stone-800/50 border border-stone-200/50 dark:border-stone-700/50 focus-within:bg-white dark:focus-within:bg-stone-900 focus-within:border-teal-500/50 focus-within:ring-4 focus-within:ring-teal-500/5 rounded-full px-4 py-2 transition-all w-64 hover:bg-stone-100 dark:hover:bg-stone-800`}>
          <Search className="w-4 h-4 text-stone-400 group-focus-within:text-teal-500" />
          <input 
            type="text" 
            placeholder={t.searchPlaceholder} 
            value={searchQuery} 
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleSearch(e.target.value)} 
            onFocus={() => setActiveMenu('search')} 
            onBlur={() => setTimeout(() => setActiveMenu('none'), 200)} 
            className="bg-transparent border-none outline-none text-xs font-medium text-stone-700 dark:text-stone-200 placeholder-stone-400 w-full" 
            aria-label={t.searchPlaceholder}
          />
          {searchQuery && (<button onClick={() => handleSearch('')} className="text-stone-400 hover:text-stone-600" aria-label={t.clearSearch}><X className="w-3 h-3" /></button>)}
        </div>
        {activeMenu === 'search' && searchResults.length > 0 && (
          <SearchResults results={searchResults} onFocus={onFocusPerson} onClose={() => handleSearch('')} />
        )}
      </div>

      <div className="h-6 w-px bg-stone-200 dark:bg-stone-800 hidden md:block mx-1"></div>

      {/* Share Button */}
      {user && (
        <button 
          onClick={() => onOpenModal('share')}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-900/40"
          title={t.shareTree}
          aria-label={t.shareTree}
        >
          <Share2 className="w-4 h-4" />
        </button>
      )}
      
      {/* Tools Dropdown */}
      <div className="relative">
        <button 
          onClick={() => setActiveMenu(activeMenu === 'tools' ? 'none' : 'tools')} 
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${activeMenu === 'tools' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 dark:text-stone-400'}`}
          aria-label={t.tools}
        >
          <Hammer className="w-4 h-4" />
        </button>
        {activeMenu === 'tools' && (
          <ToolsMenu 
            onClose={() => setActiveMenu('none')} 
            onOpenModal={onOpenModal}
            t={t}
          />
        )}
      </div>

      {/* View Settings Dropdown */}
      <div className="relative">
        <button 
          onClick={() => setActiveMenu(activeMenu === 'settings' ? 'none' : 'settings')} 
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all border ${activeMenu === 'settings' ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-600 border-teal-200' : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 border-transparent'}`}
          aria-label={t.viewOptions}
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
        {activeMenu === 'settings' && (
          <ViewSettingsMenu 
            settings={treeSettings} 
            onUpdate={setTreeSettings} 
            onClose={() => setActiveMenu('none')} 
            onPresent={() => { onPresent(); setActiveMenu('none'); }}
            t={t}
          />
        )}
      </div>

      <div className="hidden sm:flex items-center gap-1">
        <button onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')} className="w-9 h-9 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 flex items-center justify-center font-bold text-[10px]" aria-label={language === 'en' ? 'Switch to Arabic' : 'Switch to English'}>{language === 'en' ? 'AR' : 'EN'}</button>
        <button onClick={() => setDarkMode(!darkMode)} className="w-9 h-9 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 flex items-center justify-center" aria-label={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>{darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</button>
      </div>

      {/* Auth Section */}
      <div className="hidden sm:block">
        {user ? (
          <div className="relative">
            <button onClick={() => setActiveMenu(activeMenu === 'user' ? 'none' : 'user')} className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors border border-transparent hover:border-stone-200 dark:hover:border-stone-700" aria-label={t.welcomeUser}>
              <img src={user.photoURL} alt={user.displayName} className="w-7 h-7 rounded-full object-cover border border-stone-200 dark:border-stone-600" />
            </button>
            {activeMenu === 'user' && (
              <UserMenu user={user} isDemoMode={isDemoMode} onLogout={onLogout} onClose={() => setActiveMenu('none')} t={t} />
            )}
          </div>
        ) : (
          <LoginButton onLogin={onLogin} label={t.loginGoogle} />
        )}
      </div>

      {/* Export Dropdown */}
      <div className="relative hidden md:block">
        <button onClick={() => setActiveMenu(activeMenu === 'export' ? 'none' : 'export')} className="px-5 py-2 text-xs font-semibold bg-stone-900 dark:bg-teal-600 text-white rounded-full shadow-lg flex items-center gap-2" aria-label={t.export}>
          <span>{t.export}</span> <ChevronDown className="w-3 h-3 opacity-70"/>
        </button>
        {activeMenu === 'export' && (
          <ExportMenu 
            onClose={() => setActiveMenu('none')}
            onExport={handleExport}
            t={t}
          />
        )}
      </div>
    </div>
  );
});