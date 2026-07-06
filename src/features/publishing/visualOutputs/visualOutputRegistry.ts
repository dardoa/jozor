import type {
  VisualOutputDefinition,
  VisualOutputRenderer,
  VisualOutputSize,
  VisualOutputScope,
} from './visualOutputTypes';

export const VISUAL_OUTPUT_DEFINITIONS: VisualOutputDefinition[] = [
  {
    id: 'classic-ancestor-poster',
    productType: 'poster',
    templateId: 'classic-ancestor',
    displayName: {
      en: 'Classic Ancestor Poster',
      ar: 'شجرة الأسلاف الكلاسيكية الدافئة',
    },
    description: {
      en: 'Traditional cozy poster design featuring warm vintage tones (4 generations), perfect for print and framing.',
      ar: 'تصميم بوستر تقليدي مريح للعين، يعتمد على نبرات لونية هادئة (4 أجيال)، ملائم للطباعة الورقية والتأطير.',
    },
    rendererTargets: ['png', 'pdf'],
    layoutEngine: 'poster-layout',
    readingStrategy: 'ancestor',
    supportedSizes: ['A4', 'A3', 'A2', 'A1', 'A0'],
    supportedOrientations: ['portrait', 'landscape'],
    status: 'active',
    capabilities: {
      sizes: ['A4', 'A3', 'A2', 'A1', 'A0'],
      orientations: ['portrait', 'landscape'],
      scopes: ['selected-root', 'ancestor-line'],
      rendererTargets: ['png', 'pdf'],
      photoModes: ['none', 'available-profile-photos', 'circle'],
      stylePresets: ['classic', 'warm', 'vintage'],
      readingStrategies: ['ancestor'],
      layoutEngines: ['poster-layout'],
    },
  },
  {
    id: 'modern-ancestor-poster',
    productType: 'poster',
    templateId: 'modern-ancestor',
    displayName: {
      en: 'Modern Ancestor Poster',
      ar: 'شجرة الأسلاف العصرية الداكنة',
    },
    description: {
      en: 'Modern dark-themed poster design utilizing contrasting elements (4 generations) for screens or premium prints.',
      ar: 'تصميم شجرة عصري بألوان داكنة ونظام ألوان ذكي يبرز التباين والعمق (4 أجيال) للتعليق الإلكتروني والطباعة الفاخرة.',
    },
    rendererTargets: ['png', 'pdf'],
    layoutEngine: 'poster-layout',
    readingStrategy: 'ancestor',
    supportedSizes: ['A4', 'A3', 'A2', 'A1', 'A0'],
    supportedOrientations: ['portrait', 'landscape'],
    status: 'active',
    capabilities: {
      sizes: ['A4', 'A3', 'A2', 'A1', 'A0'],
      orientations: ['portrait', 'landscape'],
      scopes: ['selected-root', 'ancestor-line'],
      rendererTargets: ['png', 'pdf'],
      photoModes: ['none', 'available-profile-photos', 'circle'],
      stylePresets: ['modern', 'dark', 'minimal'],
      readingStrategies: ['ancestor'],
      layoutEngines: ['poster-layout'],
    },
  },
  {
    id: 'current-tree-snapshot',
    productType: 'snapshot',
    templateId: 'current-tree',
    displayName: {
      en: 'Current Tree Snapshot',
      ar: 'لقطة الشجرة الحالية',
    },
    description: {
      en: 'A high-fidelity export of your current workspace viewport.',
      ar: 'تصدير لقطة عالية الدقة للمساحة المعروضة حالياً.',
    },
    rendererTargets: ['png', 'pdf'],
    layoutEngine: 'tree-layout',
    readingStrategy: 'narrative',
    supportedSizes: ['viewport'],
    supportedOrientations: ['landscape', 'portrait', 'square'],
    status: 'active',
    capabilities: {
      sizes: ['viewport'],
      orientations: ['current-view'],
      scopes: ['current-tree', 'visible-nodes'],
      rendererTargets: ['png', 'pdf'],
      readingStrategies: ['narrative'],
      layoutEngines: ['tree-layout'],
    },
  },
];

export function getVisualOutputDefinition(id: string): VisualOutputDefinition | undefined {
  return VISUAL_OUTPUT_DEFINITIONS.find((def) => def.id === id);
}

export function listVisualOutputDefinitions(): VisualOutputDefinition[] {
  return VISUAL_OUTPUT_DEFINITIONS;
}

export function listVisualOutputDefinitionsByProduct(
  productType: VisualOutputDefinition['productType']
): VisualOutputDefinition[] {
  return VISUAL_OUTPUT_DEFINITIONS.filter((def) => def.productType === productType);
}

export function visualOutputSupportsRenderer(id: string, renderer: VisualOutputRenderer): boolean {
  const def = getVisualOutputDefinition(id);
  if (!def) return false;
  return def.capabilities.rendererTargets.includes(renderer);
}

export function visualOutputSupportsSize(id: string, size: VisualOutputSize): boolean {
  const def = getVisualOutputDefinition(id);
  if (!def) return false;
  return def.capabilities.sizes.includes(size);
}

export function visualOutputSupportsScope(id: string, scope: VisualOutputScope): boolean {
  const def = getVisualOutputDefinition(id);
  if (!def) return false;
  return def.capabilities.scopes.includes(scope);
}
