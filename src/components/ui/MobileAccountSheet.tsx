import { memo } from 'react';
import { CloudUpload, CreditCard, Languages, LayoutDashboard, LogIn, LogOut, Moon, Settings, Sun, X } from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';
import type { ThemeLanguageProps, UserProfile } from '../../types';
import { openAdminBillingDiagnostics, openAdminDashboard, useKindiReportsAdminAccess } from '../../features/admin';

interface MobileAccountSheetProps {
  isOpen: boolean;
  onClose: () => void;
  themeLanguage: ThemeLanguageProps;
  user: UserProfile | null;
  onLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
  onBackupNow?: () => Promise<void> | void;
  onOpenGlobalSettings?: () => void;
}

const SheetAction = ({
  icon,
  label,
  subLabel,
  onClick,
  danger = false,
  rightElement,
}: {
  icon: React.ReactNode;
  label: string;
  subLabel?: string;
  onClick: () => void;
  danger?: boolean;
  rightElement?: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all shadow-[var(--shadow-sm)] ${
      danger
        ? 'border-[var(--danger-500)]/15 bg-[var(--danger-500)]/[0.04] text-[var(--danger-500)] hover:bg-[var(--danger-500)]/10'
        : 'border-[var(--border-soft)] bg-[var(--surface-panel-subtle)] hover:bg-[var(--surface-hover)]'
    }`}
  >
    <div
      className={`rounded-xl p-2.5 ${
        danger
          ? 'bg-[var(--danger-500)]/10 text-[var(--danger-500)]'
          : 'bg-[var(--theme-bg)] text-[var(--text-dim)]'
      }`}
    >
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <div className={`text-sm font-bold ${danger ? 'text-[var(--danger-500)]' : 'text-[var(--text-main)]'}`}>{label}</div>
      {subLabel ? (
        <div className={`mt-0.5 text-[11px] leading-4 ${danger ? 'text-[var(--danger-500)]/80' : 'text-[var(--text-dim)]'}`}>
          {subLabel}
        </div>
      ) : null}
    </div>
    {rightElement ? <div className="ml-auto">{rightElement}</div> : null}
  </button>
);

type MobileAccountTranslations = {
  accountMenu?: string;
  accountPreferences?: string;
  languagePreferenceHint?: string;
  appearancePreferenceHint?: string;
  appSettings?: string;
  globalSettingsHint?: string;
  storageAndBackup?: string;
  backupNowHint?: string;
  adminTools?: string;
  adminDashboard?: string;
  adminDashboardHint?: string;
  adminBillingDiagnostics?: string;
  adminBillingDiagnosticsHint?: string;
  sessionLabel?: string;
};

export const MobileAccountSheet = memo(({
  isOpen,
  onClose,
  themeLanguage,
  user,
  onLogin,
  onLogout,
  onBackupNow,
  onOpenGlobalSettings,
}: MobileAccountSheetProps) => {
  const { t } = useTranslation();
  const text = t as typeof t & MobileAccountTranslations;
  const accountLabel = text.accountMenu || t.accountProfile;
  const canOpenKindiReports = useKindiReportsAdminAccess(user);

  if (!isOpen) return null;

  const closeThen = (action: () => void | Promise<void>) => () => {
    onClose();
    void action();
  };

  return (
    <>
      <div className="ds-overlay-backdrop fixed inset-0 z-[var(--z-index-drawer)] sm:hidden" onClick={onClose} />
      <div className="ds-drawer-shell fixed inset-x-0 bottom-0 z-[calc(var(--z-index-drawer)+1)] max-h-[min(74vh,40rem)] overflow-hidden rounded-t-[28px] border-b-0 sm:hidden">
        <div className="ds-modal-header p-4">
          <div>
            <div className="mb-2 h-1 w-12 rounded-full bg-[var(--border-main)]/70 sm:hidden" aria-hidden="true" />
            <h2 className="text-lg font-bold text-[var(--text-main)]">{accountLabel}</h2>
            <p className="text-xs text-[var(--text-dim)]">{user ? t.accountProfile : t.signIn}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 hover:bg-[var(--theme-hover)] text-[var(--text-dim)]" aria-label={t.settings.close}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto bg-[var(--surface-app)]/70 p-4">
          {user ? (
            <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel-subtle)] p-4 shadow-[var(--shadow-sm)]">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[var(--primary-600)] to-[var(--primary-400)] text-sm font-bold text-white shadow-sm">
                  {user.photoURL ? <img src={user.photoURL} alt={t.avatarAlt} className="h-full w-full rounded-full object-cover" /> : (user.displayName || user.email)[0].toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-[var(--text-main)]">{user.displayName}</div>
                  <div className="truncate text-[11px] text-[var(--text-dim)]">{user.email}</div>
                </div>
              </div>
            </section>
          ) : null}

          <section className="space-y-3">
            <h3 className="px-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)] opacity-50">{text.accountPreferences || 'Preferences'}</h3>
            <SheetAction
              icon={<Languages className="h-5 w-5" />}
              label={themeLanguage.language === 'en' ? t.switchToArabic : t.switchToEnglish}
              subLabel={text.languagePreferenceHint || 'Choose the interface language.'}
              onClick={closeThen(() => themeLanguage.setLanguage(themeLanguage.language === 'en' ? 'ar' : 'en'))}
              rightElement={<span className="rounded bg-[var(--theme-bg)] px-1.5 py-0.5 text-[10px] font-bold text-[var(--text-main)]">{themeLanguage.language === 'en' ? 'AR' : 'EN'}</span>}
            />
            <SheetAction
              icon={themeLanguage.darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              label={themeLanguage.darkMode ? t.switchToLightMode : t.switchToDarkMode}
              subLabel={text.appearancePreferenceHint || 'Adjust the interface appearance mode.'}
              onClick={closeThen(() => themeLanguage.setDarkMode(!themeLanguage.darkMode))}
            />
          </section>

          {onOpenGlobalSettings ? (
            <section className="space-y-3">
              <h3 className="px-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)] opacity-50">{text.appSettings || 'App'}</h3>
              <SheetAction
                icon={<Settings className="h-5 w-5" />}
                label={t.globalSettings.title}
                subLabel={text.globalSettingsHint || 'Open broader application preferences and defaults.'}
                onClick={closeThen(() => onOpenGlobalSettings())}
              />
            </section>
          ) : null}

          {user && onBackupNow ? (
            <section className="space-y-3">
              <h3 className="px-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)] opacity-50">{text.storageAndBackup || 'Backup'}</h3>
              <SheetAction
                icon={<CloudUpload className="h-5 w-5" />}
                label={t.userMenu.backupNow}
                subLabel={text.backupNowHint || 'Create or sync a backup for the active tree.'}
                onClick={closeThen(() => onBackupNow())}
              />
            </section>
          ) : null}

          {user && canOpenKindiReports ? (
            <section className="space-y-3">
              <h3 className="px-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)] opacity-50">{text.adminTools || 'Admin'}</h3>
              <SheetAction
                icon={<LayoutDashboard className="h-5 w-5" />}
                label={text.adminDashboard || 'Admin Dashboard'}
                subLabel={text.adminDashboardHint || 'Manage reports, defaults, diagnostics, and future admin tools.'}
                onClick={closeThen(() => openAdminDashboard())}
              />
              <SheetAction
                icon={<CreditCard className="h-5 w-5" />}
                label={text.adminBillingDiagnostics || 'Billing diagnostics'}
                subLabel={text.adminBillingDiagnosticsHint || 'Inspect Paddle webhook processing and subscription update events.'}
                onClick={closeThen(() => openAdminBillingDiagnostics())}
              />
            </section>
          ) : null}

          <section className="space-y-3">
            <h3 className="px-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-dim)] opacity-50">{text.sessionLabel || 'Session'}</h3>
            {user ? (
              <SheetAction
                icon={<LogOut className="h-5 w-5" />}
                label={t.signOut}
                onClick={closeThen(onLogout)}
                danger
              />
            ) : (
              <SheetAction
                icon={<LogIn className="h-5 w-5" />}
                label={t.signIn}
                subLabel={t.accountProfile}
                onClick={closeThen(onLogin)}
              />
            )}
          </section>
        </div>
      </div>
    </>
  );
});

MobileAccountSheet.displayName = 'MobileAccountSheet';
