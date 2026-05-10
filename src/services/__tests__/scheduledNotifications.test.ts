// @ts-nocheck
import { describe, expect, it, vi } from 'vitest';
import { buildScheduledBirthdayNotifications, parseFullBirthDate } from '../scheduledNotifications';
import type { Person } from '../../types';

const createPerson = (overrides: Partial<Person>): Person => ({
  id: 'person-1',
  title: '',
  firstName: 'Mona',
  middleName: '',
  lastName: 'Ali',
  birthName: '',
  nickName: '',
  suffix: '',
  gender: 'female',
  birthDate: '1980-03-27',
  birthPlace: '',
  birthSource: '',
  marriageDate: '',
  marriagePlace: '',
  deathDate: '',
  deathPlace: '',
  deathSource: '',
  burialPlace: '',
  residence: '',
  isDeceased: false,
  profession: '',
  company: '',
  interests: '',
  bio: '',
  gallery: [],
  voiceNotes: [],
  sources: [],
  events: [],
  email: '',
  website: '',
  blog: '',
  address: '',
  parents: [],
  spouses: [],
  children: [],
  ...overrides,
});

describe('scheduledNotifications', () => {
  it('parses full ISO-style dates only', () => {
    expect(parseFullBirthDate('1980-03-27')).toEqual({
      year: 1980,
      month: 3,
      day: 27,
    });
    expect(parseFullBirthDate('1980')).toBeNull();
    expect(parseFullBirthDate('')).toBeNull();
  });

  it('creates a birthday reminder for today when the date is complete', () => {
    const notifications = buildScheduledBirthdayNotifications({
      people: {
        'person-1': createPerson({ birthDate: '1980-03-27' }),
      },
      isRtl: false,
      now: new Date('2026-03-27T09:00:00.000Z'),
    });

    expect(notifications).toHaveLength(1);
    expect(notifications[0].spec.notification.title).toBe('Birth Anniversary');
    expect(notifications[0].spec.notification.dedupeKey).toBe('birthday:person-1:today:2026-03-27');
  });

  it('skips year-only dates so they do not create daily reminders', () => {
    const notifications = buildScheduledBirthdayNotifications({
      people: {
        'person-1': createPerson({ birthDate: '1980' }),
      },
      isRtl: false,
      now: new Date('2026-03-27T09:00:00.000Z'),
    });

    expect(notifications).toHaveLength(0);
  });

  it('creates an upcoming reminder within the 3-day window', () => {
    const notifications = buildScheduledBirthdayNotifications({
      people: {
        'person-1': createPerson({ birthDate: '1980-03-29' }),
      },
      isRtl: false,
      now: new Date('2026-03-27T09:00:00.000Z'),
    });

    expect(notifications).toHaveLength(1);
    expect(notifications[0].spec.notification.title).toBe('Upcoming Birth Anniversary');
    expect(notifications[0].spec.notification.body).toContain('In 2 day(s)');
  });

  it('uses respectful copy for deceased people', () => {
    const notifications = buildScheduledBirthdayNotifications({
      people: {
        'person-1': createPerson({
          birthDate: '1940-03-27',
          isDeceased: true,
          deathDate: '2020-01-01',
        }),
      },
      isRtl: false,
      now: new Date('2026-03-27T09:00:00.000Z'),
    });

    expect(notifications).toHaveLength(1);
    expect(notifications[0].spec.notification.body).toContain('would have turned 86');
  });
});


