import type {
  AIProxyImagePayload,
  AIProxyRequest,
  AnalyzeImageAIRequestData,
  AncestorChatAIRequestData,
  BiographyAIRequestData,
  ExtractPersonDataAIRequestData,
  FamilyStoryAIRequestData,
  FamilyStoryMember,
  KindiPlanAIRequestData,
} from '../../types/ai';
import {
  MAX_KINDI_REDACTED_TEXT_LENGTH,
  MAX_SHORT_TEXT_LENGTH,
  MAX_MEDIUM_TEXT_LENGTH,
  MAX_HISTORY_TEXT_LENGTH,
  MAX_IMAGE_BASE64_LENGTH,
  MAX_FAMILY_STORY_MEMBERS,
  MAX_RELATION_TOKENS,
  MAX_FAMILY_STORY_DATA_LENGTH,
  ALLOWED_IMAGE_MIME_TYPES,
  UUID_PATTERN,
  AIProxyValidationError,
} from './types';

const asRequestRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;

const KINDI_FORBIDDEN_PRIVATE_DATA_PATTERN = /(?:https?:\/\/|file:\/\/|blob:|data:image\/|bearer\s+|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|\b(?:person|tree|user|node)_[A-Z0-9_-]+\b)/i;

const asRequestArray = (value: unknown, fieldName: string): unknown[] => {
  if (!Array.isArray(value)) {
    throw new AIProxyValidationError(`${fieldName} must be an array.`);
  }
  return value;
};

const requireString = (
  value: unknown,
  fieldName: string,
  maxLength: number,
  allowEmpty = false,
): string => {
  if (typeof value !== 'string') {
    throw new AIProxyValidationError(`${fieldName} must be a string.`);
  }

  const normalized = value.trim();
  if (!allowEmpty && !normalized) {
    throw new AIProxyValidationError(`${fieldName} cannot be empty.`);
  }
  if (normalized.length > maxLength) {
    throw new AIProxyValidationError(`${fieldName} exceeds ${maxLength} characters.`);
  }
  return normalized;
};

const optionalString = (
  value: unknown,
  fieldName: string,
  maxLength: number,
): string | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  return requireString(value, fieldName, maxLength);
};

const requireCount = (value: unknown, fieldName: string): number => {
  if (!Number.isInteger(value) || (value as number) < 0 || (value as number) > 100_000) {
    throw new AIProxyValidationError(`${fieldName} must be a non-negative integer.`);
  }
  return value as number;
};

const validateBiographyRequestData = (value: unknown): BiographyAIRequestData => {
  const data = asRequestRecord(value);
  if (!data) throw new AIProxyValidationError('Biography data is required.');

  return {
    fullName: requireString(data.fullName, 'fullName', MAX_SHORT_TEXT_LENGTH, true),
    gender: optionalString(data.gender, 'gender', 50),
    birthDate: optionalString(data.birthDate, 'birthDate', 100),
    birthPlace: optionalString(data.birthPlace, 'birthPlace', MAX_SHORT_TEXT_LENGTH),
    deathDate: optionalString(data.deathDate, 'deathDate', 100),
    deathPlace: optionalString(data.deathPlace, 'deathPlace', MAX_SHORT_TEXT_LENGTH),
    parentsCount: requireCount(data.parentsCount, 'parentsCount'),
    spousesCount: requireCount(data.spousesCount, 'spousesCount'),
    childrenCount: requireCount(data.childrenCount, 'childrenCount'),
    relatives: requireString(data.relatives, 'relatives', MAX_MEDIUM_TEXT_LENGTH, true),
    toneInstruction: requireString(
      data.toneInstruction,
      'toneInstruction',
      MAX_SHORT_TEXT_LENGTH,
      true,
    ),
    preferredLanguage: requireString(data.preferredLanguage, 'preferredLanguage', 20),
  };
};

const validateAncestorChatRequestData = (value: unknown): AncestorChatAIRequestData => {
  const data = asRequestRecord(value);
  if (!data) throw new AIProxyValidationError('Ancestor chat data is required.');

  return {
    fullName: requireString(data.fullName, 'fullName', MAX_SHORT_TEXT_LENGTH, true),
    birthPlace: optionalString(data.birthPlace, 'birthPlace', MAX_SHORT_TEXT_LENGTH),
    birthDate: optionalString(data.birthDate, 'birthDate', 100),
    deathPlace: optionalString(data.deathPlace, 'deathPlace', MAX_SHORT_TEXT_LENGTH),
    deathDate: optionalString(data.deathDate, 'deathDate', 100),
    preferredLanguage: requireString(data.preferredLanguage, 'preferredLanguage', 20),
    historyText: requireString(data.historyText, 'historyText', MAX_HISTORY_TEXT_LENGTH, true),
    newMessage: requireString(data.newMessage, 'newMessage', MAX_MEDIUM_TEXT_LENGTH),
  };
};

const validateImagePayload = (value: unknown): AIProxyImagePayload => {
  const image = asRequestRecord(value);
  if (!image) throw new AIProxyValidationError('Image payload is required.');

  const mimeType = requireString(image.mimeType, 'image.mimeType', 100).toLowerCase();
  if (!ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
    throw new AIProxyValidationError('Unsupported image MIME type.');
  }

  const data = requireString(image.data, 'image.data', MAX_IMAGE_BASE64_LENGTH);
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(data)) {
    throw new AIProxyValidationError('Image data must be valid base64.');
  }

  return { data, mimeType };
};

const validateLanguage = (value: unknown, fieldName: string): 'ar' | 'en' => {
  if (value !== 'ar' && value !== 'en') {
    throw new AIProxyValidationError(`${fieldName} must be "ar" or "en".`);
  }
  return value;
};

const validatePersonToken = (value: unknown, fieldName: string): string => {
  const token = requireString(value, fieldName, 20);
  if (!/^P[1-9]\d*$/.test(token)) {
    throw new AIProxyValidationError(`${fieldName} must be an anonymized person token.`);
  }
  return token;
};

const validateRelationTokens = (value: unknown, fieldName: string): string[] => {
  const tokens = asRequestArray(value, fieldName);
  if (tokens.length > MAX_RELATION_TOKENS) {
    throw new AIProxyValidationError(`${fieldName} exceeds ${MAX_RELATION_TOKENS} entries.`);
  }
  return tokens.map((token, index) => validatePersonToken(token, `${fieldName}[${index}]`));
};

const validateFamilyStoryMember = (value: unknown, index: number): FamilyStoryMember => {
  const member = asRequestRecord(value);
  if (!member) {
    throw new AIProxyValidationError(`members[${index}] must be an object.`);
  }

  return {
    personToken: validatePersonToken(member.personToken, `members[${index}].personToken`),
    name: requireString(member.name, `members[${index}].name`, MAX_SHORT_TEXT_LENGTH, true),
    birthDate: optionalString(member.birthDate, `members[${index}].birthDate`, 100),
    birthPlace: optionalString(
      member.birthPlace,
      `members[${index}].birthPlace`,
      MAX_SHORT_TEXT_LENGTH,
    ),
    deathDate: optionalString(member.deathDate, `members[${index}].deathDate`, 100),
    deathPlace: optionalString(
      member.deathPlace,
      `members[${index}].deathPlace`,
      MAX_SHORT_TEXT_LENGTH,
    ),
    parents: validateRelationTokens(member.parents, `members[${index}].parents`),
    spouses: validateRelationTokens(member.spouses, `members[${index}].spouses`),
    children: validateRelationTokens(member.children, `members[${index}].children`),
  };
};

const validateExtractPersonDataRequest = (value: unknown): ExtractPersonDataAIRequestData => {
  const data = asRequestRecord(value);
  if (!data) throw new AIProxyValidationError('Person extraction data is required.');
  return {
    text: requireString(data.text, 'data.text', MAX_MEDIUM_TEXT_LENGTH),
  };
};

const validateFamilyStoryRequest = (value: unknown): FamilyStoryAIRequestData => {
  const data = asRequestRecord(value);
  if (!data) throw new AIProxyValidationError('Family story data is required.');

  const rawMembers = asRequestArray(data.members, 'data.members');
  if (rawMembers.length === 0 || rawMembers.length > MAX_FAMILY_STORY_MEMBERS) {
    throw new AIProxyValidationError(
      `data.members must contain between 1 and ${MAX_FAMILY_STORY_MEMBERS} members.`,
    );
  }

  const members = rawMembers.map(validateFamilyStoryMember);
  if (new Set(members.map((member) => member.personToken)).size !== members.length) {
    throw new AIProxyValidationError('Family story person tokens must be unique.');
  }
  if (JSON.stringify(members).length > MAX_FAMILY_STORY_DATA_LENGTH) {
    throw new AIProxyValidationError(
      `Family story data exceeds ${MAX_FAMILY_STORY_DATA_LENGTH} characters.`,
    );
  }

  return {
    language: validateLanguage(data.language, 'data.language'),
    members,
  };
};

const validateAnalyzeImageRequest = (value: unknown): AnalyzeImageAIRequestData => {
  const data = asRequestRecord(value);
  if (!data) throw new AIProxyValidationError('Image analysis data is required.');
  return {
    preferredLanguage: validateLanguage(data.preferredLanguage, 'data.preferredLanguage'),
  };
};

export function validateKindiPlanRequestData(value: unknown): KindiPlanAIRequestData {
  const data = asRequestRecord(value);
  if (!data || typeof data.redactedText !== 'string') {
    throw new AIProxyValidationError('Kindi planning requires redactedText.');
  }

  const redactedText = data.redactedText.replace(/\s+/g, ' ').trim();
  if (!redactedText) {
    throw new AIProxyValidationError('Kindi planning text cannot be empty.');
  }
  if (redactedText.length > MAX_KINDI_REDACTED_TEXT_LENGTH) {
    throw new AIProxyValidationError(
      `Kindi planning text exceeds ${MAX_KINDI_REDACTED_TEXT_LENGTH} characters.`
    );
  }
  if (UUID_PATTERN.test(redactedText)) {
    throw new AIProxyValidationError('Kindi planning text must not contain internal identifiers.');
  }
  if (KINDI_FORBIDDEN_PRIVATE_DATA_PATTERN.test(redactedText)) {
    throw new AIProxyValidationError('Kindi planning text must not contain private data or external resource references.');
  }

  return { redactedText };
}

export function validateAIProxyRequest(value: unknown): AIProxyRequest {
  const body = asRequestRecord(value);
  if (!body || typeof body.operation !== 'string') {
    throw new AIProxyValidationError('Invalid AI request.');
  }

  switch (body.operation) {
    case 'biography':
      return { operation: 'biography', data: validateBiographyRequestData(body.data) };
    case 'ancestor_chat':
      return { operation: 'ancestor_chat', data: validateAncestorChatRequestData(body.data) };
    case 'extract_person_data':
      return {
        operation: 'extract_person_data',
        data: validateExtractPersonDataRequest(body.data),
      };
    case 'family_story':
      return {
        operation: 'family_story',
        data: validateFamilyStoryRequest(body.data),
      };
    case 'analyze_image':
      return {
        operation: 'analyze_image',
        data: validateAnalyzeImageRequest(body.data),
        image: validateImagePayload(body.image),
      };
    case 'kindi_plan':
      return {
        operation: 'kindi_plan',
        data: validateKindiPlanRequestData(body.data),
      };
    default:
      throw new AIProxyValidationError('Unsupported AI operation.');
  }
}
