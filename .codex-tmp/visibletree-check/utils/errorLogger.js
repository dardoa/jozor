import { showError } from './toast';
import { useAppStore } from '../store/useAppStore';
function getMessage(error) {
    if (error instanceof Error)
        return error.message;
    if (typeof error === 'string')
        return error;
    return String(error);
}
function getStack(error) {
    if (error instanceof Error)
        return error.stack;
    return undefined;
}
function inferCategory(error, fallback) {
    if (fallback !== 'UNEXPECTED')
        return fallback;
    const message = getMessage(error).toLowerCase();
    if (message.includes('jwt') || message.includes('token') || message.includes('auth'))
        return 'AUTH';
    if (message.includes('permission') || message.includes('forbidden') || message.includes('access denied') || message.includes('rls'))
        return 'PERMISSION';
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout') || message.includes('offline'))
        return 'NETWORK';
    if (message.includes('sync') || message.includes('version') || message.includes('reconcile'))
        return 'SYNC';
    if (message.includes('constraint') || message.includes('foreign key') || message.includes('duplicate') || message.includes('column'))
        return 'DATABASE';
    if (message.includes('invalid') || message.includes('required') || message.includes('missing'))
        return 'VALIDATION';
    return 'UNEXPECTED';
}
export function getUserFacingErrorInfo(error, fallbackMessage = 'Something went wrong. Please try again.') {
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
function withStoreMetadata(metadata) {
    const merged = { ...metadata };
    try {
        const state = useAppStore.getState();
        merged.uid ?? (merged.uid = state.user?.uid);
        merged.treeId ?? (merged.treeId = state.currentTreeId);
        merged.syncState ?? (merged.syncState = state.syncStatus.state);
        merged.syncPendingCount ?? (merged.syncPendingCount = state.syncStatus.pendingCount);
    }
    catch {
        // Ignore store initialization issues.
    }
    return merged;
}
function emitLog(level, message, payload) {
    if (level === 'INFO') {
        console.warn(message, payload);
        return;
    }
    if (level === 'WARN') {
        console.warn(message, payload);
        return;
    }
    console.error(message, payload);
}
export function logError(context, error, options = {}) {
    const { category = 'UNEXPECTED', severity = 'MEDIUM', showToast = false, toastMessage, metadata = {} } = options;
    const message = getMessage(error);
    const stack = getStack(error);
    const timestamp = new Date().toISOString();
    const resolvedCategory = inferCategory(error, category);
    const enrichedMetadata = withStoreMetadata(metadata);
    const logged = {
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
            showError(toastMessage);
        }
        catch {
            // Toast fallback.
        }
    }
    return logged;
}
export function logWarn(context, message, options = {}) {
    const logged = {
        context,
        message,
        category: options.category ?? 'UNEXPECTED',
        level: 'WARN',
        timestamp: new Date().toISOString(),
        metadata: withStoreMetadata(options.metadata ?? {})
    };
    emitLog('WARN', `[${logged.category}] [${context}] ${message}`, logged);
    return logged;
}
export function logInfo(context, message, metadata = {}) {
    const logged = {
        context,
        message,
        level: 'INFO',
        timestamp: new Date().toISOString(),
        metadata: withStoreMetadata(metadata)
    };
    emitLog('INFO', `[INFO] [${context}] ${message}`, logged);
    return logged;
}
