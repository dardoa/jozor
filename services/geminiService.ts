import { GoogleGenAI } from "@google/genai";
import { Person, Message } from "../src/types";
import { getFullName } from "../src/utils/familyLogic"; // Import getFullName for better context

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");
  return new GoogleGenAI({ apiKey });
};

/**
 * Basic sanitization for user-controlled text inputs to prevent prompt injection.
 * Removes newline characters, backticks, and quotes that could break out of prompt structures.
 */
const sanitizePromptInput = (input: string): string => {
  if (!input) return '';
  // Replace characters that could be used for prompt injection or formatting disruption
  // This is a basic sanitization. More advanced scenarios might need a dedicated library.
  return input.replace(/[\n\r`"']/g, ' ').trim();
};

export const generateBiography = async (person: Person, people: Record<string, Person>, tone: string = 'Standard'): Promise<string> => {
  try {
    const ai = getClient();
    
    // Whitelist for allowed tones
    const allowedTones = ['Standard', 'Formal', 'Storyteller', 'Humorous', 'Journalistic'];
    const sanitizedTone = allowedTones.includes(tone) ? tone : 'Standard';

    // Resolve relative names for richer context and sanitize them
    const parentNames = person.parents
      .map((id: string) => people[id]) // Explicitly type id
      .filter(Boolean)
      .map((p: Person) => sanitizePromptInput(`${p.firstName} ${p.lastName}`)) // Explicitly type p
      .join(' and ');

    const spouseNames = person.spouses
      .map((id: string) => people[id]) // Explicitly type id
      .filter(Boolean)
      .map((p: Person) => sanitizePromptInput(`${p.firstName} ${p.lastName}`)) // Explicitly type p
      .join(', ');

    const childCount = person.children.length;

    // Construct a comprehensive list of details, sanitizing all string fields
    const details = [
        `Name: ${sanitizePromptInput(person.title ? person.title + ' ' : '')}${sanitizePromptInput(person.firstName)} ${sanitizePromptInput(person.middleName ? person.middleName + ' ' : '')}${sanitizePromptInput(person.lastName)}${sanitizePromptInput(person.suffix ? ' ' + person.suffix : '')}`,
        person.birthName ? `Birth Name (Maiden Name): ${sanitizePromptInput(person.birthName)}` : null,
        person.nickName ? `Nickname: ${sanitizePromptInput(person.nickName)}` : null,
        `Gender: ${person.gender}`, // Gender is an enum, no sanitization needed
        `Born: ${sanitizePromptInput(person.birthDate || 'Unknown')}${person.birthPlace ? ` in ${sanitizePromptInput(person.birthPlace)}` : ''}`,
        person.isDeceased 
            ? `Died: ${sanitizePromptInput(person.deathDate || 'Unknown')}${person.deathPlace ? ` in ${sanitizePromptInput(person.deathPlace)}` : ''}` 
            : 'Status: Currently living',
        
        // Biographical Data
        person.profession ? `Profession/Occupation: ${sanitizePromptInput(person.profession)}` : null,
        person.company ? `Company/Organization: ${sanitizePromptInput(person.company)}` : null,
        person.interests ? `Interests/Hobbies: ${sanitizePromptInput(person.interests)}` : null,
        
        // Family Context
        parentNames ? `Parents: ${parentNames}` : null,
        spouseNames ? `Spouse(s): ${spouseNames}` : null,
        childCount > 0 ? `Children: ${childCount}` : null,
    ].filter(Boolean).join('\n');

    const prompt = `
      Write a short, engaging biography (approx 100-150 words) for a person in a family tree.
      
      TONE: ${sanitizedTone}
      
      PERSON DETAILS:
      ${details}
      
      INSTRUCTIONS:
      - Write in the third person.
      - Use the provided details to weave a cohesive and natural narrative.
      - Include family connections (parents, spouses, children) where relevant to give context.
      - If the tone is 'Storyteller', make it sound like a legend, a fond memory, or a storybook entry.
      - If the tone is 'Formal', stick to facts, chronology, and professional achievements.
      - If the tone is 'Humorous', include light-hearted remarks about their profession or interests if appropriate.
      - If the tone is 'Journalistic', write it like a newspaper obituary or feature.
      - If dates are missing, generalize (e.g., "born in the 20th century") rather than saying "unknown date".
      - Do not invent facts not provided, but you can infer context (e.g. if they are a doctor, you can mention they worked in healthcare).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Could not generate biography.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const startAncestorChat = async (person: Person, people: Record<string, Person>, history: Message[], newMessage: string): Promise<string> => {
    try {
        const ai = getClient();
        
        // Sanitize person details for context
        const sanitizedPersonFirstName = sanitizePromptInput(person.firstName);
        const sanitizedPersonLastName = sanitizePromptInput(person.lastName);
        const sanitizedBirthDate = sanitizePromptInput(person.birthDate || 'Unknown');
        const sanitizedBirthPlace = sanitizePromptInput(person.birthPlace || 'Unknown');
        const sanitizedDeathDate = sanitizePromptInput(person.deathDate || 'Unknown');
        const sanitizedProfession = sanitizePromptInput(person.profession || 'Unknown');
        const sanitizedInterests = sanitizePromptInput(person.interests || 'Unknown');
        const sanitizedBio = sanitizePromptInput(person.bio || 'No specific bio provided.');

        const sanitizedParentNames = person.parents.map((id: string) => people[id]?.firstName).filter(Boolean).map(sanitizePromptInput).join(', ');
        const sanitizedSpouseNames = person.spouses.map((id: string) => people[id]?.firstName).filter(Boolean).map(sanitizePromptInput).join(', ');

        const context = `
            You are playing the role of ${sanitizedPersonFirstName} ${sanitizedPersonLastName}.
            You are part of a family tree.
            
            YOUR DETAILS:
            Born: ${sanitizedBirthDate} in ${sanitizedBirthPlace}
            Died: ${person.isDeceased ? sanitizedDeathDate : 'Still living'}
            Profession: ${sanitizedProfession}
            Interests: ${sanitizedInterests}
            Bio: ${sanitizedBio}
            
            FAMILY:
            Parents: ${sanitizedParentNames}
            Spouse: ${sanitizedSpouseNames}
            Children: ${person.children.length}
            
            INSTRUCTIONS:
            - Reply to the user's message as if you are this person.
            - Use the first person ("I").
            - Be polite, warm, and reflect the time period you lived in if known.
            - Keep answers relatively short (2-3 sentences) unless asked for a story.
            - If asked about something not in your data, say you don't remember or invent a plausible detail consistent with your profession/era.
        `;

        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            config: { systemInstruction: context }
        });

        // Replay history with sanitized messages
        for (const msg of history) {
            await chat.sendMessage({ message: sanitizePromptInput(msg.text) });
        }

        // Send the new message after sanitization
        const result = await chat.sendMessage({ message: sanitizePromptInput(newMessage) });
        return result.text || "I am having trouble remembering right now. (AI Error)"; // Added fallback
    } catch (error) {
        console.error("Gemini Chat Error", error);
        return "I am having trouble remembering right now. (API Error)";
    }
};

export const extractPersonData = async (text: string): Promise<Partial<Person>> => {
    try {
        const ai = getClient();
        const prompt = `
            Analyze the following unstructured text and extract details about a person to fill a family tree profile.
            Return ONLY a valid JSON object. Do not add markdown formatting.
            
            Fields to extract:
            - firstName, middleName, lastName, nickName, title
            - gender (infer "male" or "female")
            - birthDate (YYYY-MM-DD format if possible, otherwise YYYY)
            - birthPlace
            - isDeceased (boolean)
            - deathDate (YYYY-MM-DD format)
            - deathPlace
            - profession
            - bio (a summary of the text)

            TEXT:
            "${sanitizePromptInput(text)}"
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        const jsonText = response.text || "{}";
        return JSON.parse(jsonText);
    } catch (error) {
        console.error("Gemini Extraction Error", error);
        throw error;
    }
};

export const analyzeImage = async (base64Image: string): Promise<string> => {
    try {
        const ai = getClient();
        
        // Remove header if present (data:image/jpeg;base64,)
        const base64Data = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { mimeType: 'image/jpeg', data: base64Data } },
                    { text: "Analyze this image for a genealogy research context. Describe the people (estimated age, clothing era), the setting, and any visible text or dates. Keep it concise." }
                ]
            }
        });

        return response.text || "No analysis available.";
    } catch (error) {
        console.error("Image Analysis Error", error);
        throw error;
    }
};

export const generateFamilyStory = async (people: Record<string, Person>, rootId: string, language: string = 'en'): Promise<string> => {
    try {
        const ai = getClient();
        
        // Prepare simplified data dump to save tokens, sanitizing relevant fields
        const sanitizedSimplifiedData = Object.values(people).map(p => ({
            name: getFullName(p), // Use getFullName for consistency
            id: p.id,
            parents: p.parents,
            spouses: p.spouses,
            born: sanitizePromptInput(p.birthDate),
            place: sanitizePromptInput(p.birthPlace),
            died: sanitizePromptInput(p.deathDate),
            bio: sanitizePromptInput(p.bio ? p.bio.substring(0, 100) : '')
        }));

        const prompt = `
            Act as a master storyteller. Based on the JSON data of a family tree provided below, write a compelling, chronological narrative history of this family.
            
            LANGUAGE: ${language === 'ar' ? 'Arabic' : 'English'}
            
            INSTRUCTIONS:
            1. Start from the oldest known ancestors and move forward in time to the youngest generation.
            2. Highlight key locations (migrations), longevity, large families, or interesting professions if noted.
            3. Use a warm, nostalgic, and respectful tone.
            4. Structure the story in clear paragraphs. Use HTML formatting for the output (e.g. <h3> for eras/generations, <p> for text, <strong> for names).
            5. Do NOT output Markdown code blocks. Just return the raw HTML string suitable for placing in a div.
            6. Focus on the flow of generations. "The story begins with..."
            
            FAMILY DATA:
            ${JSON.stringify(sanitizedSimplifiedData.slice(0, 50))} 
            (Data limited to 50 key members for brevity if tree is huge)
            
            ROOT PERSON ID: ${rootId}
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text || (language === 'ar' ? "<p>حدث خطأ أثناء كتابة القصة.</p>" : "<p>Error generating story.</p>");
    } catch (error) {
        console.error("Gemini Story Error", error);
        throw error;
    }
};