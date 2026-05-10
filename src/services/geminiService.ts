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

const readProxyResult = (data: AIProxyResponse, fallbackMessage: string): string => {
  const result = data.result || '';
  if (!result) {
    throw new Error(fallbackMessage);
  }
  return result;
};

const getProxyErrorMessage = (error: unknown, fallbackMessage: string): string =>
  error instanceof Error && error.message ? error.message : fallbackMessage;

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
    const safeText = text ?? '';
    const prompt = `Analyze the following unstructured text and extract details about a person to fill a family tree profile.
Return ONLY a valid JSON object. Do not add markdown formatting, code fences (such as triple backticks), or any text before or after the JSON.

Fields to extract:
- firstName, middleName, lastName, nickName, title
- gender (infer "male" or "female")
- birthDate (YYYY-MM-DD format if possible, otherwise YYYY)
- birthPlace
- isDeceased (boolean)
- deathDate (YYYY-MM-DD format if possible)
- deathPlace
- profession
- bio (a concise summary of the text, 2-4 sentences)

If a field is unknown or not clearly stated, either omit it from the JSON or set it to an empty string/null as appropriate.

TEXT:
"""${safeText}"""`;

    const data = await callAIProxy({
      operation: 'extract_person_data',
      prompt,
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

    const p = parsed as Partial<Person>;
    return {
      firstName: p.firstName ?? '',
      middleName: p.middleName ?? '',
      lastName: p.lastName ?? '',
      nickName: p.nickName ?? '',
      title: p.title ?? '',
      gender: p.gender as Person['gender'] | undefined,
      birthDate: p.birthDate ?? '',
      birthPlace: p.birthPlace ?? '',
      isDeceased: p.isDeceased ?? false,
      deathDate: p.deathDate ?? '',
      deathPlace: p.deathPlace ?? '',
      profession: p.profession ?? '',
      bio: p.bio ?? '',
    };
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

    const simplifiedData = Object.values(people).map((p) => ({
      id: p.id,
      name: buildFullName(p),
      birthDate: p.birthDate || undefined,
      birthPlace: p.birthPlace || undefined,
      deathDate: p.deathDate || undefined,
      deathPlace: p.deathPlace || undefined,
      parents: p.parents || [],
      spouses: p.spouses || [],
      children: p.children || [],
    }));

    const storyPrompt = `Act as a master storyteller. Based on the JSON data of a family tree provided below, write a compelling, chronological narrative history of this family.

LANGUAGE: ${language === 'ar' ? 'Arabic' : 'English'}

INSTRUCTIONS:
1. Start from the oldest known ancestors and move forward in time to the youngest generation.
2. Highlight key locations (migrations), longevity, large families, or interesting professions if noted.
3. Use a warm, nostalgic, and respectful tone.
4. Structure the story in clear paragraphs. Use HTML formatting for the output (e.g. <h3> for eras/generations, <p> for text, <strong> for names).
5. Do NOT output Markdown code blocks. Just return the raw HTML string suitable for placing in a div.
6. Focus on the flow of generations. "The story begins with...".
7. If LANGUAGE is Arabic, write the entire story in Modern Standard Arabic. If it is English, write in clear, simple English.

FAMILY DATA:
${JSON.stringify(simplifiedData.slice(0, 50))}
(Data limited to 50 key members for brevity if tree is huge)`;

    const data = await callAIProxy({
      operation: 'family_story',
      prompt: storyPrompt,
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

export const analyzeImage = async (base64Image: string): Promise<string> => {
  try {
    const prompt = 'Analyze this family photo and describe the people, their estimated ages, clothing style, and any potential historical or emotional context. Identify if there are any specific recognizable traits. Keep the description concise but meaningful. Output in Arabic if the interface or context suggests it, otherwise English.';
    const base64Content = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

    const data = await callAIProxy({
      operation: 'analyze_image',
      prompt,
      image: {
        data: base64Content,
        mimeType: 'image/jpeg',
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
