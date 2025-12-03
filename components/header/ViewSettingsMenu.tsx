import React, { memo } from 'react';
import { TreeSettings, ChartType, AppTheme } from '../../types';
import { 
  SlidersHorizontal, Eye, Check, ArrowRightLeft, ArrowUpDown, 
  CircleDashed, Share2, Network, GitGraph, MonitorPlay, Palette, Zap, LayoutGrid
} from 'lucide-react';

// --- Shared Styles ---
const DROPDOWN_CONTAINER = "absolute top-full mt-2 w-64 p-1.5 bg-white/95 dark:bg-stone-950/95 backdrop-blur-xl border border-stone-200/50 dark:border-stone-700/50 rounded-2xl shadow-float z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right ring-1 ring-black/5";
const MENU_ITEM_BASE = "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all group relative overflow-hidden";
const DIVIDER = "h-px bg-stone-100 dark:bg-stone-800 my-1 mx-2";
const HEADER_LABEL = "px-3 py-1.5 text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2";

export const ViewSettingsMenu = memo(({
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
                            <div className={`w-7 h-4 rounded-full p-0.5 relative transition-colors duration-300 ${settings.enableForcePhysics ? 'bg-orange-500' : 'bg-stone-300 dark:bg-stone-600'}`}>
                                <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-300 ${settings.enableForcePhysics ? 'translate-x-3 rtl:-translate-x-3' : ''}`}></div>
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