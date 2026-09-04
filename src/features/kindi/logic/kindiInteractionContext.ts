import { redactKindiPrompt } from './kindiPrivacy';

let fallbackInteractionIdCounter = 0;

export const getSafeKindiRedactedQuery = (query: string): string | undefined => {
  const redaction = redactKindiPrompt(query);
  return /\[NAME_\d+\]/.test(redaction.redactedText) ? redaction.redactedText : undefined;
};

export const createKindiInteractionId = (): string => {
  const browserCrypto = globalThis.crypto;
  if (browserCrypto?.randomUUID) {
    return browserCrypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (browserCrypto?.getRandomValues) {
    browserCrypto.getRandomValues(bytes);
  } else {
    fallbackInteractionIdCounter += 1;
    const suffix = `${Date.now().toString(16)}${fallbackInteractionIdCounter.toString(16).padStart(4, '0')}`
      .slice(-12)
      .padStart(12, '0');
    return `00000000-0000-4000-8000-${suffix}`;
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
