import { Check, Languages, Moon, RotateCcw, Sun, Zap } from 'lucide-react';
import { Button } from '../../ui/Button';
import type { GlobalSettingsModalState } from '../useGlobalSettingsModalState';

type GlobalSettingsPreferencesTabProps = Pick<
  GlobalSettingsModalState,
  | 't'
  | 'language'
  | 'setLanguage'
  | 'darkMode'
  | 'handleToggleTheme'
  | 'isLowGraphicsMode'
  | 'setIsLowGraphicsMode'
  | 'setShowTourConfirm'
>;

export const GlobalSettingsPreferencesTab = ({
  t,
  language,
  setLanguage,
  darkMode,
  handleToggleTheme,
  isLowGraphicsMode,
  setIsLowGraphicsMode,
  setShowTourConfirm,
}: GlobalSettingsPreferencesTabProps) => (
  <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
    <div className="ds-panel-subtle flex items-center justify-between rounded-2xl p-5 shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg border border-[var(--border-soft)] p-2 ${darkMode ? 'bg-[var(--surface-subtle)] text-[var(--color-accent-500)]' : 'bg-[var(--surface-subtle)] text-[var(--color-info-500)]'}`}>
          {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </div>
        <div>
          <h4 className="font-bold text-sm text-[var(--text-main)]">
            {t.globalSettings.preferences.appearance}
          </h4>
          <p className="text-[10px] text-[var(--text-dim)]">
            {darkMode ? t.globalSettings.preferences.darkMode : t.globalSettings.preferences.lightMode}
          </p>
        </div>
      </div>
      <button
        onClick={handleToggleTheme}
        className={`relative h-6 w-12 rounded-full transition-all ${darkMode ? 'bg-[var(--color-info-500)]' : 'bg-[var(--border-strong)]'}`}
      >
        <div className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${darkMode ? 'right-1' : 'right-7'}`} />
      </button>
    </div>

    <div className="ds-panel-subtle flex items-center justify-between rounded-2xl p-5 shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-3">
        <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-2 text-[var(--primary-600)]">
          <Languages className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-sm text-[var(--text-main)]">
            {t.globalSettings.preferences.language}
          </h4>
          <p className="text-[10px] text-[var(--text-dim)]">
            {language === 'en' ? 'English' : 'Arabic'}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setLanguage('en')}
          data-active={language === 'en'}
          className="rounded-lg border border-[var(--border-soft)] px-3 py-1 text-xs font-bold text-[var(--text-dim)] transition-all data-[active=true]:border-[var(--color-info-500)] data-[active=true]:bg-[var(--color-info-500)]/12 data-[active=true]:text-[var(--color-info-500)]"
        >
          EN
        </button>
        <button
          onClick={() => setLanguage('ar')}
          data-active={language === 'ar'}
          className="rounded-lg border border-[var(--border-soft)] px-3 py-1 text-xs font-bold text-[var(--text-dim)] transition-all data-[active=true]:border-[var(--color-info-500)] data-[active=true]:bg-[var(--color-info-500)]/12 data-[active=true]:text-[var(--color-info-500)]"
        >
          AR
        </button>
      </div>
    </div>

    <div className="ds-panel-subtle flex items-center justify-between rounded-2xl p-5 shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg border border-[var(--border-soft)] p-2 ${isLowGraphicsMode ? 'bg-[var(--surface-subtle)] text-[var(--color-accent-500)]' : 'bg-[var(--surface-subtle)] text-[var(--text-dim)]'}`}>
          <Zap className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-sm text-[var(--text-main)]">
            {t.settings.lowGraphics || 'Low Graphics Mode'}
          </h4>
          <p className="text-[10px] text-[var(--text-dim)]">
            {t.settings.lowGraphicsDesc || 'Disables blurs & heavy animations'}
          </p>
        </div>
      </div>
      <button
        onClick={() => setIsLowGraphicsMode(!isLowGraphicsMode)}
        className={`relative h-6 w-12 rounded-full transition-all ${isLowGraphicsMode ? 'bg-[var(--color-info-500)]' : 'bg-[var(--border-strong)]'}`}
      >
        <div className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-all ${isLowGraphicsMode ? 'right-1' : 'right-7'}`} />
      </button>
    </div>

    <div className="ds-panel-subtle flex items-center justify-between rounded-2xl p-5 shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-3">
        <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-2 text-[var(--color-accent-500)]">
          <RotateCcw className="w-5 h-5" />
        </div>
        <div>
          <h4 className="font-bold text-sm text-[var(--text-main)]">
            {t.globalSettings.preferences.interactiveTour}
          </h4>
          <p className="text-[10px] text-[var(--text-dim)]">
            {t.globalSettings.preferences.restartTour}
          </p>
        </div>
      </div>
      <Button
        size="sm"
        variant="secondary"
        className="rounded-xl font-bold"
        onClick={() => setShowTourConfirm(true)}
      >
        <span className="flex items-center gap-2">
          <Check className="w-3 h-3" />
          {t.globalSettings.preferences.reset}
        </span>
      </Button>
    </div>
  </div>
);
