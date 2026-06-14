import type { AIProxyResponse } from '../types/ai';
import { Person, Message } from '../types';
import { callAIProxy } from './aiProxyClient';
import { showToast } from '../utils/showToast';
import { logError } from '../utils/errorLogger';

const buildFullName = (person: Person): string => {
  const parts = [person.title, person.firstName, person.middleName, person.lastName]
    .map((part) => part?.trim())
    .filter(Boolean);
  return (parts.join(' ').trim() || person.nickName || person.birthName || '').trim();
};

const cleanJsonCodeBlock = (raw: string): string => {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\s*/, '').replace(/```\s*$/, '');
  }
  return cleaned.trim();
};

const MAX_AI_RESULT_LENGTH = 50_000;
const EXTRACTED_FIELD_LIMITS = {
  short: 120,
  date: 32,
  place: 300,
  profession: 300,
  bio: 4_000,
} as const;

const readProxyResult = (data: AIProxyResponse, fallbackMessage: string): string => {
  const result = typeof data.result === 'string' ? data.result.trim() : '';
  if (!result) {
    throw new Error(fallbackMessage);
  }
  if (result.length > MAX_AI_RESULT_LENGTH) {
    throw new Error('AI proxy returned a response that exceeds the allowed size.');
  }
  return result;
};

const getProxyErrorMessage = (error: unknown, fallbackMessage: string): string =>
  error instanceof Error && error.message ? error.message : fallbackMessage;

const readLimitedString = (
  record: Record<string, unknown>,
  key: string,
  maxLength: number
): string | undefined => {
  const value = record[key];
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized ? normalized.slice(0, maxLength) : undefined;
};

export const sanitizeExtractedPersonData = (value: unknown): Partial<Person> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('AI extraction result must be a JSON object.');
  }

  const record = value as Record<string, unknown>;
  const result: Partial<Person> = {};
  const stringFields = [
    ['firstName', EXTRACTED_FIELD_LIMITS.short],
    ['middleName', EXTRACTED_FIELD_LIMITS.short],
    ['lastName', EXTRACTED_FIELD_LIMITS.short],
    ['nickName', EXTRACTED_FIELD_LIMITS.short],
    ['title', EXTRACTED_FIELD_LIMITS.short],
    ['birthDate', EXTRACTED_FIELD_LIMITS.date],
    ['birthPlace', EXTRACTED_FIELD_LIMITS.place],
    ['deathDate', EXTRACTED_FIELD_LIMITS.date],
    ['deathPlace', EXTRACTED_FIELD_LIMITS.place],
    ['profession', EXTRACTED_FIELD_LIMITS.profession],
    ['bio', EXTRACTED_FIELD_LIMITS.bio],
  ] as const;

  for (const [key, maxLength] of stringFields) {
    const fieldValue = readLimitedString(record, key, maxLength);
    if (fieldValue !== undefined) {
      result[key] = fieldValue;
    }
  }

  if (record.gender === 'male' || record.gender === 'female') {
    result.gender = record.gender;
  }
  if (typeof record.isDeceased === 'boolean') {
    result.isDeceased = record.isDeceased;
  }

  return result;
};

export const generateBiography = async (
  person: Person,
  people: Record<string, Person>,
  tone: string = 'Standard'
): Promise<string> => {
  try {
    const fullName = buildFullName(person);
    const relatives = Object.values(people)
      .filter((p) => p.id !== person.id)
      .slice(0, 10)
      .map((p) => {
        const relFullName = buildFullName(p);
        const relation = (p as Person & { relationToMain?: string }).relationToMain ?? '';
        return `${relFullName} ${relation ? `(${relation})` : ''}`;
      })
      .join('; ');

    const toneInstruction =
      tone === 'Formal'
        ? 'Write in a formal historical tone.'
        : tone === 'Story'
          ? 'Write as an engaging family story.'
          : 'Write in a clear, respectful, and concise tone.';

    const preferredLanguage =
      (person as Person & { preferredLanguage?: string }).preferredLanguage || 'ar';

    const data = await callAIProxy({
      operation: 'biography',
      data: {
        fullName,
        gender: person.gender,
        birthDate: person.birthDate,
        birthPlace: person.birthPlace,
        deathDate: person.deathDate,
        deathPlace: person.deathPlace,
        parentsCount: (person.parents || []).length,
        spousesCount: (person.spouses || []).length,
        childrenCount: (person.children || []).length,
        relatives,
        toneInstruction,
        preferredLanguage,
      },
    });

    return readProxyResult(data, 'AI proxy returned an empty response.');
  } catch (error) {
    const message = getProxyErrorMessage(error, 'Failed to generate biography. Ensure AI proxy is configured.');
    logError('AI generateBiography', error, {
      showToast: false,
    });
    showToast.error(message);
    throw error;
  }
};

export const startAncestorChat = async (
  person: Person,
  _people: Record<string, Person>,
  history: Message[],
  newMessage: string
): Promise<string> => {
  try {
    const fullName = buildFullName(person);
    const preferredLanguage =
      (person as Person & { preferredLanguage?: string }).preferredLanguage || 'ar';

    const historyText = history
      .slice(-10)
      .map((msg) => {
        const roleLabel = msg.role === 'user' ? 'المستخدم' : 'الجد/الجدة';
        return `${roleLabel}: ${msg.text}`;
      })
      .join('\n');

    const data = await callAIProxy({
      operation: 'ancestor_chat',
      data: {
        fullName,
        birthPlace: person.birthPlace,
        birthDate: person.birthDate,
        deathPlace: person.deathPlace,
        deathDate: person.deathDate,
        preferredLanguage,
        historyText,
        newMessage,
      },
    });

    return readProxyResult(data, 'AI proxy returned an empty response for chat.');
  } catch (error) {
    const message = getProxyErrorMessage(error, 'I am having trouble remembering right now. (API Error)');
    logError('AI_ANCESTOR_CHAT_ERROR', error, { showToast: false });
    showToast.error(message);
    return message;
  }
};

export const extractPersonData = async (text: string): Promise<Partial<Person>> => {
  try {
    const data = await callAIProxy({
      operation: 'extract_person_data',
      data: {
        text: text ?? '',
      },
    });
    const rawResult = readProxyResult(data, 'AI proxy returned an empty response for extraction.');

    let parsed: unknown;
    try {
      const cleaned = cleanJsonCodeBlock(rawResult);
      parsed = JSON.parse(cleaned);
    } catch (parseError) {
      logError('AI_EXTRACTION_PARSE_ERROR', parseError, { showToast: false });
      showToast.error('Failed to parse extracted data from AI.');
      throw parseError;
    }

    return sanitizeExtractedPersonData(parsed);
  } catch (error) {
    const message = getProxyErrorMessage(error, 'Failed to extract data. Ensure AI proxy is configured.');
    logError('AI_EXTRACTION_ERROR', error, {
      showToast: false,
    });
    showToast.error(message);
    throw error;
  }
};

export const generateFamilyStory = async (
  people: Record<string, Person>,
  rootId: string,
  language: string = 'en'
): Promise<string> => {
  try {
    const root = people[rootId];
    if (!root) {
      const msg =
        language === 'ar'
          ? 'الشخص الجذر غير موجود في بيانات العائلة.'
          : 'Root person not found in family data.';
      showToast.error(msg);
      throw new Error(msg);
    }

    const selectedPeople = Object.values(people).slice(0, 50);
    const personTokens = new Map(
      selectedPeople.map((person, index) => [person.id, `P${index + 1}`]),
    );
    const toKnownTokens = (ids: string[] | undefined): string[] =>
      (ids ?? []).flatMap((id) => {
        const token = personTokens.get(id);
        return token ? [token] : [];
      });
    const members = selectedPeople.map((p) => ({
      personToken: personTokens.get(p.id) as string,
      name: buildFullName(p),
      birthDate: p.birthDate || undefined,
      birthPlace: p.birthPlace || undefined,
      deathDate: p.deathDate || undefined,
      deathPlace: p.deathPlace || undefined,
      parents: toKnownTokens(p.parents),
      spouses: toKnownTokens(p.spouses),
      children: toKnownTokens(p.children),
    }));

    const data = await callAIProxy({
      operation: 'family_story',
      data: {
        language: language === 'ar' ? 'ar' : 'en',
        members,
      },
    });

    return readProxyResult(
      data,
      language === 'ar'
        ? 'لم يتم استرجاع أي نص من خدمة القصة.'
        : 'AI proxy returned an empty response for family story.'
    );
  } catch (error) {
    logError('AI_FAMILY_STORY_ERROR', error, { showToast: false });
    const fallback =
      language === 'ar'
        ? 'حدث خطأ أثناء إنشاء قصة العائلة. يرجى المحاولة لاحقًا.'
        : 'An error occurred while generating the family story. Please try again later.';
    showToast.error(getProxyErrorMessage(error, fallback));
    throw error;
  }
};

export const analyzeImage = async (
  base64Image: string,
  preferredLanguage: 'ar' | 'en' = 'en',
): Promise<string> => {
  try {
    const base64Content = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
    const mimeTypeMatch = base64Image.match(/^data:(image\/(?:jpeg|png|webp));base64,/i);

    const data = await callAIProxy({
      operation: 'analyze_image',
      data: {
        preferredLanguage,
      },
      image: {
        data: base64Content,
        mimeType: mimeTypeMatch?.[1]?.toLowerCase() ?? 'image/jpeg',
      },
    });

    return readProxyResult(data, 'AI proxy returned an empty response for image analysis.');
  } catch (error) {
    const message = getProxyErrorMessage(error, 'Failed to analyze image.');
    logError('AI_VISION_ERROR', error, { showToast: false });
    showToast.error(message);
    throw error;
  }
};
