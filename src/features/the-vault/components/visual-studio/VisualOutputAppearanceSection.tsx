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
  const colorPaletteOptions = [
    { value: 'style-default', label: t.paletteDefault },
    { value: 'heritage-warm', label: t.paletteWarm },
    { value: 'gallery-dark', label: t.paletteGallery },
    { value: 'evergreen', label: t.paletteEvergreen },
    { value: 'monochrome-print', label: t.paletteMonochrome },
  ] satisfies ReadonlyArray<{ value: SharedPosterSettings['colorPalette']; label: string }>;
  const connectorStyleOptions = [
    { value: 'subtle', label: t.connSubtle },
    { value: 'classic', label: t.connClassic },
    { value: 'bold', label: t.connBold },
  ] satisfies ReadonlyArray<{ value: SharedPosterSettings['connectorStyle']; label: string }>;
  const connectorPathOptions = [
    { value: 'style-default', label: isAr ? 'حسب التصميم' : 'Style default' },
    { value: 'curved', label: t.connPathCurved },
    { value: 'straight', label: t.connPathStraight },
    { value: 'orthogonal', label: t.connPathAngular },
  ] satisfies ReadonlyArray<{ value: SharedPosterSettings['connectorPath']; label: string }>;
  const decorationOptions = [
    { value: 'style-default', label: t.spacingDefault },
    { value: 'clean', label: t.cardEffectNone },
    { value: 'paper-grain', label: t.decorWarmPaper },
    { value: 'lineage-grid', label: t.decorLineageGrid },
  ] satisfies ReadonlyArray<{ value: SharedPosterSettings['decoration']; label: string }>;
  const ornamentOptions = [
    { value: 'style-default', label: t.spacingDefault },
    { value: 'none', label: t.cardEffectNone },
    { value: 'lineage-medallion', label: t.ornCornerFiligree },
    { value: 'gallery-marks', label: t.ornGallery },
    { value: 'corner-branches', label: t.ornCornerBranches },
  ] satisfies ReadonlyArray<{ value: SharedPosterSettings['ornament']; label: string }>;
  const pageFrameOptions = [
    { value: 'style-default', label: t.spacingDefault },
    { value: 'none', label: t.cardEffectNone },
    { value: 'minimal', label: t.ornMinimal },
    { value: 'heritage', label: t.ornHeritage },
    { value: 'gallery', label: t.ornGallery },
  ] satisfies ReadonlyArray<{ value: SharedPosterSettings['pageFrame']; label: string }>;
  const typographyOptions = [
    { value: 'balanced', label: t.typoBalanced },
    { value: 'prominent', label: t.typoProminent },
    { value: 'compact', label: t.typoCompact },
  ] satisfies ReadonlyArray<{ value: SharedPosterSettings['typography']; label: string }>;
  const fontFamilyOptions = [
    { value: 'amiri', label: t.fontAmiri },
    { value: 'noto-sans-arabic', label: t.fontNotoSans },
  ] satisfies ReadonlyArray<{ value: SharedPosterSettings['fontFamily']; label: string }>;
  const headerOptions = [
    { value: 'style-default', label: t.spacingDefault },
    { value: 'ceremonial', label: t.headerCeremonial },
    { value: 'gallery-rail', label: t.headerModernBanner },
    { value: 'registry', label: t.headerMinimal },
  ] satisfies ReadonlyArray<{ value: SharedPosterSettings['header']; label: string }>;

  return (
    <div className="space-y-4">
            {/* Color Palette */}
            <fieldset className="space-y-1.5" role="group" aria-label={t.colorPalette} data-testid="poster-color-palette-controls">
              <legend className="text-xs font-medium text-stone-400 mb-1">{t.colorPalette}</legend>
              <div className="grid grid-cols-2 gap-2">
                {colorPaletteOptions.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={currentState.shared.colorPalette === value}
                    onClick={() => onUpdate?.({ colorPalette: value })}
                    className={`px-2.5 py-2 rounded-lg border text-xs text-center transition-colors ${
                      currentState.shared.colorPalette === value
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
                {connectorStyleOptions.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={currentState.shared.connectorStyle === value}
                    onClick={() => onUpdate?.({ connectorStyle: value })}
                    className={`px-2.5 py-2 rounded-lg border text-xs text-center transition-colors ${
                      currentState.shared.connectorStyle === value
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
                {connectorPathOptions.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={currentState.shared.connectorPath === value}
                    onClick={() => onUpdate?.({ connectorPath: value })}
                    className={`px-2.5 py-2 rounded-lg border text-xs text-center transition-colors ${
                      currentState.shared.connectorPath === value
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
                {decorationOptions.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={currentState.shared.decoration === value}
                    onClick={() => onUpdate?.({ decoration: value })}
                    className={`px-2.5 py-2 rounded-lg border text-xs text-center transition-colors ${
                      currentState.shared.decoration === value
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
                {ornamentOptions.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={currentState.shared.ornament === value}
                    onClick={() => onUpdate?.({ ornament: value })}
                    className={`px-2.5 py-2 rounded-lg border text-xs text-center transition-colors ${
                      currentState.shared.ornament === value
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
                {typographyOptions.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={currentState.shared.typography === value}
                    onClick={() => onUpdate?.({ typography: value })}
                    className={`px-2.5 py-2 rounded-lg border text-xs text-center transition-colors ${
                      currentState.shared.typography === value
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
                {fontFamilyOptions.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={currentState.shared.fontFamily === value}
                    onClick={() => onUpdate?.({ fontFamily: value })}
                    className={`px-2.5 py-2 rounded-lg border text-xs text-center transition-colors ${
                      currentState.shared.fontFamily === value
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
                {pageFrameOptions.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={currentState.shared.pageFrame === value}
                    onClick={() => onUpdate?.({ pageFrame: value })}
                    className={`px-2.5 py-2 rounded-lg border text-xs text-center transition-colors ${
                      currentState.shared.pageFrame === value
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
                {headerOptions.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={currentState.shared.header === value}
                    onClick={() => onUpdate?.({ header: value })}
                    className={`px-2.5 py-2 rounded-lg border text-xs text-center transition-colors ${
                      currentState.shared.header === value
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
