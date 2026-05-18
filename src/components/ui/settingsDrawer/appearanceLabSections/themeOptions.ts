import { THEME_PALETTE_OPTIONS } from '../../../../domain/appearance/appearanceEngine';

export const radiusValueToMode = (radius: number) => (radius >= 20 ? 'grand' : 'soft');
export const radiusModeToValue = (mode: 'soft' | 'grand') => (mode === 'grand' ? 24 : 16);

export const THEME_FONT_OPTIONS = [
  { id: 'classic', label: 'Classic' },
  { id: 'modern', label: 'Modern' },
];

export const THEME_RADIUS_OPTIONS = [
  { id: 'soft', label: 'Soft' },
  { id: 'grand', label: 'Grand' },
];

export const THEME_DENSITY_OPTIONS = [
  { id: 'compact', label: 'Compact' },
  { id: 'comfortable', label: 'Comfortable' },
  { id: 'airy', label: 'Airy' },
];

export const buildPalettePreviewById = () => {
  const previews: Record<string, string[]> = {};
  THEME_PALETTE_OPTIONS.forEach((palette) => {
    previews[palette.id] = palette.swatches;
  });
  return previews;
};
