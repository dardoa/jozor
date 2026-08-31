import type { FC } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  INITIAL_POSTER_PRESETS,
  type PosterDesignState,
  type SharedPosterSettings,
} from '../../../publishing';
import type { VisualOutputConfigCopy } from './VisualOutputConfigPanel';

interface VisualOutputQuickSetupSectionProps {
  language: 'ar' | 'en';
  state: PosterDesignState;
  copy: VisualOutputConfigCopy;
  posterTitle: string;
  posterSubtitle: string;
  onSelectPreset?: (presetId: string) => void;
  onPosterTitleChange?: (value: string) => void;
  onPosterSubtitleChange?: (value: string) => void;
  onUpdateContent?: (updates: Partial<SharedPosterSettings>) => void;
}

export const VisualOutputQuickSetupSection: FC<VisualOutputQuickSetupSectionProps> = ({
  language,
  state,
  copy,
  posterTitle,
  posterSubtitle,
  onSelectPreset,
  onPosterTitleChange,
  onPosterSubtitleChange,
  onUpdateContent,
}) => {
  const isAr = language === 'ar';

  return (
    <div className="space-y-5">
      <fieldset className="space-y-2" role="group" aria-label={copy.presetsTitle}>
        <legend className="mb-1 text-xs font-medium text-stone-400">{copy.presetsTitle}</legend>
        <div className="grid grid-cols-2 gap-3">
          {INITIAL_POSTER_PRESETS.map((preset) => {
            const isSelected = state.activePresetId === preset.id;

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectPreset?.(preset.id)}
                className={`flex min-h-11 items-center justify-between rounded-lg border px-3 py-2 text-start transition-all ${
                  isSelected
                    ? 'border-amber-500 bg-amber-500/10 text-white ring-1 ring-amber-500/50'
                    : 'border-stone-800 bg-stone-950/40 text-stone-300 hover:border-stone-700 hover:bg-stone-800/40'
                }`}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="text-xs font-semibold">{preset.displayName[language]}</span>
                  {isSelected && <span className="h-2 w-2 rounded-full bg-amber-400" />}
                </div>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="space-y-3 border-t border-stone-800 pt-4">
        <div>
          <label htmlFor="poster-title-input" className="mb-1 block text-xs font-medium text-stone-400">
            {copy.posterTitle}
          </label>
          <input
            id="poster-title-input"
            aria-label={copy.posterTitle}
            type="text"
            value={posterTitle}
            onChange={(event) => onPosterTitleChange?.(event.target.value)}
            className="w-full rounded-lg border border-stone-800 bg-stone-950 px-3 py-2 text-xs text-stone-200 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div>
          <label htmlFor="poster-subtitle-input" className="mb-1 block text-xs font-medium text-stone-400">
            {copy.posterSubtitle}
          </label>
          <input
            id="poster-subtitle-input"
            aria-label={copy.posterSubtitle}
            type="text"
            value={posterSubtitle}
            onChange={(event) => onPosterSubtitleChange?.(event.target.value)}
            className="w-full rounded-lg border border-stone-800 bg-stone-950 px-3 py-2 text-xs text-stone-200 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      <fieldset className="space-y-1.5 border-t border-stone-800 pt-4" role="group" aria-label={copy.privacyMode}>
        <legend className="mb-1 text-xs font-medium text-stone-400">{copy.privacyMode}</legend>
        <div className="grid grid-cols-2 gap-2">
          {[
            { mode: 'masked' as const, label: copy.maskedLiving },
            { mode: 'owner-full' as const, label: copy.ownerFull },
          ].map(({ mode, label }) => (
            <button
              key={mode}
              type="button"
              aria-pressed={state.shared.privacyMode === mode}
              onClick={() => onUpdateContent?.({ privacyMode: mode })}
              className={`rounded-lg border px-3 py-2 text-center text-xs transition-colors ${
                state.shared.privacyMode === mode
                  ? 'border-amber-500 bg-amber-500/10 font-medium text-amber-300'
                  : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <details className="group rounded-lg border border-stone-800 bg-stone-950/30">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-xs font-semibold text-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
          <span>{isAr ? 'تفاصيل اللوحة' : 'Poster details'}</span>
          <ChevronDown className="h-4 w-4 text-stone-500 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="space-y-3 border-t border-stone-800 p-3">
          <div>
            <label htmlFor="poster-footer-input" className="mb-1 block text-xs font-medium text-stone-400">
              {copy.footerText}
            </label>
            <input
              id="poster-footer-input"
              aria-label={copy.footerText}
              type="text"
              value={state.shared.footerText}
              onChange={(event) => onUpdateContent?.({ footerText: event.target.value })}
              maxLength={80}
              className="w-full rounded-lg border border-stone-800 bg-stone-950 px-3 py-2 text-xs text-stone-200 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-stone-800 bg-stone-950/30 p-2.5 text-xs text-stone-300 hover:border-stone-700">
            <input
              type="checkbox"
              aria-label={copy.showJozorAttribution}
              checked={state.shared.showJozorAttribution}
              onChange={(event) => onUpdateContent?.({ showJozorAttribution: event.target.checked })}
              className="h-4 w-4 rounded accent-amber-500"
            />
            <span>{copy.showJozorAttribution}</span>
          </label>
        </div>
      </details>
    </div>
  );
};
