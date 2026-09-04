import type { Language } from '../../../types/common';
import type { KindiDiagnosticTargetField } from '../types';

export type KindiGuidedUpdateField = Extract<
  KindiDiagnosticTargetField,
  'birthDate' | 'deathDate' | 'residence' | 'profession'
>;

const GUIDED_UPDATE_DRAFTS: Record<Language, Record<KindiGuidedUpdateField, string>> = {
  ar: {
    birthDate: 'حدّث تاريخ ميلاد هذا الشخص إلى ',
    deathDate: 'حدّث تاريخ وفاة هذا الشخص إلى ',
    residence: 'حدّث سكن هذا الشخص إلى ',
    profession: 'حدّث مهنة هذا الشخص إلى ',
  },
  en: {
    birthDate: 'Update birth date for this person to ',
    deathDate: 'Update death date for this person to ',
    residence: 'Update residence for this person to ',
    profession: 'Update profession for this person to ',
  },
};

export const isKindiGuidedUpdateField = (
  field: KindiDiagnosticTargetField | undefined
): field is KindiGuidedUpdateField => (
  field === 'birthDate'
  || field === 'deathDate'
  || field === 'residence'
  || field === 'profession'
);

export const createKindiGuidedUpdateDraft = (
  field: KindiDiagnosticTargetField | undefined,
  language: Language
): string | undefined => (
  isKindiGuidedUpdateField(field) ? GUIDED_UPDATE_DRAFTS[language][field] : undefined
);
