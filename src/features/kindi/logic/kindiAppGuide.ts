import { HELP_TOPICS } from '../../help/helpKnowledgeBase';
import type { Language } from '../../../types/common';

export interface KindiGuideTopic {
  id: string;
  helpTopicId: string;
  title: string;
  keywords: readonly string[];
  answer: string;
}

export const getKindiAppGuideTopics = (language: Language): readonly KindiGuideTopic[] =>
  HELP_TOPICS
    .filter((topic) => topic.kindiGuide)
    .map((topic) => {
      const localized = topic.content[language];
      return {
        id: topic.kindiGuideId ?? topic.id,
        helpTopicId: topic.id,
        title: localized.title,
        keywords: [...topic.content.ar.keywords, ...topic.content.en.keywords],
        answer: `${localized.summary} ${localized.steps.join(' ')}`,
      };
    });

/** Arabic remains the default for legacy local callers; runtime callers pass the active language. */
export const KINDI_APP_GUIDE_TOPICS: readonly KindiGuideTopic[] = getKindiAppGuideTopics('ar');
