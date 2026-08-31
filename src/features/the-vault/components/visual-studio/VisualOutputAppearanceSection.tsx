import type { FC } from 'react';
import { ChevronDown } from 'lucide-react';
import type { PosterDesignState, SharedPosterSettings } from '../../../publishing';
import type { VisualOutputConfigCopy } from './VisualOutputConfigPanel';

interface VisualOutputAppearanceSectionProps {
  language: 'ar' | 'en';
  state: PosterDesignState;
  copy: VisualOutputConfigCopy;
  onUpdate?: (updates: Partial<SharedPosterSettings>) => void;
  onReset?: () => void;
}

export const VisualOutputAppearanceSection: FC<VisualOutputAppearanceSectionProps> = ({
  language,
  state: currentState,
  copy: t,
  onUpdate,
  onReset,
}) => {
  const isAr = language === 'ar';

  return (
    <div className="space-y-4">
            {/* Color Palette */}
            <fieldset className="space-y-1.5" role="group" aria-label={t.colorPalette} data-testid="poster-color-palette-controls">
              <legend className="text-xs font-medium text-stone-400 mb-1">{t.colorPalette}</legend>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { cp: 'style-default' as const, label: t.paletteDefault },
                  { cp: 'heritage-warm' as const, label: t.paletteWarm },
                  { cp: 'gallery-dark' as const, label: t.paletteGallery },
                  { cp: 'evergreen' as const, label: t.paletteEvergreen },
                  { cp: 'monochrome-print' as const, label: t.paletteMonochrome },
                ].map(({ cp, label }) => (
                  <button
                    key={cp}
                    type="button"
                    aria-pressed={currentState.shared.colorPalette === cp}
                    onClick={() => onUpdate?.({ colorPalette: cp as SharedPosterSettings['colorPalette'] })}
                    className={`px-2.5 py-2 rounded-lg border text-xs text-center transition-colors ${
                      currentState.shared.colorPalette === cp
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-medium'
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
                <span>{isAr ? 'تخصيص التصميم المتقدم' : 'Advanced design customization'}</span>
                <ChevronDown className="h-4 w-4 text-stone-500 transition-transform group-open:rotate-180" aria-hidden="true" />
              </summary>
              <div className="space-y-4 border-t border-stone-800 p-3">
            {/* Connector Style */}
            <fieldset className="space-y-1.5 border-t border-stone-800 pt-3" role="group" aria-label={t.connectors} data-testid="poster-connector-style-controls">
              <legend className="text-xs font-medium text-stone-400 mb-1">{t.connectors}</legend>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { cs: 'subtle' as const, label: t.connSubtle },
                  { cs: 'classic' as const, label: t.connClassic },
                  { cs: 'bold' as const, label: t.connBold },
                ].map(({ cs, label }) => (
                  <button
                    key={cs}
                    type="button"
                    aria-pressed={currentState.shared.connectorStyle === cs}
                    onClick={() => onUpdate?.({ connectorStyle: cs as SharedPosterSettings['connectorStyle'] })}
                    className={`px-2.5 py-2 rounded-lg border text-xs text-center transition-colors ${
                      currentState.shared.connectorStyle === cs
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-medium'
                        : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Connector Path */}
            <fieldset className="space-y-1.5 border-t border-stone-800 pt-3" role="group" aria-label={t.connectorPath} data-testid="poster-connector-path-controls">
              <legend className="text-xs font-medium text-stone-400 mb-1">{t.connectorPath}</legend>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { cp: 'style-default' as const, label: isAr ? 'حسب التصميم' : 'Style default' },
                  { cp: 'curved' as const, label: t.connPathCurved },
                  { cp: 'straight' as const, label: t.connPathStraight },
                  { cp: 'angular' as const, label: t.connPathAngular },
                ].map(({ cp, label }) => (
                  <button
                    key={cp}
                    type="button"
                    aria-pressed={currentState.shared.connectorPath === cp}
                    onClick={() => onUpdate?.({ connectorPath: cp as SharedPosterSettings['connectorPath'] })}
                    className={`px-2.5 py-2 rounded-lg border text-xs text-center transition-colors ${
                      currentState.shared.connectorPath === cp
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-medium'
                        : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Background Texture / Decoration */}
            <fieldset className="space-y-1.5 border-t border-stone-800 pt-3" role="group" aria-label={t.decoration}>
              <legend className="text-xs font-medium text-stone-400 mb-1">{t.decoration}</legend>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { dec: 'style-default' as const, label: t.spacingDefault },
                  { dec: 'none' as const, label: t.cardEffectNone },
                  { dec: 'warm-paper' as const, label: t.decorWarmPaper },
                  { dec: 'lineage-grid' as const, label: t.decorLineageGrid },
                ].map(({ dec, label }) => (
                  <button
                    key={dec}
                    type="button"
                    aria-pressed={currentState.shared.decoration === dec}
                    onClick={() => onUpdate?.({ decoration: dec as SharedPosterSettings['decoration'] })}
                    className={`px-2.5 py-2 rounded-lg border text-xs text-center transition-colors ${
                      currentState.shared.decoration === dec
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-medium'
                        : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Corner Ornaments */}
            <fieldset className="space-y-1.5 border-t border-stone-800 pt-3" role="group" aria-label={t.ornament}>
              <legend className="text-xs font-medium text-stone-400 mb-1">{t.ornament}</legend>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { orn: 'style-default' as const, label: t.spacingDefault },
                  { orn: 'none' as const, label: t.cardEffectNone },
                  { orn: 'corner-filigree' as const, label: t.ornCornerFiligree },
                  { orn: 'corner-branches' as const, label: t.ornCornerBranches },
                ].map(({ orn, label }) => (
                  <button
                    key={orn}
                    type="button"
                    aria-pressed={currentState.shared.ornament === orn}
                    onClick={() => onUpdate?.({ ornament: orn as SharedPosterSettings['ornament'] })}
                    className={`px-2.5 py-2 rounded-lg border text-xs text-center transition-colors ${
                      currentState.shared.ornament === orn
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-medium'
                        : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Typography Scale */}
            <fieldset className="space-y-1.5 border-t border-stone-800 pt-3" role="group" aria-label={t.typography}>
              <legend className="text-xs font-medium text-stone-400 mb-1">{t.typography}</legend>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { ty: 'balanced' as const, label: t.typoBalanced },
                  { ty: 'prominent' as const, label: t.typoProminent },
                  { ty: 'compact' as const, label: t.typoCompact },
                ].map(({ ty, label }) => (
                  <button
                    key={ty}
                    type="button"
                    aria-pressed={currentState.shared.typography === ty}
                    onClick={() => onUpdate?.({ typography: ty as SharedPosterSettings['typography'] })}
                    className={`px-2.5 py-2 rounded-lg border text-xs text-center transition-colors ${
                      currentState.shared.typography === ty
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-medium'
                        : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Arabic Font */}
            <fieldset className="space-y-1.5 border-t border-stone-800 pt-3" role="group" aria-label={t.fontFamily}>
              <legend className="text-xs font-medium text-stone-400 mb-1">{t.fontFamily}</legend>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { ff: 'amiri' as const, label: t.fontAmiri },
                  { ff: 'noto-sans-arabic' as const, label: t.fontNotoSans },
                ].map(({ ff, label }) => (
                  <button
                    key={ff}
                    type="button"
                    aria-pressed={currentState.shared.fontFamily === ff}
                    onClick={() => onUpdate?.({ fontFamily: ff as SharedPosterSettings['fontFamily'] })}
                    className={`px-2.5 py-2 rounded-lg border text-xs text-center transition-colors ${
                      currentState.shared.fontFamily === ff
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-medium'
                        : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Page Border Frame */}
            <fieldset className="space-y-1.5 border-t border-stone-800 pt-3" role="group" aria-label={t.pageFrame}>
              <legend className="text-xs font-medium text-stone-400 mb-1">{t.pageFrame}</legend>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { pf: 'style-default' as const, label: t.spacingDefault },
                  { pf: 'heritage' as const, label: t.ornHeritage },
                  { pf: 'gallery' as const, label: t.ornGallery },
                  { pf: 'minimal' as const, label: t.ornMinimal },
                  { pf: 'ornate-corner-filigree' as const, label: t.ornOrnateCornerFiligree },
                ].map(({ pf, label }) => (
                  <button
                    key={pf}
                    type="button"
                    aria-pressed={currentState.shared.pageFrame === pf}
                    onClick={() => onUpdate?.({ pageFrame: pf as SharedPosterSettings['pageFrame'] })}
                    className={`px-2.5 py-2 rounded-lg border text-xs text-center transition-colors ${
                      currentState.shared.pageFrame === pf
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-medium'
                        : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Header Layout Style */}
            <fieldset className="space-y-1.5 border-t border-stone-800 pt-3" role="group" aria-label={t.headerStyle}>
              <legend className="text-xs font-medium text-stone-400 mb-1">{t.headerStyle}</legend>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { hs: 'style-default' as const, label: t.spacingDefault },
                  { hs: 'ceremonial' as const, label: t.headerCeremonial },
                  { hs: 'modern-banner' as const, label: t.headerModernBanner },
                  { hs: 'minimal' as const, label: t.headerMinimal },
                ].map(({ hs, label }) => (
                  <button
                    key={hs}
                    type="button"
                    aria-pressed={currentState.shared.header === hs}
                    onClick={() => onUpdate?.({ header: hs as SharedPosterSettings['header'] })}
                    className={`px-2.5 py-2 rounded-lg border text-xs text-center transition-colors ${
                      currentState.shared.header === hs
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-medium'
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

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => onReset?.()}
                className="text-xs text-stone-400 hover:text-amber-400 transition-colors"
              >
                {t.resetSection}
              </button>
            </div>

    </div>
  );
};
