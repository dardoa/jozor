import type { DeltaOperation } from './SyncTypes';
import type { Person } from '../../types';

export function applyIncomingOps(params: {
    people: Record<string, Person>;
    ops: DeltaOperation[];
    deletedPersonIds: Set<string>;
    lastSyncedVersion: number;
    applyOperationToMap: (people: Record<string, Person>, op: DeltaOperation) => Record<string, Person> | null;
    onSkipBlacklisted?: (info: { op: DeltaOperation; targetId: string }) => void;
    excludeClientId?: string;
}): {
    people: Record<string, Person>;
    maxVersion: number;
    syncingNodeIdsToRemove: string[];
    deletedPersonIdsToRecord: string[];
    treeMetadata: {
        focusId?: string;
        rootId?: string;
        name?: string;
        settings?: Record<string, unknown>;
    };
} {
    const { ops, deletedPersonIds, applyOperationToMap, onSkipBlacklisted, excludeClientId } = params;

    let people = { ...params.people };
    let maxVersion = params.lastSyncedVersion;
    const syncingNodeIdsToRemove: string[] = [];
    const deletedPersonIdsToRecord: string[] = [];
    const treeMetadata: {
        focusId?: string;
        rootId?: string;
        name?: string;
        settings?: Record<string, unknown>;
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
            Object.assign(treeMetadata, op.payload.treeMetadata ?? {});
        } else {
            const updated = applyOperationToMap(people, op);
            if (updated) people = updated;
            if (op.type === 'DELETE_NODE' && targetId) {
                deletedPersonIdsToRecord.push(targetId);
            }
        }
        if (op.version_seq && op.version_seq > maxVersion) maxVersion = op.version_seq;

        if (targetId) syncingNodeIdsToRemove.push(targetId);
    });

    return { people, maxVersion, syncingNodeIdsToRemove, deletedPersonIdsToRecord, treeMetadata };
}
