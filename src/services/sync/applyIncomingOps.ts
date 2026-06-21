import type { DeltaOperation } from './SyncTypes';
import type { Person, TreeSettings } from '../../types';

const shouldOverwriteProperty = (
  currentTimestamp: string | undefined,
  currentClientId: string | undefined,
  currentClientVersion: number | undefined,
  incomingTimestamp: string | undefined,
  incomingClientId: string | undefined,
  incomingClientVersion: number | undefined
): boolean => {
  if (!incomingTimestamp) return true;
  if (!currentTimestamp) return true;

  if (incomingTimestamp > currentTimestamp) return true;
  if (incomingTimestamp < currentTimestamp) return false;

  const inClient = incomingClientId || '';
  const curClient = currentClientId || '';
  if (inClient > curClient) return true;
  if (inClient < curClient) return false;

  const inVer = incomingClientVersion || 0;
  const curVer = currentClientVersion || 0;
  return inVer > curVer;
};

export function applyIncomingOps(params: {
    people: Record<string, Person>;
    ops: DeltaOperation[];
    deletedPersonIds: Set<string>;
    lastSyncedVersion: number;
    applyOperationToMap: (people: Record<string, Person>, op: DeltaOperation) => Record<string, Person> | null;
    onSkipBlacklisted?: (info: { op: DeltaOperation; targetId: string }) => void;
    excludeClientId?: string;
    currentTreeSettings: TreeSettings;
}): {
    people: Record<string, Person>;
    maxVersion: number;
    syncingNodeIdsToRemove: string[];
    deletedPersonIdsToRecord: string[];
    treeMetadata: {
        focusId?: string;
        rootId?: string;
        name?: string;
        settings?: TreeSettings;
    };
    peopleChanged: boolean;
} {
    const { ops, deletedPersonIds, applyOperationToMap, onSkipBlacklisted, excludeClientId } = params;

    let people = params.people;
    let peopleChanged = false;
    let maxVersion = params.lastSyncedVersion;
    const syncingNodeIdsToRemove: string[] = [];
    const deletedPersonIdsToRecord: string[] = [];
    let treeSettingsAccumulator = { ...params.currentTreeSettings };
    const treeMetadata: {
        focusId?: string;
        rootId?: string;
        name?: string;
        settings?: TreeSettings;
    } = {};

    ops.forEach((op) => {
        // Skip operations originating from this client instance to prevent redundant updates
        if (excludeClientId && op.payload?.client_id === excludeClientId) {
            if (op.version_seq && op.version_seq > maxVersion) maxVersion = op.version_seq;
            return;
        }

        const targetId =
            (op.payload?.id as string | undefined) ||
            (op.payload?.person?.id as string | undefined) ||
            (op.payload?.existingId as string | undefined) ||
            (op.payload?.targetId as string | undefined) ||
            (op.payload?.treeMetadata?.focusId as string | undefined) ||
            (op.payload?.treeMetadata?.rootId as string | undefined);

        if (deletedPersonIds.size > 0) {
            if (targetId && deletedPersonIds.has(targetId) && op.type !== 'DELETE_NODE') {
                onSkipBlacklisted?.({ op, targetId });
                if (op.version_seq && op.version_seq > maxVersion) maxVersion = op.version_seq;
                syncingNodeIdsToRemove.push(targetId);
                return;
            }
        }

        if (op.type === 'SET_TREE_METADATA') {
            const updates = op.payload.treeMetadata;
            if (updates) {
                const incomingTimestamp = op.created_at;
                const incomingClientId = op.payload.client_id;
                const incomingClientVersion = op.payload.client_version;

                const nextSettings = { ...treeSettingsAccumulator };
                nextSettings.sync_metadata = {
                    lastUpdated: { ...(nextSettings.sync_metadata?.lastUpdated || {}) },
                    lastUpdatedOps: { ...(nextSettings.sync_metadata?.lastUpdatedOps || {}) },
                };

                const checkLww = (key: string): boolean => {
                    const currentTs = nextSettings.sync_metadata?.lastUpdated?.[key];
                    const currentOp = nextSettings.sync_metadata?.lastUpdatedOps?.[key];
                    return shouldOverwriteProperty(
                        currentTs,
                        currentOp?.client_id,
                        currentOp?.client_version,
                        incomingTimestamp,
                        incomingClientId,
                        incomingClientVersion
                    );
                };

                const updateMetadataKey = (key: string) => {
                    if (incomingTimestamp) {
                        nextSettings.sync_metadata!.lastUpdated![key] = incomingTimestamp;
                        nextSettings.sync_metadata!.lastUpdatedOps![key] = {
                            client_id: incomingClientId || '',
                            client_version: incomingClientVersion || 0,
                        };
                    }
                };

                if ('name' in updates && updates.name !== undefined) {
                    if (checkLww('name')) {
                        treeMetadata.name = updates.name;
                        updateMetadataKey('name');
                    }
                }

                if ('focusId' in updates && updates.focusId !== undefined) {
                    if (checkLww('focusId')) {
                        treeMetadata.focusId = updates.focusId;
                        updateMetadataKey('focusId');
                    }
                }

                if ('rootId' in updates && updates.rootId !== undefined) {
                    if (checkLww('rootId')) {
                        treeMetadata.rootId = updates.rootId;
                        updateMetadataKey('rootId');
                    }
                }

                if (updates.settings && typeof updates.settings === 'object') {
                    const incomingSettings = updates.settings as Record<string, unknown>;
                    let settingsUpdated = false;

                    Object.entries(incomingSettings).forEach(([k, val]) => {
                        if (k === 'sync_metadata') return;

                        if (checkLww(k)) {
                            const mutableSettings = nextSettings as unknown as Record<string, unknown>;
                            mutableSettings[k] = val;
                            updateMetadataKey(k);
                            settingsUpdated = true;
                        }
                    });

                    if (settingsUpdated) {
                        treeMetadata.settings = { ...nextSettings };
                        treeSettingsAccumulator = nextSettings;
                    }
                } else if (
                    incomingTimestamp &&
                    (
                        treeMetadata.name !== undefined ||
                        treeMetadata.focusId !== undefined ||
                        treeMetadata.rootId !== undefined
                    )
                ) {
                    treeMetadata.settings = { ...nextSettings };
                    treeSettingsAccumulator = nextSettings;
                }
            }
        } else {
            const updated = applyOperationToMap(people, op);
            if (updated) {
                people = updated;
                peopleChanged = true;
            }
            if (op.type === 'DELETE_NODE' && targetId) {
                deletedPersonIdsToRecord.push(targetId);
            }
        }
        if (op.version_seq && op.version_seq > maxVersion) maxVersion = op.version_seq;

        if (targetId) syncingNodeIdsToRemove.push(targetId);
    });

    return { people, maxVersion, syncingNodeIdsToRemove, deletedPersonIdsToRecord, treeMetadata, peopleChanged };
}
