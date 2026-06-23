import { Person } from '../types';
import { normalizePlaceName } from '../domain/placeUtils';
import { evaluateDataIntegrity } from '../domain/dataIntegrity';
import { getDisplayDate } from '../utils/familyLogic';

interface PlaceBucket {
    key: string;
    name: string;
    count: number;
    firstSeen: number;
}

export interface StatsData {
    kpis: {
        totalMembers: number;
        maxGeneration: number;
        genderRatio: { male: number; female: number; other: number };
        averageLifespan: number;
        healthScore: number;
    };
    records: {
        oldestPerson: { name: string; age: number } | null;
        mostChildren: { name: string; count: number } | null;
    };
    demographics: { decade: string; count: number }[];
    vitality: { status: string; count: number; color: string }[];
    surnames: { text: string; value: number }[];
    topNames: {
        male: { name: string; count: number }[];
        female: { name: string; count: number }[];
    };
    topPlaces: { name: string; count: number }[];
    ageDistribution: { range: string; count: number }[];
    upcomingBirthdays: {
        person: { id: string; firstName: string; lastName: string; photoUrl?: string };
        daysUntil: number;
        ageTurning: number;
        nextBirthday: string;
    }[];
}

/**
 * StatsEngine: Optimized logic for calculating family tree metrics.
 * Designed to handle 10k+ nodes by minimizing object creation and using efficient loops.
 */
export class StatsEngine {
    static calculate(people: Record<string, Person>, validationErrors: Record<string, string[]> = {}): StatsData {
        const list = Object.values(people);
        const totalMembers = list.length;

        // 1. Initial counts
        let male = 0;
        let female = 0;
        let other = 0;
        let living = 0;
        let deceased = 0;
        let totalLifespan = 0;
        let deceasedWithAgeCount = 0;

        let oldest = { name: '', age: 0 };
        let mostKids = { name: '', count: 0 };

        const decadeMap: Record<string, number> = {};
        const surnameMap: Record<string, number> = {};
        const maleNames: Record<string, number> = {};
        const femaleNames: Record<string, number> = {};
        const placesMap: Record<string, PlaceBucket> = {};
        let placeOrder = 0;
        const ageDistribution: Record<string, number> = {
            '0-19': 0,
            '20-39': 0,
            '40-59': 0,
            '60-79': 0,
            '80+': 0,
        };

        const today = new Date();
        const currentYear = today.getFullYear();
        const upcomingBirthdays: StatsData['upcomingBirthdays'] = [];

        // 2. Generation Depth Calculation
        const maxGeneration = this.calculateMaxDepth(people);

        // 3. Single pass for all metrics
        list.forEach(p => {
            // Gender
            if (p.gender === 'male') {
                male++;
                if (p.firstName) maleNames[p.firstName] = (maleNames[p.firstName] || 0) + 1;
            } else if (p.gender === 'female') {
                female++;
                if (p.firstName) femaleNames[p.firstName] = (femaleNames[p.firstName] || 0) + 1;
            } else other++;

            // Vitality & Age
            if (p.isDeceased) {
                deceased++;
            } else {
                living++;
            }

            // Birth/Death Logic
            if (p.birthDate) {
                const birthYearStr = getDisplayDate(p.birthDate);
                const birthYear = parseInt(birthYearStr, 10);

                if (!isNaN(birthYear)) {
                    // Decades
                    const decade = `${Math.floor(birthYear / 10) * 10}s`;
                    decadeMap[decade] = (decadeMap[decade] || 0) + 1;

                    const bDate = new Date(p.birthDate);

                    // Age/Lifespan
                    if (p.isDeceased && p.deathDate) {
                        const deathYear = parseInt(getDisplayDate(p.deathDate), 10);
                        if (!isNaN(deathYear) && deathYear >= birthYear) {
                            const age = deathYear - birthYear;
                            totalLifespan += age;
                            deceasedWithAgeCount++;
                            if (age > oldest.age) {
                                oldest = { name: `${p.firstName} ${p.lastName}`, age };
                            }
                        }
                    } else if (!p.isDeceased) {
                        const age = currentYear - birthYear;
                        if (age < 20) ageDistribution['0-19']++;
                        else if (age < 40) ageDistribution['20-39']++;
                        else if (age < 60) ageDistribution['40-59']++;
                        else if (age < 80) ageDistribution['60-79']++;
                        else ageDistribution['80+']++;

                        // Upcoming Birthdays (Within next 30 days)
                        const nextBday = new Date(currentYear, bDate.getMonth(), bDate.getDate());
                        if (nextBday < today) nextBday.setFullYear(currentYear + 1);
                        const diff = Math.ceil((nextBday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        if (diff <= 30) {
                            upcomingBirthdays.push({
                                person: { id: p.id, firstName: p.firstName, lastName: p.lastName, photoUrl: p.photoUrl },
                                daysUntil: diff,
                                ageTurning: nextBday.getFullYear() - bDate.getFullYear(),
                                nextBirthday: nextBday.toISOString()
                            });
                        }
                    }
                }
            }

            // Surnames
            const surname = p.lastName?.trim();
            if (surname) surnameMap[surname] = (surnameMap[surname] || 0) + 1;

            // Places
            if (p.birthPlace) {
                placeOrder = this.addPlaceCount(placesMap, p.birthPlace, placeOrder);
            }

            // Most Children
            if (p.children && p.children.length > mostKids.count) {
                mostKids = { name: `${p.firstName} ${p.lastName}`, count: p.children.length };
            }
        });

        // 4. Health Score Calculation (Unified)
        const externalInvalidCount = Object.keys(validationErrors).length;
        const healthScore = externalInvalidCount > 0
            ? (totalMembers > 0 ? Math.max(0, Math.round(((totalMembers - externalInvalidCount) / totalMembers) * 100)) : 100)
            : evaluateDataIntegrity(people).healthScore;

        // 5. Format outputs
        const demographics = Object.entries(decadeMap)
            .map(([decade, count]) => ({ decade, count }))
            .sort((a, b) => a.decade.localeCompare(b.decade));

        const vitality = [
            { status: 'Living', count: living, color: '#E1AD01' },
            { status: 'Deceased', count: deceased, color: '#002366' },
        ];

        const surnames = Object.entries(surnameMap)
            .map(([text, value]) => ({ text, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 50);

        return {
            kpis: {
                totalMembers,
                maxGeneration,
                genderRatio: { male, female, other },
                averageLifespan: deceasedWithAgeCount > 0 ? Math.round(totalLifespan / deceasedWithAgeCount) : 0,
                healthScore
            },
            records: {
                oldestPerson: oldest.age > 0 ? oldest : null,
                mostChildren: mostKids.count > 0 ? mostKids : null,
            },
            demographics,
            vitality,
            surnames,
            topPlaces: this.buildTopPlaces(placesMap, 5),
            ageDistribution: Object.entries(ageDistribution).map(([range, count]) => ({ range, count })),
            upcomingBirthdays: upcomingBirthdays.sort((a, b) => a.daysUntil - b.daysUntil).slice(0, 5),
            topNames: {
                male: Object.entries(maleNames).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count })),
                female: Object.entries(femaleNames).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => ({ name, count })),
            }
        };
    }

    private static addPlaceCount(
        placesMap: Record<string, PlaceBucket>,
        rawPlace: string,
        firstSeen: number
    ): number {
        const displayName = this.formatPlaceDisplayName(rawPlace);
        if (!displayName) return firstSeen;

        const key = normalizePlaceName(displayName);
        if (!key) return firstSeen;

        const existing = placesMap[key];
        if (existing) {
            existing.count += 1;
            existing.name = this.choosePlaceDisplayName(existing.name, displayName);
            return firstSeen;
        }

        placesMap[key] = {
            key,
            name: displayName,
            count: 1,
            firstSeen,
        };

        return firstSeen + 1;
    }

    private static buildTopPlaces(placesMap: Record<string, PlaceBucket>, limit: number): StatsData['topPlaces'] {
        const buckets = Object.values(placesMap).map(bucket => ({ ...bucket }));
        const expandedBuckets = buckets.filter(bucket => this.isExpandedPlaceKey(bucket.key));

        buckets.forEach(bucket => {
            if (this.isExpandedPlaceKey(bucket.key) || !bucket.count) return;

            const matchingExpandedBuckets = expandedBuckets.filter(expanded => (
                expanded.key !== bucket.key &&
                (expanded.key.startsWith(`${bucket.key} `) || expanded.key.endsWith(` ${bucket.key}`))
            ));

            if (matchingExpandedBuckets.length !== 1) return;

            const target = matchingExpandedBuckets[0];
            target.count += bucket.count;
            target.firstSeen = Math.min(target.firstSeen, bucket.firstSeen);
            target.name = this.choosePlaceDisplayName(target.name, bucket.name);
            bucket.count = 0;
        });

        return buckets
            .filter(bucket => bucket.count > 0)
            .sort((a, b) => b.count - a.count || a.firstSeen - b.firstSeen || a.name.localeCompare(b.name))
            .slice(0, limit)
            .map(({ name, count }) => ({ name, count }));
    }

    private static isExpandedPlaceKey(key: string): boolean {
        return key.split(' ').filter(Boolean).length > 1;
    }

    private static formatPlaceDisplayName(rawPlace: string): string {
        return rawPlace
            .trim()
            .replace(/\s*([\u060C,])\s*/g, '$1 ')
            .replace(/\s*[/\\|]\s*/g, ' / ')
            .replace(/\s*-\s*/g, ' - ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    private static choosePlaceDisplayName(currentName: string, candidateName: string): string {
        const currentScore = this.getPlaceDisplayScore(currentName);
        const candidateScore = this.getPlaceDisplayScore(candidateName);

        if (candidateScore !== currentScore) {
            return candidateScore > currentScore ? candidateName : currentName;
        }

        if (candidateName.length !== currentName.length) {
            return candidateName.length > currentName.length ? candidateName : currentName;
        }

        return currentName.localeCompare(candidateName) <= 0 ? currentName : candidateName;
    }

    private static getPlaceDisplayScore(placeName: string): number {
        const normalized = normalizePlaceName(placeName);
        let score = this.isExpandedPlaceKey(normalized) ? 2 : 0;

        if (/[\u060C,]/.test(placeName)) score += 3;
        if (/[-/\\|]/.test(placeName)) score += 1;

        return score;
    }

    /**
     * Calculates the maximum generation depth in the tree.
     * This handles multiple tree fragments by finding all "roots" (people without parents).
     */
    private static calculateMaxDepth(people: Record<string, Person>): number {
        const memo: Record<string, number> = {};

        const getDepth = (id: string, visited: Set<string>): number => {
            if (memo[id] !== undefined) return memo[id];
            if (visited.has(id)) return 0; // Prevent circularity

            visited.add(id);
            const person = people[id];
            if (!person || !person.children || person.children.length === 0) {
                memo[id] = 1;
                return 1;
            }

            let maxChildDepth = 0;
            person.children.forEach(childId => {
                maxChildDepth = Math.max(maxChildDepth, getDepth(childId, visited));
            });

            memo[id] = 1 + maxChildDepth;
            return memo[id];
        };

        // Find all roots (people with no parents recorded in the current set)
        const allIds = Object.keys(people);
        const roots = allIds.filter(id => !people[id].parents || people[id].parents!.length === 0);

        let absoluteMax = 0;
        // If no roots (circular tree or empty), handle gracefully
        const startingNodes = roots.length > 0 ? roots : allIds.slice(0, 10);

        startingNodes.forEach(rootId => {
            absoluteMax = Math.max(absoluteMax, getDepth(rootId, new Set()));
        });

        return absoluteMax;
    }
}
