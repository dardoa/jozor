import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  generateBiography,
  startAncestorChat,
  extractPersonData,
  generateFamilyStory,
  analyzeImage,
  sanitizeExtractedPersonData,
} from '../geminiService';
import { callAIProxy } from '../aiProxyClient';
import { showToast } from '../../utils/showToast';
import { logError } from '../../utils/errorLogger';
import { DEFAULT_PERSON_TEMPLATE } from '../../constants';

// Mock dependencies
vi.mock('../aiProxyClient', () => ({
  callAIProxy: vi.fn(),
}));

vi.mock('../../utils/showToast', () => ({
  showToast: {
    error: vi.fn(),
  },
}));

vi.mock('../../utils/errorLogger', () => ({
  logError: vi.fn(),
}));

const mockPerson = {
  ...DEFAULT_PERSON_TEMPLATE,
  id: 'person-1',
  firstName: 'Mahmoud',
  lastName: 'Jozor',
  gender: 'male' as const,
  birthDate: '1950-01-01',
  birthPlace: 'Cairo',
};

describe('geminiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateBiography', () => {
    it('calls callAIProxy with correct biography data and returns result', async () => {
      vi.mocked(callAIProxy).mockResolvedValue({
        result: 'Mahmoud was born in Cairo in 1950.',
      });

      const bio = await generateBiography(mockPerson, { 'person-1': mockPerson }, 'Formal');

      expect(bio).toBe('Mahmoud was born in Cairo in 1950.');
      expect(callAIProxy).toHaveBeenCalledWith({
        operation: 'biography',
        data: expect.objectContaining({
          fullName: 'Mahmoud Jozor',
          gender: 'male',
          birthDate: '1950-01-01',
          birthPlace: 'Cairo',
          toneInstruction: 'Write in a formal historical tone.',
        }),
      });
    });

    it('shows error toast and throws when API call fails', async () => {
      vi.mocked(callAIProxy).mockRejectedValue(new Error('Quota exceeded'));

      await expect(
        generateBiography(mockPerson, { 'person-1': mockPerson })
      ).rejects.toThrow('Quota exceeded');

      expect(showToast.error).toHaveBeenCalledWith('Quota exceeded');
      expect(logError).toHaveBeenCalled();
    });
  });

  describe('startAncestorChat', () => {
    it('sends history and returns response from ancestor', async () => {
      vi.mocked(callAIProxy).mockResolvedValue({
        result: 'Hello my child.',
      });

      const response = await startAncestorChat(
        mockPerson,
        { 'person-1': mockPerson },
        [{ role: 'user' as const, text: 'Who are you?' }],
        'Tell me more'
      );

      expect(response).toBe('Hello my child.');
      expect(callAIProxy).toHaveBeenCalledWith({
        operation: 'ancestor_chat',
        data: expect.objectContaining({
          fullName: 'Mahmoud Jozor',
          newMessage: 'Tell me more',
          historyText: 'المستخدم: Who are you?',
        }),
      });
    });

    it('returns error message and logs when chat API fails', async () => {
      vi.mocked(callAIProxy).mockRejectedValue(new Error('Network failure'));

      const response = await startAncestorChat(mockPerson, {}, [], 'Hello');

      expect(response).toBe('Network failure');
      expect(showToast.error).toHaveBeenCalledWith('Network failure');
      expect(logError).toHaveBeenCalled();
    });
  });

  describe('extractPersonData', () => {
    it('extracts and cleans JSON structure from AI response', async () => {
      vi.mocked(callAIProxy).mockResolvedValue({
        result: '```json\n{ "firstName": "Ahmad", "gender": "male", "isDeceased": true }\n```',
      });

      const extracted = await extractPersonData('Ahmad was a doctor who died in 2010.');

      expect(extracted.firstName).toBe('Ahmad');
      expect(extracted.gender).toBe('male');
      expect(extracted.isDeceased).toBe(true);
      expect(callAIProxy).toHaveBeenCalledWith(
        {
          operation: 'extract_person_data',
          data: {
            text: 'Ahmad was a doctor who died in 2010.',
          },
        }
      );
    });

    it('throws parse error and shows toast on malformed JSON', async () => {
      vi.mocked(callAIProxy).mockResolvedValue({
        result: 'Not a valid JSON block',
      });

      await expect(extractPersonData('Invalid text')).rejects.toThrow();
      expect(showToast.error).toHaveBeenCalledWith('Failed to parse extracted data from AI.');
      expect(logError).toHaveBeenCalled();
    });

    it('keeps only supported fields with valid runtime types', () => {
      expect(sanitizeExtractedPersonData({
        firstName: '  Ahmad  ',
        gender: 'unknown',
        isDeceased: 'yes',
        parents: ['person-2'],
        id: 'provider-controlled-id',
        profession: 'Doctor',
      })).toEqual({
        firstName: 'Ahmad',
        profession: 'Doctor',
      });
    });

    it('limits extracted field lengths and preserves explicit false booleans', () => {
      const extracted = sanitizeExtractedPersonData({
        firstName: 'A'.repeat(200),
        bio: 'B'.repeat(5_000),
        isDeceased: false,
      });

      expect(extracted.firstName).toHaveLength(120);
      expect(extracted.bio).toHaveLength(4_000);
      expect(extracted.isDeceased).toBe(false);
    });

    it('rejects non-object extraction results', () => {
      expect(() => sanitizeExtractedPersonData(['not', 'a', 'person'])).toThrow(
        'AI extraction result must be a JSON object.'
      );
    });
  });

  describe('generateFamilyStory', () => {
    it('generates story and returns raw HTML', async () => {
      vi.mocked(callAIProxy).mockResolvedValue({
        result: '<h3>The Jozor Family</h3><p>Mahmoud was a great patriarch...</p>',
      });

      const story = await generateFamilyStory({ 'person-1': mockPerson }, 'person-1', 'ar');

      expect(story).toBe('<h3>The Jozor Family</h3><p>Mahmoud was a great patriarch...</p>');
      expect(callAIProxy).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'family_story',
          data: expect.objectContaining({
            language: 'ar',
            members: [
              expect.objectContaining({
                personToken: 'P1',
                name: 'Mahmoud Jozor',
              }),
            ],
          }),
        })
      );
      expect(JSON.stringify(vi.mocked(callAIProxy).mock.calls[0][0])).not.toContain('person-1');
    });
  });

  describe('analyzeImage', () => {
    it('submits base64 image data to AI vision proxy', async () => {
      vi.mocked(callAIProxy).mockResolvedValue({
        result: 'The photo depicts a family gathering.',
      });

      const analysis = await analyzeImage('data:image/jpeg;base64,abcdef123456');

      expect(analysis).toBe('The photo depicts a family gathering.');
      expect(callAIProxy).toHaveBeenCalledWith({
        operation: 'analyze_image',
        data: {
          preferredLanguage: 'en',
        },
        image: {
          data: 'abcdef123456',
          mimeType: 'image/jpeg',
        },
      });
    });
  });
});
