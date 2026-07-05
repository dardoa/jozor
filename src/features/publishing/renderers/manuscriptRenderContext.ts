import type { FamilyManuscriptModel } from '../types';
import type { ManuscriptPrintTemplate } from './manuscriptTemplates';

export interface ManuscriptRenderContext {
  readonly model: FamilyManuscriptModel;
  readonly language: 'ar' | 'en';
  readonly template: ManuscriptPrintTemplate;
  readonly direction: 'rtl' | 'ltr';
}
