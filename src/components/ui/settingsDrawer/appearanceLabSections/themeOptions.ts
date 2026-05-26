import {
  THEME_PALETTE_OPTIONS,
  type ThemeDensity,
  type ThemeFontMode,
  type ThemeRadiusMode,
} from '../../../../domain/appearance/appearanceEngine';

export const radiusValueToMode = (radius: number) => (radius >= 20 ? 'grand' : 'soft');
export const radiusModeToValue = (mode: 'soft' | 'grand') => (mode === 'grand' ? 24 : 16);

export const THEME_FONT_OPTIONS = [
  { id: 'classic', label: 'Classic' },
  { id: 'modern', label: 'Modern' },
] satisfies Array<{ id: ThemeFontMode; label: string }>;

export const THEME_RADIUS_OPTIONS = [
  { id: 'soft', label: 'Soft' },
  { id: 'grand', label: 'Grand' },
] satisfies Array<{ id: ThemeRadiusMode; label: string }>;

export const THEME_DENSITY_OPTIONS = [
  { id: 'compact', label: 'Compact' },
  { id: 'comfortable', label: 'Comfortable' },
  { id: 'airy', label: 'Airy' },
] satisfies Array<{ id: ThemeDensity; label: string }>;

export const buildPalettePreviewById = () => {
  const previews: Record<string, string[]> = {};
  THEME_PALETTE_OPTIONS.forEach((palette) => {
    previews[palette.id] = palette.swatches;
  });
  return previews;
};
