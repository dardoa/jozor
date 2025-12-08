import { memo } from 'react';
import { UserMenuProps } from '../../types';
import { 
  Cloud, LogOut, AlertCircle, HardDrive
} from 'lucide-react';
import { DropdownContent, DropdownMenuItem, DropdownMenuDivider } from '../ui/DropdownMenu';
import { useTranslation } from '../../context/TranslationContext';

export const UserMenu = memo(({
    user, isDemoMode, onLogout, onClose, onOpenDriveFileManager // Destructure new prop
}: UserMenuProps) => {
    const { t } = useTranslation();

    return (
        <DropdownContent className="w-64" onClose={onClose}>
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

            <DropdownMenuDivider />

            {/* New: Manage Drive Files button */}
            <DropdownMenuItem 
                onClick={onOpenDriveFileManager}
                icon={<HardDrive className="w-4 h-4"/>}
                label={t.manageDriveFiles}
            />

            <DropdownMenuDivider />

            <DropdownMenuItem 
                onClick={onLogout}
                icon={<LogOut className="w-4 h-4"/>}
                label={t.signOut}
                colorClass="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
            />
        </DropdownContent>
    );
});