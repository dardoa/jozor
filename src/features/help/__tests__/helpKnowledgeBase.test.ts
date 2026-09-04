import { describe, expect, it } from 'vitest';

import {
  HELP_CATEGORIES,
  HELP_TOPICS,
  getHelpTopic,
  getLocalizedHelpTopics,
  isHelpActionId,
  searchHelpTopics,
} from '../helpKnowledgeBase';
import { getKindiAppGuideTopics } from '../../kindi/logic/kindiAppGuide';

describe('helpKnowledgeBase', () => {
  it('provides a complete bilingual and uniquely identified knowledge base', () => {
    expect(HELP_CATEGORIES).toHaveLength(7);
    expect(HELP_TOPICS.length).toBeGreaterThanOrEqual(20);
    expect(new Set(HELP_TOPICS.map((topic) => topic.id)).size).toBe(HELP_TOPICS.length);

    for (const language of ['ar', 'en'] as const) {
      const topics = getLocalizedHelpTopics(language);
      expect(topics).toHaveLength(HELP_TOPICS.length);
      topics.forEach((topic) => {
        expect(topic.title.trim()).not.toBe('');
        expect(topic.summary.trim()).not.toBe('');
        expect(topic.steps.length).toBeGreaterThanOrEqual(3);
        expect(HELP_CATEGORIES.some((category) => category.id === topic.categoryId)).toBe(true);
        if (topic.actionId) expect(isHelpActionId(topic.actionId)).toBe(true);
      });
    }
  });

  it('searches localized titles, summaries, steps, and keywords', () => {
    expect(searchHelpTopics('بوستر', 'ar').map((topic) => topic.id)).toContain('visual-posters');
    expect(searchHelpTopics('permissions', 'en').map((topic) => topic.id)).toContain('roles-and-permissions');
    expect(searchHelpTopics('مزامنة', 'ar', 'troubleshooting').map((topic) => topic.id)).toContain('sync-and-recovery');
    expect(searchHelpTopics('جودة البيانات', 'ar').map((topic) => topic.id)).toContain('kindi-data-quality');
    expect(searchHelpTopics('data completeness', 'en').map((topic) => topic.id)).toContain('kindi-data-quality');
    expect(searchHelpTopics('مسودة سيرة', 'ar').map((topic) => topic.id)).toContain('kindi-biography-draft');
    expect(searchHelpTopics('biography draft', 'en').map((topic) => topic.id)).toContain('kindi-biography-draft');
    expect(searchHelpTopics('تنظيم المصادر', 'ar').map((topic) => topic.id)).toContain('kindi-record-review');
    expect(searchHelpTopics('notes and sources', 'en').map((topic) => topic.id)).toContain('kindi-record-review');
  });

  it('documents Kindi data checks in the shared Help Center source', () => {
    const topic = getHelpTopic('kindi-data-quality', 'ar');
    const guide = getKindiAppGuideTopics('en').find((item) => item.helpTopicId === topic?.id);

    expect(topic?.actionId).toBe('kindi');
    expect(topic?.steps).toHaveLength(3);
    expect(guide?.answer).toContain('checks the tree locally');
  });

  it('keeps Kindi guide answers linked to the same source topic', () => {
    const arabicGuide = getKindiAppGuideTopics('ar');
    const capability = arabicGuide.find((topic) => topic.id === 'kindi-capabilities');
    const helpTopic = getHelpTopic('kindi-capabilities', 'ar');

    expect(capability?.helpTopicId).toBe(helpTopic?.id);
    expect(capability?.title).toBe(helpTopic?.title);
    expect(capability?.answer).toContain(helpTopic?.summary);
  });
});
