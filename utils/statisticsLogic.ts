
import { Person } from '../types';
import { getDisplayDate } from './familyLogic';

export interface FamilyStatistics {
    totalMembers: number;
    livingMembers: number;
    deceasedMembers: number;
    maleCount: number;
    femaleCount: number;
    averageLifespan: number;
    oldestPerson: { name: string; age: number } | null;
    mostChildren: { name: string; count: number } | null;
    
    // New Metrics
    birthsPerDecade: Record<string, number>;
    topMaleNames: { name: string; count: number }[];
    topFemaleNames: { name: string; count: number }[];
    topPlaces: { name: string; count: number }[];
}

export const calculateStatistics = (people: Record<string, Person>): FamilyStatistics => {
    const list = Object.values(people);
    const total = list.length;
    let male = 0;
    let female = 0;
    let living = 0;
    let deceased = 0;
    let totalLifespan = 0;
    let deceasedWithAgeCount = 0;
    
    let oldest = { name: '', age: 0 };
    let mostKids = { name: '', count: 0 };

    // Maps for aggregation
    const decadeMap: Record<string, number> = {};
    const maleNames: Record<string, number> = {};
    const femaleNames: Record<string, number> = {};
    const placesMap: Record<string, number> = {};

    list.forEach(p => {
        if (p.gender === 'male') {
            male++;
            maleNames[p.firstName] = (maleNames[p.firstName] || 0) + 1;
        } else {
            female++;
            femaleNames[p.firstName] = (femaleNames[p.firstName] || 0) + 1;
        }

        if (p.isDeceased) deceased++; else living++;

        // Places
        if (p.birthPlace) {
            const place = p.birthPlace.trim();
            if (place) placesMap[place] = (placesMap[place] || 0) + 1;
        }

        // Most Children
        if (p.children.length > mostKids.count) {
            mostKids = { name: `${p.firstName} ${p.lastName}`, count: p.children.length };
        }

        // Lifespan & Decades
        if (p.birthDate) {
            const birthYearStr = getDisplayDate(p.birthDate);
            const birthYear = parseInt(birthYearStr);
            
            if (!isNaN(birthYear)) {
                // Decade logic (e.g. 1950s)
                const decade = Math.floor(birthYear / 10) * 10;
                decadeMap[decade] = (decadeMap[decade] || 0) + 1;

                // Lifespan calc for deceased
                if (p.isDeceased && p.deathDate) {
                    const deathYear = parseInt(getDisplayDate(p.deathDate));
                    if (!isNaN(deathYear) && deathYear >= birthYear) {
                        const age = deathYear - birthYear;
                        totalLifespan += age;
                        deceasedWithAgeCount++;
                        
                        if (age > oldest.age) {
                            oldest = { name: `${p.firstName} ${p.lastName}`, age };
                        }
                    }
                }
            }
        }
    });

    // Helper to sort and slice
    const sortAndSlice = (map: Record<string, number>, limit: number = 5) => {
        return Object.entries(map)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([name, count]) => ({ name, count }));
    };

    return {
        totalMembers: total,
        livingMembers: living,
        deceasedMembers: deceased,
        maleCount: male,
        femaleCount: female,
        averageLifespan: deceasedWithAgeCount > 0 ? Math.round(totalLifespan / deceasedWithAgeCount) : 0,
        oldestPerson: oldest.age > 0 ? oldest : null,
        mostChildren: mostKids.count > 0 ? mostKids : null,
        
        birthsPerDecade: decadeMap,
        topMaleNames: sortAndSlice(maleNames),
        topFemaleNames: sortAndSlice(femaleNames),
        topPlaces: sortAndSlice(placesMap)
    };
};
