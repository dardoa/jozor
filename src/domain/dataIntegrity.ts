import { differenceInYears, isBefore, isValid, parseISO } from 'date-fns';
import type { Person } from '../types';

export type IntegritySeverity = 'INFO' | 'WARNING' | 'ERROR';

export type IntegrityCategory =
  | 'RELATIONSHIP'
  | 'TIMELINE'
  | 'DUPLICATE'
  | 'CITATION'
  | 'COMPLETENESS';

export type DataIntegrityIssueCode =
  | 'broken_parent_reference'
  | 'broken_child_reference'
  | 'broken_spouse_reference'
  | 'asymmetric_parent_child'
  | 'asymmetric_spouse'
  | 'self_parent'
  | 'self_child'
  | 'self_spouse'
  | 'duplicate_parent'
  | 'duplicate_child'
  | 'duplicate_spouse'
  | 'parent_child_cycle'
  | 'death_before_birth'
  | 'child_before_parent_birth'
  | 'mother_under_13'
  | 'possible_duplicate_person'
  | 'missing_birth_date'
  | 'missing_death_date'
  | 'missing_residence'
  | 'missing_occupation'
  | 'missing_parents'
  | 'missing_birth_citation'
  | 'missing_death_citation'
  | 'missing_profile_source';

export interface IntegrityIssue {
  readonly id: string;
  readonly code: DataIntegrityIssueCode;
  readonly severity: IntegritySeverity;
  readonly category: IntegrityCategory;
  readonly personIds?: string[];
  readonly relationshipId?: string;
  readonly personId: string;
  readonly relatedId?: string;
  readonly message: string;
}

export type DataIntegrityIssue = IntegrityIssue;

export interface DataIntegrityReport {
  readonly issues: DataIntegrityIssue[];
  readonly issuesByPerson: Record<string, string[]>;
  readonly healthScore: number;
  readonly completenessScore: number;
  readonly citationCoverage: number;
  readonly counts: Record<IntegritySeverity, number>;
  readonly countsByCategory: Record<IntegrityCategory, number>;
}

const YEAR_ONLY_PATTERN = /^\d{4}$/;

function parseLooseDate(value?: string): Date | null {
  if (!value?.trim()) return null;
  const normalized = YEAR_ONLY_PATTERN.test(value.trim()) ? `${value.trim()}-01-01` : value.trim();
  const parsed = parseISO(normalized);
  return isValid(parsed) ? parsed : null;
}

function normalizeText(value?: string): string {
  return (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function getDisplayName(person: Person): string {
  return [person.firstName, person.middleName, person.lastName].filter(Boolean).join(' ').trim() || person.id;
}

function getIssueId(issue: Pick<IntegrityIssue, 'code' | 'personId' | 'relatedId' | 'relationshipId'>): string {
  return [issue.code, issue.personId, issue.relatedId || '', issue.relationshipId || ''].join(':');
}

function getIssueCategory(code: DataIntegrityIssueCode): IntegrityCategory {
  if (code === 'death_before_birth' || code === 'child_before_parent_birth' || code === 'mother_under_13') {
    return 'TIMELINE';
  }

  if (code === 'possible_duplicate_person') {
    return 'DUPLICATE';
  }

  if (code === 'missing_birth_citation' || code === 'missing_death_citation' || code === 'missing_profile_source') {
    return 'CITATION';
  }

  if (
    code === 'missing_birth_date' ||
    code === 'missing_death_date' ||
    code === 'missing_residence' ||
    code === 'missing_occupation' ||
    code === 'missing_parents'
  ) {
    return 'COMPLETENESS';
  }

  return 'RELATIONSHIP';
}

function addIssue(
  issues: DataIntegrityIssue[],
  issue: Omit<DataIntegrityIssue, 'id' | 'category' | 'message' | 'personIds'> & { message?: string; personIds?: string[] }
): void {
  const personIds = issue.personIds || [issue.personId, issue.relatedId].filter(Boolean) as string[];
  issues.push({
    ...issue,
    id: getIssueId(issue),
    category: getIssueCategory(issue.code),
    personIds,
    message: issue.message || issue.code,
  });
}

function findDuplicates(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  values.forEach((value) => {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  });

  return [...duplicates];
}

function hasParentCycle(
  people: Record<string, Person>,
  startId: string,
  cursorId: string,
  visited = new Set<string>()
): boolean {
  if (cursorId === startId) return true;
  if (visited.has(cursorId)) return false;
  visited.add(cursorId);

  const cursor = people[cursorId];
  if (!cursor) return false;

  return cursor.parents.some((parentId) => hasParentCycle(people, startId, parentId, visited));
}

function buildIssuesByPerson(issues: DataIntegrityIssue[]): Record<string, string[]> {
  return issues.reduce<Record<string, string[]>>((acc, issue) => {
    acc[issue.personId] = acc[issue.personId] || [];
    acc[issue.personId].push(issue.message);
    return acc;
  }, {});
}

function calculateHealthScore(totalPeople: number, issues: DataIntegrityIssue[]): number {
  if (totalPeople === 0) return 100;

  const penalty = issues.reduce((sum, issue) => {
    if (issue.severity === 'ERROR') return sum + 3;
    if (issue.severity === 'WARNING') return sum + 1;
    return sum;
  }, 0);

  return Math.max(0, Math.round(100 - (penalty / totalPeople) * 10));
}

function hasText(value?: string): boolean {
  return Boolean(value?.trim());
}

function hasOccupation(person: Person): boolean {
  return hasText(person.occupation) || hasText(person.profession) || hasText(person.workplace) || hasText(person.company);
}

function hasResidence(person: Person): boolean {
  return hasText(person.currentResidence) || hasText(person.residence) || hasText(person.address);
}

function hasProfileSource(person: Person): boolean {
  return Array.isArray(person.sources) && person.sources.some((source) => hasText(source.title) || hasText(source.url));
}

function calculateCompletenessScore(people: Person[]): number {
  if (people.length === 0) return 100;

  const totalChecks = people.length * 4;
  const passedChecks = people.reduce((count, person) => {
    return count +
      (hasText(person.birthDate) ? 1 : 0) +
      (hasResidence(person) ? 1 : 0) +
      (hasOccupation(person) ? 1 : 0) +
      (person.parents.length > 0 ? 1 : 0);
  }, 0);

  return Math.round((passedChecks / totalChecks) * 100);
}

function calculateCitationCoverage(people: Person[]): number {
  let citableClaims = 0;
  let citedClaims = 0;

  people.forEach((person) => {
    if (hasText(person.birthDate) || hasText(person.birthPlace)) {
      citableClaims += 1;
      if (hasText(person.birthSource)) citedClaims += 1;
    }

    if (person.isDeceased && (hasText(person.deathDate) || hasText(person.deathPlace))) {
      citableClaims += 1;
      if (hasText(person.deathSource)) citedClaims += 1;
    }

    if (hasProfileSource(person)) {
      citableClaims += 1;
      citedClaims += 1;
    }
  });

  return citableClaims === 0 ? 100 : Math.round((citedClaims / citableClaims) * 100);
}

export function evaluateDataIntegrity(people: Record<string, Person>): DataIntegrityReport {
  const issues: DataIntegrityIssue[] = [];
  const peopleList = Object.values(people);
  const possibleDuplicateBuckets = new Map<string, string[]>();

  peopleList.forEach((person) => {
    const personName = getDisplayName(person);

    findDuplicates(person.parents).forEach((parentId) => {
      addIssue(issues, {
        code: 'duplicate_parent',
        severity: 'WARNING',
        personId: person.id,
        relatedId: parentId,
        message: `${personName} has duplicate parent links.`,
      });
    });
    findDuplicates(person.children).forEach((childId) => {
      addIssue(issues, {
        code: 'duplicate_child',
        severity: 'WARNING',
        personId: person.id,
        relatedId: childId,
        message: `${personName} has duplicate child links.`,
      });
    });
    findDuplicates(person.spouses).forEach((spouseId) => {
      addIssue(issues, {
        code: 'duplicate_spouse',
        severity: 'WARNING',
        personId: person.id,
        relatedId: spouseId,
        message: `${personName} has duplicate spouse links.`,
      });
    });

    person.parents.forEach((parentId) => {
      const parent = people[parentId];
      if (parentId === person.id) {
        addIssue(issues, {
          code: 'self_parent',
          severity: 'ERROR',
          personId: person.id,
          relatedId: parentId,
          message: `${personName} is listed as their own parent.`,
        });
      } else if (!parent) {
        addIssue(issues, {
          code: 'broken_parent_reference',
          severity: 'ERROR',
          personId: person.id,
          relatedId: parentId,
          message: `${personName} references a missing parent.`,
        });
      } else if (!parent.children.includes(person.id)) {
        addIssue(issues, {
          code: 'asymmetric_parent_child',
          severity: 'WARNING',
          personId: person.id,
          relatedId: parentId,
          message: `${personName} has a parent link that is missing from the parent's children.`,
        });
      }
    });

    person.children.forEach((childId) => {
      const child = people[childId];
      if (childId === person.id) {
        addIssue(issues, {
          code: 'self_child',
          severity: 'ERROR',
          personId: person.id,
          relatedId: childId,
          message: `${personName} is listed as their own child.`,
        });
      } else if (!child) {
        addIssue(issues, {
          code: 'broken_child_reference',
          severity: 'ERROR',
          personId: person.id,
          relatedId: childId,
          message: `${personName} references a missing child.`,
        });
      } else if (!child.parents.includes(person.id)) {
        addIssue(issues, {
          code: 'asymmetric_parent_child',
          severity: 'WARNING',
          personId: person.id,
          relatedId: childId,
          message: `${personName} has a child link that is missing from the child's parents.`,
        });
      }
    });

    person.spouses.forEach((spouseId) => {
      const spouse = people[spouseId];
      if (spouseId === person.id) {
        addIssue(issues, {
          code: 'self_spouse',
          severity: 'ERROR',
          personId: person.id,
          relatedId: spouseId,
          message: `${personName} is listed as their own spouse.`,
        });
      } else if (!spouse) {
        addIssue(issues, {
          code: 'broken_spouse_reference',
          severity: 'ERROR',
          personId: person.id,
          relatedId: spouseId,
          message: `${personName} references a missing spouse.`,
        });
      } else if (!spouse.spouses.includes(person.id)) {
        addIssue(issues, {
          code: 'asymmetric_spouse',
          severity: 'WARNING',
          personId: person.id,
          relatedId: spouseId,
          message: `${personName} has a spouse link that is not reciprocated.`,
        });
      }
    });

    if (person.parents.some((parentId) => hasParentCycle(people, person.id, parentId))) {
      addIssue(issues, {
        code: 'parent_child_cycle',
        severity: 'ERROR',
        personId: person.id,
        message: `${personName} participates in a parent-child cycle.`,
      });
    }

    const birthDate = parseLooseDate(person.birthDate);
    const deathDate = parseLooseDate(person.deathDate);
    if (!hasText(person.birthDate)) {
      addIssue(issues, {
        code: 'missing_birth_date',
        severity: 'INFO',
        personId: person.id,
        message: `${personName} is missing a birth date.`,
      });
    }

    if (person.isDeceased && !hasText(person.deathDate)) {
      addIssue(issues, {
        code: 'missing_death_date',
        severity: 'INFO',
        personId: person.id,
        message: `${personName} is marked deceased but has no death date.`,
      });
    }

    if (!hasResidence(person)) {
      addIssue(issues, {
        code: 'missing_residence',
        severity: 'INFO',
        personId: person.id,
        message: `${personName} is missing residence information.`,
      });
    }

    if (!hasOccupation(person)) {
      addIssue(issues, {
        code: 'missing_occupation',
        severity: 'INFO',
        personId: person.id,
        message: `${personName} is missing occupation information.`,
      });
    }

    if (person.parents.length === 0) {
      addIssue(issues, {
        code: 'missing_parents',
        severity: 'INFO',
        personId: person.id,
        message: `${personName} has no listed parents.`,
      });
    }

    if ((hasText(person.birthDate) || hasText(person.birthPlace)) && !hasText(person.birthSource)) {
      addIssue(issues, {
        code: 'missing_birth_citation',
        severity: 'INFO',
        personId: person.id,
        message: `${personName} has birth information without a citation.`,
      });
    }

    if (person.isDeceased && (hasText(person.deathDate) || hasText(person.deathPlace)) && !hasText(person.deathSource)) {
      addIssue(issues, {
        code: 'missing_death_citation',
        severity: 'INFO',
        personId: person.id,
        message: `${personName} has death information without a citation.`,
      });
    }

    if (!hasProfileSource(person)) {
      addIssue(issues, {
        code: 'missing_profile_source',
        severity: 'INFO',
        personId: person.id,
        message: `${personName} has no profile-level source.`,
      });
    }

    if (birthDate && deathDate && isBefore(deathDate, birthDate)) {
      addIssue(issues, {
        code: 'death_before_birth',
        severity: 'ERROR',
        personId: person.id,
        message: `${personName} has a death date before birth date.`,
      });
    }

    const nameKey = normalizeText([person.firstName, person.middleName, person.lastName].filter(Boolean).join(' '));
    const birthKey = normalizeText(person.birthDate);
    if (nameKey && birthKey) {
      const key = `${nameKey}|${birthKey}`;
      possibleDuplicateBuckets.set(key, [...(possibleDuplicateBuckets.get(key) || []), person.id]);
    }
  });

  peopleList.forEach((child) => {
    const childBirthDate = parseLooseDate(child.birthDate);
    if (!childBirthDate) return;

    child.parents.forEach((parentId) => {
      const parent = people[parentId];
      const parentBirthDate = parseLooseDate(parent?.birthDate);
      if (!parent || !parentBirthDate) return;

      if (isBefore(childBirthDate, parentBirthDate)) {
        addIssue(issues, {
          code: 'child_before_parent_birth',
          severity: 'ERROR',
          personId: child.id,
          relatedId: parentId,
          message: `${getDisplayName(child)} is born before a listed parent.`,
        });
      }

      if (parent.gender === 'female') {
        const motherAge = differenceInYears(childBirthDate, parentBirthDate);
        if (motherAge >= 0 && motherAge < 13) {
          addIssue(issues, {
            code: 'mother_under_13',
            severity: 'WARNING',
            personId: child.id,
            relatedId: parentId,
            message: `${getDisplayName(child)} has a mother younger than 13 at birth.`,
          });
        }
      }
    });
  });

  possibleDuplicateBuckets.forEach((ids) => {
    if (ids.length < 2) return;
    ids.forEach((personId) => {
      addIssue(issues, {
        code: 'possible_duplicate_person',
        severity: 'INFO',
        personId,
        relatedId: ids.find((id) => id !== personId),
        message: `${getDisplayName(people[personId])} may be a duplicate person.`,
      });
    });
  });

  const counts = issues.reduce<Record<IntegritySeverity, number>>(
    (acc, issue) => {
      acc[issue.severity] += 1;
      return acc;
    },
    { ERROR: 0, WARNING: 0, INFO: 0 }
  );
  const countsByCategory = issues.reduce<Record<IntegrityCategory, number>>(
    (acc, issue) => {
      acc[issue.category] += 1;
      return acc;
    },
    { RELATIONSHIP: 0, TIMELINE: 0, DUPLICATE: 0, CITATION: 0, COMPLETENESS: 0 }
  );

  return {
    issues,
    issuesByPerson: buildIssuesByPerson(issues),
    healthScore: calculateHealthScore(peopleList.length, issues),
    completenessScore: calculateCompletenessScore(peopleList),
    citationCoverage: calculateCitationCoverage(peopleList),
    counts,
    countsByCategory,
  };
}
