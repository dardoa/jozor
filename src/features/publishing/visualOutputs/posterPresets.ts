import type { PosterPresetDefinition, SharedPosterSettings } from './posterStateContracts';

export const CLASSIC_HERITAGE_PRESET: PosterPresetDefinition = {
  id: 'classic-heritage',
  displayName: {
    en: 'Classic Heritage',
    ar: 'التراث الكلاسيكي',
  },
  description: {
    en: 'Portrait-led family heritage artwork with warm manuscript details and ceremonial framing.',
    ar: 'لوحة تراثية عائلية تبرز صور الأشخاص ضمن تفاصيل دافئة وإطار احتفائي أصيل.',
  },
  baselineSettings: {
    colorPalette: 'heritage-warm',
    typography: 'prominent',
    fontFamily: 'amiri',
    cardScale: 'standard',
    cardEffect: 'soft',
    cardFrame: 'classic',
    cardCorner: 'soft',
    cardLayout: 'photo-focused',
    photoShape: 'circle',
    pageFrame: 'heritage',
    header: 'ceremonial',
    ornament: 'corner-branches',
    decoration: 'lineage-grid',
    connectorStyle: 'classic',
    connectorPath: 'style-default',
    spacing: 'balanced',
    marginPreset: 'balanced',
  },
};

export const MODERN_GALLERY_PRESET: PosterPresetDefinition = {
  id: 'modern-gallery',
  displayName: {
    en: 'Modern Gallery',
    ar: 'المعرض العصري',
  },
  description: {
    en: 'Sleek gallery dark aesthetic with modern sans-serif typography and clean rounded cards.',
    ar: 'طابع المعرض العصري الداكن مع خطوط حديثة وبطاقات دائرية الحواف.',
  },
  baselineSettings: {
    colorPalette: 'gallery-dark',
    typography: 'compact',
    fontFamily: 'noto-sans-arabic',
    cardScale: 'standard',
    cardEffect: 'flat',
    cardFrame: 'minimal',
    cardCorner: 'rounded',
    cardLayout: 'style-default',
    photoShape: 'circle',
    pageFrame: 'gallery',
    header: 'gallery-rail',
    ornament: 'gallery-marks',
    decoration: 'clean',
    connectorStyle: 'subtle',
    connectorPath: 'style-default',
    spacing: 'airy',
    marginPreset: 'compact',
  },
};

export const DENSE_GENEALOGY_PRESET: PosterPresetDefinition = {
  id: 'dense-genealogy',
  displayName: {
    en: 'Dense Genealogy',
    ar: 'الأنساب الكثيفة',
  },
  description: {
    en: 'Compact, restrained cards and connectors for larger family trees that need more printable capacity.',
    ar: 'بطاقات وخطوط مدمجة وهادئة للأشجار العائلية الأكبر التي تحتاج مساحة طباعة أكبر.',
  },
  baselineSettings: {
    colorPalette: 'evergreen',
    typography: 'balanced',
    fontFamily: 'noto-sans-arabic',
    cardScale: 'standard',
    cardEffect: 'flat',
    cardFrame: 'minimal',
    cardCorner: 'square',
    cardLayout: 'standard',
    photoShape: 'circle',
    pageFrame: 'minimal',
    header: 'registry',
    ornament: 'none',
    decoration: 'clean',
    connectorStyle: 'subtle',
    connectorPath: 'orthogonal',
    spacing: 'compact',
    marginPreset: 'compact',
  },
};

export const INITIAL_POSTER_PRESETS: readonly PosterPresetDefinition[] = [
  CLASSIC_HERITAGE_PRESET,
  MODERN_GALLERY_PRESET,
  DENSE_GENEALOGY_PRESET,
];

export function getPosterPresetDefinition(presetId: string): PosterPresetDefinition | undefined {
  return INITIAL_POSTER_PRESETS.find((p) => p.id === presetId);
}

export function normalizePresetId(presetId: string): string {
  const definition = getPosterPresetDefinition(presetId);
  return definition ? definition.id : CLASSIC_HERITAGE_PRESET.id;
}

export function getDefaultSharedSettingsForPreset(presetId: string): Partial<SharedPosterSettings> {
  const normalizedId = normalizePresetId(presetId);
  const preset = getPosterPresetDefinition(normalizedId);
  return preset ? preset.baselineSettings : CLASSIC_HERITAGE_PRESET.baselineSettings;
}
