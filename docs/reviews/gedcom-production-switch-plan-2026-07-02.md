# GEDCOMRelationshipAdapter Production Switch Plan

This plan documents the step-by-step strategy to switch production GEDCOM exports to consume Jozor 2.0 `RelationshipEdge` data safely using the newly implemented `GEDCOMRelationshipAdapter`.

---

## 1. Current State Audit

### Export Surface
- `exportToGEDCOM` (in `src/utils/gedcomLogic.ts`) currently derives `FAM` and `FAMC`/`FAMS` records exclusively by looping through legacy arrays: `person.parents` and `person.spouses`.
- `useExport.ts` (the main export hook) has direct access to `relationships` (`Record<string, RelationshipEdge>`) inside `useAppStore.getState()`, but currently discards it for GEDCOM, passing only `activePeople` to `exportToGEDCOM`.
- **Viewer Privacy Masking**: Masking is enforced upstream inside the hook `useExport.ts` using `maskPeopleMap(people)` before `exportToGEDCOM` is invoked.
- **JOZOR Archives**: `.jozor` exports currently package `people` (masked for viewer role), `locations`, and `settings`, but do not pack relationship edges separately.

---

## 2. Phased Production Switch Strategy

### Phase A: Internal Config/Options Extension
Modify `exportToGEDCOM` interface to accept optional configuration:

```ts
export interface GedcomExportOptions {
  readonly relationshipEdges?: Record<string, RelationshipEdge> | readonly RelationshipEdge[];
  readonly relationshipMode?: 'legacy-array' | 'relationship-edge';
}

export const exportToGEDCOM = (
  people: Record<string, Person>,
  options: GedcomExportOptions = {}
): string => {
  // ...
};
```

1. Default mode remains `'legacy-array'`.
2. If `'relationship-edge'` is selected:
   - Call `buildGedcomFamilyGroups` to get the family groups.
   - Map GEDCOM `FAM` blocks and individual `FAMS`/`FAMC` references based on the adapter groups.
   - Use already-masked `people` input for `INDI` blocks to preserve viewer privacy.

### Phase B: Comparative Gated Verification (Dry-Run Integration)
Add vitest test suites asserting:
1. When no edges are provided, the exporter fallback output matches legacy outputs byte-for-byte.
2. In edge mode, it outputs equivalent FAM listings compared to arrays.
3. Validate that `compareGedcomRelationships` comparison outputs are recorded in test logs to verify legacy-to-edge equivalence.

### Phase C: Hook Switch & Feature Gating
1. Update `useExport.ts` to call `exportToGEDCOM(activePeople, { relationshipEdges: relationships, relationshipMode: 'legacy-array' })` initially to preserve default legacy output.
2. Introduce an internal development flag to override `relationshipMode` to `'relationship-edge'` for developer dry runs. Do not expose a UI toggle.

---

## 3. Risks & Rollback Strategy
- **Risk**: Edge mappings differ from legacy arrays due to cache drift, leading to slightly different families in exported files.
- **Mitigation/Rollback**: By keeping `'legacy-array'` as the default option parameter, we can instantly rollback the switch by removing the parameter or setting it back to `'legacy-array'`.

---

## 4. Privacy Guarantees
- The adapter does not fetch store state directly and works only with input records.
- Uppercased/masked people are supplied by hook callers, guaranteeing viewer masking is preserved under both legacy and edge relationship modes.
- Warnings/errors in comparisons and adapter logs use person IDs only, keeping names/dates/places completely masked.

---

## 5. Recommendation
**Proceed with Phase A and Phase B implementation** to add the adapter-backed path and dry-run tests. Keep Phase C gated until comparison verification runs on larger family datasets.
