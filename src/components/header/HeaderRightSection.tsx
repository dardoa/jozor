import React, { memo } from 'react';
import { ChevronDown, Settings } from 'lucide-react';
import { Dropdown } from '../ui/Dropdown';
import { useTranslation } from '../../context/TranslationContext';
import { HeaderRightSectionProps } from '../../types';
import { SyncStatusIndicator } from '../SyncStatusIndicator';
import { NotificationBell } from './NotificationBell';
import { AccountMenu } from './AccountMenu';
import { useAppStore } from '../../store/useAppStore';
import { useTreePermissions } from '../../hooks/tree/useTreePermissions';
import { KindiSearchTrigger } from '../../features/kindi';

const HeaderMenuTrigger = ({ icon, label, testId, ...buttonProps }: { icon: React.ReactNode; label: string; testId?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    type="button"
    data-testid={testId}
    aria-label={label}
    {...buttonProps}
    className="flex items-center gap-1.5 rounded-xl border border-transparent px-2.5 py-2 text-[var(--text-main)] transition-all duration-200 hover:border-[var(--border-soft)] hover:bg-[var(--card-bg)] hover:shadow-[var(--shadow-sm)] active:scale-95 xl:px-3"
  >
    <span className="text-[var(--text-dim)] transition-colors group-hover:text-[var(--primary-600)]">{icon}</span>
    <span className="hidden text-xs font-semibold 2xl:inline">{label}</span>
  </button>
);

export const HeaderRightSection: React.FC<HeaderRightSectionProps> = memo(({ themeLanguage, auth, searchProps }) => {
  const { t } = useTranslation();
  const setVaultOpen = useAppStore((state) => state.setVaultOpen);
  const setVaultTab = useAppStore((state) => state.setVaultTab);
  const setVaultExportSection = useAppStore((state) => state.setVaultExportSection);
  const setSettingsDrawerOpen = useAppStore((state) => state.setSettingsDrawerOpen);
  const { role } = useTreePermissions();

  const openVault = (tab: 'cloud' | 'security' | 'trees' | 'members' | 'stats' = 'trees') => {
    setSettingsDrawerOpen(false);
    setVaultTab(tab);
    if (tab === 'cloud') {
      setVaultExportSection('cloud-backup');
    }
    setVaultOpen(true);
  };

  return (
    <div className='flex items-center gap-1.5 md:gap-2.5' role='navigation' aria-label={t.mainNavigation}>
      <div className='flex items-center gap-2' role='search' aria-label={t.search}>
        <KindiSearchTrigger people={searchProps.people} onFocusPerson={searchProps.onFocusPerson} />
      </div>

      <div className='flex items-center gap-0.5 sm:gap-1.5' role='group' aria-label={t.accountProfile}>
        {auth.user ? (
          <>
            <NotificationBell />
            <SyncStatusIndicator
              onOpenVault={() => openVault('cloud')}
              title={t.syncStatus.openBackupSettings}
              driveConnectionState={auth.hasSessionError ? 'expired' : auth.isAuthorized ? 'connected' : 'disconnected'}
              hasLinkedBackup={Boolean(auth.currentActiveDriveFileId)}
            />

            {role && (
              <button
                type='button'
                onClick={() => openVault('security')}
                title='Current tree permissions'
                className='hidden sm:flex items-center justify-center rounded-full border border-[var(--border-strong)] bg-[var(--theme-surface)] px-3 py-1 text-xs font-bold text-[var(--text-main)] shadow-sm'
              >
                {role === 'owner' ? 'مالك' : role === 'editor' ? 'محرر' : 'مشاهد'}
              </button>
            )}

            <Dropdown
              trigger={
                <button
                  id="user-menu-trigger"
                  type='button'
                  data-testid="account-menu-trigger"
                  aria-label={t.accountMenu || t.accountProfile}
                  className='flex items-center gap-1 rounded-full border border-[var(--border-main)] bg-[var(--theme-bg)] p-1 transition-all hover:bg-[var(--theme-hover)] active:scale-95 sm:pe-1.5'
                >
                  <div className='h-8 w-8 overflow-hidden rounded-full bg-gradient-to-br from-[var(--primary-600)] to-[var(--primary-400)] text-xs font-bold text-white shadow-sm sm:h-7 sm:w-7 sm:text-[11px] flex items-center justify-center'>
                    {auth.user.photoURL ? <img src={auth.user.photoURL} alt={t.avatarAlt} className='h-full w-full object-cover' /> : (auth.user.displayName || auth.user.email)[0].toUpperCase()}
                  </div>
                  <ChevronDown className='hidden h-3 w-3 text-[var(--text-dim)] sm:block' />
                </button>
              }
              align='end'
            >
              <AccountMenu themeLanguage={themeLanguage} user={auth.user} onLogin={auth.onOpenLoginModal} onLogout={auth.onLogout} />
            </Dropdown>
          </>
        ) : (
          // Guest mode: only show the settings/account dropdown, no redundant Google login button
          <Dropdown
            trigger={<HeaderMenuTrigger icon={<Settings className="w-5 h-5" />} label={t.accountMenu || t.accountProfile} testId="account-menu-trigger" />}
            align='end'
          >
            <AccountMenu themeLanguage={themeLanguage} user={null} onLogin={auth.onOpenLoginModal} onLogout={auth.onLogout} />
          </Dropdown>
        )}
      </div>
    </div>
  );
});
