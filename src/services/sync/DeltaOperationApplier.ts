import { useAppStore } from '../../store/useAppStore';
import { logError, logInfo } from '../../utils/errorLogger';
import type { DeltaOperation } from './SyncTypes';
import type { ConflictResolver } from './ConflictResolver';
import { applyIncomingOps } from './applyIncomingOps';
import { backgroundTreePersistence } from './BackgroundTreePersistence';
import { clientInstanceId } from './syncInstance';
import { storageService } from '../storageService';
import { projectPendingOperations } from '../../domain/pendingOperationsProjection';

export class DeltaOperationApplier {
    private incomingProcessingQueue: Promise<void> = Promise.resolve();
    private snapshotCounter = 0;

    constructor(private readonly resolver: ConflictResolver) {}

    async processIncomingBatch(batch: DeltaOperation[]): Promise<void> {
        this.incomingProcessingQueue = this.incomingProcessingQueue.then(async () => {
            const { lastSyncedVersion } = useAppStore.getState();
            const sequential = this.resolver.processIncoming(batch, lastSyncedVersion);

            if (sequential.length === 0) return;

            await new Promise<void>((resolve) => {
                requestAnimationFrame(async () => {
                    try {
                        const state = useAppStore.getState();
                        const { applyOperationToMap } = await import('../../utils/syncUtils');

                        const result = applyIncomingOps({
                            people: state.people,
                            ops: sequential,
                            deletedPersonIds: state.deletedPersonIds,
                            lastSyncedVersion: state.lastSyncedVersion,
                            applyOperationToMap,
                            excludeClientId: clientInstanceId,
                            currentTreeSettings: state.treeSettings,
                            onSkipBlacklisted: ({ op, targetId }) => {
                                logInfo('DeltaSyncService ghostNodeGuard', 'Skipping operation for blacklisted person.', {
                                    type: op.type,
                                    personId: targetId,
                                    version: op.version_seq,
                                });
                            },
                        });

                        if (result.deletedPersonIdsToRecord.length > 0) {
                            const uniqueDeletedIds = Array.from(new Set(result.deletedPersonIdsToRecord));
                            await storageService.recordDeletedPersonIds(state.currentTreeId, uniqueDeletedIds);
                            const mergedDeletedIds = new Set(state.deletedPersonIds);
                            uniqueDeletedIds.forEach((id) => mergedDeletedIds.add(id));
                            state.setDeletedPersonIds(mergedDeletedIds);
                        }

                        result.syncingNodeIdsToRemove.forEach((id) => state.removeSyncingNode(id));

                        // Project remote updates over local pending operations
                        const { people: projected } = projectPendingOperations(
                            result.people,
                            state.pendingOperations
                        );

                        state.setConfirmedPeople(result.people);
                        state.setPeople(projected, false);

                        if (result.treeMetadata.focusId !== undefined && result.people[result.treeMetadata.focusId]) {
                            state.setFocusId(result.treeMetadata.focusId);
                        }
                        if (result.treeMetadata.name !== undefined) {
                            state.setTreeName(result.treeMetadata.name);
                        }
                        if (result.treeMetadata.settings) {
                            state.setTreeSettings(result.treeMetadata.settings);
                        }
                        state.setLastSyncedVersion(result.maxVersion);

                        this.snapshotCounter += sequential.length;
                        if (this.snapshotCounter >= 50) {
                            this.snapshotCounter = 0;
                            backgroundTreePersistence.scheduleSnapshot(result.people);
                            state.incrementOpCount(-state.opCount);
                        } else {
                            backgroundTreePersistence.scheduleSave(result.people);
                        }
                    } catch (err) {
                        logError('DeltaSyncService processIncomingBatch', err, { category: 'SYNC', severity: 'HIGH' });
                    } finally {
                        resolve();
                    }
                });
            });
        });

        return this.incomingProcessingQueue;
    }
}
