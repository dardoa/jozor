import { cleanNameText } from './nameParser';
import { DELETE_VERBS } from '../kindiCommandLexicon';

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const parseDeleteCommand = (query: string): { targetMention?: string } => {
  const stripped = query
    .replace(new RegExp(`^(?:${DELETE_VERBS.map(escapeRegExp).join('|')})\\s+`, 'iu'), ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    targetMention: cleanNameText(stripped) || undefined,
  };
};

export const extractDeleteTargetText = (query: string): string | undefined => {
  return parseDeleteCommand(query).targetMention;
};
