
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BackgroundTreePersistence } from '../BackgroundTreePersistence';
import { offlineCache } from '../OfflineCache';
import type { Person } from '../../../types';

vi.mock('../OfflineCache', () => ({
    offlineCache: {
        saveFullTree: vi.fn().mockResolvedValue(undefined),
        createSnapshot: vi.fn().mockResolvedValue(undefined),
    },
}));

const people: Record<string, Person> = {
    p1: {
        id: 'p1',
        firstName: 'A',
        lastName: '',
        gender: 'male',
        parents: [],
        children: [],
        spouses: [],
    } as unknown as Person,
};

describe('BackgroundTreePersistence', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('defers full-tree saves outside the caller turn', async () => {
        const persistence = new BackgroundTreePersistence();

        persistence.scheduleSave(people);

        expect(offlineCache.saveFullTree).not.toHaveBeenCalled();

        await vi.runOnlyPendingTimersAsync();

        expect(offlineCache.saveFullTree).toHaveBeenCalledWith(people);
        expect(offlineCache.createSnapshot).not.toHaveBeenCalled();
    });

    it('defers snapshots and dispatches the backup request only after the snapshot completes', async () => {
        const persistence = new BackgroundTreePersistence();
        const backupListener = vi.fn();
        window.addEventListener('jozor-backup-requested', backupListener);

        persistence.scheduleSnapshot(people);

        expect(offlineCache.createSnapshot).not.toHaveBeenCalled();
        expect(backupListener).not.toHaveBeenCalled();

        await vi.runOnlyPendingTimersAsync();

        expect(offlineCache.createSnapshot).toHaveBeenCalledWith(people);
        expect(backupListener).toHaveBeenCalledTimes(1);

        window.removeEventListener('jozor-backup-requested', backupListener);
    });

    it('coalesces multiple queued saves into the latest people map', async () => {
        const persistence = new BackgroundTreePersistence();
        const latestPeople: Record<string, Person> = {
            ...people,
            p2: {
                ...people.p1,
                id: 'p2',
                firstName: 'B',
            },
        };

        persistence.scheduleSave(people);
        persistence.scheduleSave(latestPeople);

        await vi.runOnlyPendingTimersAsync();

        expect(offlineCache.saveFullTree).toHaveBeenCalledTimes(1);
        expect(offlineCache.saveFullTree).toHaveBeenCalledWith(latestPeople);
    });
});

