const historyEntryTokens = new WeakMap<object, string>();
let fallbackTokenSequence = 0;

const createOpaqueHistoryToken = () => {
  const randomId = globalThis.crypto?.randomUUID?.();
  if (randomId) return `kindi-history-${randomId}`;

  fallbackTokenSequence += 1;
  return `kindi-history-session-${fallbackTokenSequence}`;
};

/**
 * Gives an in-memory history snapshot a stable opaque identity without retaining
 * person data in Kindi messages or exposing database identifiers.
 */
export const getKindiUndoHistoryToken = (historyEntry: object | undefined): string | undefined => {
  if (!historyEntry) return undefined;

  const existing = historyEntryTokens.get(historyEntry);
  if (existing) return existing;

  const token = createOpaqueHistoryToken();
  historyEntryTokens.set(historyEntry, token);
  return token;
};
