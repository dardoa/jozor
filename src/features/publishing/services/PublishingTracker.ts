import { PublicationManifest, ExportHistoryEntry } from '../types/manifest';
import { useAppStore } from '../../../store/useAppStore';
import { buildFamilyGraph } from '../../../domain/familyGraph';
import type { Citation, Person, PublishingExportOptions, RelationshipEdge, Source } from '../../../types';
import { evaluateDataIntegrity } from '../../../domain/dataIntegrity';
import { summarizePublishingEvidence } from './PublishingEvidenceAdapter';
import { PublishingRelationshipAdapter } from './PublishingRelationshipAdapter';
import { ManuscriptStructureBuilder } from './ManuscriptStructureBuilder';

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
    readonly manuscriptOptions?: PublishingExportOptions['manuscriptOptions'];
}

interface NormalizedManuscriptOptions {
    readonly rootPersonId?: string;
    readonly generationsDepth: number | 'all';
    readonly orderingStrategy: NonNullable<NonNullable<PublishingExportOptions['manuscriptOptions']>['orderingStrategy']>;
    readonly includeImages: boolean;
    readonly includeNarrative: boolean;
    readonly includeTimeline: boolean;
    readonly includeEvidence: boolean;
    readonly customPersonOrder?: readonly string[];
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
        const manuscriptOptions = normalizeManuscriptOptions(options.manuscriptOptions);
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

        const evidenceSummary = summarizePublishingEvidence(options.people, { sources, citations });
        const manuscriptDerivedMetadata = getManuscriptDerivedMetadata(options.templateId, options.people, relationships, sources, citations, manuscriptOptions);
        const { customPersonOrder, ...manifestManuscriptOptions } = manuscriptOptions;
        const customOrderCount = customPersonOrder?.length;
        const manuscriptMetadata = options.templateId.includes('book-manuscript')
            ? {
                ...manifestManuscriptOptions,
                orderedPersonCount: manuscriptDerivedMetadata.manuscriptPersonCount,
                ...(manuscriptDerivedMetadata.branchSummaries ? { branchSummaries: manuscriptDerivedMetadata.branchSummaries } : {}),
                ...(customOrderCount !== undefined ? { customOrderCount } : {}),
            }
            : undefined;

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
            evidence: {
                ...evidenceSummary,
                manuscriptPersonCount: manuscriptDerivedMetadata.manuscriptPersonCount,
                manuscriptCitationCoverage: manuscriptDerivedMetadata.manuscriptCitationCoverage,
            },
            integrity: toIntegritySummary(options.people),
            relationships: {
                source: Object.keys(relationships).length > 0 ? 'relationship_edges' : 'legacy_person_fields',
                driftWarningCount: PublishingRelationshipAdapter
                    .createContext(options.people, relationships, treeId)
                    .warnings.length,
            },
            manuscript: manuscriptMetadata,
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
            manuscript: trackerState.manifest.manuscript,
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

function getManuscriptDerivedMetadata(
    templateId: string,
    people: Record<string, Person>,
    relationships: Record<string, RelationshipEdge>,
    sources: Record<string, Source>,
    citations: Record<string, Citation>,
    manuscriptOptions: NormalizedManuscriptOptions
): {
    readonly manuscriptPersonCount?: number;
    readonly manuscriptCitationCoverage?: number;
    readonly branchSummaries?: NonNullable<PublicationManifest['manuscript']>['branchSummaries'];
} {
    if (!templateId.includes('book-manuscript')) return {};

    const rootPersonId = manuscriptOptions.rootPersonId || Object.keys(people)[0];
    if (!rootPersonId) return {};

    try {
        const model = ManuscriptStructureBuilder.buildModel({
            rootPersonId,
            people,
            relationshipEdges: relationships,
            evidence: { sources, citations },
            generationsDepth: manuscriptOptions.generationsDepth,
            orderingStrategy: manuscriptOptions.orderingStrategy,
            customPersonOrder: manuscriptOptions.customPersonOrder,
            includeImages: manuscriptOptions.includeImages,
            includeNarrative: manuscriptOptions.includeNarrative,
        });
        const peopleChapter = model.chapters.find((chapter) => chapter.type === 'people');
        const overviewChapter = model.chapters.find((chapter) => chapter.type === 'overview');
        const entries = peopleChapter?.people ?? [];
        const branchSummaries = overviewChapter?.branchSummaries?.map((summary) => ({
            branchRootPersonId: summary.branchRootPersonId,
            label: summary.label,
            personCount: summary.personCount,
        }));
        if (entries.length === 0) return {
            manuscriptPersonCount: 0,
            manuscriptCitationCoverage: 0,
            ...(branchSummaries && branchSummaries.length > 0 ? { branchSummaries } : {}),
        };
        const averageCoverage = Math.round(
            entries.reduce((sum, entry) => sum + entry.citationCoverage, 0) / entries.length
        );
        return {
            manuscriptPersonCount: entries.length,
            manuscriptCitationCoverage: averageCoverage,
            ...(branchSummaries && branchSummaries.length > 0 ? { branchSummaries } : {}),
        };
    } catch {
        return {};
    }
}

function normalizeManuscriptOptions(
    options: PublishingExportOptions['manuscriptOptions'] = {}
): NormalizedManuscriptOptions {
    return {
        rootPersonId: options.rootPersonId,
        generationsDepth: options.generationsDepth ?? 'all',
        orderingStrategy: options.orderingStrategy ?? 'narrative',
        customPersonOrder: options.customPersonOrder,
        includeImages: options.includeImages ?? true,
        includeNarrative: options.includeNarrative ?? false,
        includeTimeline: options.includeTimeline ?? true,
        includeEvidence: options.includeEvidence ?? true,
    };
}
