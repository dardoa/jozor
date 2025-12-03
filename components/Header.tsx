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
}

export const Header: React.FC<HeaderProps> = ({
  people, onUndo, onRedo, canUndo, canRedo,
  darkMode, setDarkMode, onFocusPerson, language, setLanguage,
  treeSettings, setTreeSettings, toggleSidebar, 
  onOpenModal, onPresent,
  user, isDemoMode = false, onLogin, onLogout
}) => {
  const [activeMenu, setActiveMenu] = useState<'none' | 'export' | 'settings' | 'tools' | 'search' | 'user'>('none');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Person[]>([]);
  const t = getTranslation(language);

  // Consolidated Export Handler
  const handleExport = useCallback(async (type: 'jozor' | 'json' | 'gedcom' | 'ics' | 'print') => {
    try {
      if (type === 'jozor') {
        downloadFile(await exportToJozorArchive(people), "family.jozor", "application/octet-stream", () => setActiveMenu('none'));
      } else if (type === 'json') {
        downloadFile(JSON.stringify(people, null, 2), "tree.json", "application/json", () => setActiveMenu('none'));
      } else if (type === 'gedcom') {
        downloadFile(exportToGEDCOM(people), "tree.ged", "application/octet-stream", () => setActiveMenu('none'));
      } else if (type === 'ics') {
        downloadFile(generateICS(people), "family_calendar.ics", "text/calendar", () => setActiveMenu('none'));
      } else if (type === 'print') {
        setActiveMenu('none'); // Close menu before printing
        window.print();
      }
    } catch (e) {
      console.error(`Export to ${type} failed`, e);
      alert(`Export to ${type} failed`);
    }
  }, [people]);


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
      <header className="h-16 bg-white/80 dark:bg-stone-950/80 backdrop-blur-md flex items-center px-4 md:px-6 justify-between border-b border-stone-200/50 dark:border-stone-800/50 z-30 print:hidden transition-all shadow-sm sticky top-0">
        
        {/* Left: Branding & History */}
        <div className="flex items-center gap-3 md:gap-6">
            <button onClick={toggleSidebar} className="md:hidden p-2 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors" aria-label={t.toggleSidebar}>
                <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 select-none cursor-pointer group" onClick={() => window.location.reload()}>
                <div className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/30 dark:to-teal-800/30 p-2 rounded-xl border border-teal-200/50 dark:border-teal-700/30 shadow-sm hidden md:block group-hover:scale-105 transition-transform">
                    <Logo className="w-6 h-6 text-teal-600 dark:text-teal-400" />
                </div>
                <h1 className="text-xl font-bold tracking-tight font-sans text-stone-900 dark:text-stone-100">{t.appTitle}</h1>
            </div>
            
            {/* History Controls */}
            <div className="hidden sm:flex items-center p-1 bg-stone-100/50 dark:bg-stone-800/50 rounded-full border border-stone-200/50 dark:border-stone-700/50 backdrop-blur-sm">
                <button onClick={onUndo} disabled={!canUndo} className="p-1.5 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-white dark:hover:bg-stone-700 rounded-full transition-all disabled:opacity-30 disabled:hover:bg-transparent" dir="ltr" aria-label={t.undo}>
                    <Undo className={`w-4 h-4 ${language === 'ar' ? 'scale-x-[-1]' : ''}`} />
                </button>
                <div className="w-px h-3 bg-stone-300 dark:bg-stone-600 mx-0.5"></div>
                <button onClick={onRedo} disabled={!canRedo} className="p-1.5 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-white dark:hover:bg-stone-700 rounded-full transition-all disabled:opacity-30 disabled:hover:bg-transparent" dir="ltr" aria-label={t.redo}>
                    <Redo className={`w-4 h-4 ${language === 'ar' ? 'scale-x-[-1]' : ''}`} />
                </button>
            </div>
        </div>
        
        {/* Right: Actions */}
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
                onClick={() => onOpenModal('share')} // Use consolidated opener
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
                        onOpenModal={onOpenModal} // Pass consolidated opener
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
                        onExport={handleExport} // Pass the consolidated handler
                        t={t}
                    />
                )}
           </div>
        </div>
      </header>
  );
};