import type { Person } from '../../../../types/person';
import { normalizeKindiCommandText } from '../kindiCommandLexicon';
import {
  cleanNameText,
  cleanUpdateValue,
  normalizeKindiText,
  splitPersonName,
} from './nameParser';

export type KindiUpdateField =
  | 'firstName'
  | 'middleName'
  | 'lastName'
  | 'nickName'
  | 'birthDate'
  | 'birthPlace'
  | 'deathDate'
  | 'deathPlace'
  | 'residence'
  | 'profession'
  | 'bio';

export interface ParsedUpdateCommand {
  field?: KindiUpdateField;
  subjectText?: string;
  value?: string;
}

const includesAny = (value: string, terms: string[]) =>
  terms.some((term) => normalizeKindiCommandText(value).includes(normalizeKindiCommandText(term)));

const RESIDENCE_DIALECT_TERMS = ['ساكن', 'ساكنة', 'ساكن في', 'ساكنة في'];
const PROFESSION_DIALECT_TERMS = ['شغل', 'شغله', 'شغلها', 'يشتغل', 'تشتغل'];

export const updateAttributeClausePattern =
  /\s+(?:و\s*)?(?:صار|صارت|خلي|خلّي|اجعل|اجعلي|غير|غيّر|عدل|عدّل|حدث|حدّث|يسكن|تسكن|ساكن|ساكنة|سكنه|سكنها|سكن|السكن|مكان\s+سكنه|مكان\s+سكنها|اقامته|إقامته|اقامتها|إقامتها|كنيته|كنيتها|كنية|لقبه|لقبها|لقب|المهنة|مهنته|مهنتها|وظيفته|وظيفتها|شغل|شغله|شغلها|يشتغل|تشتغل|يعمل|تعمل|مكان\s+ميلاده|مكان\s+ميلادها|ولد\s+في|ولدت\s+في|مولود\s+في|مولودة\s+في|مواليد|عام|سنة|في\s+عام|تاريخ\s+ميلاده|تاريخ\s+ميلادها|ملاحظات|ملاحظة|السيرة|نبذة|residence|lives\s+in|live\s+in|nickname|profession|job|works\s+as|work\s+as|birth\s+place|born\s+in|born\s+on|born)\s+.+$/iu;

export const stripUpdateAttributeClauses = (value: string): string => value
  .replace(updateAttributeClausePattern, ' ')
  .replace(/\s+/g, ' ')
  .trim();

export const extractDelimitedUpdateValue = (
  query: string,
  terms: string,
  stopTerms: string
): string | undefined => {
  const match = query.match(new RegExp(
    `(?:${terms})\\s*(?:الى|إلى|هو|هي|صار|صارت|ليكون|لتكون|ك|في\\s+|ب(?=\\p{Script=Arabic}))?\\s*(.+?)(?=\\s+(?:و\\s*)?(?:${stopTerms})\\s+|[,.;:!?،]|$)`,
    'iu'
  ));
  return cleanUpdateValue(match?.[1]);
};

export const UPDATE_VALUE_STOP_TERMS = [
  'خلي',
  'خلّي',
  'اجعل',
  'اجعلي',
  'غير',
  'غيّر',
  'عدل',
  'عدّل',
  'حدث',
  'حدّث',
  'صار',
  'صارت',
  'يسكن',
  'تسكن',
  'ساكن',
  'ساكنة',
  'سكنه',
  'سكنها',
  'كنيته',
  'كنيتها',
  'كنية',
  'لقبه',
  'لقبها',
  'لقب',
  'مهنته',
  'مهنتها',
  'وظيفته',
  'وظيفتها',
  'شغل',
  'شغله',
  'شغلها',
  'يشتغل',
  'تشتغل',
  'يعمل',
  'تعمل',
  'مكان\\s+ميلاده',
  'مكان\\s+ميلادها',
  'ولد\\s+في',
  'ولدت\\s+في',
  'مولود\\s+في',
  'مولودة\\s+في',
  'مواليد',
  'عام',
  'سنة',
  'ملاحظات',
  'ملاحظة',
  'السيرة\\s+الذاتية',
  'السيره\\s+الذاتيه',
  'السيرة',
  'نبذة',
  'nickname',
  'residence',
  'lives\\s+in',
  'profession',
  'job',
  'works\\s+as',
  'work\\s+as',
  'birth\\s+place',
  'born\\s+in',
  'born\\s+on',
  'born',
].join('|');

export const detectUpdateField = (query: string): KindiUpdateField | undefined => {
  const normalized = normalizeKindiText(query);

  if (includesAny(normalized, ['الاسم الاوسط', 'الاسم الأوسط', 'اسم اوسط', 'اسم أوسط', 'middle name'])) return 'middleName';
  if (includesAny(normalized, ['الاسم الاول', 'الاسم الأول', 'اسم اول', 'اسم أول', 'first name'])) return 'firstName';
  if (includesAny(normalized, ['الكنيه', 'الكنية', 'كنيه', 'كنية', 'كنيته', 'كنيتها', 'لقبه', 'لقبها', 'nickname'])) return 'nickName';
  if (includesAny(normalized, ['اسم العائله', 'اسم العائلة', 'اللقب', 'last name', 'family name'])) return 'lastName';
  if (includesAny(normalized, ['تاريخ ميلاد', 'تاريخ الميلاد', 'birth date', 'born'])) return 'birthDate';
  if (includesAny(normalized, ['مكان ميلاد', 'مكان الميلاد', 'birth place', 'place of birth'])) return 'birthPlace';
  if (includesAny(normalized, ['تاريخ وفاه', 'تاريخ الوفاه', 'تاريخ وفاة', 'تاريخ الوفاة', 'death date'])) return 'deathDate';
  if (includesAny(normalized, ['مكان وفاه', 'مكان الوفاه', 'مكان وفاة', 'مكان الوفاة', 'death place', 'place of death'])) return 'deathPlace';
  if (includesAny(normalized, ['السكن', 'سكن', 'يسكن', 'تسكن', 'اقامه', 'إقامة', 'اقامته', 'إقامته', ...RESIDENCE_DIALECT_TERMS, 'residence', 'lives in', 'live in'])) return 'residence';
  if (includesAny(normalized, ['المهنه', 'المهنة', 'مهنة', 'وظيفه', 'وظيفة', ...PROFESSION_DIALECT_TERMS, 'profession', 'job', 'work'])) return 'profession';
  if (includesAny(normalized, ['ملاحظات', 'ملاحظه', 'ملاحظة', 'السيره الذاتيه', 'السيرة الذاتية', 'السيره', 'السيرة', 'نبذه', 'نبذة', 'notes', 'bio', 'biography'])) return 'bio';
  if (includesAny(normalized, ['الاسم', 'اسم', 'name'])) return 'firstName';

  return undefined;
};

export const stripUpdateCommandPrefix = (query: string): string =>
  query
    .replace(/^(?:update|edit|change|rename|modify|عدّل|عدل|غيّر|غير|حدّث|حدث)\s+/iu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const stripUpdateFieldPhrase = (query: string, field?: KindiUpdateField): string => {
  if (!field) return query;

  const fieldPatterns: Record<KindiUpdateField, RegExp> = {
    firstName: /^(?:الاسم\s+الاول|الاسم\s+الأول|اسم\s+اول|اسم\s+أول|first\s+name)\s*/iu,
    middleName: /^(?:الاسم\s+الاوسط|الاسم\s+الأوسط|اسم\s+اوسط|اسم\s+أوسط|middle\s+name)\s*/iu,
    nickName: /^(?:الكنيه|الكنية|كنيه|كنية|كنيته|كنيتها|لقبه|لقبها|nickname)\s*/iu,
    lastName: /^(?:اسم\s+العائله|اسم\s+العائلة|اللقب|last\s+name|family\s+name)\s*/iu,
    birthDate: /^(?:تاريخ\s+ميلاد|تاريخ\s+الميلاد|birth\s+date|born)\s*/iu,
    birthPlace: /^(?:مكان\s+ميلاد|مكان\s+الميلاد|birth\s+place|place\s+of\s+birth)\s*/iu,
    deathDate: /^(?:تاريخ\s+وفاه|تاريخ\s+الوفاه|تاريخ\s+وفاة|تاريخ\s+الوفاة|death\s+date)\s*/iu,
    deathPlace: /^(?:مكان\s+وفاه|مكان\s+الوفاه|مكان\s+وفاة|مكان\s+الوفاة|death\s+place|place\s+of\s+death)\s*/iu,
    residence: /^(?:السكن|سكن|يسكن|تسكن|اقامه|إقامة|اقامته|إقامته|ساكن|ساكنة|residence|lives\s+in|live\s+in)\s*/iu,
    profession: /^(?:المهنه|المهنة|مهنة|وظيفه|وظيفة|شغل|شغله|شغلها|يشتغل|تشتغل|profession|job|work)\s*/iu,
    bio: /^(?:ملاحظات|ملاحظه|ملاحظة|السيره\s+الذاتيه|السيرة\s+الذاتية|السيره|السيرة|نبذه|نبذة|notes|note|bio|biography)\s*/iu,
  };

  return query.replace(fieldPatterns[field], ' ').replace(/\s+/g, ' ').trim();
};

export const parseUpdateCommand = (query: string): ParsedUpdateCommand => {
  const field = detectUpdateField(query);
  const withoutCommand = stripUpdateCommandPrefix(query);
  const withoutField = stripUpdateFieldPhrase(withoutCommand, field);

  const valueMatch = withoutField.match(/\s+(?:to|into|as|الى|إلى|ليكون|لتكون|يكون|تكون|هي|هو|ضيف|اضف|أضف|اكتب|حط|حطّ|ضع)\s+(.+)$/iu);
  const beforeValue = valueMatch
    ? withoutField.slice(0, valueMatch.index).trim()
    : withoutField;
  const value = cleanUpdateValue(valueMatch?.[1]);

  const subjectText = cleanNameText(
    stripUpdateAttributeClauses(beforeValue)
      .replace(/^(?:for|to|of|لـ|ل)\s*/iu, '')
      .replace(/^(?:بيانات|معلومات|ملف|profile|data)\s+/iu, '')
      .replace(/\s+/g, ' ')
      .trim()
  );

  return {
    field,
    subjectText,
    value,
  };
};

const trimCompoundUpdateValue = (field: KindiUpdateField, value: string): string => {
  if (field === 'profession') {
    return value
      .replace(/\s+(?:و\s*)?(?:ولد\s+في|ولدت\s+في|مولود\s+في|مولودة\s+في|مكان\s+ميلاده|مكان\s+ميلادها|مواليد|عام|سنة|في\s+عام|born\s+in|born\s+on|born)\s+.+$/iu, ' ')
      .trim();
  }

  if (field === 'birthPlace') {
    return value
      .replace(/\s+(?:و\s*)?(?:مواليد|عام|سنة|في\s+عام|تاريخ\s+ميلاده|تاريخ\s+ميلادها|born\s+on|born)\s+.+$/iu, ' ')
      .trim();
  }

  return value;
};

const assignParsedUpdateField = (
  updates: Partial<Person>,
  field: KindiUpdateField,
  value: string
) => {
  const cleanedValue = trimCompoundUpdateValue(field, value);
  if (field === 'firstName') updates.firstName = cleanedValue;
  if (field === 'middleName') updates.middleName = cleanedValue;
  if (field === 'nickName') updates.nickName = cleanedValue;
  if (field === 'lastName') updates.lastName = cleanedValue;
  if (field === 'birthDate') updates.birthDate = cleanedValue;
  if (field === 'birthPlace') updates.birthPlace = cleanedValue;
  if (field === 'deathDate') updates.deathDate = cleanedValue;
  if (field === 'deathPlace') updates.deathPlace = cleanedValue;
  if (field === 'residence') updates.residence = cleanedValue;
  if (field === 'profession') updates.profession = cleanedValue;
  if (field === 'bio') updates.bio = cleanedValue;
};

export const extractUpdateFields = (query: string): Partial<Person> => {
  const updates: Partial<Person> = {};
  const parsed = parseUpdateCommand(query);
  const parsedValue = parsed.value;

  if (parsed.field && parsedValue !== undefined) {
    assignParsedUpdateField(updates, parsed.field, parsedValue);
  }

  const fieldValue = (terms: string): string | undefined => {
    const match = query.match(new RegExp(`(?:${terms}).*?(?:to|الى|إلى|هي|هو|في)\\s+([^,.;:!?،]+)`, 'i'));
    return cleanNameText(match?.[1]);
  };

  const dateMatch = query.match(/\b(\d{4}(?:-\d{2}(?:-\d{2})?)?)\b/);
  if (dateMatch?.[1] && includesAny(query.toLowerCase(), ['birth', 'born', 'ميلاد', 'ولد', 'ولدت'])) {
    updates.birthDate = dateMatch[1];
  }

  if (!parsed.field) {
    const nameMatch = query.match(/(?:name to|rename to|اسمه|اسمها|الاسم(?:\s+(?:إلى|الى))?)\s+(.+?)(?:\s+(?:birth|born|ميلاد|ولد|ولدت)\s+|$)/i);
    const name = splitPersonName(nameMatch?.[1]);
    if (name?.firstName) updates.firstName = name.firstName;
    if (name?.lastName) updates.lastName = name.lastName;
  }

  const nickName = extractDelimitedUpdateValue(
    query,
    'الكنيه|الكنية|كنيه|كنية|كنيته|كنيتها|لقبه|لقبها|لقب|nickname',
    UPDATE_VALUE_STOP_TERMS
  );
  if (nickName !== undefined) updates.nickName = nickName;

  const residence = extractDelimitedUpdateValue(
    query,
    'السكن|سكنه|سكنها|مكان\\s+سكنه|مكان\\s+سكنها|اقامته|إقامته|اقامتها|إقامتها|يسكن|تسكن|ساكن|ساكنة|residence|lives\\s+in|live\\s+in',
    UPDATE_VALUE_STOP_TERMS
  );
  if (residence !== undefined) updates.residence = residence;

  const birthPlace = fieldValue('birth place|place of birth|مكان الميلاد|مكان ميلاده|مكان ميلادها|ميلاده|ميلادها|ولادته')
    || cleanNameText(query.match(/(?:ولد|ولدت|مولود|مولودة)\s+في\s+(.+?)(?=\s+(?:عام|سنة|مواليد|born|$))/iu)?.[1]);
  if (birthPlace) updates.birthPlace = trimCompoundUpdateValue('birthPlace', birthPlace);

  const deathDateMatch = query.match(/(?:تاريخ\s+وفاة|تاريخ\s+الوفاة|تاريخ\s+وفاه|تاريخ\s+الوفاه|death\s+date)\s+(\d{4}(?:-\d{2}(?:-\d{2})?)?)/iu);
  if (deathDateMatch?.[1]) updates.deathDate = deathDateMatch[1];

  const deathPlace = fieldValue('death place|place of death|مكان الوفاة|وفاته');
  if (deathPlace) updates.deathPlace = deathPlace;

  const profession = fieldValue('profession|job|work|المهنة|مهنة|عمله|وظيفته|شغل|شغله|شغلها|يشتغل|تشتغل')
    || extractDelimitedUpdateValue(
      query,
      'شغل|شغله|شغلها|يشتغل|تشتغل',
      UPDATE_VALUE_STOP_TERMS
    );
  if (profession && updates.profession === undefined) {
    updates.profession = trimCompoundUpdateValue('profession', profession);
  }

  const bio = fieldValue('notes|note|bio|biography|ملاحظات|ملاحظة|السيرة|نبذة');
  if (bio) updates.bio = bio;

  return updates;
};
