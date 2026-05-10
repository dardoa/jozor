const LAST_ACTIVE_TREE_ID_KEY = 'lastActiveTreeId';
const TREE_RESTORE_START_MARK = 'jozor-tree-restore-start';
const SESSION_START_MARK = 'jozor-session-start';
const AUTH_TO_TREE_LOADED_MEASURE = 'Auth to Tree Loaded';

const hasBrowserStorage = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

export const getLastActiveTreeId = (): string | null => {
  if (!hasBrowserStorage()) return null;
  return localStorage.getItem(LAST_ACTIVE_TREE_ID_KEY);
};

export const setLastActiveTreeId = (treeId: string): void => {
  if (!hasBrowserStorage()) return;
  localStorage.setItem(LAST_ACTIVE_TREE_ID_KEY, treeId);
};

export const clearLastActiveTreeId = (): void => {
  if (!hasBrowserStorage()) return;
  localStorage.removeItem(LAST_ACTIVE_TREE_ID_KEY);
};

export const markTreeRestoreStart = (): void => {
  try {
    performance.mark(TREE_RESTORE_START_MARK);
  } catch {
    // Ignore performance API errors in tests or older browser contexts.
  }
};

export const measureAuthToTreeLoaded = (): void => {
  try {
    performance.measure(AUTH_TO_TREE_LOADED_MEASURE, SESSION_START_MARK, TREE_RESTORE_START_MARK);
  } catch {
    // Ignore measurement errors when marks are missing.
  }
};

