import type { Person } from '../types';
import { formatDateForPostgres } from '../utils/dateUtils';

export interface DbPersonRow {
  id: string;
  tree_id?: string;
  first_name?: string | null;
  last_name?: string | null;
  middle_name?: string | null;
  birth_name?: string | null;
  nick_name?: string | null;
  suffix?: string | null;
  gender?: string | null;
  birth_date?: string | null;
  death_date?: string | null;
  birth_place?: string | null;
  death_place?: string | null;
  bio?: string | null;
  profession?: string | null;
  company?: string | null;
  interests?: string | null;
  photo_url?: string | null;
  photo_path?: string | null;
  photo_version?: number | null;
  email?: string | null;
  website?: string | null;
  blog?: string | null;
  address?: string | null;
  custom_fields?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

export const buildPersonCustomFields = (person: Person) => ({
  title: person.title,
  birthSource: person.birthSource,
  deathSource: person.deathSource,
  burialPlace: person.burialPlace,
  residence: person.residence,
  marriageDate: person.marriageDate || '',
  marriagePlace: person.marriagePlace || '',
  gallery: person.gallery || [],
  voiceNotes: person.voiceNotes || [],
  sources: person.sources || [],
  events: person.events || [],
  partnerDetails: person.partnerDetails || {},
  isPrivate: !!person.isPrivate,
});

export const mapDbPersonRowToPerson = (row: DbPersonRow): Person => {
  const customFields = row.custom_fields || {};
  const metadata = row.metadata || {};

  return {
    ...(metadata as Partial<Person>),
    id: row.id,
    title: (customFields.title as string) ?? '',
    firstName: row.first_name ?? '',
    middleName: row.middle_name ?? '',
    lastName: row.last_name ?? '',
    birthName: row.birth_name ?? '',
    nickName: row.nick_name ?? '',
    suffix: row.suffix ?? '',
    gender: (row.gender as Person['gender']) ?? 'male',
    birthDate: row.birth_date ?? '',
    birthPlace: row.birth_place ?? '',
    birthSource: (customFields.birthSource as string) ?? '',
    marriageDate: (customFields.marriageDate as string) ?? '',
    marriagePlace: (customFields.marriagePlace as string) ?? '',
    deathDate: row.death_date ?? '',
    deathPlace: row.death_place ?? '',
    deathSource: (customFields.deathSource as string) ?? '',
    isDeceased: !!row.death_date || !!(customFields.isDeceased as boolean | undefined),
    profession: row.profession ?? '',
    company: row.company ?? '',
    interests: row.interests ?? '',
    bio: row.bio ?? '',
    photoUrl: row.photo_url ?? undefined,
    photoPath: row.photo_path ?? undefined,
    photoVersion: row.photo_version ?? undefined,
    gallery: Array.isArray(customFields.gallery) ? (customFields.gallery as Person['gallery']) : [],
    voiceNotes: Array.isArray(customFields.voiceNotes) ? (customFields.voiceNotes as string[]) : [],
    sources: Array.isArray(customFields.sources) ? (customFields.sources as Person['sources']) : [],
    events: Array.isArray(customFields.events) ? (customFields.events as Person['events']) : [],
    email: row.email ?? '',
    website: row.website ?? '',
    blog: row.blog ?? '',
    address: row.address ?? '',
    parents: [],
    spouses: [],
    children: [],
    burialPlace: (customFields.burialPlace as string) ?? '',
    residence: (customFields.residence as string) ?? '',
    partnerDetails: (customFields.partnerDetails as Person['partnerDetails']) ?? undefined,
    isPrivate: (customFields.isPrivate as boolean) ?? false,
  };
};

export const mapPersonToDbRow = (person: Person, treeId?: string) => {
  const relationshipKeys = new Set(['parents', 'spouses', 'children']);
  const metadata = Object.fromEntries(
    Object.entries(person).filter(([key]) => !relationshipKeys.has(key))
  ) as Omit<Person, 'parents' | 'spouses' | 'children'>;

  return {
  metadata,
  id: person.id,
  ...(treeId ? { tree_id: treeId } : {}),
  first_name: person.firstName || '',
  last_name: person.lastName || '',
  middle_name: person.middleName || null,
  birth_name: person.birthName || null,
  nick_name: person.nickName || null,
  suffix: person.suffix || null,
  gender: person.gender || 'male',
  birth_date: formatDateForPostgres(person.birthDate),
  death_date: formatDateForPostgres(person.deathDate),
  birth_place: person.birthPlace || null,
  death_place: person.deathPlace || null,
  bio: person.bio || null,
  profession: person.profession || null,
  company: person.company || null,
  interests: person.interests || null,
  photo_url: person.photoUrl || null,
  photo_path: person.photoPath || null,
  photo_version: person.photoVersion || 0,
  email: person.email || null,
  website: person.website || null,
  blog: person.blog || null,
  address: person.address || null,
  custom_fields: buildPersonCustomFields(person),
  };
};
