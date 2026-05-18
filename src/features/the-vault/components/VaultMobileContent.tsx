import React from 'react';
import { ChevronDown, Cloud, LogIn, ShieldCheck, Wrench } from 'lucide-react';
import type { MobileManagementSection, MobileVaultHub, VaultRenderContext } from '../types';
import {
  VaultBackupsContent,
  VaultInsightsContent,
  VaultMembersContent,
  VaultSettingsContent,
  VaultTreesContent,
} from './VaultContentSections';

interface VaultMobileContentProps {
  context: VaultRenderContext;
  hub: MobileVaultHub;
  managementSection: MobileManagementSection;
  onManagementSectionChange: (section: MobileManagementSection) => void;
  labels: {
    management: string;
    trees: string;
    members: string;
  };
}

const GuestLoginPrompt: React.FC<{ onLogin: () => void }> = ({ onLogin }) => (
  <div className="flex flex-col items-center justify-center gap-6 py-16 text-center px-4">
    <div className="w-16 h-16 rounded-2xl bg-[var(--color-primary-500)]/10 flex items-center justify-center">
      <LogIn className="h-8 w-8 text-[var(--color-primary-600)]" />
    </div>
    <div>
      <p className="font-bold text-[var(--text-main)] text-lg mb-2">هذا القسم يتطلب تسجيل الدخول</p>
      <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-xs">
        سجّل بحساب Google لإدارة أشجارك السحابية ومشاركتها مع أفراد العائلة.
      </p>
    </div>
    <button
      onClick={onLogin}
      className="px-8 py-3 rounded-2xl bg-[var(--color-primary-600)] text-white font-bold text-sm hover:bg-[var(--color-primary-700)] active:scale-95 transition-all"
    >
      تسجيل الدخول بـ Google
    </button>
  </div>
);

const MobileToolsAccordionSection: React.FC<{
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, icon: Icon, defaultOpen = false, children }) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded-[18px] border border-[var(--border-soft)] bg-[var(--surface-panel)] shadow-[var(--shadow-xs)]">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-3 text-start"
        aria-expanded={isOpen}
      >
        <span className="inline-flex min-w-0 items-center gap-3">
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-subtle)] text-[var(--primary-600)]">
            <Icon className="h-4 w-4" />
          </span>
          <span className="truncate text-sm font-bold text-[var(--text-main)]">{title}</span>
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="border-t border-[var(--border-soft)] bg-[var(--surface-app)]/45 p-3">
          {children}
        </div>
      )}
    </section>
  );
};

export const VaultMobileContent = ({
  context,
  hub,
  managementSection,
  onManagementSectionChange,
  labels,
}: VaultMobileContentProps) => {
  const isGuest = !context.currentUser;

  return (
    <div className="vault-tab-content space-y-8 transition-all duration-200 ease-in-out">
      {hub === 'management' && (
        isGuest
          ? <GuestLoginPrompt onLogin={() => void context.auth.onOpenLoginModal()} />
          : (
            <div className="space-y-8">
              <div className="space-y-4 px-4">
                <h3 className="text-[16px] font-bold tracking-tight text-[var(--text-main)]">{labels.management}</h3>
                <div className="grid grid-cols-2 gap-2 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-1">
                  <button
                    type="button"
                    onClick={() => onManagementSectionChange('trees')}
                    className={`min-h-11 rounded-xl px-4 py-3 text-sm transition-all duration-200 ease-in-out ${managementSection === 'trees' ? 'bg-[var(--primary-600)] font-semibold text-white shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'}`}
                  >
                    {labels.trees}
                  </button>
                  <button
                    type="button"
                    onClick={() => onManagementSectionChange('members')}
                    className={`min-h-11 rounded-xl px-4 py-3 text-sm transition-all duration-200 ease-in-out ${managementSection === 'members' ? 'bg-[var(--primary-600)] font-semibold text-white shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'}`}
                  >
                    {labels.members}
                  </button>
                </div>
              </div>

              {managementSection === 'trees'
                ? <VaultTreesContent context={context} compact />
                : <VaultMembersContent context={context} />
              }
            </div>
          )
      )}

      {hub === 'insights' && <VaultInsightsContent context={context} />}

      {hub === 'tools' && (
        <div className="space-y-4">
          <MobileToolsAccordionSection title={`${context.t.vaultExport} & ${context.t.vaultCloud}`} icon={Cloud} defaultOpen>
            <VaultBackupsContent context={context} />
          </MobileToolsAccordionSection>
          {!isGuest && (
            <>
              <MobileToolsAccordionSection title={context.t.vaultSecurity} icon={ShieldCheck}>
                <VaultSettingsContent context={context} section="privacy" />
              </MobileToolsAccordionSection>
              <MobileToolsAccordionSection title={context.t.vaultSecurityActions} icon={Wrench}>
                <VaultSettingsContent context={context} section="maintenance" />
              </MobileToolsAccordionSection>
            </>
          )}
        </div>
      )}
    </div>
  );
};
