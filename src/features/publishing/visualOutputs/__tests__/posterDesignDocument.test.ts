import { describe, it, expect } from 'vitest';
import { createInitialPosterDesignState } from '../posterDesignState';
import {
  serializePosterDesignDocument,
  deserializePosterDesignDocument,
  validatePosterDesignDocumentSchema,
} from '../posterDesignDocument';

describe('posterDesignDocument schema validation & migration', () => {
  it('migrates a genuine v1 document without lastTieredScope to v2 successfully', () => {
    const initialState = createInitialPosterDesignState('classic-heritage');
    const jsonStr = serializePosterDesignDocument(initialState, 'Genuine V1 Document');
    const doc = JSON.parse(jsonStr);

    const tieredV1 = { ...doc.state.tiered };
    delete (tieredV1 as { lastTieredScope?: string }).lastTieredScope;
    const v1Doc = {
      ...doc,
      metadata: {
        ...doc.metadata,
        schemaVersion: 1,
      },
      state: {
        ...doc.state,
        tiered: tieredV1,
      },
    };

    // Assert lastTieredScope is genuinely absent in V1 fixture
    expect(v1Doc.state.tiered).not.toHaveProperty('lastTieredScope');

    const result = validatePosterDesignDocumentSchema(v1Doc);
    expect(result.valid).toBe(true);
    expect(result.migratedDocument?.metadata.schemaVersion).toBe(2);
    expect(result.migratedDocument?.state.tiered.lastTieredScope).toBe('ancestors');
  });

  it('validates a complete v2 document successfully', () => {
    const initialState = createInitialPosterDesignState('classic-heritage');
    const jsonStr = serializePosterDesignDocument(initialState, 'Test V2 Document');
    const doc = JSON.parse(jsonStr);

    const result = validatePosterDesignDocumentSchema(doc);
    expect(result.valid).toBe(true);
    expect(result.migratedDocument?.metadata.schemaVersion).toBe(2);
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

  it('performs full round-trip serialization and deserialization', () => {
    const initialState = createInitialPosterDesignState('classic-heritage');
    const jsonStr = serializePosterDesignDocument(initialState, 'Round Trip Document');
    const deserialized = deserializePosterDesignDocument(jsonStr);

    expect(deserialized.metadata.schemaVersion).toBe(2);
    expect(deserialized.metadata.title).toBe('Round Trip Document');
    expect(deserialized.state.productMode).toBe('detailed-poster');
  });
});
