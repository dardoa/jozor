import React from 'react';
import { Sparkles } from 'lucide-react';
import { useTreeAppearanceStore } from '../../../../store/useTreeAppearanceStore';
import { PRESET_DEFINITIONS, type VisualPresetId } from '../appearanceLabModel';
import type { SettingsTextOptions } from '../shared';
import { activeStyle, inactiveStyle, SectionShell } from './sectionStyles';
import type { SectionId } from './types';

export const ThemeStyleSection = React.memo(({
  open,
  onToggle,
  settingsText,
  palettePreviewById,
}: {
  open: boolean;
  onToggle: (id: SectionId) => void;
  settingsText: SettingsTextOptions & Record<string, string>;
  palettePreviewById: Record<string, string[]>;
}) => {
  const activePreset = useTreeAppearanceStore((state) => state.meta.activePreset);
  const applyLabPreset = useTreeAppearanceStore((state) => state.applyPreset);
  const coreLabel = activePreset === 'custom'
    ? settingsText.customLabel || 'Custom'
    : settingsText[activePreset] || PRESET_DEFINITIONS.find((preset) => preset.id === activePreset)?.id || activePreset;

  return (
    <SectionShell
      id="theme"
      icon={Sparkles}
      title={settingsText.themeStyle || 'Theme Style'}
      caption={`${settingsText.heritage || 'Heritage'} • ${settingsText.modernPure || 'Modern Pure'} • ${settingsText.artistic || 'Artistic'}`}
      open={open}
      onToggle={onToggle}
    >
      <div className="flex flex-wrap items-center gap-2.5">
        {PRESET_DEFINITIONS.map((preset) => {
          const isActive = activePreset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyLabPreset(preset.id as VisualPresetId)}
              className="flex min-h-[82px] min-w-[7.75rem] flex-col items-start justify-between rounded-[20px] px-4 py-4 text-start transition-all duration-200 active:scale-95"
              style={isActive ? { ...activeStyle, transform: 'scale(1.05)', outline: '1px solid color-mix(in srgb, var(--color-accent-500) 60%, white)' } : { ...inactiveStyle, opacity: 0.9 }}
            >
              <Sparkles className="h-4 w-4 opacity-90" />
              <div className="flex w-full items-center justify-between gap-3">
                <div className="text-sm font-semibold">{settingsText[preset.id] || preset.id}</div>
                <div className="flex items-center gap-1 opacity-75">
                  {(palettePreviewById[preset.theme.colors] || []).map((swatch) => (
                    <span key={`${preset.id}-${swatch}`} className="h-2 w-2 rounded-full" style={{ backgroundColor: swatch }} />
                  ))}
                </div>
              </div>
            </button>
          );
        })}
        <div className="rounded-full bg-white/45 px-3 py-1.5 text-xs font-semibold text-[var(--text-main)] shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
          {coreLabel}
        </div>
      </div>
    </SectionShell>
  );
});
