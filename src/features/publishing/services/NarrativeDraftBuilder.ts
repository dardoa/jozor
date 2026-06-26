import type { ManuscriptFactEntry, ManuscriptPersonEntry } from '../types';

export interface NarrativeDraftOptions {
  readonly maxFacts?: number;
  readonly suppressEmptyPrivateNarratives?: boolean;
}

function findFact(facts: readonly ManuscriptFactEntry[], label: string): ManuscriptFactEntry | undefined {
  return facts.find((fact) => fact.label.toLowerCase() === label.toLowerCase());
}

function formatEvidenceSuffix(entry: ManuscriptPersonEntry): string {
  if (entry.citationCount <= 0) {
    return 'No linked citations are recorded yet for this profile.';
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

    const birthDate = findFact(entry.facts, 'Birth date')?.value;
    const birthPlace = findFact(entry.facts, 'Birth place')?.value;
    const deathDate = findFact(entry.facts, 'Death date')?.value;
    const deathPlace = findFact(entry.facts, 'Death place')?.value;
    const residence = findFact(entry.facts, 'Residence')?.value;
    const occupation = findFact(entry.facts, 'Occupation')?.value;

    const sentences: string[] = [];
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

    const extraFacts = entry.facts
      .filter((fact) => !['Birth date', 'Birth place', 'Death date', 'Death place', 'Residence', 'Occupation'].includes(fact.label))
      .slice(0, options.maxFacts ?? 3)
      .map((fact) => `${fact.label}: ${fact.value}`);
    if (extraFacts.length > 0) {
      sentences.push(`Additional recorded facts include ${extraFacts.join('; ')}.`);
    }

    sentences.push(formatEvidenceSuffix(entry));
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
