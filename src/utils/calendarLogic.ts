import { Person } from '../types';
import { getDisplayDate } from './familyLogic';

export const generateICS = (people: Record<string, Person>): string => {
  const events: string[] = [];

  // Header
  events.push('BEGIN:VCALENDAR');
  events.push('VERSION:2.0');
  events.push('PRODID:-//Jozor//FamilyTree//EN');
  events.push('CALSCALE:GREGORIAN');

  const now = new Date();
  const dtStamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  Object.values(people).forEach((person) => {
    const name = `${person.firstName} ${person.lastName}`;

    // Helper to format date YYYYMMDD
    const parseDate = (dateStr: string) => {
      const parts = dateStr.split('-');
      if (parts.length < 3) return null; // Need full date
      return parts.join(''); // YYYYMMDD
    };

    // Birthday (Recurring)
    if (person.birthDate && !person.isDeceased) {
      const bday = parseDate(person.birthDate);
      if (bday) {
        events.push('BEGIN:VEVENT');
        events.push(`DTSTAMP:${dtStamp}`);
        events.push(`DTSTART;VALUE=DATE:${bday}`);
        events.push(`RRULE:FREQ=YEARLY`);
        events.push(`SUMMARY:🎂 ${name}'s Birthday`);
        events.push(
          `DESCRIPTION:Born in ${getDisplayDate(person.birthDate)}` +
            (person.birthPlace ? ` at ${person.birthPlace}` : '')
        );
        events.push('TRANSP:TRANSPARENT'); // Does not block time
        events.push('END:VEVENT');
      }
    }

    // Death Anniversary (Recurring)
    if (person.isDeceased && person.deathDate) {
      const dday = parseDate(person.deathDate);
      if (dday) {
        events.push('BEGIN:VEVENT');
        events.push(`DTSTAMP:${dtStamp}`);
        events.push(`DTSTART;VALUE=DATE:${dday}`);
        events.push(`RRULE:FREQ=YEARLY`);
        events.push(`SUMMARY:🎗️ ${name}'s Memorial`);
        events.push(
          `DESCRIPTION:Passed away in ${getDisplayDate(person.deathDate)}` +
            (person.deathPlace ? ` at ${person.deathPlace}` : '')
        );
        events.push('TRANSP:TRANSPARENT');
        events.push('END:VEVENT');
      }
    }
  });

  events.push('END:VCALENDAR');
  return events.join('\r\n');
};
