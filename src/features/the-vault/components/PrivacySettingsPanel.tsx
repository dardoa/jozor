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
  const unavailableIcon = currentTreeId ? Lock : ShieldCheck;
  const UnavailableIcon = unavailableIcon;

  if (!currentTreeId || !canManageSecurity) {
    return (
      <section className="rounded-[14px] border border-[var(--border-soft)] bg-[var(--surface-panel)] p-5">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-subtle)] text-[var(--text-muted)]">
            <UnavailableIcon className="h-5 w-5" />
          </span>
          <h3 className="text-[16px] font-bold text-[var(--text-main)]">{t.vaultSecurityPrivacyTitle}</h3>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[14px] border border-[var(--border-soft)] bg-[var(--surface-panel)] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface-subtle)] text-[var(--primary-600)]">
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 className="text-[16px] font-bold text-[var(--text-main)]">{t.vaultSecurityPrivacyTitle}</h3>
          </div>
        </div>
        <span className="inline-flex w-fit items-center rounded-md bg-[var(--surface-subtle)] px-2.5 py-1 text-xs font-semibold text-[var(--text-secondary)]">
          {treeIsPrivate ? t.vaultPrivateTree : t.vaultSharedTree}
        </span>
      </div>

      <div className="mt-5 flex flex-col gap-4 border-t border-[var(--border-soft)] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-[var(--text-main)]">{t.vaultPrivacyMode}</h4>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-[var(--text-muted)]">{t.vaultPrivacyModeHint}</p>
          <p className="mt-2 text-xs font-semibold text-[var(--primary-600)]">
            {treeSettings.privacyMode ? t.vaultPrivacyModeEnabled : t.vaultPrivacyModeOff}
          </p>
        </div>
        <Checkbox
          label={t.vaultPrivacyMode}
          value={Boolean(treeSettings.privacyMode)}
          onChange={(value) => onUpdateSetting('privacyMode', value)}
          icon={EyeOff}
        />
      </div>
    </section>
  );
};
