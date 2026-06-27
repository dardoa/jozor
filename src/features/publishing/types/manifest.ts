import type { ManuscriptOrderingStrategy } from '../../../types/publishing';

export interface PublicationPrivacyMetadata {
  readonly userRole?: string | null;
  readonly masked: boolean;
}

export interface PublicationEvidenceMetadata {
  readonly sourceCount: number;
  readonly citationCount: number;
  readonly citedPersonCount: number;
  readonly citationCoverage: number;
  readonly manuscriptPersonCount?: number;
  readonly manuscriptCitationCoverage?: number;
}

export interface PublicationIntegritySummary {
  readonly healthScore: number;
  readonly completenessScore: number;
  readonly citationCoverage: number;
  readonly issueCount: number;
  readonly counts: Record<string, number>;
  readonly countsByCategory: Record<string, number>;
}

export interface PublicationRelationshipMetadata {
  readonly source: 'relationship_edges' | 'legacy_person_fields';
  readonly driftWarningCount: number;
}

export interface PublicationManuscriptMetadata {
  readonly rootPersonId?: string;
  readonly orderingStrategy: ManuscriptOrderingStrategy;
  readonly generationsDepth?: number | 'all';
  readonly includeImages: boolean;
  readonly includeTimeline: boolean;
  readonly includeEvidence: boolean;
  readonly includeNarrative: boolean;
  readonly orderedPersonCount?: number;
  readonly customOrderCount?: number;
  readonly branchSummaries?: readonly PublicationManuscriptBranchSummary[];
}

export interface PublicationManuscriptBranchSummary {
  readonly branchRootPersonId: string;
  readonly label: string;
  readonly personCount: number;
}

export interface PublicationSchemaVersions {
  readonly manifest: 2;
  readonly relationships: 1;
  readonly citations: 1;
  readonly privacy: 1;
}

export interface PublicationManifest {
  readonly publicationId: string;
  readonly templateId: string; // e.g., 'classic-book-manuscript', 'gedcom', 'json', etc.
  readonly createdAt: string; // ISO string
  readonly totalPeople: number;
  readonly totalFamilies: number;
  readonly totalPages: number;
  readonly initiatedBy: string; // User ID or 'anonymous'
  readonly schemaVersions?: PublicationSchemaVersions;
  readonly privacy?: PublicationPrivacyMetadata;
  readonly evidence?: PublicationEvidenceMetadata;
  readonly integrity?: PublicationIntegritySummary;
  readonly relationships?: PublicationRelationshipMetadata;
  readonly manuscript?: PublicationManuscriptMetadata;
}

export interface PublicationResult {
  readonly success: boolean;
  readonly durationMs: number;
  readonly warnings: readonly string[];
  readonly outputFiles: readonly {
    readonly name: string;
    readonly format: 'png' | 'pdf' | 'json' | 'gedcom' | 'ics' | 'jozor';
    readonly size?: number; // Size in bytes if applicable
  }[];
}

export interface ExportHistoryEntry {
  readonly id?: number; // Primary key for Dexie auto-increment
  readonly publicationId: string;
  readonly treeId: string;
  readonly templateId: string;
  readonly exportType: 'legacy' | 'publishing';
  readonly createdAt: string;
  readonly totalPages: number;
  readonly totalPeople: number;
  readonly totalFamilies: number;
  readonly initiatedBy: string;
  readonly success: boolean;
  readonly durationMs: number;
  readonly warnings: readonly string[];
  readonly schemaVersions?: PublicationSchemaVersions;
  readonly privacy?: PublicationPrivacyMetadata;
  readonly evidence?: PublicationEvidenceMetadata;
  readonly integrity?: PublicationIntegritySummary;
  readonly relationships?: PublicationRelationshipMetadata;
  readonly manuscript?: PublicationManuscriptMetadata;
  readonly outputFiles: readonly {
    readonly name: string;
    readonly format: string;
    readonly size?: number;
  }[];
}
