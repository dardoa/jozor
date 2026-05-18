import type { Person } from '../../types';
import type { ParsedIntent } from '../../services/search/queryParser';
import type { RelativeType } from '../../commands/AddRelativeCommand';

export type KindiIntentKind = 'QUERY' | 'UNKNOWN' | 'GREETING' | 'SUPPORT' | 'ACTION' | 'UPDATE' | 'DELETE';

export interface KindiPersonResult {
  person: Person;
  matchLevel: 'strong' | 'medium';
  score: number;
}

export interface KindiAddPlan {
  type: 'ADD';
  relation: RelativeType;
  gender: 'male' | 'female';
  targetPersonId?: string;
  targetPersonName?: string;
  name?: {
    firstName?: string;
    lastName?: string;
  };
  initialUpdates?: Partial<Person>;
}

export interface KindiUpdatePlan {
  type: 'UPDATE';
  personId: string;
  updates: Partial<Person>;
}

export interface KindiDeletePlan {
  type: 'DELETE';
  personId: string;
}

export type KindiExecutivePlan = KindiAddPlan | KindiUpdatePlan | KindiDeletePlan;

export type KindiAIPlanIntent = 'ADD' | 'UPDATE' | 'DELETE' | 'QUERY' | 'UNKNOWN';
export type KindiAIClassificationCategory =
  | 'EXECUTABLE_COMMAND'
  | 'FAMILY_QUERY'
  | 'SUPPORT'
  | 'GREETING'
  | 'IRRELEVANT'
  | 'UNCLEAR';
export type KindiAIPlanRelation =
  | RelativeType
  | 'son'
  | 'daughter'
  | 'wife'
  | 'husband'
  | 'father'
  | 'mother';
export type KindiAIPlanGender = 'male' | 'female' | 'M' | 'F';

/**
 * Raw AI planning output before local validation and target resolution.
 * This type intentionally carries mentions only; AI output must never provide
 * person IDs or bypass Kindi's local confirmation pipeline.
 */
export interface KindiAIPlanDraft {
  intent: KindiAIPlanIntent;
  relation?: KindiAIPlanRelation;
  gender?: KindiAIPlanGender;
  targetMention?: string;
  newPersonName?: string;
  updates?: Partial<Person>;
  missingFields?: string[];
  confidence: number;
}

export interface KindiAIClassification {
  category: KindiAIClassificationCategory;
  draft?: KindiAIPlanDraft;
  clarifyingQuestion?: string;
  confidence: number;
}

export interface KindiLearningTrace {
  redactedQuery: string;
  aiDraft: KindiAIPlanDraft;
  confidence: number;
  localLexiconVersion: string;
}

export interface KindiRoutedIntent {
  kind: KindiIntentKind;
  query: string;
  parsedIntents: ParsedIntent[];
  targetText: string;
  summary: string;
}

export interface KindiDisambiguation {
  promptName: string;
  routedIntent: KindiRoutedIntent;
  resultPeople: Person[];
  fallbackFocusId?: string;
  status?: 'pending' | 'resolved' | 'cancelled';
}

export interface KindiConfirmation {
  id: string;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  kind: Exclude<KindiIntentKind, 'QUERY' | 'GREETING' | 'SUPPORT'>;
  status?: 'pending' | 'processing' | 'confirmed' | 'failed' | 'cancelled';
  error?: string;
  relatedPeople?: Person[];
  plan?: KindiExecutivePlan;
  learningTrace?: KindiLearningTrace;
}

export interface KindiMessage {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  people?: Person[];
  peopleResults?: KindiPersonResult[];
  visiblePeopleCount?: number;
  confirmation?: KindiConfirmation;
  disambiguation?: KindiDisambiguation;
}

export interface KindiParsedCommand {
  relation?: KindiAddPlan['relation'];
  gender?: KindiAddPlan['gender'];
  newPersonName?: KindiAddPlan['name'];
  targetMention?: string;
  initialUpdates?: Partial<Person>;
}
