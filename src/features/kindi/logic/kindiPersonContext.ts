import type { Person } from '../../../types/person';
import type { Language } from '../../../types/common';
import { getFullName } from '../../../utils/familyLogic';

const relatedName = (people: Record<string, Person>, id: string | undefined): string | undefined => {
  if (!id) return undefined;
  const person = people[id];
  return person ? getFullName(person) : undefined;
};

export const getKindiPersonContextLabel = (
  person: Person,
  people: Record<string, Person>,
  language: Language = 'ar'
): string => {
  const parentName = relatedName(people, person.parents[0]);
  if (parentName) {
    if (language === 'en') return `${person.gender === 'female' ? 'Daughter' : 'Son'} of ${parentName}`;
    return `${person.gender === 'female' ? 'بنت' : 'ابن'} ${parentName}`;
  }

  const spouseName = relatedName(people, person.spouses[0]);
  if (spouseName) {
    if (language === 'en') return `${person.gender === 'female' ? 'Wife' : 'Husband'} of ${spouseName}`;
    return `${person.gender === 'female' ? 'زوجة' : 'زوج'} ${spouseName}`;
  }

  const childName = relatedName(people, person.children[0]);
  if (childName) {
    if (language === 'en') return `${person.gender === 'female' ? 'Mother' : 'Father'} of ${childName}`;
    return `${person.gender === 'female' ? 'والدة' : 'والد'} ${childName}`;
  }

  return language === 'en' ? 'No direct relationship recorded' : 'لا توجد صلة مباشرة مسجلة';
};

