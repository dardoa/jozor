import type { PublicationTemplate } from '../types';
import { CLASSIC_THEME, MODERN_THEME } from '../renderers/PosterRenderer';

export const CLASSIC_ANCESTOR_POSTER_TEMPLATE: PublicationTemplate = {
  id: 'classic-ancestor-poster',
  name: 'شجرة الأسلاف الكلاسيكية الدافئة',
  publicationKind: 'ancestor-poster',
  outputFamily: 'graphic',
  documentType: 'single-page',
  theme: CLASSIC_THEME,
  sections: [
    { type: 'cover' },
    { type: 'tree', options: { variant: 'ancestor', depth: 4 } }
  ],
  defaultLayoutOptions: {
    pageWidth: 1000,
    pageHeight: 800,
    margins: {
      top: 50,
      bottom: 50,
      left: 50,
      right: 50,
    },
  },
};

export const MODERN_ANCESTOR_POSTER_TEMPLATE: PublicationTemplate = {
  id: 'modern-ancestor-poster',
  name: 'شجرة الأسلاف العصرية الداكنة',
  publicationKind: 'ancestor-poster',
  outputFamily: 'graphic',
  documentType: 'single-page',
  theme: MODERN_THEME,
  sections: [
    { type: 'cover' },
    { type: 'tree', options: { variant: 'ancestor', depth: 4 } }
  ],
  defaultLayoutOptions: {
    pageWidth: 1000,
    pageHeight: 800,
    margins: {
      top: 60,
      bottom: 60,
      left: 60,
      right: 60,
    },
  },
};

export const CLASSIC_BOOK_MANUSCRIPT_TEMPLATE: PublicationTemplate = {
  id: 'classic-book-manuscript',
  name: 'كتاب العائلة الكلاسيكي المصغر',
  publicationKind: 'book-manuscript',
  outputFamily: 'document',
  documentType: 'paginated',
  theme: CLASSIC_THEME,
  sections: [
    { type: 'cover' },
    { type: 'introduction' },
    { type: 'tree', options: { variant: 'ancestor', depth: 3 } },
    { type: 'timeline' },
  ],
  defaultLayoutOptions: {
    pageWidth: 595, // A4
    pageHeight: 842,
    margins: {
      top: 50,
      bottom: 50,
      left: 50,
      right: 50,
    },
  },
};

export const ALL_TEMPLATES: readonly PublicationTemplate[] = [
  CLASSIC_ANCESTOR_POSTER_TEMPLATE,
  MODERN_ANCESTOR_POSTER_TEMPLATE,
  CLASSIC_BOOK_MANUSCRIPT_TEMPLATE,
];
