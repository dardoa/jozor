import React, { memo } from 'react';
import { UserProfile } from '../../types';
import { 
  Cloud, LogOut, AlertCircle
} from 'lucide-react';

// --- Shared Styles ---
const DROPDOWN_CONTAINER = "absolute top-full mt-2 w-64 p-1.5 bg-white/95 dark:bg-stone-950/95 backdrop-blur-xl border border-stone-200/50 dark:border-stone-700/50 rounded-2xl shadow-float z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right ring-1 ring-black/5";
const MENU_ITEM_BASE = "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-all group relative overflow-hidden";
const DIVIDER = "h-px bg-stone-100 dark:bg-stone-800 my-1 mx-2";

export const UserMenu = memo(({
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