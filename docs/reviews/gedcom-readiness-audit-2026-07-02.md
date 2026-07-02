# GEDCOM Privacy & Relationship Readiness Audit (2026-07-02)

This document reviews the current status and security posture of the GEDCOM import/export engine within Jozor.

## Status Summary
- **Export Privacy**: Masking for `viewer` roles is enforced at the hook boundary (`useExport.ts`) before passing the dataset to `exportToGEDCOM`.
- **Relationships Model**: GEDCOM exporter relies on legacy `Person.parents/spouses/children` arrays. Modern `RelationshipEdge` mapping is handled in store adapters and is not native to the GEDCOM exporter.
- **Import Verification**: Import logic accepts standard format datasets but relies on subsequent exports/viewer rules to apply privacy.

---

## 1. Confirmed Behavior (Implemented)

### Export Privacy Gating
- When the current user role is `viewer`, the React export hook (`useExport.ts`) pre-masks the `Person` record.
- Masked records substitute name fields with `'Private'` and redact sensitive biographical dates/places (e.g. `birthDate`, `birthPlace`).
- Cross-references (`FAMS`, `FAMC`, `FAM` husband/wife/child references) associate individuals correctly using IDs, ensuring family linkages remain intact even when name metadata is masked.

---

## 2. Deferred Limitations (Pending Hardening)

### Legacy Array Dependency
- The `exportToGEDCOM` function in `gedcomLogic.ts` directly loops through `person.parents` and `person.spouses`.
- **Deferred Limitation**: If store relationship conflicts occur (e.g., `RelationshipEdge` database values differ from local legacy arrays), the GEDCOM exporter reflects only the local legacy arrays. Full `RelationshipEdge`-native GEDCOM generation is deferred to a future milestone.

### Import Parser Gaps
- The current import parser accepts uploaded files and parses standard records.
- **Deferred Limitation**: High-performance parser resilience checks (such as circular relationships, self-parent links, and very large duplicate identity blocks) are pending future hardening. Privacy masking is only applied on the export/viewer path, not at import time.

---

## 3. Recommended Actions
- Re-architect `exportToGEDCOM` to consume `RelationshipEdge` records once the database mapping completes.
- Add backend-side import validation to guard against self-parent loops and relationship cycles before records persist.
