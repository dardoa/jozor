import React, { memo, useState, useEffect } from 'react';
import {
    X, Layout, Palette, Spline, CheckSquare, Settings,
    Activity, MonitorPlay, RotateCcw, Languages, Sun, Moon,
    Type, Move, Eye, Ghost, Clock, Grid, Zap
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { DEFAULT_TREE_SETTINGS } from '../../constants';
import { useTranslation } from '../../context/TranslationContext';
import { TreeSettings } from '../../types';

const SectionHeader = ({ icon: Icon, label, onReset, language }: { icon: any, label: string, onReset?: () => void, language: string }) => (
    <div className="flex items-center justify-between mb-4 mt-6 first:mt-0">
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-500 flex items-center gap-2.5">
            <Icon className="w-4 h-4" />
            {label}
        </h3>
        {onReset && (
            <button
                type="button"
                onClick={onReset}
                className="text-[9px] font-bold uppercase tracking-widest text-slate-400 hover:text-amber-400 px-2 py-1 rounded-full hover:bg-white/5 transition-colors"
            >
                {language === 'ar' ? 'إعادة ضبط' : 'Reset'}
            </button>
        )}
    </div>
);

const Checkbox = ({ label, value, onChange, icon: Icon }: { label: string, value: boolean, onChange: (v: boolean) => void, icon?: any }) => (
    <label className="flex items-center justify-between group cursor-pointer py-2 px-3 rounded-xl hover:bg-white/5 transition-colors select-none">
        <div className="flex items-center gap-3">
            {Icon && <Icon className={`w-4 h-4 ${value ? 'text-amber-500' : 'text-slate-500'}`} />}
            <span className={`text-xs font-bold transition-colors ${value ? 'text-slate-50' : 'text-slate-400'}`}>{label}</span>
        </div>
        <div className="relative">
            <input
                type="checkbox"
                className="sr-only"
                checked={value}
                onChange={(e) => onChange(e.target.checked)}
            />
            <div className={`w-8 h-4 rounded-full transition-colors ${value ? 'bg-amber-500/30' : 'bg-slate-700'}`}>
                <div className={`absolute top-0.5 w-3 h-3 rounded-full transition-all duration-300 ${value ? 'right-0.5 bg-amber-500 scale-110 shadow-[0_0_8px_rgba(245,158,11,0.6)]' : 'right-4.5 bg-slate-400'}`} />
            </div>
        </div>
    </label>
);

const SliderField = ({ label, value, onChange, min, max, step, unit, icon: Icon }: { label: string, value: number, onChange: (v: number) => void, min: number, max: number, step: number, unit: string, icon?: any }) => (
    <div className="flex flex-col gap-2 py-2 px-3">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
                {Icon && <Icon className="w-3.5 h-3.5 text-slate-500" />}
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
            </div>
            <span className="text-[10px] font-black text-amber-500">{value}{unit}</span>
        </div>
        <input
            type="range" min={min} max={max} step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-full h-1 bg-slate-700 rounded-full appearance-none accent-amber-500 cursor-pointer"
        />
    </div>
);

const LayoutContent = ({ isRtl, treeSettings, updateSetting, resetSection, localWidth, setLocalWidth, localTextSize, setLocalTextSize, localSpacingX, setLocalSpacingX, localSpacingY, setLocalSpacingY, language }: any) => (
    <>
        {/* Section: Chart Type */}
        <div>
            <SectionHeader icon={Grid} label={isRtl ? 'تخطيط الشجرة' : 'Layout Engine'} onReset={() => resetSection('layout')} language={language} />
            <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                    { id: 'descendant', label: isRtl ? 'سلالة' : 'Descendant', icon: Layout },
                    { id: 'fan', label: isRtl ? 'مروحي' : 'Fan/Radial', icon: RotateCcw },
                    { id: 'pedigree', label: isRtl ? 'نسب' : 'Pedigree', icon: Move },
                    { id: 'force', label: isRtl ? 'ديناميكي' : 'Dynamic', icon: Activity },
                ].map(opt => (
                    <button
                        key={opt.id}
                        onClick={() => updateSetting('chartType', opt.id)}
                        className={`flex items-center gap-2 px-3 py-3 rounded-xl text-[10px] font-bold transition-all border ${treeSettings.chartType === opt.id ? 'bg-amber-500 border-amber-500 text-slate-900 shadow-lg' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
                    >
                        <opt.icon className="w-3.5 h-3.5" /> {opt.label}
                    </button>
                ))}
            </div>

            {treeSettings.chartType !== 'force' && (
                <div className="bg-black/20 p-1 rounded-xl flex gap-1">
                    {[
                        { id: 'vertical', label: isRtl ? 'رأسي' : 'Vertical' },
                        { id: 'horizontal', label: isRtl ? 'أفقي' : 'Horizontal' },
                        { id: 'radial', label: isRtl ? 'قطري' : 'Radial' }
                    ].map(mode => (
                        <button
                            key={mode.id}
                            onClick={() => updateSetting('layoutMode', mode.id)}
                            className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${treeSettings.layoutMode === mode.id ? 'bg-white/10 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            {mode.label}
                        </button>
                    ))}
                </div>
            )}
        </div>

        {/* Section: Metrics */}
        <div>
            <SectionHeader icon={Move} label={isRtl ? 'المقاييس' : 'Visual Metrics'} onReset={() => resetSection('metrics')} language={language} />
            <div className="space-y-1 bg-white/5 rounded-2xl p-2">
                <SliderField label="Box Width" value={localWidth} onChange={setLocalWidth} min={120} max={300} step={10} unit="PX" icon={Type} />
                <SliderField label="Text Size" value={localTextSize} onChange={setLocalTextSize} min={8} max={20} step={1} unit="PX" icon={Type} />
                <SliderField label="H-Spacing" value={localSpacingX} onChange={setLocalSpacingX} min={40} max={400} step={10} unit="PX" icon={Move} />
                <SliderField label="V-Spacing" value={localSpacingY} onChange={setLocalSpacingY} min={40} max={400} step={10} unit="PX" icon={Move} />
            </div>
        </div>

        {/* Section: Nodes & Lines */}
        <div>
            <SectionHeader icon={Spline} label={isRtl ? 'العُقَد والروابط' : 'Nodes & Lines'} onReset={() => resetSection('nodesLines')} language={language} />
            <div className="space-y-1 bg-white/5 rounded-2xl p-2">
                {treeSettings.chartType !== 'fan' && treeSettings.chartType !== 'force' && (
                    <Checkbox
                        label={isRtl ? 'نمط عقد مضغوطة للعائلات الكبيرة' : 'Compact nodes for dense trees'}
                        value={!!treeSettings.isCompact}
                        onChange={v => updateSetting('isCompact', v)}
                    />
                )}
                <SliderField
                    label={isRtl ? 'عدد الأجيال المعروضة' : 'Visible generations'}
                    value={treeSettings.generationLimit}
                    onChange={v => updateSetting('generationLimit', v)}
                    min={1}
                    max={10}
                    step={1}
                    unit=""
                />

                {treeSettings.chartType !== 'fan' && treeSettings.chartType !== 'force' && (
                    <>
                        <div className="h-px bg-white/5 my-2 mx-3" />
                        <div className="px-3 py-1 space-y-2">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{isRtl ? 'شكل الروابط' : 'Line style'}</span>
                            <div className="grid grid-cols-3 gap-1">
                                {['curved', 'straight', 'step'].map(st => (
                                    <button
                                        key={st}
                                        onClick={() => updateSetting('lineStyle', st)}
                                        className={`px-2 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all ${treeSettings.lineStyle === st ? 'bg-amber-500/30 border-amber-400 text-amber-100' : 'bg-white/0 border-white/5 text-slate-400'}`}
                                    >
                                        {st}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <SliderField label="Line thickness" value={treeSettings.lineThickness || 2} onChange={v => updateSetting('lineThickness', v)} min={1} max={6} step={1} unit="px" />
                    </>
                )}

                <div className="h-px bg-white/5 my-2 mx-3" />
                <div className="px-3 py-1 space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{isRtl ? 'منطق ألوان العقد' : 'Node color logic'}</span>
                    <div className="grid grid-cols-3 gap-1">
                        {['gender', 'lineage', 'none'].map(logic => (
                            <button
                                key={logic}
                                onClick={() => updateSetting('boxColorLogic', logic)}
                                className={`px-2 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all ${treeSettings.boxColorLogic === logic ? 'bg-amber-500/30 border-amber-400 text-amber-100' : 'bg-white/0 border-white/5 text-slate-400'}`}
                            >
                                {logic}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* Section: Advanced Graph */}
        {(treeSettings.chartType === 'force' || treeSettings.chartType === 'descendant') && (
            <div>
                <SectionHeader icon={Activity} label={isRtl ? 'مخطط متقدم' : 'Advanced Graph'} onReset={() => resetSection('advancedGraph')} language={language} />
                <div className="space-y-1 bg-white/5 rounded-2xl p-2">
                    {treeSettings.chartType === 'force' && (
                        <>
                            <Checkbox label={isRtl ? 'تفعيل فيزياء مخطط القوة' : 'Enable force physics'} value={!!treeSettings.enableForcePhysics} onChange={v => updateSetting('enableForcePhysics', v)} />
                            {treeSettings.enableForcePhysics && <SliderField label="Time scale" value={treeSettings.timeScaleFactor || 5} onChange={v => updateSetting('timeScaleFactor', v)} min={1} max={10} step={1} unit="x" />}
                        </>
                    )}
                    <Checkbox label={isRtl ? 'تمييز فرع التركيز' : 'Highlight focus branch'} value={!!treeSettings.highlightBranch} onChange={v => updateSetting('highlightBranch', v)} />
                </div>
            </div>
        )}
    </>
);

const VisualsContent = ({ isRtl, treeSettings, updateSetting, resetSection, applyPreset, darkMode, setDarkMode, language, setLanguage }: any) => (
    <>
        {/* Global Presets */}
        <div className="bg-white/5 rounded-2xl p-3 border border-white/5">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 mb-2 text-center">{isRtl ? 'أنماط جاهزة' : 'Global Presets'}</p>
            <div className="grid grid-cols-3 gap-2">
                {['simple', 'detailed', 'print'].map(p => (
                    <button key={p} onClick={() => applyPreset(p as any)} className="px-2 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-200">
                        {p}
                    </button>
                ))}
            </div>
        </div>

        {/* Visibility */}
        <div>
            <SectionHeader icon={Eye} label={isRtl ? 'الظهور' : 'Visibility'} onReset={() => resetSection('visibility')} language={language} />
            {/* Select All / Deselect All */}
            <div className="flex justify-end mb-2">
                {(() => {
                    const allOn = treeSettings.showFirstName && treeSettings.showLastName &&
                        treeSettings.showDates && treeSettings.showPhotos &&
                        treeSettings.showGender && treeSettings.showDeceased && treeSettings.showMinimap;
                    return (
                        <button
                            onClick={() => {
                                const val = !allOn;
                                ['showFirstName', 'showLastName', 'showDates', 'showPhotos',
                                    'showGender', 'showDeceased', 'showMinimap'].forEach(
                                        k => updateSetting(k as any, val)
                                    );
                            }}
                            className="text-[9px] font-black text-amber-400 hover:text-amber-300 uppercase tracking-widest px-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
                        >
                            {allOn
                                ? (isRtl ? 'إلغاء الكل' : 'Deselect All')
                                : (isRtl ? 'تحديد الكل' : 'Select All')}
                        </button>
                    );
                })()}
            </div>
            <div className="space-y-1">
                <Checkbox label={isRtl ? 'الاسم الأول' : 'First Name'} value={!!treeSettings.showFirstName} onChange={v => updateSetting('showFirstName', v)} />
                <Checkbox label={isRtl ? 'اسم العائلة' : 'Last Name'} value={!!treeSettings.showLastName} onChange={v => updateSetting('showLastName', v)} />
                <Checkbox label={isRtl ? 'التواريخ' : 'Show Dates'} value={!!treeSettings.showDates} onChange={v => updateSetting('showDates', v)} icon={Clock} />
                <Checkbox label={isRtl ? 'الصور' : 'Show Photos'} value={!!treeSettings.showPhotos} onChange={v => updateSetting('showPhotos', v)} icon={Eye} />
                <Checkbox label={isRtl ? 'الجنس' : 'Show Gender'} value={!!treeSettings.showGender} onChange={v => updateSetting('showGender', v)} />
                <Checkbox label={isRtl ? 'المتوفين' : 'Show Deceased'} value={!!treeSettings.showDeceased} onChange={v => updateSetting('showDeceased', v)} icon={Ghost} />
                <Checkbox label={isRtl ? 'الخريطة المصغرة' : 'Show Minimap'} value={!!treeSettings.showMinimap} onChange={v => updateSetting('showMinimap', v)} icon={Grid} />
            </div>
        </div>

        {/* Appearance */}
        <div>
            <SectionHeader icon={Palette} label={isRtl ? 'المظهر العام' : 'Global Appearance'} onReset={() => resetSection('appearance')} language={language} />
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setDarkMode(!darkMode)} className={`flex items-center justify-between px-4 py-3 rounded-2xl border ${darkMode ? 'bg-white/10 text-white' : 'bg-white/5 text-slate-400'}`}>
                        <span className="text-[10px] font-black uppercase">{darkMode ? 'Dark' : 'Light'}</span>
                        {darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')} className="px-4 py-3 rounded-2xl bg-white/5 text-slate-400 font-black uppercase text-[10px] font-black uppercase tracking-widest">{language === 'en' ? 'Arabic' : 'English'}</button>
                </div>
                <div className="p-3 bg-white/5 rounded-2xl space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">{isRtl ? 'لون النمط' : 'Theme Color'}</label>
                    <div className="flex gap-2">
                        {['#E1AD01', '#3b82f6', '#10b981', '#ef4444'].map(c => (
                            <button key={c} onClick={() => updateSetting('themeColor', c)} className={`flex-1 h-8 rounded-lg border-2 ${treeSettings.themeColor === c ? 'border-white' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                        ))}
                    </div>
                </div>
                {/* Date Format */}
                <div className="p-3 bg-white/5 rounded-2xl space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">{isRtl ? 'تنسيق التاريخ' : 'Date Format'}</label>
                    <div className="grid grid-cols-4 gap-1">
                        {(['iso', 'eu', 'us', 'long'] as const).map(fmt => (
                            <button
                                key={fmt}
                                onClick={() => updateSetting('dateFormat', fmt)}
                                className={`px-2 py-1.5 rounded-lg text-[9px] font-black uppercase border transition-all
                                    ${(treeSettings.dateFormat || 'iso') === fmt
                                        ? 'bg-amber-500/30 border-amber-400 text-amber-100'
                                        : 'bg-white/0 border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/20'}`}
                            >
                                {fmt === 'iso' ? 'ISO' :
                                    fmt === 'eu' ? 'EU' :
                                        fmt === 'us' ? 'US' : (isRtl ? 'طويل' : 'Long')}
                            </button>
                        ))}
                    </div>
                    <p className="text-[9px] text-slate-600 font-bold">
                        {(treeSettings.dateFormat || 'iso') === 'iso' ? '2001-09-11' :
                            (treeSettings.dateFormat || 'iso') === 'eu' ? '11/09/2001' :
                                (treeSettings.dateFormat || 'iso') === 'us' ? '09/11/2001' : 'Sep 11, 2001'}
                    </p>
                </div>
            </div>
        </div>
    </>
);

const PerformanceContent = ({ isRtl, treeSettings, updateSetting, resetSection, language }: any) => (
    <div className="space-y-6">
        <SectionHeader icon={Zap} label={isRtl ? 'الأداء' : 'Performance'} onReset={() => resetSection('performance')} language={language} />
        <div className="space-y-4">
            <Checkbox label={isRtl ? 'وضع رسومات خفيفة' : 'Low-Graphics Mode'} value={!!treeSettings.isLowGraphicsMode} onChange={v => updateSetting('isLowGraphicsMode', v)} icon={Zap} />
            <p className="px-3 text-[9px] font-bold text-slate-500 uppercase tracking-tight">{isRtl ? 'يقلل من تأثيرات الشفافية والتحريك' : 'Disables blurs & heavy animations'}</p>
        </div>
    </div>
);

export const SettingsDrawer = memo(() => {
    const isSettingsDrawerOpen = useAppStore(state => state.isSettingsDrawerOpen);
    const setSettingsDrawerOpen = useAppStore(state => state.setSettingsDrawerOpen);
    const treeSettings = useAppStore(state => state.treeSettings);
    const setTreeSettings = useAppStore(state => state.setTreeSettings);
    const darkMode = useAppStore(state => state.darkMode);
    const setDarkMode = useAppStore(state => state.setDarkMode);
    const { t, language, setLanguage } = useTranslation();

    const [localSpacingX, setLocalSpacingX] = useState(treeSettings.nodeSpacingX);
    const [localSpacingY, setLocalSpacingY] = useState(treeSettings.nodeSpacingY);
    const [localWidth, setLocalWidth] = useState(treeSettings.nodeWidth);
    const [localTextSize, setLocalTextSize] = useState(treeSettings.textSize);
    const [activeTab, setActiveTab] = useState<'visuals' | 'layout' | 'performance'>('layout');

    const handleReset = () => {
        if (!window.confirm(language === 'ar'
            ? 'هل تريد إعادة ضبط جميع الإعدادات للقيم الافتراضية؟'
            : 'Reset all settings to defaults?'
        )) return;
        setTreeSettings(DEFAULT_TREE_SETTINGS);
    };

    const resetSection = (
        section:
            | 'layout'
            | 'metrics'
            | 'visibility'
            | 'performance'
            | 'nodesLines'
            | 'advancedGraph'
            | 'appearance'
    ) => {
        setTreeSettings(prev => {
            const d = DEFAULT_TREE_SETTINGS;
            switch (section) {
                case 'layout':
                    return {
                        ...prev,
                        chartType: d.chartType,
                        layoutMode: d.layoutMode,
                    };
                case 'metrics':
                    return {
                        ...prev,
                        nodeWidth: d.nodeWidth,
                        textSize: d.textSize,
                        nodeSpacingX: d.nodeSpacingX,
                        nodeSpacingY: d.nodeSpacingY,
                    };
                case 'visibility':
                    return {
                        ...prev,
                        showPhotos: d.showPhotos,
                        showFirstName: d.showFirstName,
                        showMiddleName: d.showMiddleName,
                        showLastName: d.showLastName,
                        showNickname: d.showNickname,
                        showMaidenName: d.showMaidenName,
                        showPrefix: d.showPrefix,
                        showSuffix: d.showSuffix,
                        showDates: d.showDates,
                        showBirthDate: d.showBirthDate,
                        showMarriageDate: d.showMarriageDate,
                        showDeathDate: d.showDeathDate,
                        showBirthPlace: d.showBirthPlace,
                        showMarriagePlace: d.showMarriagePlace,
                        showBurialPlace: d.showBurialPlace,
                        showResidence: d.showResidence,
                        showOccupation: d.showOccupation,
                        showDeceased: d.showDeceased,
                        showGender: d.showGender,
                        enableTimeOffset: d.enableTimeOffset,
                        showMinimap: d.showMinimap,
                    };
                case 'performance':
                    return {
                        ...prev,
                        isLowGraphicsMode: d.isLowGraphicsMode,
                    };
                case 'nodesLines':
                    return {
                        ...prev,
                        isCompact: d.isCompact,
                        generationLimit: d.generationLimit,
                        lineStyle: d.lineStyle,
                        lineThickness: d.lineThickness,
                        boxColorLogic: d.boxColorLogic,
                    };
                case 'advancedGraph':
                    return {
                        ...prev,
                        enableForcePhysics: d.enableForcePhysics,
                        timeScaleFactor: d.timeScaleFactor,
                        highlightBranch: d.highlightBranch,
                        highlightedBranchRootId: d.highlightedBranchRootId,
                    };
                case 'appearance':
                    return {
                        ...prev,
                        theme: d.theme,
                        themeColor: d.themeColor,
                        dateFormat: 'iso',
                    };
                default:
                    return prev;
            }
        });
    };

    const applyPreset = (preset: 'simple' | 'detailed' | 'print') => {
        setTreeSettings(prev => {
            const base = { ...prev };

            if (preset === 'simple') {
                return {
                    ...base,
                    isCompact: true,
                    generationLimit: 4,
                    showMiddleName: false,
                    showNickname: false,
                    showMaidenName: false,
                    showPrefix: false,
                    showSuffix: false,
                    showOccupation: false,
                    showBirthPlace: false,
                    showMarriagePlace: false,
                    showBurialPlace: false,
                    showResidence: false,
                    showDates: true,
                    showBirthDate: true,
                    showMarriageDate: false,
                    showDeathDate: true,
                    boxColorLogic: 'gender',
                };
            }

            if (preset === 'detailed') {
                return {
                    ...base,
                    isCompact: false,
                    generationLimit: 6,
                    showMiddleName: true,
                    showNickname: true,
                    showMaidenName: true,
                    showPrefix: true,
                    showSuffix: true,
                    showOccupation: true,
                    showBirthPlace: true,
                    showMarriagePlace: true,
                    showBurialPlace: true,
                    showResidence: true,
                    showDates: true,
                    showBirthDate: true,
                    showMarriageDate: true,
                    showDeathDate: true,
                    boxColorLogic: 'lineage',
                };
            }

            // print preset
            return {
                ...base,
                isCompact: true,
                showPhotos: false,
                showMinimap: false,
                isLowGraphicsMode: true,
                enableForcePhysics: false,
                boxColorLogic: 'none',
            };
        });
    };

    const updateSetting = (key: keyof TreeSettings, value: any) => {
        setTreeSettings(prev => ({ ...prev, [key]: value }));
    };

    // Unified debounced slider update — merges 4 separate effects into 1 to reduce re-renders
    useEffect(() => {
        const timer = setTimeout(() => {
            setTreeSettings(prev => ({
                ...prev,
                nodeSpacingX: localSpacingX,
                nodeSpacingY: localSpacingY,
                nodeWidth: localWidth,
                textSize: localTextSize,
            }));
        }, 150);
        return () => clearTimeout(timer);
    }, [localSpacingX, localSpacingY, localWidth, localTextSize]);

    // Sync from store when changed elsewhere
    useEffect(() => {
        setLocalSpacingX(treeSettings.nodeSpacingX);
        setLocalSpacingY(treeSettings.nodeSpacingY);
        setLocalWidth(treeSettings.nodeWidth);
        setLocalTextSize(treeSettings.textSize);
    }, [treeSettings.nodeSpacingX, treeSettings.nodeSpacingY, treeSettings.nodeWidth, treeSettings.textSize]);

    if (!isSettingsDrawerOpen) return null;

    const isRtl = language === 'ar';

    const contentProps = {
        isRtl,
        treeSettings,
        updateSetting,
        resetSection,
        language
    };

    return (
        <div className="fixed inset-0 z-[1000] flex justify-end pointer-events-none">
            {/* Backdrop */}
            <div
                className={`absolute inset-0 bg-black/40 transition-opacity duration-300 pointer-events-auto ${isSettingsDrawerOpen ? 'opacity-100' : 'opacity-0'} ${treeSettings.isLowGraphicsMode ? '' : 'backdrop-blur-sm'}`}
                onClick={() => setSettingsDrawerOpen(false)}
            />

            {/* Drawer */}
            <div
                className={`w-full max-w-[360px] h-full bg-slate-900/95 border-s border-white/10 shadow-[-] transition-transform duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] pointer-events-auto overflow-hidden flex flex-col ${isSettingsDrawerOpen ? 'translate-x-0' : (isRtl ? '-translate-x-full' : 'translate-x-full')} ${treeSettings.isLowGraphicsMode ? '' : 'backdrop-blur-2xl'}`}
                style={{ direction: 'ltr' /* Keep internal layout consistent, text elements handle RTL */ }}
            >
                {/* Header */}
                <div className="flex-none p-6 flex items-center justify-between border-b border-white/5 bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/10 text-amber-500 rounded-xl">
                            <Settings className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black uppercase tracking-widest text-white">
                                {isRtl ? 'الإعدادات' : 'Tree Settings'}
                            </h2>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                                {isRtl ? 'تخصيص العرض والأداء' : 'Customize view & performance'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setSettingsDrawerOpen(false)}
                        className="p-2.5 hover:bg-white/10 rounded-full transition-all text-slate-400 hover:text-white"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {/* Tab Navigation */}
                    <div className="flex bg-white/5 p-1 rounded-2xl mb-2 sticky top-0 z-10 backdrop-blur-md border border-white/5">
                        {[
                            { id: 'layout', label: isRtl ? 'التخطيط' : 'Layout', icon: Grid },
                            { id: 'visuals', label: isRtl ? 'المظهر' : 'Visuals', icon: Palette },
                            { id: 'performance', label: isRtl ? 'الأداء' : 'Perf', icon: Zap },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                                    ? 'bg-amber-500 text-slate-900 shadow-lg'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                    }`}
                            >
                                <tab.icon className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* Tabbed Content Wrapper */}
                    <div className="transition-all duration-300 ease-in-out">
                        {/* Tab 1: Layout */}
                        {activeTab === 'layout' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                                {/* ... existing layout settings content ... */}
                                <LayoutContent
                                    {...contentProps}
                                    localWidth={localWidth}
                                    setLocalWidth={setLocalWidth}
                                    localTextSize={localTextSize}
                                    setLocalTextSize={setLocalTextSize}
                                    localSpacingX={localSpacingX}
                                    setLocalSpacingX={setLocalSpacingX}
                                    localSpacingY={localSpacingY}
                                    setLocalSpacingY={setLocalSpacingY}
                                />
                            </div>
                        )}

                        {/* Tab 2: Visuals */}
                        {activeTab === 'visuals' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                                <VisualsContent
                                    {...contentProps}
                                    applyPreset={applyPreset}
                                    darkMode={darkMode}
                                    setDarkMode={setDarkMode}
                                    setLanguage={setLanguage}
                                />
                            </div>
                        )}

                        {/* Tab 3: Performance */}
                        {activeTab === 'performance' && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
                                <PerformanceContent
                                    {...contentProps}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className={`p-6 border-t border-white/10 bg-black/40 ${treeSettings.isLowGraphicsMode ? '' : 'backdrop-blur-md'}`}>
                    <button onClick={handleReset} className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                        <RotateCcw className="w-3.5 h-3.5" /> {isRtl ? 'إعادة ضبط بالكامل' : 'Global Reset'}
                    </button>
                </div>
            </div>

            <style>{`
                input[type=range]::-webkit-slider-thumb {
                    appearance: none;
                    height: 12px;
                    width: 12px;
                    border-radius: 50%;
                    background: #f59e0b;
                    cursor: pointer;
                    margin-top: -4px;
                    border: 2px solid #0f172a;
                    box-shadow: 0 0 10px rgba(245, 158, 11, 0.4);
                }
                input[type=range]::-webkit-slider-runnable-track {
                    width: 100%;
                    height: 4px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 2px;
                }
            `}</style>
        </div>
    );
});
