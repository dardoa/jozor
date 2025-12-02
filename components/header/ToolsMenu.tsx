import React, { memo } from 'react';
import { 
  Calculator, Hammer, Activity, ShieldCheck, Calendar, BookOpen, Map
} from 'lucide-react';

// --- Shared Styles ---
const DROPDOWN_CONTAINER = "absolute top-full mt-2 w-64 p-1.5 bg-white/95 dark:bg-stone-950/95 backdrop-blur-xl border border-stone-200/50 dark:border-stone-700/50 rounded-2xl shadow-float z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right ring-1 ring-black/5";
const MENU_ITEM_BASE = "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all group relative overflow-hidden";
const ICON_WRAPPER = "p-1.5 rounded-lg bg-stone-50 dark:bg-stone-800 group-hover:bg-white dark:group-hover:bg-stone-700 text-stone-500 group-hover:text-teal-600 dark:text-stone-400 dark:group-hover:text-teal-400 transition-colors shadow-sm";
const DIVIDER = "h-px bg-stone-100 dark:bg-stone-800 my-1 mx-2";

export const ToolsMenu = memo(({
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