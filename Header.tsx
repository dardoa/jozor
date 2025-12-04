import React, { useState } from 'react';
import { Person, Language, TreeSettings, ChartType, UserProfile } from '../types';
import { exportToGEDCOM } from '../utils/gedcomLogic';
import { exportToJozorArchive } from '../utils/archiveLogic';
import { getTranslation } from '../utils/translations';
import { 
  Printer, FileText, ChevronDown, Undo, Redo, Search, Moon, Sun, X, 
  Archive, SlidersHorizontal, Eye, Check, ArrowRightLeft, ArrowUpDown, 
  Calculator, Menu, Hammer, Activity, CircleDashed, Share2, Network, 
  GitGraph, Cloud, LogOut, AlertCircle, ShieldCheck
} from 'lucide-react';
import { Logo } from './Logo';
import { LoginButton } from './LoginButton';

// Import new sub-components
import { ExportMenu } from './header/ExportMenu';
import { ToolsMenu } from './header/ToolsMenu';
import { ViewSettingsMenu } from './header/ViewSettingsMenu';
import { UserMenu } from './header/UserMenu';

// --- Main Header ---

interface HeaderProps {
  people: Record<string, Person>;
  onImport: () => void;
  onImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
  onOpenCalculator: () => void;
  onOpenStats: () => void;
  onOpenConsistency: () => void;
  user: UserProfile | null;
  isDemoMode?: boolean;
  onLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
}

export const Header: React.FC<HeaderProps> = ({
  people, onUndo, onRedo, canUndo, canRedo,
  darkMode, setDarkMode, onFocusPerson, language, setLanguage,
  treeSettings, setTreeSettings, toggleSidebar, onOpenCalculator, onOpenStats, onOpenConsistency,
  user, isDemoMode = false, onLogin, onLogout
}) => {
  const [activeMenu, setActiveMenu] = useState<'none' | 'export' | 'settings' | 'tools' | 'search' | 'user'>('none');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Person[]>([]);
  const t = getTranslation(language);

  // File Download Helper
  const downloadFile = (content: string | Blob, filename: string, type: string) => {
    const url = URL.createObjectURL(content instanceof Blob ? content : new Blob([content], {type}));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setActiveMenu('none');
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

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
      <header className="h-16 bg-white/90 dark:bg-gray-900/95 backdrop-blur-md flex items-center px-4 md:px-6 justify-between border-b border-gray-200 dark:border-gray-800 z-30 print:hidden transition-all shadow-sm">
        
        {/* Left: Branding & History */}
        <div className="flex items-center gap-3 md:gap-6">
            <button onClick={toggleSidebar} className="md:hidden p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
                <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 select-none">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-2 rounded-xl border border-blue-200/50 dark:border-blue-700/30 shadow-sm hidden md:block">
                    <Logo className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h1 className="text-xl font-bold tracking-tight font-sans text-gray-900 dark:text-gray-100">{t.appTitle}</h1>
            </div>
            <div className="hidden sm:flex items-center p-1 bg-gray-100/80 dark:bg-gray-800/80 rounded-full border border-gray-200 dark:border-gray-700">
                <button onClick={onUndo} disabled={!canUndo} className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-white dark:hover:bg-gray-700 rounded-full transition-all disabled:opacity-30 disabled:hover:bg-transparent shadow-none hover:shadow-sm" dir="ltr">
                    <Undo className={`w-4 h-4 ${language === 'ar' ? 'scale-x-[-1]' : ''}`} />
                </button>
                <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-0.5"></div>
                <button onClick={onRedo} disabled={!canRedo} className="p-1.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white hover:bg-white dark:hover:bg-gray-700 rounded-full transition-all disabled:opacity-30 disabled:hover:bg-transparent shadow-none hover:shadow-sm" dir="ltr">
                    <Redo className={`w-4 h-4 ${language === 'ar' ? 'scale-x-[-1]' : ''}`} />
                </button>
            </div>
        </div>
        
        {/* Right: Actions */}
        <div className="flex items-center gap-2 md:gap-4">
           {/* Search */}
           <div className="relative group hidden lg:block">
                <div className={`flex items-center gap-2.5 bg-gray-100/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 focus-within:bg-white dark:focus-within:bg-gray-900 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 rounded-full px-4 py-2 transition-all w-60 hover:bg-gray-100 dark:hover:bg-gray-800`}>
                    <Search className="w-4 h-4 text-gray-400 group-focus-within:text-blue-500" />
                    <input 
                        type="text" 
                        placeholder={t.searchPlaceholder} 
                        value={searchQuery} 
                        onChange={(e) => handleSearch(e.target.value)} 
                        onFocus={() => setActiveMenu('search')} 
                        onBlur={() => setTimeout(() => setActiveMenu('none'), 200)} 
                        className="bg-transparent border-none outline-none text-xs font-medium text-gray-700 dark:text-gray-200 placeholder-gray-400 w-full" 
                    />
                    {searchQuery && (<button onClick={() => handleSearch('')} className="text-gray-400"><X className="w-3 h-3" /></button>)}
                </div>
                {activeMenu === 'search' && searchResults.length > 0 && (
                    <div className="absolute top-full start-0 mt-3 w-72 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 py-2 overflow-hidden z-50">
                        {searchResults.map(p => (
                            <button key={p.id} onClick={() => { onFocusPerson(p.id); handleSearch(''); }} className="w-full text-start px-4 py-2.5 hover:bg-blue-50 dark:hover:bg-gray-700 flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">{p.firstName[0]}</div>
                                <div className="text-sm font-semibold text-gray-700 dark:text-gray-200">{p.firstName} {p.lastName}</div>
                            </button>
                        ))}
                    </div>
                )}
           </div>

           <div className="h-6 w-px bg-gray-200 dark:bg-gray-800 hidden md:block"></div>
           
           {/* Tools Dropdown */}
           <div className="relative">
                <button 
                    onClick={() => setActiveMenu(activeMenu === 'tools' ? 'none' : 'tools')} 
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-all border hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 border-transparent"
                >
                    <Hammer className="w-4 h-4" />
                </button>
                {activeMenu === 'tools' && (
                    <ToolsMenu 
                        onClose={() => setActiveMenu('none')} 
                        onOpenModal={(modalType) => {
                            if (modalType === 'calculator') onOpenCalculator();
                            else if (modalType === 'stats') onOpenStats();
                            else if (modalType === 'consistency') onOpenConsistency();
                            // Add other modal types here if needed
                            setActiveMenu('none');
                        }}
                        t={t}
                    />
                )}
           </div>

            {/* View Settings Dropdown */}
            <div className="relative">
                <button 
                    onClick={() => setActiveMenu(activeMenu === 'settings' ? 'none' : 'settings')} 
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all border ${activeMenu === 'settings' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 border-blue-200' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 border-transparent'}`}
                >
                    <SlidersHorizontal className="w-4 h-4" />
                </button>
                {activeMenu === 'settings' && (
                    <ViewSettingsMenu 
                        settings={treeSettings} 
                        onUpdate={setTreeSettings} 
                        onClose={() => setActiveMenu('none')} 
                        onPresent={() => { /* onPresent logic */ setActiveMenu('none'); }}
                        t={t}
                    />
                )}
            </div>

           <div className="hidden sm:flex items-center gap-1">
                <button onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')} className="w-9 h-9 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 flex items-center justify-center font-bold text-[10px]">{language === 'en' ? 'AR' : 'EN'}</button>
                <button onClick={() => setDarkMode(!darkMode)} className="w-9 h-9 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 flex items-center justify-center">{darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</button>
           </div>

            {/* Auth Section */}
            <div className="hidden sm:block">
                 {user ? (
                    <div className="relative">
                        <button onClick={() => setActiveMenu(activeMenu === 'user' ? 'none' : 'user')} className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-700">
                             <img src={user.photoURL} alt={user.displayName} className="w-7 h-7 rounded-full object-cover border border-gray-200 dark:border-gray-600" />
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
                <button onClick={() => setActiveMenu(activeMenu === 'export' ? 'none' : 'export')} className="px-5 py-2 text-xs font-semibold bg-gray-900 dark:bg-blue-600 text-white rounded-full shadow-lg flex items-center gap-2">
                    <span>{t.export}</span> <ChevronDown className="w-3 h-3 opacity-70"/>
                </button>
                {activeMenu === 'export' && (
                    <ExportMenu 
                        onClose={() => setActiveMenu('none')}
                        onExport={async (type) => {
                            try { 
                                if (type === 'jozor') downloadFile(await exportToJozorArchive(people), "family.jozor", "application/octet-stream"); 
                                else if (type === 'json') downloadFile(JSON.stringify(people, null, 2), "tree.json", "application/json");
                                else if (type === 'gedcom') downloadFile(exportToGEDCOM(people), "tree.ged", "application/octet-stream");
                                else if (type === 'print') window.print();
                            } 
                            catch(e) { alert(`Export to ${type} failed`); }
                        }}
                        t={t}
                    />
                )}
           </div>
        </div>
      </header>
  );
};