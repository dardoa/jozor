import type { Person } from '../../types';
import type { ParsedIntent } from '../../services/search/queryParser';
import type { RelativeType } from '../../commands/AddRelativeCommand';

export type KindiIntentKind = 'QUERY' | 'SUPPORT' | 'ACTION' | 'UPDATE' | 'DELETE';

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
  kind: Exclude<KindiIntentKind, 'QUERY' | 'SUPPORT'>;
  status?: 'pending' | 'processing' | 'confirmed' | 'failed' | 'cancelled';
  error?: string;
  relatedPeople?: Person[];
  plan?: KindiExecutivePlan;
}

export interface KindiMessage {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  people?: Person[];
  visiblePeopleCount?: number;
  confirmation?: KindiConfirmation;
  disambiguation?: KindiDisambiguation;
}
