import type { FC } from 'react';
import type {
  FocusSettingsBucket,
  PosterDesignState,
  PosterTreeScope,
  RadialSettingsBucket,
  SharedPosterSettings,
  TieredSettingsBucket,
} from '../../../publishing';
import type { VisualOutputConfigCopy } from './VisualOutputConfigPanel';
import type { VisualStudioPosterRootOption } from './visualStudioPosterOptions';
import { VisualOutputPersonPicker } from './VisualOutputPersonPicker';

interface VisualOutputTreeLayoutSectionProps {
  language: 'ar' | 'en';
  state: PosterDesignState;
  copy: VisualOutputConfigCopy;
  posterRootOptions: readonly VisualStudioPosterRootOption[];
  selectedPosterRootToken?: string;
  selectedFocalPersonToken?: string;
  onSelectPosterRoot?: (token: string) => void;
  onUpdateContent?: (updates: Partial<SharedPosterSettings> & { scope?: PosterTreeScope }) => void;
  onUpdateLayout?: (updates: Partial<SharedPosterSettings> & Partial<TieredSettingsBucket>) => void;
  onUpdateFocus?: (updates: Partial<FocusSettingsBucket>) => void;
  onUpdateRadial?: (updates: Partial<RadialSettingsBucket>) => void;
  onResetLayout?: () => void;
}

export const VisualOutputTreeLayoutSection: FC<VisualOutputTreeLayoutSectionProps> = ({
  language,
  state: currentState,
  copy: t,
  posterRootOptions,
  selectedPosterRootToken,
  selectedFocalPersonToken,
  onSelectPosterRoot,
  onUpdateContent,
  onUpdateLayout,
  onUpdateFocus,
  onUpdateRadial,
  onResetLayout,
}) => {
  const isAr = language === 'ar';
  const effectivePosterRootToken = selectedPosterRootToken || currentState.shared.selectedPosterRootToken;

  return (
    <div className="space-y-4">
            {/* Root selection is contextual layout input, not poster content styling. */}
            {posterRootOptions.length > 0
              && currentState.scope !== 'full-tree'
              && currentState.layoutMode === 'tiered'
              && (
              <VisualOutputPersonPicker
                language={language}
                label={t.selectedRoot}
                options={posterRootOptions}
                value={effectivePosterRootToken || posterRootOptions[0]?.token || ''}
                selectId="poster-root-select"
                testId="poster-root-select"
                onChange={(token) => {
                    if (onSelectPosterRoot) {
                      onSelectPosterRoot(token);
                    } else {
                      onUpdateContent?.({ selectedPosterRootToken: token });
                    }
                  }}
              />
            )}
            {/* Radial Generations Controls */}
            {currentState.productMode === 'detailed-poster' && currentState.layoutMode === 'radial-generations' && (
              <div className="space-y-4" data-testid="radial-controls-section">
                {/* Radial Root Person Selector */}
                {posterRootOptions.length > 0 && (
                  <VisualOutputPersonPicker
                    language={language}
                    label={t.selectedRoot}
                    options={posterRootOptions}
                    value={effectivePosterRootToken || posterRootOptions[0]?.token || ''}
                    selectId="radial-root-select"
                    testId="radial-root-select"
                    onChange={(token) => {
                        if (onSelectPosterRoot) {
                          onSelectPosterRoot(token);
                        } else {
                          onUpdateContent?.({ selectedPosterRootToken: token });
                        }
                      }}
                  />
                )}

                {/* Radial Geometry Span (360 vs 180) */}
                <fieldset className="space-y-1.5" role="group" aria-label={isAr ? 'نطاق الدائرة' : 'Radial Geometry Span'}>
                  <legend className="text-xs font-medium text-stone-400 mb-1">
                    {isAr ? 'نطاق الدائرة' : 'Radial Geometry Span'}
                  </legend>
                  <div className="grid grid-cols-2 gap-2" data-testid="radial-span-control">
                    {[
                      { span: '360-full-circle' as const, label: isAr ? '360° دائرة كاملة' : '360° Full Circle' },
                      { span: '180-half-fan' as const, label: isAr ? '180° مروحة نصف دائرة' : '180° Half Fan' },
                    ].map(({ span, label }) => {
                      const isSelected = currentState.radial.radialSpan === span;
                      return (
                        <button
                          key={span}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => onUpdateRadial?.({ radialSpan: span })}
                          className={`px-2 py-2 rounded-lg border text-xs text-center transition-colors ${
                            isSelected
                              ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-medium'
                              : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                {/* Generation Rings (3..6) */}
                <fieldset className="space-y-1.5" role="group" aria-label={isAr ? 'عدد الحلقات' : 'Generation Rings'}>
                  <legend className="text-xs font-medium text-stone-400 mb-1">
                    {isAr ? 'عدد الحلقات (الأجيال)' : 'Generation Rings'}
                  </legend>
                  <div className="grid grid-cols-4 gap-1.5" data-testid="radial-rings-control">
                    {[3, 4, 5, 6].map((rings) => {
                      const isSelected = currentState.radial.generationRings === rings;
                      return (
                        <button
                          key={rings}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => onUpdateRadial?.({ generationRings: rings as 3 | 4 | 5 | 6 })}
                          className={`py-2 rounded-lg border text-xs font-medium text-center transition-colors ${
                            isSelected
                              ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                              : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                          }`}
                        >
                          {rings}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                {/* Ring Spacing */}
                <fieldset className="space-y-1.5" role="group" aria-label={isAr ? 'المسافة بين الحلقات' : 'Ring Spacing'}>
                  <legend className="text-xs font-medium text-stone-400 mb-1">
                    {isAr ? 'المسافة بين الحلقات' : 'Ring Spacing'}
                  </legend>
                  <div className="grid grid-cols-3 gap-2" data-testid="radial-spacing-control">
                    {[
                      { spacing: 'compact' as const, label: isAr ? 'مدمجة' : 'Compact' },
                      { spacing: 'balanced' as const, label: isAr ? 'متوازنة' : 'Balanced' },
                      { spacing: 'spacious' as const, label: isAr ? 'واسعة' : 'Spacious' },
                    ].map(({ spacing, label }) => {
                      const isSelected = currentState.radial.ringSpacing === spacing;
                      return (
                        <button
                          key={spacing}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => onUpdateRadial?.({ ringSpacing: spacing })}
                          className={`px-2 py-2 rounded-lg border text-xs text-center transition-colors ${
                            isSelected
                              ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-medium'
                              : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                {/* Center Card Scale */}
                <fieldset className="space-y-1.5" role="group" aria-label={isAr ? 'حجم البطاقة المركزية' : 'Center Card Scale'}>
                  <legend className="text-xs font-medium text-stone-400 mb-1">
                    {isAr ? 'حجم البطاقة المركزية' : 'Center Card Scale'}
                  </legend>
                  <div className="grid grid-cols-3 gap-2" data-testid="radial-card-scale-control">
                    {[
                      { scale: 'compact' as const, label: isAr ? 'صغيرة' : 'Compact' },
                      { scale: 'standard' as const, label: isAr ? 'قياسية' : 'Standard' },
                      { scale: 'large' as const, label: isAr ? 'كبيرة' : 'Large' },
                    ].map(({ scale, label }) => {
                      const isSelected = currentState.radial.centerCardScale === scale;
                      return (
                        <button
                          key={scale}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => onUpdateRadial?.({ centerCardScale: scale })}
                          className={`px-2 py-2 rounded-lg border text-xs text-center transition-colors ${
                            isSelected
                              ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-medium'
                              : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

              </div>
            )}

            {/* Direction */}
            {currentState.layoutMode !== 'radial-generations' && (
            <fieldset className="space-y-1.5" role="group" aria-label={t.treeDirection}>
              <legend className="text-xs font-medium text-stone-400 mb-1">{t.treeDirection}</legend>
              <div className="grid grid-cols-2 gap-2" data-testid="poster-direction-control">
                {[
                  { dir: 'horizontal' as const, label: t.horizontal },
                  { dir: 'vertical' as const, label: t.vertical },
                ].map(({ dir, label }) => (
                  <button
                    key={dir}
                    type="button"
                    aria-pressed={currentState.shared.direction === dir}
                    onClick={() => onUpdateLayout?.({ direction: dir })}
                    className={`px-3 py-2 rounded-lg border text-xs text-center transition-colors ${
                      currentState.shared.direction === dir
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-medium'
                        : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
            )}

            {/* Depth (Tiered Ancestors/Descendants) */}
            {currentState.layoutMode === 'tiered' && currentState.scope !== 'full-tree' && (
              <div>
                <label className="block text-xs font-medium text-stone-400 mb-1.5">{t.generationsDepth}</label>
                <div className="grid grid-cols-5 gap-1.5" data-testid="poster-depth-control">
                  {[1, 2, 3, 4, 'all' as const].map((depth) => (
                    <button
                      key={String(depth)}
                      type="button"
                      aria-pressed={currentState.tiered.generationDepth === depth}
                      onClick={() => onUpdateLayout?.({ generationDepth: depth as 1 | 2 | 3 | 4 | 'all' })}
                      className={`py-2 rounded-lg border text-xs text-center font-medium transition-colors ${
                        currentState.tiered.generationDepth === depth
                          ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                          : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                      }`}
                    >
                      {depth === 'all' ? (isAr ? 'الكل' : 'All') : depth}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Focus Family Contextual Controls */}
            {currentState.productMode === 'detailed-poster' && currentState.layoutMode === 'focus-family' && (
              <div className="space-y-3 border-t border-stone-800/80 pt-3" data-testid="focus-family-controls">
                {/* Focal Person Token Selector */}
                <VisualOutputPersonPicker
                  language={language}
                  label={isAr ? 'الشخص المحوري' : 'Focal Person'}
                  options={posterRootOptions}
                  value={selectedFocalPersonToken ?? currentState.focus.focalPersonToken}
                  onChange={(token) => onUpdateFocus?.({ focalPersonToken: token })}
                  selectId="focal-person-select"
                  testId="focal-person-select"
                />

                {/* Ancestor Depth */}
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1.5">
                    {isAr ? 'عمق الأسلاف (للأعلى)' : 'Ancestor Depth (Up)'}
                  </label>
                  <div className="grid grid-cols-5 gap-1.5" data-testid="focus-ancestor-depth">
                    {[1, 2, 3, 4, 'all' as const].map((depth) => (
                      <button
                        key={`anc-${depth}`}
                        type="button"
                        aria-pressed={currentState.focus.ancestorDepth === depth}
                        onClick={() => onUpdateFocus?.({ ancestorDepth: depth as 1 | 2 | 3 | 4 | 'all' })}
                        className={`py-2 rounded-lg border text-xs text-center font-medium transition-colors ${
                          currentState.focus.ancestorDepth === depth
                            ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                            : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                        }`}
                      >
                        {depth === 'all' ? (isAr ? 'الكل' : 'All') : depth}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Descendant Depth */}
                <div>
                  <label className="block text-xs font-medium text-stone-400 mb-1.5">
                    {isAr ? 'عمق الأحفاد (للأسفل)' : 'Descendant Depth (Down)'}
                  </label>
                  <div className="grid grid-cols-5 gap-1.5" data-testid="focus-descendant-depth">
                    {[1, 2, 3, 4, 'all' as const].map((depth) => (
                      <button
                        key={`desc-${depth}`}
                        type="button"
                        aria-pressed={currentState.focus.descendantDepth === depth}
                        onClick={() => onUpdateFocus?.({ descendantDepth: depth as 1 | 2 | 3 | 4 | 'all' })}
                        className={`py-2 rounded-lg border text-xs text-center font-medium transition-colors ${
                          currentState.focus.descendantDepth === depth
                            ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                            : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                        }`}
                      >
                        {depth === 'all' ? (isAr ? 'الكل' : 'All') : depth}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Include Spouses & Siblings Checkboxes */}
                <div className="space-y-2 text-xs pt-1">
                  <label className="flex items-center gap-2 text-stone-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentState.focus.includeSpouses}
                      onChange={(e) => onUpdateFocus?.({ includeSpouses: e.target.checked })}
                      className="rounded border-stone-700 bg-stone-950 text-amber-500 focus:ring-amber-500/40"
                      data-testid="focus-include-spouses"
                    />
                    <span>{isAr ? 'تضمين الأزواج والزوجات' : 'Include Spouses'}</span>
                  </label>

                  <label className="flex items-center gap-2 text-stone-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={currentState.focus.includeSiblings}
                      onChange={(e) => onUpdateFocus?.({ includeSiblings: e.target.checked })}
                      className="rounded border-stone-700 bg-stone-950 text-amber-500 focus:ring-amber-500/40"
                      data-testid="focus-include-siblings"
                    />
                    <span>{isAr ? 'تضمين الإخوة والأخوات' : 'Include Siblings'}</span>
                  </label>
                </div>
              </div>
            )}

            {/* Spacing Density */}
            {currentState.layoutMode !== 'radial-generations' && (
            <fieldset className="space-y-1.5" role="group" aria-label={t.treeSpacing}>
              <legend className="text-xs font-medium text-stone-400 mb-1">{t.treeSpacing}</legend>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { sp: 'style-default' as const, label: t.spacingDefault },
                  { sp: 'compact' as const, label: t.spacingCompact },
                  { sp: 'balanced' as const, label: t.spacingBalanced },
                  { sp: 'airy' as const, label: t.spacingAiry },
                ].map(({ sp, label }) => (
                  <button
                    key={sp}
                    type="button"
                    onClick={() => onUpdateLayout?.({ spacing: sp === 'style-default' ? 'balanced' : sp })}
                    className={`px-3 py-2 rounded-lg border text-xs text-center transition-colors ${
                      currentState.shared.spacing === sp
                        ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-medium'
                        : 'border-stone-800 bg-stone-950/40 text-stone-400 hover:border-stone-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                aria-label={language === 'ar' ? 'إعادة ضبط التخطيط' : 'Reset Layout'}
                onClick={() => onResetLayout?.()}
                className="text-xs text-stone-400 hover:text-amber-400 transition-colors"
              >
                {t.resetSection}
              </button>
            </div>

    </div>
  );
};
