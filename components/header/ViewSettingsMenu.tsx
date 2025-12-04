import React, { memo } from 'react'; // Removed useEffect as it's no longer needed
import { TreeSettings, ChartType, AppTheme } from '../../types';
import { 
  SlidersHorizontal, Eye, Check, ArrowRightLeft, ArrowUpDown, 
  CircleDashed, Share2, Network, GitGraph, MonitorPlay, Palette, Zap, LayoutGrid
} from 'lucide-react';
import { DropdownMenuContainer, DropdownMenuItem, DropdownMenuDivider, DropdownMenuHeader } from '../ui/DropdownMenu';

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
        { id: 'descendant', label: t.descendant, icon: <GitGraph className="w-3.5 h-3.5"/> }, // Corrected key
        { id: 'fan', label: t.fan, icon: <CircleDashed className="w-3.5 h-3.5"/> },             // Corrected key
        { id: 'pedigree', label: t.pedigree, icon: <Share2 className="w-3.5 h-3.5 rotate-90"/> }, // Corrected key
        { id: 'force', label: t.force, icon: <Network className="w-3.5 h-3.5"/> },               // Corrected key
    ];

    const themes: {id: AppTheme, label: string, colorClass: string, borderClass: string}[] = [
        { id: 'modern', label: 'Modern', colorClass: 'bg-stone-50', borderClass: 'border-stone-200' },
        { id: 'vintage', label: 'Vintage', colorClass: 'bg-[#f4e4bc]', borderClass: 'border-[#d4c5a3]' },
        { id: 'blueprint', label: 'Blueprint', colorClass: 'bg-[#1e3a8a]', borderClass: 'border-blue-400' },
    ];

    // Removed debugging log as the issue is identified
    // useEffect(() => {
    //     chartOptions.forEach(option => {
    //         console.log(`Chart Option Label for ${option.id}:`, option.label);
    //     });
    // }, [chartOptions]);

    return (
        <>
            <div className="fixed inset-0 z-10" onClick={onClose}></div>
            <DropdownMenuContainer className="end-0 w-72">
                <DropdownMenuHeader icon={<Eye className="w-3 h-3" />} label={t.chartType} />
                <div className="grid grid-cols-1 gap-1 px-1">
                    {chartOptions.map((type) => (
                        <DropdownMenuItem 
                            key={type.id}
                            onClick={() => onUpdate({ ...settings, chartType: type.id as ChartType })}
                            isActive={settings.chartType === type.id}
                            icon={type.icon}
                            label={type.label} 
                            className="justify-between"
                        >
                            {settings.chartType === type.id && <Check className="w-3 h-3 text-teal-600"/>}
                        </DropdownMenuItem>
                    ))}
                </div>

                <DropdownMenuDivider />
                <DropdownMenuHeader icon={<Palette className="w-3 h-3" />} label="Theme" />
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

                <DropdownMenuDivider />
                
                {settings.chartType === 'descendant' && (
                    <>
                        <DropdownMenuHeader icon={<LayoutGrid className="w-3 h-3" />} label={t.layout} />
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
                        <DropdownMenuDivider />
                    </>
                )}

                {settings.chartType === 'force' && (
                    <>
                        <DropdownMenuItem 
                            onClick={() => onUpdate({ ...settings, enableForcePhysics: !settings.enableForcePhysics })} 
                            icon={<Zap className="w-3.5 h-3.5"/>}
                            label="Physics"
                            // Removed colorClass, iconBgClass, iconTextColorClass to use default debugging styles
                        >
                            <div className={`w-7 h-4 rounded-full p-0.5 relative transition-colors duration-300 ${settings.enableForcePhysics ? 'bg-orange-500' : 'bg-stone-300 dark:bg-stone-600'}`}>
                                <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-300 ${settings.enableForcePhysics ? 'translate-x-3 rtl:-translate-x-3' : ''}`}></div>
                            </div>
                        </DropdownMenuItem>
                        <DropdownMenuDivider />
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

                <DropdownMenuDivider />
                <DropdownMenuItem 
                    onClick={onPresent} 
                    icon={<MonitorPlay className="w-3.5 h-3.5"/>}
                    label="Present Mode"
                    // Removed colorClass, iconBgClass, iconTextColorClass to use default debugging styles
                />
            </DropdownMenuContainer>
        </>
    );
});