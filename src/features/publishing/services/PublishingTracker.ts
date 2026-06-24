import { PublicationManifest, ExportHistoryEntry } from '../types/manifest';
import { useAppStore } from '../../../store/useAppStore';
import { buildFamilyGraph } from '../../../domain/familyGraph';
import { Citation, Person, RelationshipEdge, Source } from '../../../types';
import { evaluateDataIntegrity } from '../../../domain/dataIntegrity';
import { summarizePublishingEvidence } from './PublishingEvidenceAdapter';
import { PublishingRelationshipAdapter } from './PublishingRelationshipAdapter';

export interface TrackerStartOptions {
    readonly templateId: string;
    readonly exportType: 'legacy' | 'publishing';
    readonly people: Record<string, Person>;
    readonly totalPages?: number;
    readonly relationships?: Record<string, RelationshipEdge>;
    readonly sources?: Record<string, Source>;
    readonly citations?: Record<string, Citation>;
    readonly userRole?: string | null;
    readonly treeId?: string | null;
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
        const {
            user,
            currentUserRole,
            currentTreeId,
            relationships: storeRelationships,
            sources: storeSources,
            citations: storeCitations,
        } = useAppStore.getState();
        const relationships = options.relationships ?? storeRelationships ?? {};
        const sources = options.sources ?? storeSources ?? {};
        const citations = options.citations ?? storeCitations ?? {};
        const userRole = options.userRole ?? currentUserRole ?? null;
        const treeId = options.treeId ?? currentTreeId ?? 'publishing';
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
            schemaVersions: {
                manifest: 2,
                relationships: 1,
                citations: 1,
                privacy: 1,
            },
            privacy: {
                userRole,
                masked: userRole === 'viewer',
            },
            evidence: summarizePublishingEvidence(options.people, { sources, citations }),
            integrity: toIntegritySummary(options.people),
            relationships: {
                source: Object.keys(relationships).length > 0 ? 'relationship_edges' : 'legacy_person_fields',
                driftWarningCount: PublishingRelationshipAdapter
                    .createContext(options.people, relationships, treeId)
                    .warnings.length,
            },
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
            schemaVersions: trackerState.manifest.schemaVersions,
            privacy: trackerState.manifest.privacy,
            evidence: trackerState.manifest.evidence,
            integrity: trackerState.manifest.integrity,
            relationships: trackerState.manifest.relationships,
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

function toIntegritySummary(people: Record<string, Person>) {
    const report = evaluateDataIntegrity(people);
    return {
        healthScore: report.healthScore,
        completenessScore: report.completenessScore,
        citationCoverage: report.citationCoverage,
        issueCount: report.issues.length,
        counts: report.counts,
        countsByCategory: report.countsByCategory,
    };
}
