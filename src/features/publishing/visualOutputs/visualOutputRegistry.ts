import type { VisualOutputDefinition } from './visualOutputTypes';

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
    supportedSizes: ['A4'],
    supportedOrientations: ['portrait'],
    status: 'active',
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
    supportedSizes: ['A4'],
    supportedOrientations: ['portrait'],
    status: 'active',
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
