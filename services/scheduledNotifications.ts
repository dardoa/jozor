import { createBirthdayNotificationSpec, type NotificationDeliverySpec } from './notificationPolicyService';
import type { Person } from '../types';

const FULL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const UPCOMING_WINDOW_DAYS = 3;

type BirthdayReminderKind = 'today' | 'upcoming';

type ScheduledBirthdayNotification = {
  personId: string;
  fullName: string;
  eventDateIso: string;
  spec: NotificationDeliverySpec;
};

type ParsedBirthDate = {
  year: number;
  month: number;
  day: number;
};

type BirthdayOccurrence = {
  kind: BirthdayReminderKind;
  nextBirthday: Date;
  daysUntil: number;
};

const startOfUtcDay = (date: Date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const formatIsoDate = (date: Date) => date.toISOString().substring(0, 10);

/**
 * We only schedule daily birthday reminders for full calendar dates.
 * Year-only strings remain valid genealogical data, but they are too imprecise
 * for a day-level reminder and must stay silent.
 */
export const parseFullBirthDate = (value: string): ParsedBirthDate | null => {
  const match = FULL_DATE_PATTERN.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(candidate.getTime()) ||
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
};

const getBirthdayOccurrence = (parsedBirthDate: ParsedBirthDate, now: Date): BirthdayOccurrence | null => {
  const today = startOfUtcDay(now);
  let nextBirthday = new Date(Date.UTC(today.getUTCFullYear(), parsedBirthDate.month - 1, parsedBirthDate.day));

  if (
    nextBirthday.getUTCMonth() !== parsedBirthDate.month - 1 ||
    nextBirthday.getUTCDate() !== parsedBirthDate.day
  ) {
    return null;
  }

  if (nextBirthday < today) {
    nextBirthday = new Date(Date.UTC(today.getUTCFullYear() + 1, parsedBirthDate.month - 1, parsedBirthDate.day));
  }

  const daysUntil = Math.round((nextBirthday.getTime() - today.getTime()) / 86_400_000);
  if (daysUntil === 0) {
    return { kind: 'today', nextBirthday, daysUntil };
  }

  if (daysUntil > 0 && daysUntil <= UPCOMING_WINDOW_DAYS) {
    return { kind: 'upcoming', nextBirthday, daysUntil };
  }

  return null;
};

const getFullName = (person: Person) =>
  [person.firstName, person.middleName, person.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();

export const buildScheduledBirthdayNotifications = (params: {
  people: Record<string, Person>;
  isRtl: boolean;
  now?: Date;
}): ScheduledBirthdayNotification[] => {
  const { people, isRtl, now = new Date() } = params;
  const todayIso = formatIsoDate(startOfUtcDay(now));

  return Object.values(people)
    .flatMap(person => {
      if (!person.birthDate) return [];

      const parsedBirthDate = parseFullBirthDate(person.birthDate);
      if (!parsedBirthDate || parsedBirthDate.year < 1700) return [];

      const occurrence = getBirthdayOccurrence(parsedBirthDate, now);
      if (!occurrence) return [];

      const fullName = getFullName(person);
      const anniversaryAge = occurrence.nextBirthday.getUTCFullYear() - parsedBirthDate.year;

      return [
        {
          personId: person.id,
          fullName,
          eventDateIso: formatIsoDate(occurrence.nextBirthday),
          spec: createBirthdayNotificationSpec({
            isRtl,
            personId: person.id,
            fullName,
            year: parsedBirthDate.year,
            age: anniversaryAge,
            kind: occurrence.kind,
            daysUntil: occurrence.daysUntil,
            isDeceased: person.isDeceased || Boolean(person.deathDate),
            dedupeDate: todayIso,
            eventDateIso: formatIsoDate(occurrence.nextBirthday),
          }),
        },
      ];
    })
    .sort((left, right) => left.eventDateIso.localeCompare(right.eventDateIso));
};
