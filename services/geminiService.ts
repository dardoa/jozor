import { Person, Message } from "../types";
import { showError } from '../utils/toast'; // Import showError

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
    // Placeholder for backend call
    showError("AI features are disabled. Please set up a backend proxy for Gemini API calls.");
    return "AI features are currently unavailable. Please set up a backend proxy.";

  } catch (error) {
    console.error("Gemini API Error:", error);
    showError("Failed to generate biography. Ensure backend proxy is configured."); // Use toast
    throw error;
  }
};

export const startAncestorChat = async (person: Person, people: Record<string, Person>, history: Message[], newMessage: string): Promise<string> => {
    try {
        // Placeholder for backend call
        showError("AI chat is disabled. Please set up a backend proxy for Gemini API calls.");
        return "AI chat is currently unavailable. Please set up a backend proxy.";

    } catch (error) {
        console.error("Gemini Chat Error", error);
        showError("I am having trouble remembering right now. (API Error)"); // Use toast
        return "I am having trouble remembering right now. (API Error)";
    }
};

export const extractPersonData = async (text: string): Promise<Partial<Person>> => {
    try {
        // Placeholder for backend call
        showError("AI data extraction is disabled. Please set up a backend proxy for Gemini API calls.");
        return {};

    } catch (error) {
        console.error("Gemini Extraction Error", error);
        showError("Failed to extract data. Ensure backend proxy is configured."); // Use toast
        throw error;
    }
};

export const analyzeImage = async (base64Image: string): Promise<string> => {
    try {
        // Placeholder for backend call
        showError("AI image analysis is disabled. Please set up a backend proxy for Gemini API calls.");
        return "AI image analysis is currently unavailable. Please set up a backend proxy.";

    } catch (error) {
        console.error("Image Analysis Error", error);
        showError("Image analysis failed. Ensure backend proxy is configured."); // Use toast
        throw error;
    }
};

export const generateFamilyStory = async (people: Record<string, Person>, rootId: string, language: string = 'en'): Promise<string> => {
    try {
        // Placeholder for backend call
        showError("AI story generation is disabled. Please set up a backend proxy for Gemini API calls.");
        return language === 'ar' ? "<p>ميزة إنشاء القصة بالذكاء الاصطناعي غير متاحة حاليًا. يرجى إعداد وكيل خلفي لمكالمات Gemini API.</p>" : "<p>AI story generation is currently unavailable. Please set up a backend proxy for Gemini API calls.</p>";

    } catch (error) {
        console.error("Gemini Story Error", error);
        showError(language === 'ar' ? "حدث خطأ أثناء كتابة القصة. يرجى التأكد من تكوين الوكيل الخلفي." : "Error generating story. Ensure backend proxy is configured."); // Use toast
        throw error;
    }
};