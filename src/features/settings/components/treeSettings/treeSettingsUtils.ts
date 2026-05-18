import type { Person } from '../../../../types';

export const getPersonFullName = (person?: Person | null): string => {
  if (!person) return '';
  return [person.firstName, person.lastName].filter(Boolean).join(' ').trim();
};
