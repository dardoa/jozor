import type { KindiAnswerKind, KindiAnswerSource, KindiIntentKind } from '../types';
import {
  KINDI_LEARNING_FAILURE_REASONS,
  type KindiParserStage,
} from './kindiLearningTaxonomy';

export const KINDI_LEARNING_EVENT_TYPES = [
  'query_submitted',
  'search_success',
  'search_failure',
  'ai_fallback_requested',
  'ai_fallback_result',
  'confirmation_shown',
  'confirmation_confirmed',
  'confirmation_cancelled',
  'confirmation_failed',
  'disambiguation_shown',
  'disambiguation_resolved',
  'disambiguation_cancelled',
  'support_local_answered',
  'support_unanswered',
  'answer_feedback_helpful',
  'answer_feedback_unhelpful',
] as const;

export type KindiLearningEventType = typeof KINDI_LEARNING_EVENT_TYPES[number];

export const KINDI_LEARNING_ROUTE_KINDS = [
  'QUERY',
  'UNKNOWN',
  'GREETING',
  'SUPPORT',
  'ACTION',
  'UPDATE',
  'DELETE',
] as const satisfies readonly KindiIntentKind[];

export const KINDI_LEARNING_RESULT_KINDS = [
  'disabled',
  'no_draft',
  'invalid_draft',
  'low_confidence',
  'planned',
  'failed',
  'classified',
  'paywall_intercepted',
  'cloud_failure_intercepted',
  'not_found',
  'nearby',
  'reliable',
  'unknown_with_intent_signal',
  'no_plan',
  'ambiguous',
  'needs_add_name',
  'confirmation',
  'ADD',
  'UPDATE',
  'DELETE',
  'ACTION',
  'ai_success',
  'local_success',
  'relationship',
  'diagnostic',
  'biography',
  'record-review',
  'search',
  'guide',
  'change',
  ...Object.values(KINDI_LEARNING_FAILURE_REASONS),
] as const;

export type KindiLearningResultKind = typeof KINDI_LEARNING_RESULT_KINDS[number];

export const KINDI_LEARNING_AI_CATEGORIES = [
  'EXECUTABLE_COMMAND',
  'FAMILY_QUERY',
  'SUPPORT',
  'GREETING',
  'IRRELEVANT',
  'UNCLEAR',
] as const;

export type KindiLearningAICategory = typeof KINDI_LEARNING_AI_CATEGORIES[number];

export const KINDI_LEARNING_INTENT_GUESSES = [
  ...KINDI_LEARNING_ROUTE_KINDS,
  'ADD',
  'EXECUTABLE_COMMAND',
  'FAMILY_QUERY',
  'IRRELEVANT',
  'UNCLEAR',
] as const;

export type KindiLearningIntentGuess = typeof KINDI_LEARNING_INTENT_GUESSES[number];

export const KINDI_LEARNING_PARSER_STAGES = [
  'intent_router',
  'local_search',
  'command_planner',
  'ai_fallback',
  'confirmation',
  'disambiguation',
  'support_guide',
  'execution',
] as const satisfies readonly KindiParserStage[];

export const KINDI_LEARNING_PARSER_NAMES = [
  'intentRouter',
  'searchService',
  'guideMatcher',
  'kindiHelpKnowledgeService',
  'kindiAIPlanningFlow',
  'kindiAIService',
  'kindiCommandPlanningFlow',
  'kindiTargetResolver',
  'KindiOverlay',
  'useKindiExecutionFlow',
  'kindiTreeDiagnosticsEngine',
  'kindiBiographyDraftEngine',
  'kindiRecordReviewEngine',
  'kindiSearchFlow',
  'kindiLocalQueryEngine',
] as const;

export type KindiLearningParserName = typeof KINDI_LEARNING_PARSER_NAMES[number];

export const KINDI_LEARNING_ANSWER_SOURCES = [
  'local-tree',
  'help-center',
  'cloud-assisted',
] as const satisfies readonly KindiAnswerSource[];

export const KINDI_LEARNING_ANSWER_KINDS = [
  'relationship',
  'diagnostic',
  'biography',
  'record-review',
  'search',
  'guide',
  'change',
] as const satisfies readonly KindiAnswerKind[];

export const KINDI_LEARNING_PLAN_TYPES = ['ADD', 'UPDATE', 'DELETE'] as const;
