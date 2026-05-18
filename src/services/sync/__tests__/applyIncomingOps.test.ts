
import { describe, expect, it, vi } from 'vitest';
import { applyIncomingOps } from '../applyIncomingOps';
import type { DeltaOperation } from '../SyncTypes';
import type { Person } from '../../../types';

const root: any = {
    id: 'person-1',
    firstName: 'Root',
    lastName: '',
    gender: 'male',
    parents: [],
    children: [],
    spouses: [],
};

describe('applyIncomingOps', () => {
    it('extracts tree metadata operations without mutating the people map', () => {
        const applyOperationToMap = vi.fn();
        const op: DeltaOperation = {
            tree_id: 'tree-1',
            user_id: 'user-2',
            type: 'SET_TREE_METADATA',
            payload: {
                treeMetadata: {
                    rootId: 'person-1',
                    focusId: 'person-1',
                    name: 'Sovereign Tree',
                },
            },
            version_seq: 8,
        };

        const result = applyIncomingOps({
            people: { 'person-1': root },
            ops: [op],
            deletedPersonIds: new Set(),
            lastSyncedVersion: 7,
            applyOperationToMap,
        });

        expect(applyOperationToMap).not.toHaveBeenCalled();
        expect(result.people).toEqual({ 'person-1': root });
        expect(result.treeMetadata).toEqual({
            rootId: 'person-1',
            focusId: 'person-1',
            name: 'Sovereign Tree',
        });
        expect(result.maxVersion).toBe(8);
    });
});

