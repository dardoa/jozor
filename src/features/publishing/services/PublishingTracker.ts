import { PublicationManifest, ExportHistoryEntry } from '../types/manifest';
import { useAppStore } from '../../../store/useAppStore';
import { buildFamilyGraph } from '../../../domain/familyGraph';
import { Person } from '../../../types';

export interface TrackerStartOptions {
    readonly templateId: string;
    readonly exportType: 'legacy' | 'publishing';
    readonly people: Record<string, Person>;
    readonly totalPages?: number;
}

export class PublishingTracker {
    /**
     * Starts tracking a publication/export process.
     * Generates a PublicationManifest and captures the start time.
     */
    static startTracking(options: TrackerStartOptions): {
        readonly manifest: PublicationManifest;
        readonly startTime: number;
        readonly exportType: 'legacy' | 'publishing';
    } {
        const { user } = useAppStore.getState();
        const publicationId = typeof crypto !== 'undefined' && crypto.randomUUID 
            ? crypto.randomUUID() 
            : Math.random().toString(36).substring(2, 15);

        const totalPeople = Object.keys(options.people).length;
        let totalFamilies = 0;

        try {
            const graph = buildFamilyGraph(options.people);
            totalFamilies = Object.keys(graph.families).length;
        } catch (error) {
            console.error('Tracker: Failed to compute families count:', error);
        }

        const manifest: PublicationManifest = {
            publicationId,
            templateId: options.templateId,
            createdAt: new Date().toISOString(),
            totalPeople,
            totalFamilies,
            totalPages: options.totalPages ?? 1,
            initiatedBy: user?.uid || 'anonymous',
        };

        return {
            manifest,
            startTime: performance.now(),
            exportType: options.exportType,
        };
    }

    /**
     * Ends tracking a publication/export process.
     * Computes final metrics, saves the ExportHistoryEntry to IndexedDB, and updates Zustand.
     */
    static async endTracking(
        trackerState: {
            readonly manifest: PublicationManifest;
            readonly startTime: number;
            readonly exportType: 'legacy' | 'publishing';
        },
        success: boolean,
        warnings: readonly string[],
        outputFiles: readonly {
            readonly name: string;
            readonly format: string;
            readonly size?: number;
        }[]
    ): Promise<ExportHistoryEntry> {
        const durationMs = Math.round(performance.now() - trackerState.startTime);
        const { currentTreeId, addExportEntry } = useAppStore.getState();

        const entry: Omit<ExportHistoryEntry, 'id'> = {
            publicationId: trackerState.manifest.publicationId,
            treeId: currentTreeId || 'local-tree',
            templateId: trackerState.manifest.templateId,
            exportType: trackerState.exportType,
            createdAt: trackerState.manifest.createdAt,
            totalPages: trackerState.manifest.totalPages,
            totalPeople: trackerState.manifest.totalPeople,
            totalFamilies: trackerState.manifest.totalFamilies,
            initiatedBy: trackerState.manifest.initiatedBy,
            success,
            durationMs,
            warnings,
            outputFiles,
        };

        try {
            await addExportEntry(entry);
        } catch (error) {
            console.error('Tracker: Failed to save export entry to state:', error);
        }

        return entry;
    }
}
