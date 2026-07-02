export type GedcomRelationshipMode = 'legacy-array' | 'relationship-edge';

export interface GedcomExportModeState {
  readonly relationshipMode: GedcomRelationshipMode;
  readonly reason: string;
}

let testOverride: GedcomRelationshipMode | null = null;

const isTestEnvironment = (): boolean => {
  return typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
};

export const getGedcomExportMode = (): GedcomExportModeState => {
  if (isTestEnvironment() && testOverride !== null) {
    return {
      relationshipMode: testOverride,
      reason: 'GEDCOM relationship mode overridden for test environment.',
    };
  }

  return {
    relationshipMode: 'relationship-edge',
    reason: 'GEDCOM exports use RelationshipEdge by default with legacy fallback when edges are unavailable.',
  };
};

export const setGedcomExportModeOverrideForTests = (
  mode: GedcomRelationshipMode | null
): void => {
  if (isTestEnvironment()) {
    testOverride = mode;
  }
};
