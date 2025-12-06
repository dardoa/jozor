
import { Person } from '../types';
import { getDisplayDate } from './familyLogic';

export interface ConsistencyIssue {
    id: string;
    personId: string;
    relatedPersonId?: string;
    type: 'parentTooYoung' | 'parentTooOld' | 'bornAfterDeath' | 'futureBirth' | 'immortal' | 'childOlderThanParent';
    details: string;
    severity: 'warning' | 'error';
}

const getYear = (dateStr?: string): number | null => {
    if (!dateStr) return null;
    const y = parseInt(getDisplayDate(dateStr));
    return isNaN(y) ? null : y;
};

export const checkConsistency = (people: Record<string, Person>): ConsistencyIssue[] => {
    const issues: ConsistencyIssue[] = [];
    const currentYear = new Date().getFullYear();

    Object.values(people).forEach(person => {
        const birthYear = getYear(person.birthDate);
        const deathYear = getYear(person.deathDate);

        // 1. Basic Validity
        if (birthYear && birthYear > currentYear) {
            issues.push({
                id: `future-${person.id}`,
                personId: person.id,
                type: 'futureBirth',
                details: `${birthYear}`,
                severity: 'error'
            });
        }

        if (birthYear && deathYear && deathYear < birthYear) {
            issues.push({
                id: `bornAfterDeath-${person.id}`,
                personId: person.id,
                type: 'bornAfterDeath',
                details: `Died ${deathYear}, Born ${birthYear}`,
                severity: 'error'
            });
        }

        if (birthYear && !person.isDeceased && (currentYear - birthYear > 110)) {
            issues.push({
                id: `immortal-${person.id}`,
                personId: person.id,
                type: 'immortal',
                details: `Age: ${currentYear - birthYear}`,
                severity: 'warning'
            });
        }

        // 2. Parent Logic
        person.parents.forEach(parentId => {
            const parent = people[parentId];
            if (!parent) return;
            
            const parentBirthYear = getYear(parent.birthDate);
            const parentDeathYear = getYear(parent.deathDate);

            if (birthYear && parentBirthYear) {
                const diff = birthYear - parentBirthYear;
                if (diff < 0) {
                     issues.push({
                        id: `older-${person.id}-${parentId}`,
                        personId: person.id,
                        relatedPersonId: parentId,
                        type: 'childOlderThanParent',
                        details: `Child born ${Math.abs(diff)} years before parent`,
                        severity: 'error'
                    });
                } else if (diff < 12) {
                     issues.push({
                        id: `young-${person.id}-${parentId}`,
                        personId: person.id,
                        relatedPersonId: parentId,
                        type: 'parentTooYoung',
                        details: `Parent was ${diff} years old`,
                        severity: 'warning'
                    });
                } else if (parent.gender === 'female' && diff > 55) {
                    issues.push({
                        id: `old-${person.id}-${parentId}`,
                        personId: person.id,
                        relatedPersonId: parentId,
                        type: 'parentTooOld',
                        details: `Mother was ${diff} years old`,
                        severity: 'warning'
                    });
                }
            }

            if (birthYear && parentDeathYear) {
                // Allow some margin for father (conception before death)
                const margin = parent.gender === 'male' ? 1 : 0;
                if (birthYear > parentDeathYear + margin) {
                     issues.push({
                        id: `ghost-${person.id}-${parentId}`,
                        personId: person.id,
                        relatedPersonId: parentId,
                        type: 'bornAfterDeath',
                        details: `Born ${birthYear - parentDeathYear} years after parent died`,
                        severity: 'error'
                    });
                }
            }
        });
    });

    return issues;
};
