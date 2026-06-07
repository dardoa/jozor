import { memo } from 'react';
import { BrainCircuit, CreditCard, FolderArchive, Languages, LayoutDashboard, LogIn, LogOut, Moon, Settings, Sun, Sparkles } from 'lucide-react';
import { DropdownContent, DropdownMenuDivider, DropdownMenuHeader, DropdownMenuItem } from '../ui/DropdownMenu';
import { useTranslation } from '../../context/TranslationContext';
import type { ThemeLanguageProps, UserProfile } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { openAdminBillingDiagnostics, openAdminDashboard, useKindiReportsAdminAccess } from '../../features/admin';

interface AccountMenuProps {
  themeLanguage: ThemeLanguageProps;
  user: UserProfile | null;
  onLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
  onBackupNow?: () => Promise<void> | void;
  onOpenGlobalSettings?: () => void;
}

type AccountMenuTranslations = {
  adminTools?: string;
  adminDashboard?: string;
  adminDashboardHint?: string;
  adminBillingDiagnostics?: string;
  adminBillingDiagnosticsHint?: string;
};

export const AccountMenu = memo<AccountMenuProps>(
  ({ themeLanguage, user, onLogin, onLogout }) => {
    const { t } = useTranslation();
    const text = t as typeof t & AccountMenuTranslations;
    const accountLabel = t.accountMenu || t.accountProfile;
    const setVaultOpen = useAppStore((state) => state.setVaultOpen);
    const setVaultTab = useAppStore((state) => state.setVaultTab);
    const canOpenKindiReports = useKindiReportsAdminAccess(user);
    const subscriptionTier = useAppStore((state) => state.subscriptionTier);

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
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wider border ${
                  subscriptionTier === 'family'
                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    : subscriptionTier === 'pro'
                      ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
                      : 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20'
                }`}>
                  {subscriptionTier === 'family' ? (themeLanguage.language === 'ar' ? 'باقة العائلة' : 'Family Plan') :
                   subscriptionTier === 'pro' ? (themeLanguage.language === 'ar' ? 'باقة المحترفين' : 'Pro Plan') :
                   (themeLanguage.language === 'ar' ? 'الباقة المجانية' : 'Free Plan')}
                </span>
                {subscriptionTier !== 'family' && (
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('open-paywall'))}
                    className="text-[9px] font-extrabold text-[var(--primary-600)] hover:text-[var(--primary-700)] underline bg-transparent border-0 cursor-pointer p-0"
                  >
                    {themeLanguage.language === 'ar' ? 'ترقية' : 'Upgrade'}
                  </button>
                )}
              </div>
            </div>
            <DropdownMenuDivider />
            <DropdownMenuHeader icon={<Sparkles className="w-3 h-3" />} label={themeLanguage.language === 'ar' ? 'الاشتراك والباقات' : 'Subscription'} />
            <DropdownMenuItem
              onClick={() => window.dispatchEvent(new CustomEvent('open-paywall'))}
              icon={<Sparkles className="w-4 h-4 text-indigo-400" />}
              label={themeLanguage.language === 'ar' ? 'إدارة الاشتراك والترقية' : 'Manage Subscription'}
              subLabel={
                subscriptionTier === 'family' ? (themeLanguage.language === 'ar' ? 'أنت على باقة العائلة المميزة' : 'You are on the Family plan') :
                subscriptionTier === 'pro' ? (themeLanguage.language === 'ar' ? 'ترقية لباقة العائلة للحصول على ميزات أكثر' : 'Upgrade to Family for more features') :
                (themeLanguage.language === 'ar' ? 'ترقية للحصول على ميزات الذكاء الاصطناعي والمشاركة' : 'Upgrade to unlock cloud AI and sharing')
              }
            />
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
              onClick={() => openAdminDashboard()}
              icon={<LayoutDashboard className="w-4 h-4" />}
              label={text.adminDashboard || 'Admin Dashboard'}
              subLabel={text.adminDashboardHint || 'Manage reports, defaults, diagnostics, and future admin tools.'}
            />
            <DropdownMenuItem
              onClick={() => openAdminBillingDiagnostics()}
              icon={<CreditCard className="w-4 h-4" />}
              label={text.adminBillingDiagnostics || 'Billing diagnostics'}
              subLabel={text.adminBillingDiagnosticsHint || 'Inspect Paddle webhook processing and subscription update events.'}
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
