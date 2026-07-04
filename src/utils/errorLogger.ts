import { showToast as toastApi } from './showToast';
import { useAppStore } from '../store/useAppStore';

export type ErrorCategory =
  | 'AUTH'
  | 'NETWORK'
  | 'SYNC'
  | 'VALIDATION'
  | 'DATABASE'
  | 'PERMISSION'
  | 'BILLING'
  | 'RENDER'
  | 'UNEXPECTED';
export type ErrorSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface LoggedError {
  message: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  context: string;
  level: LogLevel;
  stack?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface UserFacingErrorInfo {
  category: ErrorCategory;
  message: string;
  retryable: boolean;
}

function getStringProperty(value: object, key: string): string | undefined {
  const property = (value as Record<string, unknown>)[key];
  return typeof property === 'string' ? property : undefined;
}

function getMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    // Check for common error properties in Supabase/Fetch responses
    const message = getStringProperty(error, 'message');
    if (message) return message;
    const errorDescription = getStringProperty(error, 'error_description');
    if (errorDescription) return errorDescription;
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error);
}

function getStack(error: unknown): string | undefined {
  if (error instanceof Error) return error.stack;
  return undefined;
}

function inferCategory(error: unknown, fallback: ErrorCategory): ErrorCategory {
  if (fallback !== 'UNEXPECTED') return fallback;

  const message = getMessage(error).toLowerCase();

  if (message.includes('limit_exceeded_free') || message.includes('billing') || message.includes('quota exceeded') || message.includes('limit reached')) return 'BILLING';
  if (message.includes('jwt') || message.includes('token') || message.includes('auth')) return 'AUTH';
  if (message.includes('permission') || message.includes('forbidden') || message.includes('access denied') || message.includes('rls')) return 'PERMISSION';
  if (message.includes('network') || message.includes('fetch') || message.includes('timeout') || message.includes('offline')) return 'NETWORK';
  if (message.includes('sync') || message.includes('version') || message.includes('reconcile')) return 'SYNC';
  if (message.includes('constraint') || message.includes('foreign key') || message.includes('duplicate') || message.includes('column')) return 'DATABASE';
  if (message.includes('invalid') || message.includes('required') || message.includes('missing')) return 'VALIDATION';

  return 'UNEXPECTED';
}

export function getUserFacingErrorInfo(
  error: unknown,
  fallbackMessage = 'Something went wrong. Please try again.'
): UserFacingErrorInfo {
  const category = inferCategory(error, 'UNEXPECTED');

  switch (category) {
    case 'AUTH':
      return {
        category,
        message: 'Your session has expired. Please sign in again.',
        retryable: false,
      };
    case 'PERMISSION':
      return {
        category,
        message: 'You do not have permission to make this change.',
        retryable: false,
      };
    case 'BILLING':
      return {
        category,
        message: 'Plan limit reached. Please upgrade your subscription to continue.',
        retryable: false,
      };
    case 'NETWORK':
      return {
        category,
        message: 'Network problem detected. Your changes can be retried when the connection is stable.',
        retryable: true,
      };
    case 'SYNC':
      return {
        category,
        message: 'Sync is temporarily unavailable. We will retry automatically.',
        retryable: true,
      };
    case 'DATABASE':
      return {
        category,
        message: 'The server could not save this change right now. Please try again.',
        retryable: true,
      };
    case 'VALIDATION':
      return {
        category,
        message: 'Some data is incomplete or invalid. Please review the latest change.',
        retryable: false,
      };
    case 'RENDER':
      return {
        category,
        message: 'The view could not be rendered correctly. Try reloading the page.',
        retryable: true,
      };
    default:
      return {
        category,
        message: fallbackMessage,
        retryable: true,
      };
  }
}

function withStoreMetadata(metadata: Record<string, unknown>) {
  const merged = { ...metadata };

  try {
    const state = useAppStore.getState();
    merged.uid ??= state.user?.uid;
    merged.treeId ??= state.currentTreeId;
    merged.syncState ??= state.syncStatus.state;
    merged.syncPendingCount ??= state.syncStatus.pendingCount;
  } catch {
    // Ignore store initialization issues.
  }

  return merged;
}

function emitLog(level: LogLevel, message: string, payload: unknown) {
  if (level === 'INFO') {
    const shouldEmitInfo =
      import.meta.env.DEV || import.meta.env.VITE_ENABLE_CLIENT_INFO_LOGS === 'true';
    if (!shouldEmitInfo) return;

    console.info(message, payload);
    return;
  }

  if (level === 'WARN') {
    console.warn(message, payload);
    return;
  }

  console.error(message, payload);
}

export function logError(
  context: string,
  error: unknown,
  options: {
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    showToast?: boolean;
    toastMessage?: string;
    metadata?: Record<string, unknown>;
  } = {}
): LoggedError {
  const {
    category = 'UNEXPECTED',
    severity = 'MEDIUM',
    showToast = false,
    toastMessage,
    metadata = {}
  } = options;

  const message = getMessage(error);
  const stack = getStack(error);
  const timestamp = new Date().toISOString();
  const resolvedCategory = inferCategory(error, category);
  const enrichedMetadata = withStoreMetadata(metadata);

  const logged: LoggedError = {
    message,
    category: resolvedCategory,
    severity,
    context,
    level: 'ERROR',
    stack,
    timestamp,
    metadata: enrichedMetadata
  };

  const severityLabel = severity === 'CRITICAL' ? '[CRITICAL]' : severity === 'HIGH' ? '[HIGH]' : '[WARN]';
  emitLog('ERROR', `${severityLabel} [${resolvedCategory}] [${context}] ${message}`, logged);

  if (showToast && toastMessage) {
    try {
      toastApi.error(toastMessage);
    } catch {
      // Toast fallback.
    }
  }

  return logged;
}

export function logWarn(
  context: string,
  message: string,
  options: {
    category?: ErrorCategory;
    metadata?: Record<string, unknown>;
  } = {}
) {
  const logged = {
    context,
    message,
    category: options.category ?? 'UNEXPECTED',
    level: 'WARN' as const,
    timestamp: new Date().toISOString(),
    metadata: withStoreMetadata(options.metadata ?? {})
  };

  emitLog('WARN', `[${logged.category}] [${context}] ${message}`, logged);
  return logged;
}

export function logInfo(
  context: string,
  message: string,
  metadata: Record<string, unknown> = {}
) {
  const logged = {
    context,
    message,
    level: 'INFO' as const,
    timestamp: new Date().toISOString(),
    metadata: withStoreMetadata(metadata)
  };

  emitLog('INFO', `[INFO] [${context}] ${message}`, logged);
  return logged;
}
