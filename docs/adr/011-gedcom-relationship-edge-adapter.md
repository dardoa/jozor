# ADR 011: GEDCOM RelationshipEdge Adapter Design

## Status
Accepted

## Context
1. **Source of Truth**: Sprint 11 introduced `RelationshipEdge` as the Jozor 2.0 relationship source of truth.
2. **Backward Compatibility**: Legacy `Person.parents`, `Person.children`, and `Person.spouses` remain compatibility arrays to prevent breaking existing components.
3. **Current GEDCOM Export**: The current GEDCOM export consumes these legacy compatibility arrays.
4. **Pre-GEDCOM Hardening**: Security regression testing has successfully validated privacy masking for the `viewer` role on GEDCOM export, but relationship-edge native integration is deferred.
5. **Requirements for GEDCOM**: GEDCOM requires lineage-linked family (`FAM`) records built from spouse/parent-child relationships, so a mapping layer is needed.

## Decision
Introduce a `GEDCOMRelationshipAdapter` that builds GEDCOM-ready family groups from `RelationshipEdge` data first, then falls back to compatibility arrays only when edges are missing.

### RelationshipEdge Direction Rules
1. **Explicit Direction**: Parent-child edges must be interpreted from explicit edge type/direction, not inferred from person array order.
2. **Deterministic Spouse Normalization**: Spouse pairs must be normalized deterministically (e.g. sorted pair key) to avoid duplicate `FAM` records.
3. **Fallback Resolution**: Prefer `RelationshipEdge` as source of truth. Build family groups from spouse edges and parent-child edges, falling back to legacy arrays for local/older trees.
4. **Drift Detection**: Detect and report relationship drift between edges and legacy arrays. Warn without throwing when drift is non-fatal.

## Options Considered

### 1. Continue using Person arrays only
- **Pros**: Simple, already implemented.
- **Cons**: Diverges from Jozor 2.0 relationship model, risks exporting stale cache values.

### 2. Rewrite GEDCOM exporter directly against RelationshipEdge
- **Pros**: Direct source of truth.
- **Cons**: Mixes GEDCOM syntax formatting with relationship grouping logic, breaks legacy compat fallbacks.

### 3. Introduce `GEDCOMRelationshipAdapter`
- **Pros**: Isolates lineage grouping mapping, testable, fallback-ready, detects drift.
- **Cons**: Extra layer to maintain.

## Data Contract
```ts
interface GedcomFamilyGroup {
  readonly familyId: string;
  readonly spouseIds: readonly string[];
  readonly childIds: readonly string[];
  readonly source: 'relationship-edge' | 'legacy-array' | 'mixed';
  readonly warnings: readonly GedcomRelationshipWarning[];
}

interface GedcomRelationshipWarning {
  readonly code:
    | 'RELATIONSHIP_DRIFT'
    | 'MISSING_PERSON'
    | 'DUPLICATE_SPOUSE_PAIR'
    | 'SELF_RELATIONSHIP'
    | 'UNRESOLVED_PARENT_CHILD';
  readonly personIds: readonly string[];
  readonly message: string;
}
```

## Privacy Boundary
- `GEDCOMRelationshipAdapter` receives already-masked `people` from the export hook for viewer role.
- Adapter must not fetch from store directly.
- Adapter must not read raw Supabase database records.
- Warnings must use person IDs only and must not include display names, dates, places, or raw biographical fields.

## Activation Plan
1. Add `GEDCOMRelationshipAdapter` with tests.
2. Keep GEDCOM exporter behavior unchanged initially.
3. Add optional adapter-backed export path behind tests.
4. Compare edge output with legacy output.
5. Switch exporter to adapter once stable.
6. Keep legacy fallback for older/local trees.

## Future Verification Tests
- Edge and legacy arrays match => no warnings.
- Edge conflicts with arrays => `RELATIONSHIP_DRIFT`.
- Duplicate spouse edges produce one `FAM` record.
- Parent-child edges build correct family groups.
- Missing person produces warning, not crash.
- Masked viewer people remain masked in GEDCOM output.

## Consequences
- GEDCOM rewrite is deferred until adapter is specified and tested.
- Current privacy coverage remains valid.
- Future GEDCOM integration can align with Jozor 2.0 relationship source of truth without breaking older trees.
