import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, RefreshCw, Save, Settings2, ShieldCheck } from 'lucide-react';

import { useTranslation } from '../../context/TranslationContext';
import { useAppStore } from '../../store/useAppStore';
import { checkKindiReportsAdminAccess } from '../kindi';
import {
  fetchAdminDefaultTreeSettings,
  saveAdminDefaultTreeSettings,
  sanitizeDefaultTreeSettings,
  type AdminDefaultTreeSettings as AdminDefaultTreeSettingsModel,
} from './defaultTreeSettingsService';

const returnToApp = () => {
  if (window.history.length > 1) {
    window.history.back();
    return;
  }

  window.history.pushState(null, '', '/');
  window.dispatchEvent(new PopStateEvent('popstate'));
};

const numberFields: Array<{
  key: keyof Pick<AdminDefaultTreeSettingsModel, 'nodeSpacingX' | 'nodeSpacingY' | 'nodeWidth' | 'textSize' | 'generationLimit'>;
  min: number;
  max: number;
}> = [
  { key: 'nodeSpacingX', min: 40, max: 400 },
  { key: 'nodeSpacingY', min: 80, max: 800 },
  { key: 'nodeWidth', min: 120, max: 260 },
  { key: 'textSize', min: 10, max: 18 },
  { key: 'generationLimit', min: 2, max: 12 },
];

export const AdminDefaultTreeSettings: React.FC = () => {
  const { t, language } = useTranslation();
  const text = (t as any).adminTreeDefaults;
  const BackIcon = language === 'ar' ? ArrowRight : ArrowLeft;
  const user = useAppStore((state) => state.user);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<AdminDefaultTreeSettingsModel>(() =>
    sanitizeDefaultTreeSettings({})
  );

  const loadSettings = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const [hasAccess, defaults] = await Promise.all([
        checkKindiReportsAdminAccess(user),
        fetchAdminDefaultTreeSettings(user),
      ]);
      setIsAdmin(hasAccess);
      setSettings(defaults);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : text.loadError);
    } finally {
      setIsLoading(false);
    }
  }, [text.loadError, user]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const updateSetting = <K extends keyof AdminDefaultTreeSettingsModel>(
    key: K,
    value: AdminDefaultTreeSettingsModel[K]
  ) => {
    setSettings((current) => sanitizeDefaultTreeSettings({ ...current, [key]: value }));
  };

  const saveSettings = async () => {
    if (!user || !isAdmin) return;
    setIsSaving(true);
    setError(null);
    try {
      setSettings(await saveAdminDefaultTreeSettings(user, settings));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : text.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="h-screen overflow-y-auto bg-[var(--surface-app)] p-6 text-[var(--text-main)]">
        <div className="mx-auto max-w-3xl rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] p-6">
          <h1 className="text-xl font-black">{text.adminRequiredTitle}</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{text.adminRequiredBody}</p>
        </div>
      </div>
    );
  }

  if (!isLoading && !isAdmin) {
    return (
      <div className="h-screen overflow-y-auto bg-[var(--surface-app)] p-6 text-[var(--text-main)]">
        <div className="mx-auto max-w-3xl rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] p-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-[var(--primary-600)]" />
            <h1 className="text-xl font-black">{text.protectedTitle}</h1>
          </div>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{text.protectedBody}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto bg-[var(--surface-app)] px-4 py-6 text-[var(--text-main)] sm:px-6">
      <main className="mx-auto flex max-w-5xl flex-col gap-5">
        <header className="flex flex-col gap-3 border-b border-[var(--border-soft)] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <button
              type="button"
              onClick={returnToApp}
              className="mb-3 inline-flex items-center gap-2 rounded-md border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2 text-xs font-black text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)]"
            >
              <BackIcon className="h-4 w-4" />
              {text.backToApp}
            </button>
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--primary-600)]">
              <Settings2 className="h-4 w-4" />
              {text.breadcrumb}
            </div>
            <h1 className="mt-2 text-2xl font-black">{text.title}</h1>
            <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">{text.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void loadSettings()}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2 text-sm font-black text-[var(--text-secondary)] shadow-sm transition hover:bg-[var(--surface-hover)]"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              {text.refresh}
            </button>
            <button
              type="button"
              onClick={() => void saveSettings()}
              disabled={isSaving || isLoading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--primary-600)] px-3 py-2 text-sm font-black text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className={`h-4 w-4 ${isSaving ? 'animate-pulse' : ''}`} />
              {text.save}
            </button>
          </div>
        </header>

        {error && (
          <div className="rounded-lg border border-[var(--danger-500)]/30 bg-[var(--danger-500)]/10 p-4 text-sm text-[var(--text-main)]">
            {error}
          </div>
        )}

        <section className="grid gap-4 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] p-4 sm:grid-cols-2">
          <label className="grid gap-1 text-sm font-bold text-[var(--text-secondary)]">
            {text.fields.chartType}
            <select
              value={settings.chartType}
              onChange={(event) => updateSetting('chartType', event.target.value as AdminDefaultTreeSettingsModel['chartType'])}
              className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-app)] px-3 py-2 text-[var(--text-main)]"
            >
              <option value="focus">{text.options.focus}</option>
              <option value="radial">{text.options.radial}</option>
            </select>
          </label>
          <label className="flex items-center gap-3 rounded-md border border-[var(--border-soft)] bg-[var(--surface-app)] p-3 text-sm font-bold text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={settings.showPhotos}
              onChange={(event) => updateSetting('showPhotos', event.target.checked)}
            />
            {text.fields.showPhotos}
          </label>
          <label className="flex items-center gap-3 rounded-md border border-[var(--border-soft)] bg-[var(--surface-app)] p-3 text-sm font-bold text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={settings.privacyMode}
              onChange={(event) => updateSetting('privacyMode', event.target.checked)}
            />
            {text.fields.privacyMode}
          </label>
          {numberFields.map((field) => (
            <label key={field.key} className="grid gap-1 text-sm font-bold text-[var(--text-secondary)]">
              {text.fields[field.key]}
              <input
                type="number"
                min={field.min}
                max={field.max}
                value={settings[field.key]}
                onChange={(event) => updateSetting(field.key, Number(event.target.value) as never)}
                className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-app)] px-3 py-2 text-[var(--text-main)]"
              />
            </label>
          ))}
        </section>

        <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] p-4 text-sm text-[var(--text-secondary)]">
          {text.footerNote}
        </div>
      </main>
    </div>
  );
};
