import { memo } from 'react';
import { LogOut, HardDrive, Settings, FolderTree, Clock } from 'lucide-react';
import { DropdownContent, DropdownMenuItem, DropdownMenuDivider } from '../ui/DropdownMenu';
import { useTranslation } from '../../context/TranslationContext';
import { useAppStore } from '../../store/useAppStore';
import { ModalType } from '../../types';

interface UserMenuProps {
  onClose?: () => void;
  onLogout: () => void;
  onOpenDriveFileManager: () => void;
  onOpenTreeManager: () => void;
  onOpenModal?: (modalType: ModalType) => void;
}

export const UserMenu = memo(
  ({
    onLogout,
    onClose,
    onOpenDriveFileManager,
    onOpenTreeManager,
    onOpenModal,
  }: UserMenuProps) => {
    const { t, language } = useTranslation();

    // Direct store subscriptions (eliminating prop drilling)
    const user = useAppStore((state) => state.user);
    const setActivityLogOpen = useAppStore((state) => state.setActivityLogOpen);

    if (!user) return null;

    return (
      <DropdownContent className='w-64' onClose={onClose}>
        <div className='px-4 py-3 bg-[var(--theme-bg)]/50 rounded-t-2xl border-b border-[var(--border-main)]'>
          <p className='text-xs font-bold text-[var(--text-main)] truncate'>
            {t.welcomeUser} {user.displayName.split(' ')[0]}
          </p>
          <p className='text-[10px] text-[var(--text-muted)] truncate'>{user.email}</p>
        </div>


        <DropdownMenuDivider />

        <DropdownMenuItem
          onClick={() => {
            onOpenModal?.('globalSettings');
            onClose?.();
          }}
          icon={<Settings className='w-4 h-4' />}
          label={t.settings}
        />

        {/* Manage Drive Files & Trees */}
        <DropdownMenuItem
          onClick={onOpenDriveFileManager}
          icon={<HardDrive className='w-4 h-4' />}
          label={t.manageDriveFiles}
        />

        <DropdownMenuItem
          onClick={onOpenTreeManager}
          icon={<FolderTree className='w-4 h-4' />}
          label={t.manageTrees}
        />

        <DropdownMenuItem
          onClick={() => setActivityLogOpen(true)}
          icon={<Clock className='w-4 h-4' />}
          label={t.historyLog || 'Activity History'}
        />

        <DropdownMenuDivider />

        <DropdownMenuItem
          onClick={onLogout}
          icon={<LogOut className='w-4 h-4' />}
          label={t.signOut}
          colorClass='text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
        />
      </DropdownContent>
    );
  }
);
