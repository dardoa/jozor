export interface PublicationManifest {
  readonly publicationId: string;
  readonly templateId: string; // e.g., 'classic-book-manuscript', 'gedcom', 'json', etc.
  readonly createdAt: string; // ISO string
  readonly totalPeople: number;
  readonly totalFamilies: number;
  readonly totalPages: number;
  readonly initiatedBy: string; // User ID or 'anonymous'
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
  readonly outputFiles: readonly {
    readonly name: string;
    readonly format: string;
    readonly size?: number;
  }[];
}
