import { memo } from 'react';
import { Activity, BrainCircuit, FolderArchive, Languages, LogIn, LogOut, Moon, Settings, SlidersHorizontal, Sun } from 'lucide-react';
import { DropdownContent, DropdownMenuDivider, DropdownMenuHeader, DropdownMenuItem } from '../ui/DropdownMenu';
import { useTranslation } from '../../context/TranslationContext';
import type { ThemeLanguageProps, UserProfile } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { openAdminDiagnostics, openAdminTreeDefaults, openKindiLearningReports, useKindiReportsAdminAccess } from '../../features/admin';

interface AccountMenuProps {
  themeLanguage: ThemeLanguageProps;
  user: UserProfile | null;
  onLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
  onBackupNow?: () => Promise<void> | void;
  onOpenGlobalSettings?: () => void;
}

export const AccountMenu = memo<AccountMenuProps>(
  ({ themeLanguage, user, onLogin, onLogout }) => {
    const { t } = useTranslation();
    const text = t as unknown as Record<string, string>;
    const accountLabel = t.accountMenu || t.accountProfile;
    const setVaultOpen = useAppStore((state) => state.setVaultOpen);
    const setVaultTab = useAppStore((state) => state.setVaultTab);
    const canOpenKindiReports = useKindiReportsAdminAccess(user);

    const handleOpenVault = () => {
      // Guest → stats tab; Logged in → trees tab
      setVaultTab(user ? 'trees' : 'stats');
      setVaultOpen(true);
    };

    return (
      <DropdownContent className="w-64" aria-label={accountLabel}>
        <DropdownMenuHeader icon={<Settings className="w-3 h-3" />} label={accountLabel} />

        {user && (
          <>
            <div className="px-4 py-2">
              <p className="text-xs font-bold text-[var(--text-main)] truncate">
                {t.userMenu.welcome} {user.displayName.split(' ')[0]}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] truncate">{user.email}</p>
            </div>
            <DropdownMenuDivider />
          </>
        )}

        {/* Preferences */}
        <DropdownMenuHeader icon={<Languages className="w-3 h-3" />} label={t.accountPreferences} />
        <DropdownMenuItem
          onClick={() => themeLanguage.setLanguage(themeLanguage.language === 'en' ? 'ar' : 'en')}
          icon={<Languages className="w-4 h-4" />}
          label={themeLanguage.language === 'en' ? t.switchToArabic : t.switchToEnglish}
          rightElement={
            <span className="text-[10px] font-bold bg-[var(--theme-bg)] text-[var(--text-main)] px-1.5 py-0.5 rounded">
              {themeLanguage.language === 'en' ? 'AR' : 'EN'}
            </span>
          }
        />
        <DropdownMenuItem
          onClick={() => themeLanguage.setDarkMode(!themeLanguage.darkMode)}
          icon={themeLanguage.darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          label={themeLanguage.darkMode ? t.switchToLightMode : t.switchToDarkMode}
        />

        {/* Vault — accessible to both guest and logged-in users */}
        <DropdownMenuDivider />
        <DropdownMenuHeader icon={<FolderArchive className="w-3 h-3" />} label={t.vaultTitle || 'The Vault'} />
        <DropdownMenuItem
          onClick={handleOpenVault}
          icon={<FolderArchive className="w-4 h-4" />}
          label={t.vaultTitle || 'The Vault'}
          subLabel={
            user
              ? (t.vaultSubtitle || 'Manage your trees and backups')
              : 'الإحصائيات والتصدير المحلي'
          }
        />

        {user && canOpenKindiReports && (
          <>
            <DropdownMenuDivider />
            <DropdownMenuHeader icon={<BrainCircuit className="w-3 h-3" />} label={text.adminTools || 'Admin'} />
            <DropdownMenuItem
              onClick={openKindiLearningReports}
              icon={<BrainCircuit className="w-4 h-4" />}
              label={text.kindiLearningReports || 'Kindi learning reports'}
              subLabel={text.kindiLearningReportsHint || 'Review redacted Kindi learning telemetry.'}
            />
            <DropdownMenuItem
              onClick={openAdminTreeDefaults}
              icon={<SlidersHorizontal className="w-4 h-4" />}
              label={text.defaultTreeSettings || 'Default tree settings'}
              subLabel={text.defaultTreeSettingsHint || 'Set visual defaults for newly created trees.'}
            />
            <DropdownMenuItem
              onClick={openAdminDiagnostics}
              icon={<Activity className="w-4 h-4" />}
              label={text.diagnosticsTitle || 'Diagnostics'}
              subLabel={text.diagnosticsHint || 'Monitor performance, synchronization, and bootstrap telemetry.'}
            />
          </>
        )}

        {/* Session */}
        <DropdownMenuDivider />
        <DropdownMenuHeader icon={user ? <LogOut className="w-3 h-3" /> : <LogIn className="w-3 h-3" />} label={t.sessionLabel} />
        {user ? (
          <DropdownMenuItem
            onClick={() => { void onLogout(); }}
            icon={<LogOut className="w-4 h-4" />}
            label={t.signOut}
            colorClass="text-[var(--danger-500)] hover:bg-[var(--danger-500)]/10"
            iconBgClass="bg-[var(--danger-500)]/10"
            iconTextColorClass="text-[var(--danger-500)]"
          />
        ) : (
          <DropdownMenuItem
            onClick={() => { void onLogin(); }}
            icon={<LogIn className="w-4 h-4" />}
            label={t.signIn}
            colorClass="text-[var(--primary-600)] hover:bg-[var(--primary-600)]/10"
            iconBgClass="bg-[var(--primary-600)]/10"
            iconTextColorClass="text-[var(--primary-600)]"
          />
        )}
      </DropdownContent>
    );
  }
);

AccountMenu.displayName = 'AccountMenu';
