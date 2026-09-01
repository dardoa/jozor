import React from 'react';
import { EyeOff, Lock, ShieldCheck, Users } from 'lucide-react';

import type { TreeSettings } from '../../../types';
import type { TranslationSchema } from '../../../utils/translationLoader';
import { Checkbox } from '../../../components/ui/settingsDrawer/shared';

interface PrivacySettingsPanelProps {
  currentTreeId: string | null;
  treeSettings: TreeSettings;
  treeIsPrivate: boolean;
  canManageSecurity: boolean;
  onUpdateSetting: (key: keyof TreeSettings, value: boolean | string | number | null) => void;
  t: TranslationSchema;
}

export const PrivacySettingsPanel: React.FC<PrivacySettingsPanelProps> = ({
  currentTreeId,
  treeSettings,
  treeIsPrivate,
  canManageSecurity,
  onUpdateSetting,
  t,
}) => {
  if (!currentTreeId) {
    return (
      <section role="status" className="flex min-h-28 items-center gap-3 rounded-lg border border-dashed border-[var(--border-soft)] px-4 py-5">
        <ShieldCheck className="h-5 w-5 shrink-0 text-[var(--text-muted)]" />
        <div>
          <h3 className="text-sm font-bold text-[var(--text-main)]">{t.vaultSecurityPrivacyTitle}</h3>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">{t.vaultPrivacyNoTree}</p>
        </div>
      </section>
    );
  }

  if (!canManageSecurity) {
    return (
      <section role="status" className="flex min-h-28 items-center gap-3 rounded-lg border border-dashed border-[var(--border-soft)] px-4 py-5">
        <Lock className="h-5 w-5 shrink-0 text-[var(--text-muted)]" />
        <div>
          <h3 className="text-sm font-bold text-[var(--text-main)]">{t.vaultSecurityPrivacyTitle}</h3>
          <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">{t.vaultPrivacyNoPermission}</p>
        </div>
      </section>
    );
  }

  const privacyModeEnabled = Boolean(treeSettings.privacyMode);

  return (
    <section aria-labelledby="vault-privacy-title" className="rounded-[14px] border border-[var(--border-soft)] bg-[var(--surface-panel)]">
      <header className="flex items-center gap-3 px-4 py-4 sm:px-5">
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-subtle)] text-[var(--primary-600)]">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <h3 id="vault-privacy-title" className="text-base font-bold text-[var(--text-main)]">{t.vaultSecurityPrivacyTitle}</h3>
      </header>

      <div className="divide-y divide-[var(--border-soft)] border-t border-[var(--border-soft)]">
        <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex min-w-0 items-start gap-3">
            <Users className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]" />
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-[var(--text-main)]">{t.vaultPrivacyAccessTitle}</h4>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-[var(--text-muted)]">{t.vaultPrivacyAccessHint}</p>
            </div>
          </div>
          <span className="inline-flex w-fit shrink-0 items-center rounded-md bg-[var(--surface-subtle)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)]">
            {treeIsPrivate ? t.vaultPrivateTree : t.vaultSharedTree}
          </span>
        </div>

        <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex min-w-0 items-start gap-3">
            <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-muted)]" />
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-[var(--text-main)]">{t.vaultPrivacyMode}</h4>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-[var(--text-muted)]">{t.vaultPrivacyModeHint}</p>
              <p aria-live="polite" className="mt-2 text-xs font-semibold text-[var(--primary-600)]">
                {privacyModeEnabled ? t.vaultPrivacyModeEnabled : t.vaultPrivacyModeOff}
              </p>
            </div>
          </div>
          <Checkbox
            label={t.vaultPrivacyMode}
            value={privacyModeEnabled}
            onChange={(value) => onUpdateSetting('privacyMode', value)}
            icon={EyeOff}
          />
        </div>
      </div>
    </section>
  );
};
