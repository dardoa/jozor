import { describe, it, expect } from 'vitest';
import { createInitialPosterDesignState } from '../posterDesignState';
import {
  serializePosterDesignDocument,
  deserializePosterDesignDocument,
  validatePosterDesignDocumentSchema,
} from '../posterDesignDocument';

describe('posterDesignDocument schema validation & migration', () => {
  it('migrates a genuine v1 document without lastTieredScope/lastRadialScope to v3 successfully', () => {
    const initialState = createInitialPosterDesignState('classic-heritage');
    const jsonStr = serializePosterDesignDocument(initialState, 'Genuine V1 Document');
    const doc = JSON.parse(jsonStr);

    const tieredV1 = { ...doc.state.tiered };
    delete (tieredV1 as { lastTieredScope?: string }).lastTieredScope;

    const radialV1 = { ...doc.state.radial };
    delete (radialV1 as { lastRadialScope?: string }).lastRadialScope;

    const v1Doc = {
      ...doc,
      metadata: {
        ...doc.metadata,
        schemaVersion: 1,
      },
      state: {
        ...doc.state,
        tiered: tieredV1,
        radial: radialV1,
      },
    };

    expect(v1Doc.state.tiered).not.toHaveProperty('lastTieredScope');
    expect(v1Doc.state.radial).not.toHaveProperty('lastRadialScope');

    const result = validatePosterDesignDocumentSchema(v1Doc);
    expect(result.valid).toBe(true);
    expect(result.migratedDocument?.metadata.schemaVersion).toBe(3);
    expect(result.migratedDocument?.state.tiered.lastTieredScope).toBe('ancestors');
    expect(result.migratedDocument?.state.radial.lastRadialScope).toBe('ancestors');
  });

  it('migrates a genuine v2 document to v3 successfully', () => {
    const initialState = createInitialPosterDesignState('classic-heritage');
    const jsonStr = serializePosterDesignDocument(initialState, 'Genuine V2 Document');
    const doc = JSON.parse(jsonStr);

    const radialV2 = { ...doc.state.radial };
    delete (radialV2 as { lastRadialScope?: string }).lastRadialScope;

    const v2Doc = {
      ...doc,
      metadata: {
        ...doc.metadata,
        schemaVersion: 2,
      },
      state: {
        ...doc.state,
        radial: radialV2,
      },
    };

    expect(v2Doc.state.radial).not.toHaveProperty('lastRadialScope');

    const result = validatePosterDesignDocumentSchema(v2Doc);
    expect(result.valid).toBe(true);
    expect(result.migratedDocument?.metadata.schemaVersion).toBe(3);
    expect(result.migratedDocument?.state.radial.lastRadialScope).toBe('ancestors');
  });

  it('validates a complete v3 document successfully', () => {
    const initialState = createInitialPosterDesignState('classic-heritage');
    const jsonStr = serializePosterDesignDocument(initialState, 'Test V3 Document');
    const doc = JSON.parse(jsonStr);

    const result = validatePosterDesignDocumentSchema(doc);
    expect(result.valid).toBe(true);
    expect(result.migratedDocument?.metadata.schemaVersion).toBe(3);
    expect(result.migratedDocument?.state.radial.lastRadialScope).toBe('ancestors');
  });

  it('rejects documents with unknown or unsupported schemaVersion', () => {
    const initialState = createInitialPosterDesignState('classic-heritage');
    const jsonStr = serializePosterDesignDocument(initialState);
    const doc = JSON.parse(jsonStr);

    const invalidDoc = {
      ...doc,
      metadata: {
        ...doc.metadata,
        schemaVersion: 99,
      },
    };

    const result = validatePosterDesignDocumentSchema(invalidDoc);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Unsupported or unknown document schemaVersion');
  });

  it('rejects v3 documents with invalid lastRadialScope', () => {
    const initialState = createInitialPosterDesignState('classic-heritage');
    const jsonStr = serializePosterDesignDocument(initialState);
    const doc = JSON.parse(jsonStr);

    const invalidDoc = {
      ...doc,
      state: {
        ...doc.state,
        radial: {
          ...doc.state.radial,
          lastRadialScope: 'invalid-scope',
        },
      },
    };

    const result = validatePosterDesignDocumentSchema(invalidDoc);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Document failed structural or security validation');
  });

  it('performs full round-trip serialization and deserialization', () => {
    const initialState = createInitialPosterDesignState('classic-heritage');
    const jsonStr = serializePosterDesignDocument(initialState, 'Round Trip Document');
    const deserialized = deserializePosterDesignDocument(jsonStr);

    expect(deserialized.metadata.schemaVersion).toBe(3);
    expect(deserialized.metadata.title).toBe('Round Trip Document');
    expect(deserialized.state.productMode).toBe('detailed-poster');
    expect(deserialized.state.radial.lastRadialScope).toBe('ancestors');
  });
});
