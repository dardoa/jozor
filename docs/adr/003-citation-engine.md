﻿﻿﻿﻿﻿﻿# ADR-003: Citation Engine Architecture

## Status
Accepted (June 2026)

## Context
In Jozor 1.0, source referencing is unstructured:
1. **Unstructured Vital Sources**: Birth and death sources are modeled as plain-text fields on the `Person` interface (`birthSource: string`, `deathSource: string`).
2. **Flat Person Sources**: General sources are modeled as a flat array of object items directly on the `Person` interface (`sources: { id, title, url, date, type }[]`).
3. **No Event or Relationship Links**: It is impossible to reference sources for specific custom life events or relationship links.
4. **Data Redundancy**: If multiple relatives share the same source, the source metadata must be duplicated on every single relative's record.

To support high-fidelity research and GEDCOM 7 compatibility, we need a normalized, shared citation engine where individual facts, events, and relationship links can reference structured, shared sources.

## Decision
We will build the **Citation Engine Kernel** (Sprint 12) to separate source definitions from individual person records by introducing shared `Source` entities and a `Citation` link model, supported by new IndexedDB stores in Dexie Version 6. To prevent update loops or data corruption in the first phase, backward synchronization (`sources/citations` -> `people`) will not run automatically in the Zustand store. Instead, we will implement an explicit utility helper function to apply citations to legacy fields on-demand.

### 1. Data Models

#### Shared Source
A shared source entity represents a single repository-level source (a book, website, record, oral history, etc.). Duplicate sources are prevented by generating a `normalizedKey` (derived from treeId, type, and normalized title). We add an optional `origin` field to track where the source came from (e.g. `'local'`, `'gedcom'`, or a specific sync identifier):
```typescript
export interface Source {
  readonly id: string; // Deterministic UUID based on normalizedKey
  readonly treeId: string;
  readonly type: 'DOCUMENT' | 'ORAL' | 'PHOTO' | 'ARCHIVE' | 'BOOK' | 'WEBSITE' | 'OTHER';
  readonly title: string;
  readonly normalizedKey: string; // normalized key for duplicate checking: treeId:type:title_normalized
  readonly author?: string;
  readonly date?: string;
  readonly url?: string;
  readonly notes?: string;
  readonly origin?: string; // origin of data (e.g. 'local', 'gedcom')
  readonly createdAt: string;  // ISO timestamp
  readonly updatedAt?: string; // ISO timestamp
}
```

#### Citation Claim Keys & Citation Link
A citation maps a specific fact, event, or relationship field to a shared source, detailing how/where the source verifies the claim. We introduce a standardized union type `CitationClaimKey` for target fields, and add `origin` to track citation provenance:
```typescript
export type CitationClaimKey =
  | 'person.birth.date'
  | 'person.birth.place'
  | 'person.death.date'
  | 'person.death.place'
  | 'person.profile.sources'
  | 'relationship.parent'
  | 'relationship.spouse'
  | 'event.date'
  | 'event.place';

export interface Citation {
  readonly id: string; // Deterministic UUID based on target properties
  readonly treeId: string;
  readonly sourceId: string; // Points to Source.id
  readonly targetType: 'PERSON' | 'RELATIONSHIP' | 'EVENT';
  readonly targetId: string; // Person ID, Relationship ID, or Event ID
  readonly targetField?: CitationClaimKey | string; // Specific field/claim being cited
  readonly quote?: string; // Transcript/quote from the source
  readonly notes?: string; // Researcher note
  readonly confidence?: 'LOW' | 'MEDIUM' | 'HIGH';
  readonly origin?: string; // origin of citation (e.g. 'local', 'gedcom')
  readonly createdAt: string;  // ISO timestamp
  readonly updatedAt?: string; // ISO timestamp
}
```

### 2. Deterministic UUID Generation (SHA-256 Behavior)
To avoid IndexedDB write churn when deriving sources and citations dynamically, we use a deterministic UUID generation strategy based on SHA-256:
- For sources: hash the `normalizedKey`.
- For citations: hash the combination of target properties: `treeId + ":" + sourceId + ":" + targetType + ":" + targetId + ":" + (targetField ?? "")`.

#### SHA-256 to UUID Formatting Algorithm:
1. Compute the SHA-256 hash of the input string, yielding a 64-character hex string.
2. Take the first 32 characters of the hex string.
3. Replace the 13th character (index 12) with `'4'` (specifying UUID version 4).
4. Replace the 17th character (index 16) with `'8'`, `'9'`, `'a'`, or `'b'` (specifying RFC 4122 variant). We will standardize on `'a'`.
5. Format the resulting string with hyphens: `xxxxxxxx-xxxx-4xxx-axxx-xxxxxxxxxxxx` (8-4-4-4-12 structure).

This ensures standard UUID validators will pass while maintaining absolute determinism.

### 3. IndexedDB Schema Upgrade (Version 6)
We will upgrade Dexie schema in [db.ts](file:///d:/AppDEV/Jozor1.1/src/utils/db.ts) to Version 6.
New stores:
```typescript
sources: 'id, treeId, type, normalizedKey, [treeId+type], [treeId+normalizedKey]'
citations: 'id, treeId, sourceId, targetType, targetId, targetField, [treeId+targetId], [treeId+sourceId], [treeId+targetType], [treeId+targetType+targetId]'
```

#### Migration Strategy (V5 -> V6)
During the upgrade transaction, we will automatically migrate legacy unstructured sources to structured sources and citations:
1. Scan all existing `people` records.
2. For each person:
   - For each item in `person.sources`:
     - Generate a `normalizedKey` (e.g. `treeId:DOCUMENT:title_normalized`).
     - Deduplicate and register a shared `Source` record under the tree (with `origin: 'migration'`).
     - Create a general `Citation` linking that person to the shared source (`targetType: 'PERSON'`, `targetId: person.id`, `targetField: 'person.profile.sources'`, `origin: 'migration'`).
   - If `person.birthSource` is set and not empty:
     - Find/create a shared `Source` for it (using a normalized key).
     - Create a birth date `Citation` (`targetType: 'PERSON'`, `targetId: person.id`, `targetField: 'person.birth.date'`, `origin: 'migration'`).
   - If `person.deathSource` is set and not empty:
     - Find/create a shared `Source` for it (using a normalized key).
     - Create a death date `Citation` (`targetType: 'PERSON'`, `targetId: person.id`, `targetField: 'person.death.date'`, `origin: 'migration'`).

### 4. Backwards Compatibility & Synchronization
* **Explicit On-Demand Sync Utility**: Rather than running reactive sync automatically inside `familySlice.ts` (which could cause infinite update loops or corrupt legacy data), we will implement an explicit helper function `applyCitationsToLegacyPersonFields(people, citations, sources)`.
  This utility can be called on-demand to update the legacy `person.sources`, `person.birthSource`, and `person.deathSource` fields based on the structured sources/citations.
* **Integrity Cascades**:
  - Deleting a person automatically deletes all citations targeting that person (where `targetId === person.id`).
  - Deleting a relationship automatically deletes all citations targeting that relationship.
  - Deleting a source automatically deletes all citations referencing that source.

## Consequences
* **Normalized Data**: Shared sources eliminate data redundancy.
* **Deterministic Stability**: SHA-256 based UUID generation prevents IndexedDB write churn during derivation.
* **Granular Evidence**: Birth place, birth date, marriages, and events can now be proven independently with distinct page numbers, confidence levels, and transcript quotes.
* **Safe Evolution**: By decoupling automatic sync from the Zustand actions, the kernel remains safe and isolated, preventing regressions in current UI rendering.
