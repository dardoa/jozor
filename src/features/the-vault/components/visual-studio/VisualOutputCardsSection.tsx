import type { FC } from 'react';
import { ChevronDown } from 'lucide-react';
import type { PosterDesignState, SharedPosterSettings } from '../../../publishing';
import type { VisualOutputConfigCopy } from './VisualOutputConfigPanel';

interface VisualOutputCardsSectionProps {
  language: 'ar' | 'en';
  state: PosterDesignState;
  copy: VisualOutputConfigCopy;
  onUpdate?: (updates: Partial<SharedPosterSettings>) => void;
  onUpdateContent?: (updates: Partial<SharedPosterSettings>) => void;
  onReset?: () => void;
}

export const VisualOutputCardsSection: FC<VisualOutputCardsSectionProps> = ({
  language,
  state,
  copy,
  onUpdate,
  onUpdateContent,
  onReset,
}) => {
  const isAr = language === 'ar';
  const shared = state.shared;

  return (
    <div className="space-y-4">
      <fieldset className="space-y-2" role="group" aria-label={copy.personDetails}>
        <legend className="mb-1 text-xs font-medium text-stone-400">{copy.personDetails}</legend>
        <div className="space-y-2 text-xs">
          {[
            { key: 'showYears' as const, label: copy.showYears },
            { key: 'showRelationship' as const, label: copy.showRelationship },
            { key: 'showBirthPlace' as const, label: copy.showBirthPlace },
            { key: 'showOccupation' as const, label: copy.showOccupation },
            { key: 'showDescription' as const, label: copy.showDescription },
          ].map(({ key, label }) => (
            <label key={key} className="flex cursor-pointer items-center gap-2 text-stone-300">
              <input
                type="checkbox"
                checked={Boolean(shared[key])}
                onChange={(event) => onUpdateContent?.({ [key]: event.target.checked })}
                className="rounded border-stone-700 bg-stone-950 text-amber-500 focus:ring-amber-500/40"
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="border-t border-stone-800 pt-3">
      <div className="space-y-2 text-xs">
        <label className="flex cursor-pointer items-center gap-2 text-stone-300">
          <input
            type="checkbox"
            checked={shared.includePhotos}
            onChange={(event) => onUpdate?.({ includePhotos: event.target.checked })}
            className="rounded border-stone-700 bg-stone-950 text-amber-500 focus:ring-amber-500/40"
          />
          <span>{copy.showPhotos}</span>
        </label>

        {shared.includePhotos && (
          <label className="mr-4 flex cursor-pointer items-center gap-2 text-stone-300">
            <input
              type="checkbox"
              checked={shared.hideLivingPhotos}
              onChange={(event) => onUpdate?.({ hideLivingPhotos: event.target.checked })}
              className="rounded border-stone-700 bg-stone-950 text-amber-500 focus:ring-amber-500/40"
            />
            <span>{copy.hideLivingPhotos}</span>
          </label>
        )}
      </div>
      </div>

      {shared.includePhotos && (
        <fieldset className="space-y-1.5 border-t border-stone-800 pt-3" role="group" aria-label={copy.photoShape}>
          <legend className="mb-1 text-xs font-medium text-stone-400">{copy.photoShape}</legend>
          <div className="grid grid-cols-3 gap-2" data-testid="poster-photo-shape-control">
            {[
              { value: 'circle' as const, label: copy.photoCircle },
              { value: 'square' as const, label: copy.photoSquare },
              { value: 'rounded' as const, label: copy.photoRounded },
            ].map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={shared.photoShape === value}
                onClick={() => onUpdate?.({ photoShape: value })}
                className={`rounded-lg border px-2.5 py-2 text-center text-xs transition-colors ${
                  shared.photoShape === value
                    ? 'border-amber-500 bg-amber-500/10 font-medium text-amber-300'
                    : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <details className="group rounded-lg border border-stone-800 bg-stone-950/30">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3 text-xs font-semibold text-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
          <span>{isAr ? 'تخصيص البطاقة' : 'Customize card'}</span>
          <ChevronDown className="h-4 w-4 text-stone-500 transition-transform group-open:rotate-180" aria-hidden="true" />
        </summary>
        <div className="space-y-4 border-t border-stone-800 p-3">
          <fieldset className="space-y-1.5 border-t border-stone-800 pt-3" role="group" aria-label={copy.cardScale}>
            <legend className="mb-1 text-xs font-medium text-stone-400">{copy.cardScale}</legend>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'compact' as const, label: copy.cardScaleCompact },
                { value: 'standard' as const, label: copy.cardScaleStandard },
                { value: 'large' as const, label: copy.cardScaleLarge },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={shared.cardScale === value}
                  onClick={() => onUpdate?.({ cardScale: value })}
                  className={`rounded-lg border px-2.5 py-2 text-center text-xs transition-colors ${
                    shared.cardScale === value
                      ? 'border-amber-500 bg-amber-500/10 font-medium text-amber-300'
                      : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-1.5 border-t border-stone-800 pt-3" role="group" aria-label={copy.cardLayout}>
            <legend className="mb-1 text-xs font-medium text-stone-400">{copy.cardLayout}</legend>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'style-default' as const, label: isAr ? 'حسب التصميم' : 'Style default' },
                { value: 'standard' as const, label: copy.cardLayoutStandard },
                { value: 'photo-focused' as const, label: copy.cardLayoutPhotoHero },
                { value: 'text-minimal' as const, label: copy.cardLayoutTextMinimal },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={shared.cardLayout === value}
                  onClick={() => onUpdate?.({ cardLayout: value })}
                  className={`rounded-lg border px-2.5 py-2 text-center text-xs transition-colors ${
                    shared.cardLayout === value
                      ? 'border-amber-500 bg-amber-500/10 font-medium text-amber-300'
                      : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-1.5 border-t border-stone-800 pt-3" role="group" aria-label={copy.cardEffect}>
            <legend className="mb-1 text-xs font-medium text-stone-400">{copy.cardEffect}</legend>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'style-default' as const, label: copy.cardEffectDefault },
                { value: 'flat' as const, label: copy.cardEffectNone },
                { value: 'soft' as const, label: copy.cardEffectSoft },
                { value: 'elevated' as const, label: copy.cardEffectHard },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={shared.cardEffect === value}
                  onClick={() => onUpdate?.({ cardEffect: value })}
                  className={`rounded-lg border px-2.5 py-2 text-center text-xs transition-colors ${
                    shared.cardEffect === value
                      ? 'border-amber-500 bg-amber-500/10 font-medium text-amber-300'
                      : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-1.5 border-t border-stone-800 pt-3" role="group" aria-label={copy.cardFrame}>
            <legend className="mb-1 text-xs font-medium text-stone-400">{copy.cardFrame}</legend>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'style-default' as const, label: copy.cardFrameDefault },
                { value: 'minimal' as const, label: copy.cardFrameMinimal },
                { value: 'classic' as const, label: copy.cardFrameClassic },
                { value: 'ornate' as const, label: copy.cardFrameOrnate },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={shared.cardFrame === value}
                  onClick={() => onUpdate?.({ cardFrame: value })}
                  className={`rounded-lg border px-2.5 py-2 text-center text-xs transition-colors ${
                    shared.cardFrame === value
                      ? 'border-amber-500 bg-amber-500/10 font-medium text-amber-300'
                      : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-1.5 border-t border-stone-800 pt-3" role="group" aria-label={copy.cardCorner}>
            <legend className="mb-1 text-xs font-medium text-stone-400">{copy.cardCorner}</legend>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'style-default' as const, label: copy.cardCornerDefault },
                { value: 'square' as const, label: copy.cardCornerSquare },
                { value: 'soft' as const, label: copy.cardCornerSoft },
                { value: 'rounded' as const, label: copy.cardCornerRounded },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={shared.cardCorner === value}
                  onClick={() => onUpdate?.({ cardCorner: value })}
                  className={`rounded-lg border px-2.5 py-2 text-center text-xs transition-colors ${
                    shared.cardCorner === value
                      ? 'border-amber-500 bg-amber-500/10 font-medium text-amber-300'
                      : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      </details>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-stone-400 transition-colors hover:text-amber-400"
        >
          {copy.resetSection}
        </button>
      </div>
    </div>
  );
};
