import React from 'react';
import { EyeOff, Lock, ShieldCheck } from 'lucide-react';

import type { TreeSettings } from '../../../types';
import type { TranslationSchema } from '../../../utils/translationLoader';
import { Checkbox } from '../../../components/ui/settingsDrawer/shared';

interface PrivacySettingsPanelProps {
  currentTreeId: string | null;
  treeSettings: TreeSettings;
  treeIsPrivate: boolean;
  canManageSecurity: boolean;
  onOpenCleanTree: () => void;
  onUpdateSetting: (key: keyof TreeSettings, value: boolean | string | number | null) => void;
  section?: 'all' | 'privacy' | 'maintenance';
  t: TranslationSchema;
}

export const PrivacySettingsPanel: React.FC<PrivacySettingsPanelProps> = ({
  currentTreeId,
  treeSettings,
  treeIsPrivate,
  canManageSecurity,
  onOpenCleanTree,
  onUpdateSetting,
  section = 'all',
  t,
}) => {
  const showPrivacy = section === 'all' || section === 'privacy';
  const showMaintenance = section === 'all' || section === 'maintenance';

  if (!currentTreeId) {
    return (
      <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] p-6 shadow-[var(--shadow-xs)]">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-[var(--surface-subtle)] p-2 text-[var(--text-muted)]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-[16px] font-bold tracking-tight text-[var(--text-main)]">{t.vaultSecurityPrivacyTitle}</h3>
          </div>
        </div>
      </section>
    );
  }

  if (!canManageSecurity) {
    return (
      <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] p-6 shadow-[var(--shadow-xs)]">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-[var(--surface-subtle)] p-2 text-[var(--text-muted)]">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-[16px] font-bold tracking-tight text-[var(--text-main)]">{t.vaultSecurityPrivacyTitle}</h3>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {showPrivacy && (
      <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] p-6 shadow-[var(--shadow-xs)]">
        <div className="space-y-6">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-[var(--surface-subtle)] p-2 text-[var(--primary-600)]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-[16px] font-bold tracking-tight text-[var(--text-main)]">{t.vaultSecurityPrivacyTitle}</h3>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 gap-y-3">
            <span className="inline-flex min-h-11 items-center rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)]">
              {treeIsPrivate ? t.vaultPrivateTree : t.vaultSharedTree}
            </span>
          </div>
        </div>
      </section>
      )}

      {showPrivacy && (
      <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] p-6 shadow-[var(--shadow-xs)]">
        <h4 className="text-[16px] font-bold tracking-tight text-[var(--text-main)]">{t.vaultPrivacy}</h4>
        <div className="mt-4 flex flex-wrap gap-2.5 gap-y-3">
          <Checkbox
            label={t.vaultPrivacyMode}
            value={Boolean(treeSettings.privacyMode)}
            onChange={(value) => onUpdateSetting('privacyMode', value)}
            icon={EyeOff}
          />
          <span className="inline-flex min-h-11 items-center rounded-2xl bg-[var(--primary-600)]/10 px-4 py-2 text-sm font-semibold text-[var(--primary-600)]">
            {treeSettings.privacyMode ? t.vaultPrivacyModeEnabled : t.vaultPrivacyModeOff}
          </span>
        </div>
      </section>
      )}

      {showMaintenance && (
      <section className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel)] p-6 shadow-[var(--shadow-xs)]">
        <h4 className="text-[16px] font-bold tracking-tight text-[var(--text-main)]">{t.vaultSecurityActions}</h4>
        <div className="mt-4">
          <button
            type="button"
            onClick={onOpenCleanTree}
            className="min-h-11 rounded-xl border border-[var(--danger-500)]/30 bg-[var(--danger-500)]/10 px-4 py-2 text-sm font-semibold text-[var(--danger-600)] transition-all duration-200 ease-in-out hover:bg-[var(--danger-500)]/15"
          >
            {t.cleanTree}
          </button>
        </div>
      </section>
      )}
    </div>
  );
};
