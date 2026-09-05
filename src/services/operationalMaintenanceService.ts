import { getUserFacingErrorInfo, logError, logInfo } from '../utils/errorLogger';
import { authTokenService } from './authTokenService';

interface MaintenanceUser {
  uid: string;
  email: string;
  supabaseToken?: string;
}

type MaintenanceMode = 'operations' | 'activity';

export interface LegacyPersonMediaMigrationSummary {
  scannedCount: number;
  migratedCount: number;
  cleanedCount: number;
  blockedCount: number;
  externalCount: number;
  failedCount: number;
  complete: boolean;
}

interface LegacyPersonMediaMigrationBatch extends LegacyPersonMediaMigrationSummary {
  nextOffset: number;
}

const PERSON_MEDIA_MIGRATION_BATCH_SIZE = 10;
const PERSON_MEDIA_MIGRATION_MAX_BATCHES = 1000;

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

const isNonNegativeInteger = (value: unknown): value is number =>
  Number.isInteger(value) && Number(value) >= 0;

const parsePersonMediaMigrationBatch = (value: unknown): LegacyPersonMediaMigrationBatch => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Person media migration returned an invalid response.');
  }
  const batch = value as Record<string, unknown>;
  const countKeys = [
    'scannedCount',
    'migratedCount',
    'cleanedCount',
    'blockedCount',
    'externalCount',
    'failedCount',
    'nextOffset',
  ] as const;
  if (
    countKeys.some((key) => !isNonNegativeInteger(batch[key]))
    || typeof batch.complete !== 'boolean'
  ) {
    throw new Error('Person media migration returned an invalid response.');
  }
  return batch as unknown as LegacyPersonMediaMigrationBatch;
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

export const migrateLegacyPersonMedia = async (
  treeId: string,
  user: MaintenanceUser
): Promise<LegacyPersonMediaMigrationSummary> => {
  const token = getToken(user);
  if (!token) {
    throw new Error('Missing authenticated session for maintenance operation.');
  }

  const summary: LegacyPersonMediaMigrationSummary = {
    scannedCount: 0,
    migratedCount: 0,
    cleanedCount: 0,
    blockedCount: 0,
    externalCount: 0,
    failedCount: 0,
    complete: false,
  };
  let offset = 0;

  try {
    for (let batchIndex = 0; batchIndex < PERSON_MEDIA_MIGRATION_MAX_BATCHES; batchIndex += 1) {
      const response = await fetch('/api/person-media-migration', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          treeId,
          offset,
          limit: PERSON_MEDIA_MIGRATION_BATCH_SIZE,
        }),
      });
      if (!response.ok) {
        throw await parseMaintenanceError(response, 'Person media migration failed.');
      }

      const batch = parsePersonMediaMigrationBatch(await response.json());
      summary.scannedCount += batch.scannedCount;
      summary.migratedCount += batch.migratedCount;
      summary.cleanedCount += batch.cleanedCount;
      summary.blockedCount += batch.blockedCount;
      summary.externalCount += batch.externalCount;
      summary.failedCount += batch.failedCount;
      summary.complete = batch.complete;

      if (batch.complete) break;
      if (batch.nextOffset <= offset) {
        throw new Error('Person media migration did not advance its cursor.');
      }
      offset = batch.nextOffset;
    }

    if (!summary.complete) {
      throw new Error('Person media migration reached its safe batch limit. Run it again to continue.');
    }

    logInfo('OperationalMaintenance migrateLegacyPersonMedia', 'Migrated legacy person media.', {
      treeId,
      ...summary,
    });
    return summary;
  } catch (error) {
    logError('OperationalMaintenance migrateLegacyPersonMedia', error, {
      category: 'SYNC',
      severity: 'HIGH',
      showToast: false,
      metadata: { treeId },
    });
    throw new Error(getUserFacingErrorInfo(error, 'Person media migration failed.').message);
  }
};
