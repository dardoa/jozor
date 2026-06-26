import type { ManuscriptFactEntry, ManuscriptPersonEntry } from '../types';

export interface NarrativeDraftOptions {
  readonly maxFacts?: number;
  readonly suppressEmptyPrivateNarratives?: boolean;
  readonly language?: 'ar' | 'en';
}

function findFact(facts: readonly ManuscriptFactEntry[], labels: readonly string[]): ManuscriptFactEntry | undefined {
  const normalizedLabels = labels.map((label) => label.toLowerCase());
  return facts.find((fact) => normalizedLabels.includes(fact.label.toLowerCase()));
}

function formatEvidenceSuffix(entry: ManuscriptPersonEntry, language: 'ar' | 'en'): string {
  if (entry.citationCount <= 0) {
    if (language === 'ar') {
      return 'لا توجد استشهادات مرتبطة بهذا الملف الشخصي حتى الآن.';
    }
    return 'No linked citations are recorded yet for this profile.';
  }

  if (language === 'ar') {
    const sourceText = entry.sourceHighlights.length > 0
      ? ` من أبرز المصادر: ${entry.sourceHighlights.map((source) => source.title).join('، ')}.`
      : '';
    return `يرتبط هذا الملف بـ ${entry.citationCount} استشهاد وبنسبة تغطية ${entry.citationCoverage}% للوقائع.${sourceText}`;
  }

  const sourceText = entry.sourceHighlights.length > 0
    ? ` Key sources include ${entry.sourceHighlights.map((source) => source.title).join(', ')}.`
    : '';
  return `This profile has ${entry.citationCount} linked citation${entry.citationCount === 1 ? '' : 's'} and ${entry.citationCoverage}% fact coverage.${sourceText}`;
}

function shouldSuppressNarrative(entry: ManuscriptPersonEntry, options: NarrativeDraftOptions): boolean {
  const suppressEmptyPrivateNarratives = options.suppressEmptyPrivateNarratives ?? true;
  if (!suppressEmptyPrivateNarratives) {
    return false;
  }

  return entry.displayName.trim().toLowerCase() === 'private' &&
    entry.facts.length === 0 &&
    entry.sourceHighlights.length === 0 &&
    entry.citationCount === 0;
}

export class NarrativeDraftBuilder {
  public static buildPersonNarrative(
    entry: ManuscriptPersonEntry,
    options: NarrativeDraftOptions = {}
  ): string {
    if (shouldSuppressNarrative(entry, options)) {
      return '';
    }

    const birthDate = findFact(entry.facts, ['Birth date', 'تاريخ الميلاد'])?.value;
    const birthPlace = findFact(entry.facts, ['Birth place', 'مكان الميلاد'])?.value;
    const deathDate = findFact(entry.facts, ['Death date', 'تاريخ الوفاة'])?.value;
    const deathPlace = findFact(entry.facts, ['Death place', 'مكان الوفاة'])?.value;
    const residence = findFact(entry.facts, ['Residence', 'الإقامة'])?.value;
    const occupation = findFact(entry.facts, ['Occupation', 'المهنة'])?.value;
    const language = options.language ?? 'en';

    const sentences: string[] = [];
    if (language === 'ar') {
      if (birthDate || birthPlace) {
        sentences.push(`${entry.displayName} وُلد${birthDate ? ` بتاريخ ${birthDate}` : ''}${birthPlace ? ` في ${birthPlace}` : ''}.`);
      } else {
        sentences.push(`يرد ${entry.displayName} في هذا المخطوط العائلي.`);
      }

      if (residence || occupation) {
        sentences.push([
          residence ? `يرتبط بـ ${residence}` : '',
          occupation ? `وتذكر السجلات مهنته/عمله: ${occupation}` : '',
        ].filter(Boolean).join(' ') + '.');
      }

      if (deathDate || deathPlace) {
        sentences.push(`${entry.displayName} توفي${deathDate ? ` بتاريخ ${deathDate}` : ''}${deathPlace ? ` في ${deathPlace}` : ''}.`);
      }
    } else {
      if (birthDate || birthPlace) {
        sentences.push(`${entry.displayName} was born${birthDate ? ` on ${birthDate}` : ''}${birthPlace ? ` in ${birthPlace}` : ''}.`);
      } else {
        sentences.push(`${entry.displayName} is documented in this family manuscript.`);
      }

      if (residence || occupation) {
        sentences.push([
          residence ? `They are associated with ${residence}` : '',
          occupation ? `and are recorded with the occupation ${occupation}` : '',
        ].filter(Boolean).join(' ') + '.');
      }

      if (deathDate || deathPlace) {
        sentences.push(`${entry.displayName} died${deathDate ? ` on ${deathDate}` : ''}${deathPlace ? ` in ${deathPlace}` : ''}.`);
      }
    }

    const extraFacts = entry.facts
      .filter((fact) => ![
        'Birth date',
        'Birth place',
        'Death date',
        'Death place',
        'Residence',
        'Occupation',
        'تاريخ الميلاد',
        'مكان الميلاد',
        'تاريخ الوفاة',
        'مكان الوفاة',
        'الإقامة',
        'المهنة',
      ].includes(fact.label))
      .slice(0, options.maxFacts ?? 3)
      .map((fact) => `${fact.label}: ${fact.value}`);
    if (extraFacts.length > 0) {
      sentences.push(language === 'ar'
        ? `تتضمن الوقائع الإضافية المسجلة: ${extraFacts.join('؛ ')}.`
        : `Additional recorded facts include ${extraFacts.join('; ')}.`);
    }

    sentences.push(formatEvidenceSuffix(entry, language));
    return sentences.join(' ');
  }

  public static applyToPeople(
    entries: readonly ManuscriptPersonEntry[],
    options: NarrativeDraftOptions = {}
  ): readonly ManuscriptPersonEntry[] {
    return entries.map((entry) => {
      const narrative = NarrativeDraftBuilder.buildPersonNarrative(entry, options);
      return narrative ? { ...entry, narrative } : entry;
    });
  }
}
