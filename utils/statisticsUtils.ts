import { Person } from '../types';

/**
 * Calculate gender distribution in the family tree
 */
export function calculateGenderSplit(people: Record<string, Person>): {
    male: number;
    female: number;
    unknown: number;
} {
    const counts = { male: 0, female: 0, unknown: 0 };

    Object.values(people).forEach((person) => {
        if (person.gender === 'male') counts.male++;
        else if (person.gender === 'female') counts.female++;
        else counts.unknown++;
    });

    return counts;
}

/**
 * Get the most frequent birth locations
 */
export function getTopLocations(
    people: Record<string, Person>,
    limit: number = 5
): Array<{ location: string; count: number }> {
    const locationCounts = new Map<string, number>();

    Object.values(people).forEach((person) => {
        const location = person.birthPlace?.trim();
        if (location) {
            locationCounts.set(location, (locationCounts.get(location) || 0) + 1);
        }
    });

    return Array.from(locationCounts.entries())
        .map(([location, count]) => ({ location, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
}

/**
 * Get upcoming birthdays sorted by days until
 */
export function getUpcomingBirthdays(
    people: Record<string, Person>,
    limit: number = 5
): Array<{ person: Person; daysUntil: number; nextBirthday: Date }> {
    const today = new Date();
    const currentYear = today.getFullYear();

    const birthdays = Object.values(people)
        .filter((person) => person.birthDate && !person.deathDate) // Only living people
        .map((person) => {
            const birthDate = new Date(person.birthDate!);
            const nextBirthday = new Date(
                currentYear,
                birthDate.getMonth(),
                birthDate.getDate()
            );

            // If birthday already passed this year, use next year
            if (nextBirthday < today) {
                nextBirthday.setFullYear(currentYear + 1);
            }

            const daysUntil = Math.ceil(
                (nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
            );

            return { person, daysUntil, nextBirthday };
        })
        .sort((a, b) => a.daysUntil - b.daysUntil)
        .slice(0, limit);

    return birthdays;
}

/**
 * Find people who are disconnected from the tree
 */
export function findDisconnectedPeople(people: Record<string, Person>): Person[] {
    return Object.values(people).filter((person) => {
        const hasParents = person.parents && person.parents.length > 0;
        const hasSpouses = person.spouses && person.spouses.length > 0;
        const hasChildren = person.children && person.children.length > 0;

        return !hasParents && !hasSpouses && !hasChildren;
    });
}

/**
 * Find date logic errors in the tree
 */
export function findDateErrors(
    people: Record<string, Person>
): Array<{ person: Person; error: string }> {
    const errors: Array<{ person: Person; error: string }> = [];

    Object.values(people).forEach((person) => {
        // Check birth after death
        if (person.birthDate && person.deathDate) {
            const birth = new Date(person.birthDate);
            const death = new Date(person.deathDate);

            if (birth > death) {
                errors.push({
                    person,
                    error: 'Birth date is after death date',
                });
            }
        }

        // Check parent younger than child
        if (person.parents && person.birthDate) {
            const childBirth = new Date(person.birthDate);

            person.parents.forEach((parentId) => {
                const parent = people[parentId];
                if (parent && parent.birthDate) {
                    const parentBirth = new Date(parent.birthDate);
                    const ageDiff = childBirth.getFullYear() - parentBirth.getFullYear();

                    if (ageDiff < 13) {
                        errors.push({
                            person,
                            error: `Parent "${parent.firstName} ${parent.lastName}" was too young (${ageDiff} years) when this person was born`,
                        });
                    }
                }
            });
        }

        // Check for future dates
        const today = new Date();
        if (person.birthDate && new Date(person.birthDate) > today) {
            errors.push({
                person,
                error: 'Birth date is in the future',
            });
        }

        if (person.deathDate && new Date(person.deathDate) > today) {
            errors.push({
                person,
                error: 'Death date is in the future',
            });
        }
    });

    return errors;
}

/**
 * Find people with missing critical data
 */
export function findMissingData(people: Record<string, Person>): Array<{
    person: Person;
    missing: string[];
}> {
    return Object.values(people)
        .map((person) => {
            const missing: string[] = [];
            const hasName = person.firstName || person.lastName;

            if (!hasName) missing.push('Name');
            if (!person.birthDate) missing.push('Birth Date');
            if (!person.photoUrl) missing.push('Photo');

            return { person, missing };
        })
        .filter((item) => item.missing.length > 0);
}

/**
 * Calculate age distribution for living people
 */
export function getAgeDistribution(people: Record<string, Person>): {
    ranges: Array<{ range: string; count: number }>;
    average: number;
} {
    const today = new Date();
    const ages: number[] = [];

    Object.values(people).forEach((person) => {
        if (person.birthDate && !person.deathDate) {
            const birth = new Date(person.birthDate);
            const age = today.getFullYear() - birth.getFullYear();
            ages.push(age);
        }
    });

    const ranges = [
        { range: '0-18', count: 0 },
        { range: '19-30', count: 0 },
        { range: '31-50', count: 0 },
        { range: '51-70', count: 0 },
        { range: '71+', count: 0 },
    ];

    ages.forEach((age) => {
        if (age <= 18) ranges[0].count++;
        else if (age <= 30) ranges[1].count++;
        else if (age <= 50) ranges[2].count++;
        else if (age <= 70) ranges[3].count++;
        else ranges[4].count++;
    });

    const average = ages.length > 0
        ? Math.round(ages.reduce((sum, age) => sum + age, 0) / ages.length)
        : 0;

    return { ranges, average };
}
