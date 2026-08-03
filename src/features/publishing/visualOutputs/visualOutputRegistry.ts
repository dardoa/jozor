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
      en: 'Warm print-first family poster for ancestor, descendant, or complete-tree layouts with owner-controlled photos.',
      ar: 'لوحة عائلية دافئة للطباعة تعرض الأسلاف أو الأحفاد أو الشجرة الكاملة مع صور يتحكم بها المالك.',
    },
    defaultRenderer: 'svg',
    rendererTargets: ['svg', 'png', 'pdf'],
    layoutEngine: 'ancestor-tiered',
    readingStrategy: 'ancestor',
    supportedSizes: ['A4', 'A3', 'A2', 'A1', 'A0'],
    supportedOrientations: ['portrait', 'landscape'],
    status: 'active',
    capabilities: {
      sizes: ['A4', 'A3', 'A2', 'A1', 'A0'],
      orientations: ['portrait', 'landscape'],
      scopes: ['selected-root', 'ancestor-line', 'descendant-line', 'full-tree'],
      rendererTargets: ['svg', 'png', 'pdf'],
      photoModes: ['none', 'available-profile-photos', 'circle'],
      stylePresets: ['classic'],
      readingStrategies: ['ancestor', 'descendant', 'network'],
      layoutEngines: ['ancestor-tiered', 'descendant-tiered', 'focus-family', 'full-tree-overview', 'radial-generations'],
      generationDepths: [1, 2, 3, 4, 'all'],
    },
    plannedCapabilities: {
      stylePresets: ['warm', 'vintage'],
    },
    previewAsset: {
      type: 'placeholder',
      aspectRatio: 'poster',
      alt: {
        en: 'Preview of Classic Ancestor Poster',
        ar: 'معاينة بوستر الأسلاف الكلاسيكي',
      },
    },
    recommendedFor: {
      en: ['Printing', 'Family reunion', 'Archives'],
      ar: ['الطباعة', 'لمّات العائلة', 'الأرشفة'],
    },
  },
  {
    id: 'modern-ancestor-poster',
    productType: 'poster',
    templateId: 'modern-ancestor',
    displayName: {
      en: 'Modern Gallery Poster',
      ar: 'لوحة العائلة العصرية',
    },
    description: {
      en: 'A clean gallery-style family poster with strong portraits, restrained contrast, and flexible generation depth for contemporary interiors.',
      ar: 'لوحة عائلية بأسلوب معرض حديث، تبرز الصور بتباين هادئ وتدعم عمق الأجيال المختار للطباعة في المنازل العصرية.',
    },
    defaultRenderer: 'svg',
    rendererTargets: ['svg', 'png', 'pdf'],
    layoutEngine: 'ancestor-tiered',
    readingStrategy: 'ancestor',
    supportedSizes: ['A4', 'A3'],
    supportedOrientations: ['portrait', 'landscape'],
    status: 'active',
    capabilities: {
      sizes: ['A4', 'A3', 'A2', 'A1', 'A0'],
      orientations: ['portrait', 'landscape'],
      scopes: ['selected-root', 'ancestor-line', 'descendant-line', 'full-tree'],
      rendererTargets: ['svg', 'png', 'pdf'],
      photoModes: ['none', 'available-profile-photos', 'circle'],
      stylePresets: ['modern-gallery'],
      readingStrategies: ['ancestor', 'descendant', 'network'],
      layoutEngines: ['ancestor-tiered', 'descendant-tiered', 'focus-family', 'full-tree-overview', 'radial-generations'],
      generationDepths: [1, 2, 3, 4, 'all'],
    },
    plannedCapabilities: {
      stylePresets: ['minimal'],
    },
    previewAsset: {
      type: 'placeholder',
      aspectRatio: 'poster',
      alt: {
        en: 'Preview of Modern Gallery Poster',
        ar: 'معاينة لوحة العائلة العصرية',
      },
    },
    recommendedFor: {
      en: ['Digital display', 'Presentations', 'Premium print'],
      ar: ['العرض الرقمي', 'العروض التقديمية', 'الطباعة الفاخرة'],
    },
  },
  {
    id: 'dense-genealogy-poster',
    productType: 'poster',
    templateId: 'dense-genealogy',
    displayName: {
      en: 'Dense Genealogy Poster',
      ar: 'لوحة الأنساب الكثيفة',
    },
    description: {
      en: 'A compact print-first direction for larger ancestor and descendant trees with restrained decoration and higher information density.',
      ar: 'اتجاه طباعي مدمج للأشجار الأكبر، ببطاقات أصغر وزخرفة هادئة وكثافة معلومات أعلى.',
    },
    defaultRenderer: 'svg',
    rendererTargets: ['svg', 'png', 'pdf'],
    layoutEngine: 'ancestor-tiered',
    readingStrategy: 'ancestor',
    supportedSizes: ['A4', 'A3', 'A2', 'A1', 'A0'],
    supportedOrientations: ['portrait', 'landscape'],
    status: 'experimental',
    capabilities: {
      sizes: ['A4', 'A3', 'A2', 'A1', 'A0'],
      orientations: ['portrait', 'landscape'],
      scopes: ['selected-root', 'ancestor-line', 'descendant-line', 'full-tree'],
      rendererTargets: ['svg', 'png', 'pdf'],
      photoModes: ['none', 'available-profile-photos', 'circle'],
      stylePresets: ['minimal'],
      readingStrategies: ['ancestor', 'descendant', 'network'],
      layoutEngines: ['ancestor-tiered', 'descendant-tiered', 'full-tree-overview'],
      generationDepths: [1, 2, 3, 4, 'all'],
    },
    previewAsset: {
      type: 'placeholder',
      aspectRatio: 'poster',
      alt: {
        en: 'Preview of Dense Genealogy Poster',
        ar: 'معاينة لوحة الأنساب الكثيفة',
      },
    },
    recommendedFor: {
      en: ['Larger trees', 'Branch collections', 'Information-dense print'],
      ar: ['الأشجار الأكبر', 'مجموعات الفروع', 'الطباعة كثيفة المعلومات'],
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
    previewAsset: {
      type: 'placeholder',
      aspectRatio: 'landscape',
      alt: {
        en: 'Preview of Current Tree Snapshot',
        ar: 'معاينة لقطة الشجرة الحالية',
      },
    },
    recommendedFor: {
      en: ['Quick sharing', 'Documentation', 'Current view'],
      ar: ['المشاركة السريعة', 'التوثيق', 'العرض الحالي'],
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
