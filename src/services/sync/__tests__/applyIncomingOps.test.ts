
import { describe, expect, it, vi } from 'vitest';
import { applyIncomingOps } from '../applyIncomingOps';
import type { DeltaOperation } from '../SyncTypes';
import { DEFAULT_TREE_SETTINGS } from '../../../constants';
import type { Person } from '../../../types';


const root: Person = {
    id: 'person-1',
    title: '',
    firstName: 'Root',
    middleName: '',
    lastName: '',
    birthName: '',
    nickName: '',
    suffix: '',
    gender: 'male',
    birthDate: '',
    birthPlace: '',
    birthSource: '',
    deathDate: '',
    deathPlace: '',
    deathSource: '',
    burialPlace: '',
    residence: '',
    isDeceased: false,
    profession: '',
    company: '',
    interests: '',
    bio: '',
    gallery: [],
    voiceNotes: [],
    sources: [],
    events: [],
    email: '',
    website: '',
    blog: '',
    address: '',
    parents: [],
    children: [],
    spouses: [],
    partnerDetails: {},
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
            currentTreeSettings: DEFAULT_TREE_SETTINGS,
        });

        expect(applyOperationToMap).not.toHaveBeenCalled();
        expect(result.people).toEqual({ 'person-1': root });
        expect(result.treeMetadata).toEqual({
            rootId: 'person-1',
            focusId: 'person-1',
            name: 'Sovereign Tree',
        });
        expect(result.maxVersion).toBe(8);
        expect(result.deletedPersonIdsToRecord).toEqual([]);
    });

    it('returns deleted person ids from incoming delete operations for persistence', () => {
        const applyOperationToMap = vi.fn(() => ({}));
        const op: DeltaOperation = {
            tree_id: 'tree-1',
            user_id: 'user-2',
            type: 'DELETE_NODE',
            payload: { id: 'person-1' },
            version_seq: 9,
        };

        const result = applyIncomingOps({
            people: { 'person-1': root },
            ops: [op],
            deletedPersonIds: new Set(),
            lastSyncedVersion: 8,
            applyOperationToMap,
            currentTreeSettings: DEFAULT_TREE_SETTINGS,
        });

        expect(result.people).toEqual({});
        expect(result.deletedPersonIdsToRecord).toEqual(['person-1']);
        expect(result.maxVersion).toBe(9);
    });

    it('keeps intentionally empty tree names and merges accepted settings metadata', () => {
        const applyOperationToMap = vi.fn();
        const op: DeltaOperation = {
            tree_id: 'tree-1',
            user_id: 'user-2',
            type: 'SET_TREE_METADATA',
            payload: {
                client_id: 'client-b',
                client_version: 2,
                treeMetadata: {
                    name: '',
                    settings: {
                        showPhotos: false,
                    },
                },
            },
            created_at: '2026-06-09T01:00:00.000Z',
            version_seq: 10,
        };

        const result = applyIncomingOps({
            people: { 'person-1': root },
            ops: [op],
            deletedPersonIds: new Set(),
            lastSyncedVersion: 9,
            applyOperationToMap,
            currentTreeSettings: DEFAULT_TREE_SETTINGS,
        });

        expect(result.treeMetadata.name).toBe('');
        expect(result.treeMetadata.settings?.showPhotos).toBe(false);
        expect(result.treeMetadata.settings?.sync_metadata?.lastUpdated?.showPhotos).toBe('2026-06-09T01:00:00.000Z');
        expect(result.treeMetadata.settings?.sync_metadata?.lastUpdatedOps?.showPhotos).toEqual({
            client_id: 'client-b',
            client_version: 2,
        });
    });
});

