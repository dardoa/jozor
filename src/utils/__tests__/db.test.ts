import { describe, expect, it } from 'vitest';
import { db, JOZOR_DB_SCHEMA_VERSION } from '../db';

describe('Dexie Database Schema Verification', () => {
  it('Dexie database instance has launch baseline configured', () => {
    expect(db.verno).toBe(JOZOR_DB_SCHEMA_VERSION);
  });

  it('All tables exist and have correct schemas', () => {
    const tableNames = db.tables.map((t) => t.name);
    expect(tableNames).toContain('people');
    expect(tableNames).toContain('settings');
    expect(tableNames).toContain('pending_operations');
    expect(tableNames).toContain('person_tombstones');
    expect(tableNames).toContain('person_media_cleanup');
    expect(tableNames).toContain('archive_import_cleanup');
    expect(tableNames).toContain('export_history');
    expect(tableNames).toContain('relationships');
    expect(tableNames).toContain('sources');
    expect(tableNames).toContain('citations');
  });

  it('Verifies primary keys and indexes for all tables', () => {
    // 1. People
    const peopleSchema = db.people.schema;
    expect(peopleSchema.primKey.name).toBe('id');

    // 2. Settings
    const settingsSchema = db.settings.schema;
    expect(settingsSchema.primKey.name).toBe('key');

    // 3. Pending Operations
    const pendingOpsSchema = db.pending_operations.schema;
    expect(pendingOpsSchema.primKey.src).toBe('++id');
    expect(pendingOpsSchema.primKey.auto).toBe(true);
    expect(pendingOpsSchema.indexes.some((i) => i.name === 'tree_id')).toBe(true);

    // 4. Person Tombstones
    const tombstonesSchema = db.person_tombstones.schema;
    expect(tombstonesSchema.primKey.src).toBe('[tree_id+person_id]');
    expect(tombstonesSchema.indexes.some((i) => i.name === 'tree_id')).toBe(true);
    expect(tombstonesSchema.indexes.some((i) => i.name === 'person_id')).toBe(true);
    expect(tombstonesSchema.indexes.some((i) => i.name === 'deleted_at')).toBe(true);

    const mediaCleanupSchema = db.person_media_cleanup.schema;
    expect(mediaCleanupSchema.primKey.src).toBe('++id');
    expect(mediaCleanupSchema.indexes.some((i) => i.name === 'dedupe_key')).toBe(true);
    expect(mediaCleanupSchema.indexes.some((i) => i.name === 'tree_id')).toBe(true);
    expect(mediaCleanupSchema.indexes.some((i) => i.name === 'user_id')).toBe(true);
    expect(db.archive_import_cleanup.schema.primKey.name).toBe('tree_id');
    expect(db.archive_import_cleanup.schema.indexes.some(i => i.name === 'user_id')).toBe(true);

    // 5. Export History
    const exportHistorySchema = db.export_history.schema;
    expect(exportHistorySchema.primKey.src).toBe('++id');
    expect(exportHistorySchema.primKey.auto).toBe(true);
    expect(exportHistorySchema.indexes.some((i) => i.name === 'publicationId')).toBe(true);
    expect(exportHistorySchema.indexes.some((i) => i.name === 'treeId')).toBe(true);

    // 6. Relationships
    const relationshipsSchema = db.relationships.schema;
    expect(relationshipsSchema.primKey.name).toBe('id');
    expect(relationshipsSchema.indexes.some((i) => i.name === 'treeId')).toBe(true);
    expect(relationshipsSchema.indexes.some((i) => i.name === 'fromPersonId')).toBe(true);
    expect(relationshipsSchema.indexes.some((i) => i.name === 'toPersonId')).toBe(true);
    expect(relationshipsSchema.indexes.some((i) => i.name === 'type')).toBe(true);
    expect(relationshipsSchema.indexes.some((i) => i.name === '[treeId+fromPersonId]')).toBe(true);
    expect(relationshipsSchema.indexes.some((i) => i.name === '[treeId+toPersonId]')).toBe(true);
    expect(relationshipsSchema.indexes.some((i) => i.name === '[treeId+type]')).toBe(true);

    // 7. Sources
    const sourcesSchema = db.sources.schema;
    expect(sourcesSchema.primKey.name).toBe('id');
    expect(sourcesSchema.indexes.some((i) => i.name === 'treeId')).toBe(true);
    expect(sourcesSchema.indexes.some((i) => i.name === 'type')).toBe(true);
    expect(sourcesSchema.indexes.some((i) => i.name === 'normalizedKey')).toBe(true);
    expect(sourcesSchema.indexes.some((i) => i.name === '[treeId+type]')).toBe(true);
    expect(sourcesSchema.indexes.some((i) => i.name === '[treeId+normalizedKey]')).toBe(true);

    // 8. Citations
    const citationsSchema = db.citations.schema;
    expect(citationsSchema.primKey.name).toBe('id');
    expect(citationsSchema.indexes.some((i) => i.name === 'treeId')).toBe(true);
    expect(citationsSchema.indexes.some((i) => i.name === 'sourceId')).toBe(true);
    expect(citationsSchema.indexes.some((i) => i.name === 'targetType')).toBe(true);
    expect(citationsSchema.indexes.some((i) => i.name === 'targetId')).toBe(true);
    expect(citationsSchema.indexes.some((i) => i.name === 'targetField')).toBe(true);
    expect(citationsSchema.indexes.some((i) => i.name === '[treeId+targetId]')).toBe(true);
    expect(citationsSchema.indexes.some((i) => i.name === '[treeId+sourceId]')).toBe(true);
    expect(citationsSchema.indexes.some((i) => i.name === '[treeId+targetType]')).toBe(true);
    expect(citationsSchema.indexes.some((i) => i.name === '[treeId+targetType+targetId]')).toBe(true);
  });
});
