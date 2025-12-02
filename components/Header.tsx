
import React, { useState, memo } from 'react';
import { Person, Language, TreeSettings, ChartType, UserProfile, AppTheme } from '../types';
import { exportToGEDCOM } from '../utils/gedcomLogic';
import { exportToJozorArchive } from '../utils/archiveLogic';
import { generateICS } from '../utils/calendarLogic';
import { getTranslation } from '../utils/translations';
import { 
  Printer, FileText, ChevronDown, Undo, Redo, Search, Moon, Sun, X, 
  Archive, SlidersHorizontal, Eye, Check, ArrowRightLeft, ArrowUpDown, 
  Calculator, Menu, Hammer, Activity, CircleDashed, Share2, Network, 
  GitGraph, Cloud, LogOut, AlertCircle, ShieldCheck, Calendar, BookOpen,
  Map, MonitorPlay, Palette, Zap, Download, LayoutGrid, List
} from 'lucide-react';
import { Logo } from './Logo';
import { LoginButton } from './LoginButton';

// --- Shared Styles ---
const DROPDOWN_CONTAINER = "absolute top-full mt-2 w-64 p-1.5 bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl border border-stone-200/50 dark:border-stone-700/50 rounded-2xl shadow-float z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right ring-1 ring-black/5";
const MENU_ITEM_BASE = "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all group relative overflow-hidden";
const ICON_WRAPPER = "p-1.5 rounded-lg bg-stone-50 dark:bg-stone-800 group-hover:bg-white dark:group-hover:bg-stone-700 text-stone-500 group-hover:text-teal-600 dark:text-stone-400 dark:group-hover:text-teal-400 transition-colors shadow-sm";
const DIVIDER = "h-px bg-stone-100 dark:bg-stone-800 my-1 mx-2";
const HEADER_LABEL = "px-3 py-1.5 text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2";

// --- Sub-Components (Memoized) ---

const ExportMenu = memo(({
    onClose, onExportJozor, onExportJSON, onExportGEDCOM, onExportICS, onPrint, t
}: {
    onClose: () => void;
    onExportJozor: () => void;
    onExportJSON: () => void;
    onExportGEDCOM: () => void;
    onExportICS: () => void;
    onPrint: () => void;
    t: any;
}) => (
    <>
        <div className="fixed inset-0 z-10" onClick={onClose}></div>
        <div className={`${DROPDOWN_CONTAINER} end-0`}>
            <div className={HEADER_LABEL}><Download className="w-3 h-3" /> {t.downloadAs}</div>
            
            <button onClick={onExportJozor} className={`${MENU_ITEM_BASE} bg-teal-50/50 dark:bg-teal-900/10 hover:!bg-teal-50 dark:hover:!bg-teal-900/30`}>
                <div className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400 shadow-sm">
                    <Archive className="w-4 h-4"/>
                </div>
                <div className="flex flex-col items-start gap-0.5">
                    <span className="font-bold text-teal-900 dark:text-teal-100">{t.jozorArchive}</span>
                    <span className="text-[9px] text-teal-600/70 dark:text-teal-300/70">{t.photosData}</span>
                </div>
            </button>
            
            <div className={DIVIDER}></div>
            
            <button onClick={onExportICS} className={MENU_ITEM_BASE}>
                <div className={ICON_WRAPPER}><Calendar className="w-3.5 h-3.5"/></div>
                {t.calendarExport}
            </button>
            <button onClick={onExportJSON} className={MENU_ITEM_BASE}>
                <div className={ICON_WRAPPER}><FileText className="w-3.5 h-3.5"/></div>
                {t.jsonFile}
            </button>
            <button onClick={onExportGEDCOM} className={MENU_ITEM_BASE}>
                <div className={ICON_WRAPPER}><FileText className="w-3.5 h-3.5"/></div>
                {t.gedcomFile}
            </button>
            
            <div className={DIVIDER}></div>
            
            <button onClick={onPrint} className={MENU_ITEM_BASE}>
                <div className={ICON_WRAPPER}><Printer className="w-3.5 h-3.5"/></div>
                {t.printPdf}
            </button>
        </div>
    </>
));

const ToolsMenu = memo(({
    onClose, onStats, onCalc, onConsistency, onTimeline, onStory, onMap, t
}: {
    onClose: () => void;
    onStats: () => void;
    onCalc: () => void;
    onConsistency: () => void;
    onTimeline: () => void;
    onStory: () => void;
    onMap: () => void;
    t: any;
}) => (
    <>
        <div className="fixed inset-0 z-10" onClick={onClose}></div>
        <div className={`${DROPDOWN_CONTAINER} end-0`}>
            <button onClick={onStory} className={`${MENU_ITEM_BASE} mb-1 !bg-amber-50 dark:!bg-amber-900/10 hover:!bg-amber-100 dark:hover:!bg-amber-900/30 !text-amber-800 dark:!text-amber-200`}>
                <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400">
                    <BookOpen className="w-3.5 h-3.5"/>
                </div>
                <span className="font-bold">{t.familyStory}</span>
            </button>
            
            <div className={DIVIDER}></div>
            
            <button onClick={onMap} className={MENU_ITEM_BASE}>
                <div className={`${ICON_WRAPPER} !text-green-600 bg-green-50 dark:bg-green-900/20`}><Map className="w-3.5 h-3.5"/></div>
                {t.viewOnMap}
            </button>
            <button onClick={onTimeline} className={MENU_ITEM_BASE}>
                <div className={`${ICON_WRAPPER} !text-blue-500 bg-blue-50 dark:bg-blue-900/20`}><Calendar className="w-3.5 h-3.5"/></div>
                {t.familyTimeline}
            </button>
            <button onClick={onStats} className={MENU_ITEM_BASE}>
                <div className={`${ICON_WRAPPER} !text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20`}><Activity className="w-3.5 h-3.5"/></div>
                {t.familyStatistics}
            </button>
            <button onClick={onConsistency} className={MENU_ITEM_BASE}>
                <div className={`${ICON_WRAPPER} !text-orange-500 bg-orange-50 dark:bg-orange-900/20`}><ShieldCheck className="w-3.5 h-3.5"/></div>
                {t.consistencyChecker}
            </button>
            <button onClick={onCalc} className={MENU_ITEM_BASE}>
                <div className={`${ICON_WRAPPER} !text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20`}><Calculator className="w-3.5 h-3.5"/></div>
                {t.relationshipCalculator}
            </button>
        </div>
    </>
));

const ViewSettingsMenu = memo(({
    settings, onUpdate, onClose, onPresent, t
}: {
    settings: TreeSettings;
    onUpdate: (s: TreeSettings) => void;
    onClose: () => void;
    onPresent: () => void;
    t: any;
}) => {
    const chartOptions = [
        { id: 'descendant', label: t.descendantChart, icon: <GitGraph className="w-3.5 h-3.5"/> },
        { id: 'fan', label: t.fanChart, icon: <CircleDashed className="w-3.5 h-3.5"/> },
        { id: 'pedigree', label: t.pedigreeChart, icon: <Share2 className="w-3.5 h-3.5 rotate-90"/> },
        { id: 'force', label: t.forceChart, icon: <Network className="w-3.5 h-3.5"/> },
    ];

    const themes: {id: AppTheme, label: string, colorClass: string, borderClass: string}[] = [
        { id: 'modern', label: 'Modern', colorClass: 'bg-stone-50', borderClass: 'border-stone-200' },
        { id: 'vintage', label: 'Vintage', colorClass: 'bg-[#f4e4bc]', borderClass: 'border-[#d4c5a3]' },
        { id: 'blueprint', label: 'Blueprint', colorClass: 'bg-[#1e3a8a]', borderClass: 'border-blue-400' },
    ];

    return (
        <>
            <div className="fixed inset-0 z-10" onClick={onClose}></div>
            <div className={`${DROPDOWN_CONTAINER} w-72 end-0`}>
                <div className={HEADER_LABEL}><Eye className="w-3 h-3" /> {t.chartType}</div>
                <div className="grid grid-cols-1 gap-1 px-1">
                    {chartOptions.map((type) => (
                        <button 
                            key={type.id}
                            onClick={() => onUpdate({ ...settings, chartType: type.id as ChartType })}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                                settings.chartType === type.id 
                                ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 ring-1 ring-teal-200 dark:ring-teal-800' 
                                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'
                            }`}
                        >
                            <div className="flex items-center gap-2.5">
                                <div className={`p-1 rounded-md ${settings.chartType === type.id ? 'bg-teal-100 text-teal-600' : 'bg-stone-100 text-stone-500'}`}>{type.icon}</div>
                                {type.label}
                            </div>
                            {settings.chartType === type.id && <Check className="w-3 h-3 text-teal-600"/>}
                        </button>
                    ))}
                </div>

                <div className={DIVIDER}></div>
                <div className={HEADER_LABEL}><Palette className="w-3 h-3" /> Theme</div>
                <div className="grid grid-cols-3 gap-2 px-3 pb-1">
                    {themes.map(th => (
                        <button 
                            key={th.id}
                            onClick={() => onUpdate({ ...settings, theme: th.id })}
                            className={`relative h-14 rounded-xl border-2 transition-all overflow-hidden flex flex-col items-center justify-center gap-1 ${
                                settings.theme === th.id 
                                ? 'ring-2 ring-teal-500 ring-offset-2 dark:ring-offset-stone-900 border-transparent' 
                                : 'border-transparent hover:scale-105'
                            }`}
                        >
                            <div className={`absolute inset-0 ${th.colorClass} opacity-80`}></div>
                            {th.id === 'blueprint' && <div className="absolute inset-0 bg-[radial-gradient(#ffffff33_1px,transparent_1px)] [background-size:8px_8px]"></div>}
                            <span className={`relative z-10 text-[9px] font-bold uppercase tracking-wider ${th.id === 'blueprint' ? 'text-white' : 'text-stone-800'}`}>{th.label}</span>
                        </button>
                    ))}
                </div>

                <div className={DIVIDER}></div>
                
                {settings.chartType === 'descendant' && (
                    <>
                        <div className={HEADER_LABEL}><LayoutGrid className="w-3 h-3" /> {t.layout}</div>
                        <div className="grid grid-cols-3 gap-1 px-3 pb-2">
                            {(['vertical', 'horizontal', 'radial'] as const).map(mode => (
                                <button key={mode} onClick={() => onUpdate({ ...settings, layoutMode: mode })} 
                                    className={`flex flex-col items-center justify-center p-2 rounded-xl border transition-all ${
                                        settings.layoutMode === mode 
                                        ? 'bg-teal-50 border-teal-200 text-teal-600 dark:bg-teal-900/30 dark:border-teal-800 dark:text-teal-300' 
                                        : 'bg-transparent border-stone-100 dark:border-stone-700 text-stone-500 hover:bg-stone-50'
                                    }`}>
                                    {mode === 'vertical' ? <ArrowUpDown className="w-4 h-4 mb-1" /> : mode === 'horizontal' ? <ArrowRightLeft className="w-4 h-4 mb-1" /> : <CircleDashed className="w-4 h-4 mb-1" />}
                                    <span className="text-[8px] font-bold uppercase">{t[mode]}</span>
                                </button>
                            ))}
                        </div>
                        <div className={DIVIDER}></div>
                    </>
                )}

                {settings.chartType === 'force' && (
                    <>
                        <button 
                            onClick={() => onUpdate({ ...settings, enableForcePhysics: !settings.enableForcePhysics })} 
                            className={`${MENU_ITEM_BASE} justify-between`}
                        >
                            <span className="flex items-center gap-2.5">
                                <div className="p-1 rounded-md bg-orange-100 text-orange-600"><Zap className="w-3.5 h-3.5"/></div>
                                Physics
                            </span>
                            <div className={`w-8 h-4 rounded-full p-0.5 relative transition-colors duration-300 ${settings.enableForcePhysics ? 'bg-orange-500' : 'bg-stone-300 dark:bg-stone-600'}`}>
                                <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-300 ${settings.enableForcePhysics ? 'translate-x-4 rtl:-translate-x-4' : ''}`}></div>
                            </div>
                        </button>
                        <div className={DIVIDER}></div>
                    </>
                )}

                <div className="space-y-0.5 px-1">
                    {['showPhotos', 'showDates', 'showMinimap', 'isCompact'].map((key) => (
                        <button key={key} onClick={() => onUpdate({ ...settings, [key]: !settings[key as keyof TreeSettings] })} 
                            className="flex items-center justify-between w-full px-3 py-2 hover:bg-stone-50 dark:hover:bg-stone-800 rounded-lg group transition-colors"
                        >
                            <span className="text-xs font-medium text-stone-600 dark:text-stone-300">{t[key as keyof typeof t] || key}</span>
                            <div className={`w-7 h-4 rounded-full p-0.5 relative transition-colors duration-300 ${settings[key as keyof TreeSettings] ? 'bg-teal-500' : 'bg-stone-200 dark:bg-stone-700'}`}>
                                <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-300 ${settings[key as keyof TreeSettings] ? 'translate-x-3 rtl:-translate-x-3' : ''}`}></div>
                            </div>
                        </button>
                    ))}
                </div>

                <div className={DIVIDER}></div>
                <button onClick={onPresent} className={`${MENU_ITEM_BASE} !text-purple-600 hover:!bg-purple-50 dark:!text-purple-300 dark:hover:!bg-purple-900/20`}>
                    <div className="p-1 rounded-md bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300"><MonitorPlay className="w-3.5 h-3.5"/></div>
                    Present Mode
                </button>
            </div>
        </>
    );
});

const UserMenu = memo(({
    user, isDemoMode, onLogout, onClose, t
}: {
    user: UserProfile;
    isDemoMode: boolean;
    onLogout: () => void;
    onClose: () => void;
    t: any;
}) => (
    <>
        <div className="fixed inset-0 z-10" onClick={onClose}></div>
        <div className={`${DROPDOWN_CONTAINER} end-0`}>
            <div className="px-4 py-3 bg-stone-50/50 dark:bg-stone-800/50 rounded-t-2xl border-b border-stone-100 dark:border-stone-800">
                <p className="text-xs font-bold text-stone-900 dark:text-white truncate">{t.welcomeUser} {user.displayName.split(' ')[0]}</p>
                <p className="text-[10px] text-stone-500 truncate">{user.email}</p>
            </div>
            
            <div className="p-2">
                 <div className={`px-3 py-2 flex items-center gap-2 text-xs rounded-xl font-medium border ${isDemoMode ? 'bg-orange-50 border-orange-100 text-orange-700 dark:bg-orange-900/20 dark:border-orange-800 dark:text-orange-400' : 'bg-green-50 border-green-100 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400'}`}>
                    {isDemoMode ? <AlertCircle className="w-3.5 h-3.5" /> : <Cloud className="w-3.5 h-3.5" />}
                    {isDemoMode ? t.demoMode : t.synced}
                 </div>
            </div>

            <div className={DIVIDER}></div>

            <button onClick={onLogout} className={`${MENU_ITEM_BASE} text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20`}>
                <LogOut className="w-4 h-4"/> {t.logout}
            </button>
        </div>
    </>
));

const SearchResults = memo(({
    results, onFocus, onClose
}: {
    results: Person[], onFocus: (id: string) => void, onClose: () => void
}) => (
    <div className={`${DROPDOWN_CONTAINER} w-80 start-0 max-h-96 overflow-y-auto scrollbar-thin`}>
        {results.length === 0 && <div className="p-4 text-center text-xs text-stone-400 italic">No results found</div>}
        {results.map(p => (
            <button key={p.id} onClick={() => { onFocus(p.id); onClose(); }} className="w-full flex items-center gap-3 p-2 hover:bg-teal-50 dark:hover:bg-stone-800 rounded-xl transition-colors group text-start">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shadow-sm shrink-0 ${p.gender === 'male' ? 'bg-teal-100 text-teal-600 dark:bg-teal-900 dark:text-teal-300' : 'bg-pink-100 text-pink-600 dark:bg-pink-900 dark:text-pink-300'}`}>
                    {p.firstName[0]}
                </div>
                <div className="min-w-0">
                    <div className="text-sm font-semibold text-stone-700 dark:text-stone-200 group-hover:text-teal-600 dark:group-hover:text-teal-400 truncate">
                        {p.firstName} {p.lastName}
                    </div>
                    {p.birthDate && <div className="text-[10px] text-stone-400 font-mono">b. {p.birthDate}</div>}
                </div>
                <div className="ms-auto opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRightLeft className="w-3 h-3 text-stone-400" />
                </div>
            </button>
        ))}
    </div>
));

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
  onOpenTimeline: () => void;
  onOpenShare: () => void;
  onOpenStory: () => void;
  onOpenMap: () => void;
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
  onOpenCalculator, onOpenStats, onOpenConsistency, onOpenTimeline, onOpenShare, onOpenStory, onOpenMap, onPresent,
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
      <header className="h-16 bg-white/80 dark:bg-stone-950/80 backdrop-blur-md flex items-center px-4 md:px-6 justify-between border-b border-stone-200/50 dark:border-stone-800/50 z-30 print:hidden transition-all shadow-sm sticky top-0">
        
        {/* Left: Branding & History */}
        <div className="flex items-center gap-3 md:gap-6">
            <button onClick={toggleSidebar} className="md:hidden p-2 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors">
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
                <button onClick={onUndo} disabled={!canUndo} className="p-1.5 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-white dark:hover:bg-stone-700 rounded-full transition-all disabled:opacity-30 disabled:hover:bg-transparent" dir="ltr">
                    <Undo className={`w-4 h-4 ${language === 'ar' ? 'scale-x-[-1]' : ''}`} />
                </button>
                <div className="w-px h-3 bg-stone-300 dark:bg-stone-600 mx-0.5"></div>
                <button onClick={onRedo} disabled={!canRedo} className="p-1.5 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-white dark:hover:bg-stone-700 rounded-full transition-all disabled:opacity-30 disabled:hover:bg-transparent" dir="ltr">
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
                        onChange={(e) => handleSearch(e.target.value)} 
                        onFocus={() => setActiveMenu('search')} 
                        onBlur={() => setTimeout(() => setActiveMenu('none'), 200)} 
                        className="bg-transparent border-none outline-none text-xs font-medium text-stone-700 dark:text-stone-200 placeholder-stone-400 w-full" 
                    />
                    {searchQuery && (<button onClick={() => handleSearch('')} className="text-stone-400 hover:text-stone-600"><X className="w-3 h-3" /></button>)}
                </div>
                {activeMenu === 'search' && searchResults.length > 0 && (
                    <SearchResults results={searchResults} onFocus={onFocusPerson} onClose={() => handleSearch('')} />
                )}
           </div>

           <div className="h-6 w-px bg-stone-200 dark:bg-stone-800 hidden md:block mx-1"></div>

           {/* Share Button */}
           {user && (
               <button 
                onClick={onOpenShare}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-900/40"
                title={t.shareTree}
               >
                   <Share2 className="w-4 h-4" />
               </button>
           )}
           
           {/* Tools Dropdown */}
           <div className="relative">
                <button 
                    onClick={() => setActiveMenu(activeMenu === 'tools' ? 'none' : 'tools')} 
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${activeMenu === 'tools' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 dark:text-stone-400'}`}
                >
                    <Hammer className="w-4 h-4" />
                </button>
                {activeMenu === 'tools' && (
                    <ToolsMenu 
                        onClose={() => setActiveMenu('none')} 
                        onStats={() => { onOpenStats(); setActiveMenu('none'); }}
                        onCalc={() => { onOpenCalculator(); setActiveMenu('none'); }}
                        onConsistency={() => { onOpenConsistency(); setActiveMenu('none'); }}
                        onTimeline={() => { onOpenTimeline(); setActiveMenu('none'); }}
                        onStory={() => { onOpenStory && onOpenStory(); setActiveMenu('none'); }}
                        onMap={() => { onOpenMap && onOpenMap(); setActiveMenu('none'); }}
                        t={t}
                    />
                )}
           </div>

            {/* View Settings Dropdown */}
            <div className="relative">
                <button 
                    onClick={() => setActiveMenu(activeMenu === 'settings' ? 'none' : 'settings')} 
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all border ${activeMenu === 'settings' ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-600 border-teal-200' : 'hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 border-transparent'}`}
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
                <button onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')} className="w-9 h-9 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 flex items-center justify-center font-bold text-[10px]">{language === 'en' ? 'AR' : 'EN'}</button>
                <button onClick={() => setDarkMode(!darkMode)} className="w-9 h-9 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 flex items-center justify-center">{darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</button>
           </div>

            {/* Auth Section */}
            <div className="hidden sm:block">
                 {user ? (
                    <div className="relative">
                        <button onClick={() => setActiveMenu(activeMenu === 'user' ? 'none' : 'user')} className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors border border-transparent hover:border-stone-200 dark:hover:border-stone-700">
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
                <button onClick={() => setActiveMenu(activeMenu === 'export' ? 'none' : 'export')} className="px-5 py-2 text-xs font-semibold bg-stone-900 dark:bg-teal-600 text-white rounded-full shadow-lg flex items-center gap-2">
                    <span>{t.export}</span> <ChevronDown className="w-3 h-3 opacity-70"/>
                </button>
                {activeMenu === 'export' && (
                    <ExportMenu 
                        onClose={() => setActiveMenu('none')}
                        onExportJozor={async () => {
                            try { downloadFile(await exportToJozorArchive(people), "family.jozor", "application/octet-stream"); } 
                            catch(e) { alert("Archive creation failed"); }
                        }}
                        onExportICS={() => downloadFile(generateICS(people), "family_calendar.ics", "text/calendar")}
                        onExportJSON={() => downloadFile(JSON.stringify(people, null, 2), "tree.json", "application/json")}
                        onExportGEDCOM={() => downloadFile(exportToGEDCOM(people), "tree.ged", "application/octet-stream")}
                        onPrint={() => { setActiveMenu('none'); window.print(); }}
                        t={t}
                    />
                )}
           </div>
        </div>
      </header>
  );
};
