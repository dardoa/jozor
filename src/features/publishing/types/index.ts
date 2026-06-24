export type DocumentType = 'single-page' | 'paginated';

export type SectionType = 'cover' | 'introduction' | 'tree' | 'biography' | 'timeline' | 'gallery' | 'bibliography';

export type BlockType = 'header' | 'paragraph' | 'tree' | 'map' | 'timeline' | 'gallery' | 'statistics';

export type AssetType = 'tree-diagram' | 'text' | 'image' | 'event' | 'map' | 'chart';

export interface PublicationRequest {
  readonly rootPersonId: string;
  readonly templateId: string;
  readonly theme?: string;
  readonly scope: {
    readonly type: 'ancestor' | 'branch' | 'timeline' | 'all';
    readonly generationsDepth?: number;
  };
  readonly options?: Record<string, unknown>;
}

export interface PosterTheme {
  readonly colors: {
    readonly background: string;
    readonly text: string;
    readonly subtext: string;
  };
  readonly node: {
    readonly male: {
      readonly background: string;
    };
    readonly female: {
      readonly background: string;
    };
    readonly borderColor: string;
    readonly width: number;
    readonly height: number;
  };
  readonly edge: {
    readonly father: {
      readonly color: string;
    };
    readonly mother: {
      readonly color: string;
    };
    readonly width: number;
  };
  readonly fonts: {
    readonly fontFamily: string;
    readonly titleSize: string;
    readonly nameSize: string;
    readonly dateSize: string;
  };
}

export type PublicationTheme = PosterTheme;

export interface PublicationSectionDefinition {
  readonly type: SectionType;
  readonly options?: {
    readonly depth?: number;
    readonly variant?: 'ancestor' | 'branch';
    readonly title?: string;
    readonly [key: string]: unknown;
  };
}

export interface PublicationTemplate {
  readonly id: string;
  readonly name: string;
  readonly publicationKind: 'ancestor-poster' | 'branch-poster' | 'timeline' | 'book-manuscript' | 'all';
  readonly documentType: DocumentType;
  readonly theme: PublicationTheme;
  readonly sections: readonly PublicationSectionDefinition[];
  readonly defaultLayoutOptions: {
    readonly pageWidth: number;
    readonly pageHeight: number;
    readonly margins: {
      readonly top: number;
      readonly bottom: number;
      readonly left: number;
      readonly right: number;
    };
    readonly generationSpacing?: number;
  };
}

export interface PublicationAsset {
  readonly id: string;
  readonly type: AssetType;
  readonly payload: unknown; // polymorphic data specific to the asset type
}

export interface PublicationBlock {
  readonly id: string;
  readonly type: BlockType;
  readonly assets: readonly PublicationAsset[];
}

export interface PublicationSection {
  readonly id: string;
  readonly type: SectionType;
  readonly blocks: readonly PublicationBlock[];
}

export interface PublicationDocument {
  readonly id: string;
  readonly title: string;
  readonly theme: string;
  readonly type: DocumentType;
  readonly sections: readonly PublicationSection[];
}

export interface PublicationPersonSnapshot {
  readonly id: string;
  readonly displayName: string;
  readonly birthDate?: string;
  readonly deathDate?: string;
  readonly gender: 'male' | 'female';
  readonly photoUrl?: string;
}

export type ManuscriptChapterType = 'overview' | 'people' | 'timeline' | 'evidence';

export interface ManuscriptFactEntry {
  readonly label: string;
  readonly value: string;
  readonly citationCount: number;
}

export interface ManuscriptSourceHighlight {
  readonly sourceId: string;
  readonly title: string;
  readonly citationCount: number;
}

export interface ManuscriptPersonEntry {
  readonly personId: string;
  readonly displayName: string;
  readonly facts: readonly ManuscriptFactEntry[];
  readonly sourceHighlights: readonly ManuscriptSourceHighlight[];
  readonly citationCount: number;
  readonly citationCoverage: number;
}

export interface ManuscriptTimelineEntry {
  readonly personId: string;
  readonly personName: string;
  readonly date: string;
  readonly title: string;
  readonly place?: string;
}

export interface ManuscriptCitationEntry {
  readonly citationId: string;
  readonly sourceId: string;
  readonly sourceTitle: string;
  readonly targetId: string;
  readonly targetField?: string;
}

export interface ManuscriptChapter {
  readonly id: string;
  readonly type: ManuscriptChapterType;
  readonly title: string;
  readonly people?: readonly ManuscriptPersonEntry[];
  readonly timeline?: readonly ManuscriptTimelineEntry[];
  readonly citations?: readonly ManuscriptCitationEntry[];
}

export interface FamilyManuscriptModel {
  readonly id: string;
  readonly title: string;
  readonly rootPersonId: string;
  readonly chapters: readonly ManuscriptChapter[];
}

// ---------------------------------------------------------------------------
// Geometrical Placed Document Types (Layout Engine Output)
// ---------------------------------------------------------------------------

export interface PlacedAsset {
  readonly assetId: string;
  readonly type: AssetType;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly payload: unknown;
}

export interface PlacedBlock {
  readonly blockId: string;
  readonly type: BlockType;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly assets: readonly PlacedAsset[];
}

export interface PlacedSection {
  readonly sectionId: string;
  readonly type: SectionType;
  readonly pageNumber: number; // 1-indexed for paginated documents, 1 for single-page documents
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly blocks: readonly PlacedBlock[];
}

export interface PlacedDocument {
  readonly documentId: string;
  readonly totalPages: number;
  readonly pageSize?: {
    readonly width: number;
    readonly height: number;
  };
  readonly sections: readonly PlacedSection[];
}

export * from './manifest';

