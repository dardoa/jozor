import React from 'react';
import { EyeOff, Loader2, Lock, ShieldCheck } from 'lucide-react';

import type { TreeSettings, UserProfile } from '../../types';
import type { TranslationSchema } from '../../utils/translationLoader';
import { Checkbox } from '../ui/settingsDrawer/shared';

interface PrivacySettingsPanelProps {
  currentTreeId: string | null;
  currentUser: UserProfile | null;
  treeSettings: TreeSettings;
  treeIsPrivate: boolean;
  canManageSecurity: boolean;
  isPasswordResetting: boolean;
  onResetPassword: () => void;
  onOpenDiagnostics: () => void;
  onOpenCleanTree: () => void;
  onUpdateSetting: (key: keyof TreeSettings, value: boolean | string | number | null) => void;
  t: TranslationSchema;
}

export const PrivacySettingsPanel: React.FC<PrivacySettingsPanelProps> = ({
  currentTreeId,
  currentUser,
  treeSettings,
  treeIsPrivate,
  canManageSecurity,
  isPasswordResetting,
  onResetPassword,
  onOpenDiagnostics,
  onOpenCleanTree,
  onUpdateSetting,
  t,
}) => {
  if (!currentTreeId) {
    return (
      <section className="rounded-2xl bg-white/40 p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-white/70 p-2 text-slate-500">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-[16px] font-bold tracking-tight text-slate-800">{t.vaultSecurityPrivacyTitle}</h3>
          </div>
        </div>
      </section>
    );
  }

  if (!canManageSecurity) {
    return (
      <section className="rounded-2xl bg-white/40 p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-white/70 p-2 text-slate-500">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-[16px] font-bold tracking-tight text-slate-800">{t.vaultSecurityPrivacyTitle}</h3>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white/40 p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        <div className="space-y-6">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-white/70 p-2 text-[#a67c37]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-[16px] font-bold tracking-tight text-slate-800">{t.vaultSecurityPrivacyTitle}</h3>
            </div>
          </div>

          <div className="flex flex-wrap gap-2.5 gap-y-3">
            <span className="inline-flex min-h-11 items-center rounded-2xl bg-white/45 px-4 py-2 text-sm font-semibold text-slate-600">
              {treeIsPrivate ? t.vaultPrivateTree : t.vaultSharedTree}
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white/40 p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        <h4 className="text-[16px] font-bold tracking-tight text-slate-800">{t.vaultPrivacy}</h4>
        <div className="mt-4 flex flex-wrap gap-2.5 gap-y-3">
          <Checkbox
            label={t.vaultPrivacyMode}
            value={Boolean(treeSettings.privacyMode)}
            onChange={(value) => onUpdateSetting('privacyMode', value)}
            icon={EyeOff}
          />
          <span className="inline-flex min-h-11 items-center rounded-2xl bg-[#a67c37]/10 px-4 py-2 text-sm font-semibold text-[#a67c37]">
            {treeSettings.privacyMode ? t.vaultPrivacyModeEnabled : t.vaultPrivacyModeOff}
          </span>
        </div>
      </section>

      <section className="rounded-2xl bg-white/40 p-6 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        <h4 className="text-[16px] font-bold tracking-tight text-slate-800">{t.vaultSecurityActions}</h4>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onResetPassword}
            disabled={isPasswordResetting || !currentUser?.email}
            className="min-h-11 rounded-xl border border-black/[0.04] bg-white/40 px-4 py-2 text-sm font-semibold text-slate-600 transition-all duration-200 ease-in-out hover:bg-white disabled:opacity-50"
          >
            {isPasswordResetting ? <Loader2 className="h-4 w-4 animate-spin" /> : t.vaultResetPassword}
          </button>
          <button
            type="button"
            onClick={onOpenDiagnostics}
            className="min-h-11 rounded-xl border border-black/[0.04] bg-white/40 px-4 py-2 text-sm font-semibold text-slate-600 transition-all duration-200 ease-in-out hover:bg-white"
          >
            {t.vaultDiagnostics}
          </button>
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={onOpenCleanTree}
            className="min-h-11 rounded-xl border border-red-200 bg-red-50/60 px-4 py-2 text-sm font-semibold text-red-600 transition-all duration-200 ease-in-out hover:bg-red-50"
          >
            {t.cleanTree}
          </button>
        </div>
      </section>
    </div>
  );
};
