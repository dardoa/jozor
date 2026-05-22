import { getUserFacingErrorInfo, logError, logInfo } from '../utils/errorLogger';
import { authTokenService } from './authTokenService';

interface MaintenanceUser {
  uid: string;
  email: string;
  supabaseToken?: string;
}

type MaintenanceMode = 'operations' | 'activity';

const getToken = (user: MaintenanceUser): string | undefined =>
  user.supabaseToken || authTokenService.getStoredSupabaseTokenOrUndefined();

const parseMaintenanceError = async (response: Response, fallbackMessage: string): Promise<Error> => {
  try {
    const payload = await response.json() as { error?: { message?: string } | string };
    const message = typeof payload.error === 'string'
      ? payload.error
      : payload.error?.message;
    return new Error(message || fallbackMessage);
  } catch {
    return new Error(fallbackMessage);
  }
};

const runMaintenanceRequest = async (
  treeId: string,
  user: MaintenanceUser,
  mode: MaintenanceMode,
  params: Record<string, number>
): Promise<number> => {
  const token = getToken(user);
  if (!token) {
    throw new Error('Missing authenticated session for maintenance operation.');
  }

  const response = await fetch('/api/maintenance', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      treeId,
      mode,
      ...params,
    }),
  });

  if (!response.ok) {
    throw await parseMaintenanceError(response, 'Maintenance request failed.');
  }

  const payload = await response.json() as { deletedCount?: number | string };
  return typeof payload.deletedCount === 'number'
    ? payload.deletedCount
    : Number(payload.deletedCount ?? 0);
};

export const pruneTreeOperations = async (
  treeId: string,
  user: MaintenanceUser,
  keepLatest = 2000
): Promise<number> => {
  try {
    const deletedCount = await runMaintenanceRequest(treeId, user, 'operations', { keepLatest });
    logInfo('OperationalMaintenance pruneTreeOperations', 'Pruned old tree operations.', {
      treeId,
      keepLatest,
      deletedCount,
    });
    return deletedCount;
  } catch (error) {
    logError('OperationalMaintenance pruneTreeOperations', error, {
      category: 'DATABASE',
      severity: 'MEDIUM',
      showToast: false,
      metadata: { treeId, keepLatest },
    });
    throw new Error(getUserFacingErrorInfo(error, 'Failed to prune old sync operations.').message);
  }
};

export const pruneActivityLogs = async (
  treeId: string,
  user: MaintenanceUser,
  keepDays = 180
): Promise<number> => {
  try {
    const deletedCount = await runMaintenanceRequest(treeId, user, 'activity', { keepDays });
    logInfo('OperationalMaintenance pruneActivityLogs', 'Pruned old activity logs.', {
      treeId,
      keepDays,
      deletedCount,
    });
    return deletedCount;
  } catch (error) {
    logError('OperationalMaintenance pruneActivityLogs', error, {
      category: 'DATABASE',
      severity: 'MEDIUM',
      showToast: false,
      metadata: { treeId, keepDays },
    });
    throw new Error(getUserFacingErrorInfo(error, 'Failed to prune old activity logs.').message);
  }
};
