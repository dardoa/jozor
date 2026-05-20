import type { Person } from '../../../types';
import { getFullName } from '../../../utils/familyLogic';

const relatedName = (people: Record<string, Person>, id: string | undefined): string | undefined => {
  if (!id) return undefined;
  const person = people[id];
  return person ? getFullName(person) : undefined;
};

export const getKindiPersonContextLabel = (
  person: Person,
  people: Record<string, Person>
): string => {
  const parentName = relatedName(people, person.parents[0]);
  if (parentName) {
    return `${person.gender === 'female' ? 'بنت' : 'ابن'} ${parentName}`;
  }

  const spouseName = relatedName(people, person.spouses[0]);
  if (spouseName) {
    return `${person.gender === 'female' ? 'زوجة' : 'زوج'} ${spouseName}`;
  }

  const childName = relatedName(people, person.children[0]);
  if (childName) {
    return `${person.gender === 'female' ? 'والدة' : 'والد'} ${childName}`;
  }

  return 'لا توجد صلة مباشرة مسجلة';
};

