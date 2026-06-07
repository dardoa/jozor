import React from 'react';
import { Sparkles } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../../../store/useAppStore';
import {
  CHART_TYPE_OPTIONS,
  SectionHeader,
  type SettingsTextOptions,
  type SettingsTranslator,
} from '../shared';
import { activeStyle, inactiveStyle } from './sectionStyles';

export const CoreEngineSection = React.memo(({ settingsText, t }: { settingsText: SettingsTextOptions; t: SettingsTranslator }) => {
  // READ: from appearanceSlice
  const { treeMode } = useAppStore(
    useShallow((state) => ({ treeMode: state.appearance.coreEngine.treeMode }))
  );
  // WRITE: directly to appearanceSlice
  const updateField = useAppStore((state) => state.updateAppearanceField);

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

      </div>
    </section>
  );
});
