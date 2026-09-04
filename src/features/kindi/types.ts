import type { Person } from '../../types/person';
import type {
  SmartPersonaFieldId,
  SmartPersonaSectionId,
  SmartPersonaTabId,
} from '../../types/common';
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
  interactionId?: string;
  promptName: string;
  routedIntent: KindiRoutedIntent;
  resultPeople: Person[];
  fallbackFocusId?: string;
  status?: 'pending' | 'resolved' | 'cancelled';
}

export interface KindiConfirmation {
  id: string;
  interactionId?: string;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  kind: Extract<KindiIntentKind, 'ACTION' | 'UPDATE' | 'DELETE'>;
  status?: 'pending' | 'processing' | 'confirmed' | 'failed' | 'cancelled';
  error?: string;
  relatedPeople?: Person[];
  plan?: KindiExecutivePlan;
  learningTrace?: KindiLearningTrace;
}

export interface KindiUndoAction {
  status: 'available' | 'undone' | 'expired' | 'failed';
  peopleVersion: number;
  historyEntryToken: string;
  pastCount: number;
  futureCount: number;
}

export type KindiAnswerSource = 'local-tree' | 'help-center' | 'cloud-assisted';
export type KindiAnswerKind = 'relationship' | 'diagnostic' | 'biography' | 'record-review' | 'search' | 'guide' | 'change';
export type KindiAnswerFeedback = 'helpful' | 'not-helpful';

export interface KindiAnswerMeta {
  source: KindiAnswerSource;
  kind: KindiAnswerKind;
  interactionId?: string;
  topicId?: string;
  feedbackEnabled?: boolean;
  feedback?: KindiAnswerFeedback;
}

export interface KindiDiagnosticSummary {
  scope: 'tree' | 'person';
  healthScore: number;
  completenessScore: number;
  citationCoverage: number | null;
  errorCount: number;
  warningCount: number;
  reviewNoteCount: number;
}

export type KindiDiagnosticSuggestionKey =
  | 'relationship-structure'
  | 'relationship-reciprocity'
  | 'timeline'
  | 'possible-duplicate'
  | 'birth-date'
  | 'death-date'
  | 'residence'
  | 'occupation'
  | 'parents'
  | 'birth-source'
  | 'death-source'
  | 'profile-source';

export type KindiDiagnosticTargetTab = Extract<SmartPersonaTabId, 'about' | 'links'>;
export type KindiDiagnosticTargetSection = Extract<
  SmartPersonaSectionId,
  'overview' | 'workBio' | 'relationships'
>;
export type KindiDiagnosticTargetField = SmartPersonaFieldId;

export interface KindiDiagnosticSuggestion {
  key: KindiDiagnosticSuggestionKey;
  text: string;
  targetPersonId: string;
  targetTab: KindiDiagnosticTargetTab;
  targetSection: KindiDiagnosticTargetSection;
  targetField?: KindiDiagnosticTargetField;
}

export interface KindiPersonContextSummary {
  personId: string;
  summary: string;
}

export type KindiDiagnosticPersonContext = KindiPersonContextSummary;

export interface KindiBiographyFact {
  label: string;
  value: string;
}

export interface KindiBiographyDraft {
  facts: KindiBiographyFact[];
  text: string;
  isSaved: false;
}

export type KindiRecordSectionId = 'facts' | 'notes' | 'sources';

export interface KindiRecordItem {
  label: string;
  value: string;
}

export interface KindiRecordSection {
  id: KindiRecordSectionId;
  title: string;
  items: KindiRecordItem[];
}

export interface KindiRecordReview {
  sections: KindiRecordSection[];
  sourceSummary: {
    recordedCount: number;
    displayedCount: number;
    hasBirthSource: boolean;
    hasDeathSource: boolean;
  };
  reviewNotes: string[];
  isSaved: false;
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
  helpTopicId?: string;
  undoAction?: KindiUndoAction;
  answerMeta?: KindiAnswerMeta;
  diagnosticSummary?: KindiDiagnosticSummary;
  diagnosticPersonContexts?: KindiDiagnosticPersonContext[];
  diagnosticSuggestions?: KindiDiagnosticSuggestion[];
  biographyDraft?: KindiBiographyDraft;
  recordReview?: KindiRecordReview;
  recordReviewTargetPersonId?: string;
  personContexts?: KindiPersonContextSummary[];
}

export interface KindiParsedCommand {
  relation?: KindiAddPlan['relation'];
  gender?: KindiAddPlan['gender'];
  newPersonName?: KindiAddPlan['name'];
  targetMention?: string;
  initialUpdates?: Partial<Person>;
}
