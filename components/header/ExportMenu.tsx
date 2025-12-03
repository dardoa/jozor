import React, { memo } from 'react';
import { 
  Printer, FileText, ChevronDown, Archive, Calendar, Download
} from 'lucide-react';

// --- Shared Styles ---
const DROPDOWN_CONTAINER = "absolute top-full mt-2 w-64 p-1.5 bg-white/95 dark:bg-stone-950/95 backdrop-blur-xl border border-stone-200/50 dark:border-stone-700/50 rounded-2xl shadow-float z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right ring-1 ring-black/5";
const MENU_ITEM_BASE = "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all group relative overflow-hidden";
const ICON_WRAPPER = "p-1.5 rounded-lg bg-stone-50 dark:bg-stone-800 group-hover:bg-white dark:group-hover:bg-stone-700 text-stone-500 group-hover:text-teal-600 dark:text-stone-400 dark:group-hover:text-teal-400 transition-colors shadow-sm";
const DIVIDER = "h-px bg-stone-100 dark:bg-stone-800 my-1 mx-2";
const HEADER_LABEL = "px-3 py-1.5 text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2";

export const ExportMenu = memo(({
    onClose, onExport, t
}: {
    onClose: () => void;
    onExport: (type: 'jozor' | 'json' | 'gedcom' | 'ics' | 'print') => void;
    t: any;
}) => (
    <>
        <div className="fixed inset-0 z-10" onClick={onClose}></div>
        <div className={`${DROPDOWN_CONTAINER} end-0`}>
            <div className={HEADER_LABEL}><Download className="w-3 h-3" /> {t.downloadAs}</div>
            
            <button onClick={() => onExport('jozor')} className={`${MENU_ITEM_BASE} bg-teal-50/50 dark:bg-teal-900/10 hover:!bg-teal-50 dark:hover:!bg-teal-900/30`}>
                <div className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-900/50 text-teal-600 dark:text-teal-400 shadow-sm">
                    <Archive className="w-4 h-4"/>
                </div>
                <div className="flex flex-col items-start gap-0.5">
                    <span className="font-bold text-teal-900 dark:text-teal-100">{t.jozorArchive}</span>
                    <span className="text-[9px] text-teal-600/70 dark:text-teal-300/70">{t.photosData}</span>
                </div>
            </button>
            
            <div className={DIVIDER}></div>
            
            <button onClick={() => onExport('ics')} className={MENU_ITEM_BASE}>
                <div className={ICON_WRAPPER}><Calendar className="w-3.5 h-3.5"/></div>
                {t.calendarExport}
            </button>
            <button onClick={() => onExport('json')} className={MENU_ITEM_BASE}>
                <div className={ICON_WRAPPER}><FileText className="w-3.5 h-3.5"/></div>
                {t.jsonFile}
            </button>
            <button onClick={() => onExport('gedcom')} className={MENU_ITEM_BASE}>
                <div className={ICON_WRAPPER}><FileText className="w-3.5 h-3.5"/></div>
                {t.gedcomFile}
            </button>
            
            <div className={DIVIDER}></div>
            
            <button onClick={() => onExport('print')} className={MENU_ITEM_BASE}>
                <div className={ICON_WRAPPER}><Printer className="w-3.5 h-3.5"/></div>
                {t.printPdf}
            </button>
        </div>
    </>
));