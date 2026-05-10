import React from 'react';
import { Sparkles } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useTreeAppearanceStore } from '../../../../store/useTreeAppearanceStore';
import {
  CHART_TYPE_OPTIONS,
  LAYOUT_MODE_OPTIONS,
  SectionHeader,
  type SettingsTextOptions,
  type SettingsTranslator,
} from '../shared';
import { activeStyle, inactiveStyle } from './sectionStyles';

export const CoreEngineSection = React.memo(({ settingsText, t }: { settingsText: SettingsTextOptions & Record<string, string>; t: SettingsTranslator }) => {
  const { treeMode, orientation } = useTreeAppearanceStore(
    useShallow((state) => ({ treeMode: state.coreEngine.treeMode, orientation: state.coreEngine.orientation }))
  );
  const updateField = useTreeAppearanceStore((state) => state.updateField);

  return (
    <section className="rounded-[24px] bg-transparent shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
      <div className="space-y-6 px-4 py-4">
        <SectionHeader icon={Sparkles} label={settingsText.coreSection || 'Core Engine'} t={t} />
        <div className="space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
            {settingsText.treeMode || 'Tree Mode'}
          </div>
          <div className="flex gap-1 rounded-2xl bg-white/35 p-1">
            {CHART_TYPE_OPTIONS.map((option) => {
              const ModeIcon = option.icon;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => updateField('coreEngine.treeMode', option.id)}
                  className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-[11px] font-semibold transition-all duration-200"
                  style={treeMode === option.id ? activeStyle : inactiveStyle}
                >
                  <ModeIcon className="h-[17px] w-[17px]" />
                  {t[option.labelKey] || option.id}
                </button>
              );
            })}
          </div>
        </div>
        {treeMode === 'focus' ? (
          <div className="space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              {settingsText.orientation || 'Orientation'}
            </div>
            <div className="flex flex-wrap gap-2">
              {LAYOUT_MODE_OPTIONS.filter((mode) => mode.id !== 'radial').map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => updateField('coreEngine.orientation', mode.id as 'vertical' | 'horizontal')}
                  className="inline-flex min-h-9 items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-all duration-200"
                  style={{
                    backgroundColor: orientation === mode.id ? 'rgba(166,124,55,0.12)' : 'rgba(255,255,255,0.45)',
                    color: orientation === mode.id ? 'var(--color-accent-500)' : 'var(--text-muted)',
                    borderColor: orientation === mode.id ? 'rgba(166,124,55,0.26)' : 'rgba(0,0,0,0.06)',
                    boxShadow: 'none',
                  }}
                >
                  <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full border" style={{ borderColor: 'currentColor' }}>
                    {orientation === mode.id ? <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: 'currentColor' }} /> : null}
                  </span>
                  {t[mode.labelKey]}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
});
