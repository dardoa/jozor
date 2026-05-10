import { Person } from '../types';
import { getDisplayDate } from './familyLogic';

export interface StatisticItem {
  name: string;
  count: number;
}

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
  topMaleNames: StatisticItem[];
  topFemaleNames: StatisticItem[];
  topPlaces: StatisticItem[];
  upcomingBirthdays: UpcomingBirthday[];
  ageDistribution: AgeDistribution;
}

export interface UpcomingBirthday {
  person: {
    id: string;
    firstName: string;
    lastName: string;
    photoUrl?: string;
  };
  daysUntil: number;
  nextBirthday: Date;
  ageTurning: number;
}

export interface AgeDistribution {
  ranges: { range: string; count: number }[];
  average: number;
}

/**
 * Calculates various statistics for the family tree.
 * @param people The record of all people in the tree.
 * @returns A FamilyStatistics object containing calculated metrics.
 */
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

  // New Metrics Containers
  const upcomingBirthdays: UpcomingBirthday[] = [];
  const ageDistributionCounts: Record<string, number> = {
    '0-19': 0,
    '20-39': 0,
    '40-59': 0,
    '60-79': 0,
    '80+': 0,
  };
  let totalLivingAge = 0;

  const today = new Date();
  const currentYear = today.getFullYear();

  // Maps for aggregation
  const decadeMap: Record<string, number> = {};
  const maleNames: Record<string, number> = {};
  const femaleNames: Record<string, number> = {};
  const placesMap: Record<string, number> = {};

  list.forEach((p) => {
    // Gender Counts & Names
    if (p.gender === 'male') {
      male++;
      maleNames[p.firstName] = (maleNames[p.firstName] || 0) + 1;
    } else {
      female++;
      femaleNames[p.firstName] = (femaleNames[p.firstName] || 0) + 1;
    }

    // Living Status
    // Living Status & Age Distribution & Birthdays
    if (p.isDeceased) {
      deceased++;
    } else {
      living++;
      if (p.birthDate) {
        const bDate = new Date(p.birthDate);
        if (!isNaN(bDate.getTime())) {
          const age = currentYear - bDate.getFullYear();
          totalLivingAge += age;

          // Age Distribution
          if (age < 20) ageDistributionCounts['0-19']++;
          else if (age < 40) ageDistributionCounts['20-39']++;
          else if (age < 60) ageDistributionCounts['40-59']++;
          else if (age < 80) ageDistributionCounts['60-79']++;
          else ageDistributionCounts['80+']++;

          // Upcoming Birthday
          const nextBirthday = new Date(today.getFullYear(), bDate.getMonth(), bDate.getDate());
          if (nextBirthday < today) {
            nextBirthday.setFullYear(today.getFullYear() + 1);
          }
          const diffTime = nextBirthday.getTime() - today.getTime();
          const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          // Memory Audit: check for large Base64 images
          if (p.photoUrl && p.photoUrl.length > 150000) { // > 150KB
            console.warn(`[MemoryAudit] ⚠️ Person ${p.id} has very large photoUrl (${Math.round(p.photoUrl.length / 1024)}KB). Base64 images bloat memory and cause freezes.`);
          }

          upcomingBirthdays.push({
            person: {
              id: p.id,
              firstName: p.firstName,
              lastName: p.lastName,
              photoUrl: p.photoUrl // Still needed for display, but we've logged a warning
            },
            daysUntil,
            nextBirthday,
            ageTurning: nextBirthday.getFullYear() - bDate.getFullYear()
          });
        }
      }
    }

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
      const birthYear = parseInt(birthYearStr, 10);

      if (!isNaN(birthYear)) {
        // Decade logic (e.g. 1950s)
        const decade = Math.floor(birthYear / 10) * 10;
        decadeMap[decade] = (decadeMap[decade] || 0) + 1;

        // Lifespan calc for deceased
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
        }
      }
    }
  });

  // Helper to sort and slice
  const sortAndSlice = (map: Record<string, number>, limit: number = 5): StatisticItem[] => {
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
    averageLifespan:
      deceasedWithAgeCount > 0 ? Math.round(totalLifespan / deceasedWithAgeCount) : 0,
    oldestPerson: oldest.age > 0 ? oldest : null,
    mostChildren: mostKids.count > 0 ? mostKids : null,

    birthsPerDecade: decadeMap,
    topMaleNames: sortAndSlice(maleNames),
    topFemaleNames: sortAndSlice(femaleNames),
    topPlaces: sortAndSlice(placesMap),
    upcomingBirthdays: upcomingBirthdays.sort((a, b) => a.daysUntil - b.daysUntil).slice(0, 5),
    ageDistribution: {
      ranges: Object.entries(ageDistributionCounts).map(([range, count]) => ({ range, count })),
      average: living > 0 ? Math.round(totalLivingAge / living) : 0,
    },
  };
};
