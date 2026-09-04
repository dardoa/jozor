export interface BiographyAIRequestData {
  fullName: string;
  gender?: string;
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  parentsCount: number;
  spousesCount: number;
  childrenCount: number;
  relatives: string;
  toneInstruction: string;
  preferredLanguage: string;
}

export interface AncestorChatAIRequestData {
  fullName: string;
  birthPlace?: string;
  birthDate?: string;
  deathPlace?: string;
  deathDate?: string;
  preferredLanguage: string;
  historyText: string;
  newMessage: string;
}

export interface AIProxyImagePayload {
  data: string;
  mimeType: string;
}

export interface KindiPlanAIRequestData {
  redactedText: string;
}

export interface ExtractPersonDataAIRequestData {
  text: string;
}

export interface FamilyStoryMember {
  personToken: string;
  name: string;
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  parents: string[];
  spouses: string[];
  children: string[];
}

export interface FamilyStoryAIRequestData {
  language: 'ar' | 'en';
  members: FamilyStoryMember[];
}

export interface AnalyzeImageAIRequestData {
  preferredLanguage: 'ar' | 'en';
}

export type AIProxyRequest =
  | { operation: 'biography'; data: BiographyAIRequestData }
  | { operation: 'ancestor_chat'; data: AncestorChatAIRequestData }
  | { operation: 'extract_person_data'; data: ExtractPersonDataAIRequestData }
  | { operation: 'family_story'; data: FamilyStoryAIRequestData }
  | { operation: 'analyze_image'; data: AnalyzeImageAIRequestData; image: AIProxyImagePayload }
  | { operation: 'kindi_plan'; data: KindiPlanAIRequestData };

export interface AIProxyResponse {
  result: string;
  model?: string;
  usage?: {
    used: number;
    limit: number;
    resetAt: string;
  };
}
