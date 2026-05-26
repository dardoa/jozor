import React from 'react';
import { Circle, Palette, Type, Waypoints } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../../../../store/useAppStore';
import { SectionHeader, type SettingsTextOptions, type SettingsTranslator } from '../shared';
import { activeStyle, inactiveStyle, SectionShell } from './sectionStyles';
import { THEME_DENSITY_OPTIONS, THEME_FONT_OPTIONS, THEME_RADIUS_OPTIONS } from './themeOptions';
import type { SectionId } from './types';

export const AppearanceSection = React.memo(({ open, onToggle, settingsText, t }: { open: boolean; onToggle: (id: SectionId) => void; settingsText: SettingsTextOptions & Record<string, string>; t: SettingsTranslator }) => {
  // READ: from appearanceSlice
  const { fontMode, radiusMode, density } = useAppStore(
    useShallow((state) => ({ 
      fontMode: state.appearance.fontMode, 
      radiusMode: state.appearance.radiusMode, 
      density: state.appearance.density 
    }))
  );
  const setAppearanceFontMode = useAppStore((state) => state.setAppearanceFontMode);
  const setAppearanceDensity = useAppStore((state) => state.setAppearanceDensity);
  const setAppearanceRadiusMode = useAppStore((state) => state.setAppearanceRadiusMode);

  return (
    <SectionShell
      id="appearance"
      icon={Palette}
      title={settingsText.appearance || 'Appearance'}
      caption={`${settingsText.fontPicker || 'Typography'} • ${settingsText.cornerRadius || 'Radius'} • ${settingsText.densitySpacing || 'Density'}`}
      open={open}
      onToggle={onToggle}
    >
      <div className="space-y-6">
        <SectionHeader icon={Type} label={settingsText.fontPicker || 'Typography'} t={t} />
        <div className="grid gap-3 sm:grid-cols-2">
          {THEME_FONT_OPTIONS.map((option) => {
            const sampleFont = option.id === 'classic' ? 'var(--font-family-serif)' : 'var(--font-family-sans)';
            return (
              <button key={option.id} type="button" onClick={() => { setAppearanceFontMode(option.id); }} className="flex min-h-[88px] flex-col items-start justify-between rounded-[20px] px-4 py-4 text-start transition-all duration-200 active:scale-95" style={fontMode === option.id ? activeStyle : inactiveStyle}>
                <div className="text-[11px] font-bold uppercase tracking-[0.08em] opacity-75">{option.label}</div>
                <div className="text-[24px] font-semibold leading-none" style={{ fontFamily: sampleFont }}>Aa</div>
              </button>
            );
          })}
        </div>
      </div>
      <div className="space-y-6">
        <SectionHeader icon={Circle} label={settingsText.cornerRadius || 'Corner Radius'} t={t} />
        <div className="flex flex-wrap gap-3">
          {THEME_RADIUS_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => { setAppearanceRadiusMode(option.id); }}
              className={`flex min-h-12 min-w-12 items-center justify-center px-4 py-3 transition-all duration-200 active:scale-95 ${option.id === 'soft' ? 'rounded-2xl' : 'rounded-[28px]'}`}
              style={radiusMode === option.id ? activeStyle : inactiveStyle}
              aria-label={option.label}
            >
              <Circle className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>
      <div className="space-y-6">
        <SectionHeader icon={Waypoints} label={settingsText.densitySpacing || 'Density'} t={t} />
        <div className="flex flex-wrap gap-3">
          {THEME_DENSITY_OPTIONS.filter((option) => option.id !== 'airy').map((option) => (
            <button key={option.id} type="button" onClick={() => { setAppearanceDensity(option.id); }} className="flex min-h-12 min-w-12 items-center justify-center rounded-2xl px-4 py-3 transition-all duration-200 active:scale-95" style={density === option.id ? activeStyle : inactiveStyle} aria-label={option.label}>
              <Waypoints className={option.id === 'compact' ? 'h-3.5 w-3.5' : 'h-4.5 w-4.5'} />
            </button>
          ))}
        </div>
      </div>
    </SectionShell>
  );
});
