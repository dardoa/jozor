import { getSupabaseWithAuth } from './supabaseClient';
import { getUserFacingErrorInfo, logError, logInfo } from '../utils/errorLogger';
import { authTokenService } from './authTokenService';

const getClient = (uid: string, email: string, token?: string) =>
  getSupabaseWithAuth(uid, email, token || authTokenService.getStoredSupabaseTokenOrUndefined());

interface MaintenanceUser {
  uid: string;
  email: string;
  supabaseToken?: string;
}

export const pruneTreeOperations = async (
  treeId: string,
  user: MaintenanceUser,
  keepLatest = 2000
): Promise<number> => {
  try {
    const client = getClient(user.uid, user.email, user.supabaseToken);
    const { data, error } = await client.rpc('prune_tree_operations', {
      p_tree_id: treeId,
      p_keep_latest: keepLatest,
    });

    if (error) throw error;

    const deletedCount = typeof data === 'number' ? data : Number(data ?? 0);
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
    const client = getClient(user.uid, user.email, user.supabaseToken);
    const { data, error } = await client.rpc('prune_activity_logs', {
      p_tree_id: treeId,
      p_keep_days: keepDays,
    });

    if (error) throw error;

    const deletedCount = typeof data === 'number' ? data : Number(data ?? 0);
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
