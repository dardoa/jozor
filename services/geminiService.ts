import { Person, Message } from '../types';
import { showError } from '../utils/toast';
import { logError } from '../utils/errorLogger';

// --- Shared helpers for Gemini services ---

/**
 * Builds the full name of a person by joining title, names, and falling back to nicknames if necessary.
 * @param person - The person object to build the name for.
 * @returns The formatted full name string.
 */
const buildFullName = (person: Person): string => {
  const parts = [person.title, person.firstName, person.middleName, person.lastName]
    .map((part) => part?.trim())
    .filter(Boolean);
  return (parts.join(' ').trim() || person.nickName || person.birthName || '').trim();
};

/**
 * Cleans the JSON response from Gemini by removing markdown code blocks if present.
 * @param raw - The raw string response from the AI.
 * @returns The cleaned JSON string.
 */
const cleanJsonCodeBlock = (raw: string): string => {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\s*/, '').replace(/```\s*$/, '');
  }
  return cleaned.trim();
};

/**
 * Generates a biography for a person using the Gemini AI service.
 * @param person - The person to generate a biography for.
 * @param people - The full family tree record for context.
 * @param tone - The tone of the biography (Standard, Formal, Story).
 * @returns A promise that resolves to the generated biography HTML string.
 */
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
        const relFullName = buildFullName(p as Person);
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

    const response = await fetch('/api/ai/generate-content', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'biography',
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
      }),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to generate biography. (API Error)';
      try {
        const err = await response.json();
        errorMessage = err.error || errorMessage;
      } catch {
        // ignore JSON parse error
      }
      showError(errorMessage);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const result: string = data.result || '';

    if (!result) {
      const msg = 'Gemini returned an empty response.';
      showError(msg);
      throw new Error(msg);
    }

    return result;
  } catch (error) {
    logError('Gemini generateBiography', error, { showToast: true, toastMessage: 'Failed to generate biography. Ensure backend proxy is configured.' });
    throw error;
  }
};

/**
 * Starts a chat session with an AI representing an ancestor based on family data.
 * @param person - The person (ancestor) to talk to.
 * @param history - The message history of the current chat.
 * @param newMessage - The new message from the user.
 * @returns A promise that resolves to the AI's response string.
 */
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

    const response = await fetch('/api/ai/generate-content', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'ancestor_chat',
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
      }),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to continue ancestor chat. (API Error)';
      try {
        const err = await response.json();
        errorMessage = err.error || errorMessage;
      } catch {
        // ignore JSON parse error
      }
      showError(errorMessage);
      return 'I am having trouble remembering right now. (API Error)';
    }

    const data = await response.json();
    const result: string = data.result || '';

    if (!result) {
      const msg = 'Gemini returned an empty response for chat.';
      showError(msg);
      return 'I am having trouble remembering right now. (Empty response)';
    }

    return result;
  } catch (error) {
    console.error('Gemini Chat Error', error);
    showError('I am having trouble remembering right now. (API Error)');
    return 'I am having trouble remembering right now. (API Error)';
  }
};

/**
 * Extracts structured person data from unstructured text using Gemini AI.
 * @param text - The unstructured text to analyze.
 * @returns A promise that resolves to a partial Person object with extracted data.
 */
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

    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to extract data. (API Error)';
      try {
        const err = await response.json();
        errorMessage = err.error || errorMessage;
      } catch {
        // ignore JSON parse error
      }
      showError(errorMessage);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const rawResult: string = data.result || '';

    if (!rawResult) {
      const msg = 'Gemini returned an empty response for extraction.';
      showError(msg);
      throw new Error(msg);
    }

    let parsed: any;
    try {
      const cleaned = cleanJsonCodeBlock(rawResult);
      parsed = JSON.parse(cleaned);
    } catch (e) {
      console.error('Failed to parse Gemini extraction JSON:', rawResult);
      showError('Failed to parse extracted data from AI.');
      throw e;
    }

    const p = parsed as Partial<Person>;
    const result: Partial<Person> = {
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
    return result;
  } catch (error) {
    logError('GEMINI_EXTRACTION_ERROR', error, { showToast: true, toastMessage: 'Failed to extract data. Ensure backend proxy is configured.' });
    throw error;
  }
};

/**
 * Generates a comprehensive family story based on the entire family tree.
 * @param people - The full family tree record.
 * @param rootId - The root person ID to start the story from.
 * @param language - The language of the generated story (ar, en).
 * @returns A promise that resolves to the generated story HTML string.
 */
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
      showError(msg);
      throw new Error(msg);
    }

    const simplifiedData = Object.values(people).map((p) => ({
      id: p.id,
      name: buildFullName(p as Person),
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

    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt: storyPrompt }),
    });

    if (!response.ok) {
      let errorMessage =
        language === 'ar'
          ? 'فشل في إنشاء قصة العائلة. (خطأ في واجهة البرمجة)'
          : 'Failed to generate family story. (API Error)';
      try {
        const err = await response.json();
        errorMessage = err.error || errorMessage;
      } catch {
        // ignore JSON parse error
      }
      showError(errorMessage);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const result: string = data.result || '';

    if (!result) {
      const msg =
        language === 'ar'
          ? 'لم يتم استرجاع أي نص من خدمة القصة.'
          : 'Gemini returned an empty response for family story.';
      showError(msg);
      throw new Error(msg);
    }

    return result;
  } catch (error) {
    console.error('Gemini Story Error', error);
    const fallback =
      language === 'ar'
        ? 'حدث خطأ أثناء إنشاء قصة العائلة. يرجى المحاولة لاحقًا.'
        : 'An error occurred while generating the family story. Please try again later.';
    showError(fallback);
    throw error;
  }
};

/**
 * Analyzes an image using Gemini AI (Vision).
 * @param base64Image - The image data as a base64 string (including data:image/... prefix).
 * @returns A promise that resolves to the AI's analysis string.
 */
export const analyzeImage = async (base64Image: string): Promise<string> => {
  try {
    const prompt = `Analyze this family photo and describe the people, their estimated ages, clothing style, and any potential historical or emotional context. Identify if there are any specific recognizable traits. Keep the description concise but meaningful. Output in Arabic if the interface or context suggests it, otherwise English.`;

    // Extract base64 content if it has the data URI prefix
    const base64Content = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        image: {
          data: base64Content,
          mimeType: 'image/jpeg',
        },
      }),
    });

    if (!response.ok) {
      let errorMessage = 'Failed to analyze image. (API Error)';
      try {
        const err = await response.json();
        errorMessage = err.error || errorMessage;
      } catch {
        // ignore
      }
      showError(errorMessage);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    const result: string = data.result || '';

    if (!result) {
      const msg = 'Gemini returned an empty response for image analysis.';
      showError(msg);
      throw new Error(msg);
    }

    return result;
  } catch (error) {
    logError('GEMINI_VISION_ERROR', error, { showToast: true, toastMessage: 'Failed to analyze image.' });
    throw error;
  }
};
