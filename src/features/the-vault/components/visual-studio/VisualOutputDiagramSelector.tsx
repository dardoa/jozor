import React from 'react';
import { CircleDot, Focus, Network, TreePine } from 'lucide-react';
import type {
  PosterDesignState,
  PosterLayoutMode,
  PosterTreeScope,
  RadialSettingsBucket,
} from '../../../publishing';

interface VisualOutputDiagramSelectorProps {
  language: 'ar' | 'en';
  state: PosterDesignState;
  onSelectDiagramType: (mode: PosterLayoutMode | 'full-tree') => void;
  onSwitchScope: (scope: PosterTreeScope) => void;
  onUpdateRadial: (updates: Partial<RadialSettingsBucket>) => void;
}

export const VisualOutputDiagramSelector: React.FC<VisualOutputDiagramSelectorProps> = ({
  language,
  state,
  onSelectDiagramType,
  onSwitchScope,
  onUpdateRadial,
}) => {
  const isAr = language === 'ar';
  const activeDiagramType = state.productMode === 'detailed-poster'
    ? state.layoutMode
    : 'full-tree';
  const diagramOptions = [
    { mode: 'tiered' as const, label: isAr ? 'شجرة أجيال' : 'Generation Tree', Icon: Network },
    { mode: 'focus-family' as const, label: isAr ? 'حول شخص' : 'Around a Person', Icon: Focus },
    { mode: 'radial-generations' as const, label: isAr ? 'دائري / مروحي' : 'Radial / Fan', Icon: CircleDot },
    { mode: 'full-tree' as const, label: isAr ? 'الشجرة الكاملة' : 'Full Family Tree', Icon: TreePine },
  ];
  const scopeOptions = state.productMode === 'detailed-poster' && state.layoutMode !== 'focus-family'
    ? state.layoutMode === 'radial-generations'
      ? [
          { scope: 'ancestors' as const, label: isAr ? 'الأسلاف' : 'Ancestors' },
          { scope: 'descendants' as const, label: isAr ? 'الأحفاد' : 'Descendants' },
        ]
      : [
          { scope: 'ancestors' as const, label: isAr ? 'الأسلاف' : 'Ancestors' },
          { scope: 'descendants' as const, label: isAr ? 'الأحفاد' : 'Descendants' },
          { scope: 'selected-branch' as const, label: isAr ? 'فرع محدد' : 'Selected Branch' },
        ]
    : [];

  return (
    <section
      className="grid gap-3 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] p-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"
      data-testid="visual-studio-diagram-selector"
      dir={isAr ? 'rtl' : 'ltr'}
    >
      <fieldset className="min-w-0 space-y-2" role="group" aria-label={isAr ? 'كيف تريد عرض عائلتك؟' : 'How do you want to show your family?'}>
        <legend className="text-xs font-bold text-[var(--text-main)]">
          {isAr ? 'كيف تريد عرض عائلتك؟' : 'How do you want to show your family?'}
        </legend>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4" data-testid="poster-layout-engine-control">
          {diagramOptions.map(({ mode, label, Icon }) => {
            const isSelected = activeDiagramType === mode;
            return (
              <button
                key={mode}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onSelectDiagramType(mode)}
                className={`flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-500)] ${
                  isSelected
                    ? 'border-[var(--primary-600)] bg-[var(--primary-600)] text-white'
                    : 'border-[var(--border-soft)] bg-[var(--surface-subtle)] text-[var(--text-muted)] hover:border-[var(--primary-500)] hover:text-[var(--text-main)]'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 text-center leading-tight">{label}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {scopeOptions.length > 0 && (
        <fieldset
          className="min-w-0 space-y-2"
          role="group"
          aria-label={isAr ? 'نطاق الشجرة' : 'Tree Scope'}
          data-testid="poster-scope-group"
        >
          <legend className="text-xs font-bold text-[var(--text-main)]">
            {isAr ? 'النطاق' : 'Scope'}
          </legend>
          <div
            className="grid grid-cols-2 gap-2 sm:flex"
            data-testid={state.layoutMode === 'radial-generations'
              ? 'radial-scope-control'
              : 'poster-scope-control'}
          >
            {scopeOptions.map(({ scope, label }) => {
              const isSelected = state.scope === scope;
              return (
                <button
                  key={scope}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    onSwitchScope(scope);
                    if (state.layoutMode === 'radial-generations') {
                      onUpdateRadial({ lastRadialScope: scope as 'ancestors' | 'descendants' });
                    }
                  }}
                  className={`min-h-10 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-500)] ${
                    isSelected
                      ? 'border-[var(--primary-600)] bg-[var(--primary-500)]/10 text-[var(--primary-700)]'
                      : 'border-[var(--border-soft)] bg-[var(--surface-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}
    </section>
  );
};
