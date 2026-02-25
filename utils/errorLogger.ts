/**
 * Unified error logging: captures message and stack, optionally shows toast.
 * Use in services where React hooks (e.g. useToast) are not available.
 */

import { showError } from './toast';
import { useAppStore } from '../store/useAppStore';

export interface LoggedError {
  message: string;
  stack?: string;
  name?: string;
}

function getMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return String(e);
}

function getStack(e: unknown): string | undefined {
  if (e instanceof Error) return e.stack;
  return undefined;
}

/**
 * Logs error to console with message and stack, then optionally shows a user-facing toast.
 */
export function logError(
  context: string,
  error: unknown,
  options?: { showToast?: boolean; toastMessage?: string }
): LoggedError {
  const message = getMessage(error);
  const stack = getStack(error);
  const logged: LoggedError = { message, stack, name: error instanceof Error ? error.name : undefined };

  // Attempt to grab telemetry context
  let contextTags = '';
  try {
    const state = useAppStore.getState();
    const uid = state.user?.uid;
    const treeId = state.currentTreeId;
    if (uid) contextTags += `| UID: ${uid} `;
    if (treeId) contextTags += `| Tree: ${treeId} `;
  } catch (e) {
    // Ignore store initialization errors (e.g., if logger is called before store mounts)
  }

  if (typeof console !== 'undefined' && console.error) {
    console.error(`[${context}]${contextTags}`, message, stack != null ? `\n${stack}` : '');
  }

  if (options?.showToast !== false && options?.toastMessage !== undefined) {
    try {
      showError(options.toastMessage);
    } catch {
      // Toast may not be available in some environments
    }
  }

  return logged;
}
