import type { Person } from '../../types';
import { logError } from '../../utils/errorLogger';
import { offlineCache } from './OfflineCache';

const IDLE_TIMEOUT_MS = 1500;

type IdleCallbackHandle = number;

type IdleWindow = Window & {
    requestIdleCallback?: (
        callback: IdleRequestCallback,
        options?: IdleRequestOptions
    ) => IdleCallbackHandle;
    cancelIdleCallback?: (handle: IdleCallbackHandle) => void;
};

export class BackgroundTreePersistence {
    private pendingPeople: Record<string, Person> | null = null;
    private pendingTreeId: string | undefined;
    private pendingSnapshot = false;
    private idleHandle: IdleCallbackHandle | null = null;

    scheduleSave(people: Record<string, Person>, treeId?: string): void {
        this.pendingPeople = people;
        this.pendingTreeId = treeId;
        this.scheduleFlush();
    }

    scheduleSnapshot(people: Record<string, Person>, treeId?: string): void {
        this.pendingPeople = people;
        this.pendingTreeId = treeId;
        this.pendingSnapshot = true;
        this.scheduleFlush();
    }

    private scheduleFlush(): void {
        if (this.idleHandle !== null) return;

        if (typeof window === 'undefined') {
            this.idleHandle = setTimeout(() => void this.flush(), 0) as unknown as number;
            return;
        }

        const idleWindow = window as IdleWindow;
        if (idleWindow.requestIdleCallback) {
            this.idleHandle = idleWindow.requestIdleCallback(
                () => void this.flush(),
                { timeout: IDLE_TIMEOUT_MS }
            );
            return;
        }

        this.idleHandle = window.setTimeout(() => void this.flush(), 0);
    }

    private clearScheduledHandle(): void {
        if (this.idleHandle === null) return;

        if (typeof window !== 'undefined') {
            const idleWindow = window as IdleWindow;
            if (typeof idleWindow.cancelIdleCallback === 'function' && typeof idleWindow.requestIdleCallback === 'function') {
                idleWindow.cancelIdleCallback(this.idleHandle);
            } else {
                window.clearTimeout(this.idleHandle);
            }
        } else {
            clearTimeout(this.idleHandle as unknown as ReturnType<typeof setTimeout>);
        }

        this.idleHandle = null;
    }

    async flush(): Promise<void> {
        const people = this.pendingPeople;
        const treeId = this.pendingTreeId;
        const shouldSnapshot = this.pendingSnapshot;

        this.idleHandle = null;
        this.pendingPeople = null;
        this.pendingTreeId = undefined;
        this.pendingSnapshot = false;

        if (!people) return;

        try {
            if (shouldSnapshot) {
                await offlineCache.createSnapshot(people, treeId);
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('jozor-backup-requested'));
                }
                return;
            }

            await offlineCache.saveFullTree(people, treeId);
        } catch (error) {
            logError('BackgroundTreePersistence flush', error, {
                category: 'SYNC',
                severity: 'MEDIUM',
                metadata: {
                    operationType: shouldSnapshot ? 'background_snapshot' : 'background_save_full_tree',
                },
            });
        } finally {
            if (this.pendingPeople) {
                this.clearScheduledHandle();
                this.scheduleFlush();
            }
        }
    }
}

export const backgroundTreePersistence = new BackgroundTreePersistence();
