
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
        expect(result.peopleChanged).toBe(false);
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
        expect(result.peopleChanged).toBe(true);
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

    it('applies only newer tree metadata settings from mixed remote updates', () => {
        const applyOperationToMap = vi.fn();
        const op: DeltaOperation = {
            tree_id: 'tree-1',
            user_id: 'user-2',
            type: 'SET_TREE_METADATA',
            payload: {
                client_id: 'client-b',
                client_version: 1,
                treeMetadata: {
                    settings: {
                        showPhotos: false,
                        showDates: false,
                    },
                },
            },
            created_at: '2026-06-09T01:00:00.000Z',
            version_seq: 11,
        };

        const result = applyIncomingOps({
            people: { 'person-1': root },
            ops: [op],
            deletedPersonIds: new Set(),
            lastSyncedVersion: 10,
            applyOperationToMap,
            currentTreeSettings: {
                ...DEFAULT_TREE_SETTINGS,
                showPhotos: true,
                showDates: true,
                sync_metadata: {
                    lastUpdated: {
                        showPhotos: '2026-06-09T02:00:00.000Z',
                        showDates: '2026-06-09T00:00:00.000Z',
                    },
                    lastUpdatedOps: {
                        showPhotos: { client_id: 'client-a', client_version: 1 },
                        showDates: { client_id: 'client-a', client_version: 1 },
                    },
                },
            },
        });

        expect(result.treeMetadata.settings?.showPhotos).toBe(true);
        expect(result.treeMetadata.settings?.showDates).toBe(false);
        expect(result.treeMetadata.settings?.sync_metadata?.lastUpdated?.showPhotos).toBe('2026-06-09T02:00:00.000Z');
        expect(result.treeMetadata.settings?.sync_metadata?.lastUpdated?.showDates).toBe('2026-06-09T01:00:00.000Z');
    });

    it('skips non-delete operations for persisted deleted person ids', () => {
        const applyOperationToMap = vi.fn();
        const onSkipBlacklisted = vi.fn();
        const op: DeltaOperation = {
            tree_id: 'tree-1',
            user_id: 'user-2',
            type: 'UPDATE_PROP',
            payload: {
                id: 'person-1',
                updates: {
                    firstName: 'Returned',
                },
            },
            version_seq: 12,
        };

        const result = applyIncomingOps({
            people: { 'person-1': root },
            ops: [op],
            deletedPersonIds: new Set(['person-1']),
            lastSyncedVersion: 11,
            applyOperationToMap,
            onSkipBlacklisted,
            currentTreeSettings: DEFAULT_TREE_SETTINGS,
        });

        expect(applyOperationToMap).not.toHaveBeenCalled();
        expect(onSkipBlacklisted).toHaveBeenCalledWith({ op, targetId: 'person-1' });
        expect(result.people).toEqual({ 'person-1': root });
        expect(result.maxVersion).toBe(12);
        expect(result.syncingNodeIdsToRemove).toEqual(['person-1']);
        expect(result.peopleChanged).toBe(false);
    });

    it('does not report people changes when operations from the current client are skipped', () => {
        const applyOperationToMap = vi.fn();
        const op: DeltaOperation = {
            tree_id: 'tree-1',
            user_id: 'user-1',
            type: 'UPDATE_PROP',
            payload: {
                id: 'person-1',
                client_id: 'client-current',
                updates: {
                    firstName: 'Local echo',
                },
            },
            version_seq: 13,
        };
        const people = { 'person-1': root };

        const result = applyIncomingOps({
            people,
            ops: [op],
            deletedPersonIds: new Set(),
            lastSyncedVersion: 12,
            applyOperationToMap,
            excludeClientId: 'client-current',
            currentTreeSettings: DEFAULT_TREE_SETTINGS,
        });

        expect(applyOperationToMap).not.toHaveBeenCalled();
        expect(result.people).toBe(people);
        expect(result.maxVersion).toBe(13);
        expect(result.peopleChanged).toBe(false);
    });
});

