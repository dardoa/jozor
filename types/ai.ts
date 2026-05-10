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

export type AIProxyRequest =
  | { operation: 'biography'; data: BiographyAIRequestData }
  | { operation: 'ancestor_chat'; data: AncestorChatAIRequestData }
  | { operation: 'extract_person_data'; prompt: string }
  | { operation: 'family_story'; prompt: string }
  | { operation: 'analyze_image'; prompt: string; image: AIProxyImagePayload };

export interface AIProxyResponse {
  result: string;
  model?: string;
}
