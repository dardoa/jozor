# ADR-002: Relationship Edge Model & User Identity

## Status
Accepted (June 2026)

## Context
In Jozor 1.0, relationships are modeled as simple arrays of IDs on the `Person` interface: `parents: string[]`, `spouses: string[]`, and `children: string[]`. While simple, this architecture has critical limitations:
1. **Lack of Rich Semantics**: It assumes all relationships are linear and biological. It cannot model complex relationships such as adoption (`ADOPTIVE_PARENT`), legal guardianship (`GUARDIAN`), foster parenting (`FOSTER_PARENT`), or step-relationships (`STEP_PARENT`).
2. **Data Integrity & Concurrency**: In collaborative sessions, updating array-based relationship fields creates LWW (Last-Write-Wins) sync conflicts, as simultaneous edits on separate relatives can easily overwrite the entire array.
3. **User Context**: The system does not know which person node represents the current owner of the tree, hindering personalized features like Kindi AI assistant interactions, pathfinding, and relationship-centric views.
4. **Missing Narrative Attributes**: Important biographical attributes like current residence, occupation, and workplace are missing from the `Person` model, which are crucial for GEDCOM 7 compatibility, narrative summaries, and spatial histories.

## Decision
We will separate relationship data from person data by introducing a standalone `RelationshipEdge` model and a new IndexedDB table, while expanding the `Person` model to include narrative attributes and owner mapping.

### 1. Data Model Additions

#### Standalone Relationship Edge
We will use directed names (`fromPersonId` and `toPersonId`) to clearly represent relationship hierarchy (e.g. parent -> child), and add `status` and `updatedAt` for future-proofing:
```typescript
export type RelationshipEdgeType =
  | 'BIOLOGICAL_PARENT'
  | 'ADOPTIVE_PARENT'
  | 'GUARDIAN'
  | 'FOSTER_PARENT'
  | 'STEP_PARENT'
  | 'SPOUSE'
  | 'PARTNER';

export interface RelationshipEdge {
  readonly id: string; // unique UUID
  readonly treeId: string;
  readonly fromPersonId: string; // Parent or Spouse 1 (symmetrical marriages ordered alphabetically)
  readonly toPersonId: string;   // Child or Spouse 2
  readonly type: RelationshipEdgeType;
  readonly status?: 'ACTIVE' | 'ENDED' | 'UNKNOWN';
  readonly metadata?: {
    readonly startDate?: string;
    readonly startPlace?: string;
    readonly endDate?: string;
    readonly endPlace?: string;
    readonly [key: string]: unknown;
  };
  readonly updatedAt?: string; // ISO timestamp for LWW sync
  readonly createdAt: string;  // ISO timestamp
}
```

#### Expanded Person Model
We will add the following optional fields to the `Person` interface in [person.ts](file:///d:/AppDEV/Jozor1.1/src/types/person.ts):
```typescript
export interface Person {
  // ... existing fields
  readonly currentResidence?: string;
  readonly occupation?: string;
  readonly workplace?: string;
}
```

#### User Identity Mapping
We will add `ownerPersonId` to the `TreeSettings` interface in [tree.ts](file:///d:/AppDEV/Jozor1.1/src/types/tree.ts):
```typescript
export interface TreeSettings {
  // ... existing settings
  readonly ownerPersonId?: string | null;
}
```

### 2. IndexedDB Schema Upgrade (Version 5)
We will upgrade Dexie schema in [db.ts](file:///d:/AppDEV/Jozor1.1/src/utils/db.ts) to Version 5. Optimized compound indexes will support queries such as fetching relationships for a specific person or type:
```typescript
relationships: 'id, treeId, fromPersonId, toPersonId, type, [treeId+fromPersonId], [treeId+toPersonId], [treeId+type]'
```

### 3. Redux / Zustand State & Sync Strategy
To maintain absolute backward compatibility with the existing layout/rendering pipeline (`buildFamilyGraph`), export formats, and UI components:
* **Source of Truth**: The `relationships` store is the primary source of truth.
* **Denormalized Helper Fields**: The `parents`, `spouses`, and `children` arrays on the `Person` object in memory and IndexedDB will be retained but updated automatically as denormalized collections synchronized with the edges.
* **Derivation Strictness**: When deriving relationships from people (e.g. during migration or import), the parser will strictly validate:
  1. No self-relationships (`fromPersonId === toPersonId`).
  2. No missing nodes (both people must exist in the tree).
  3. No duplicate spouse pairs (normalized such that `fromPersonId < toPersonId`).
  4. No duplicate parental links.
* **Database Migration**: During the Dexie Version 5 upgrade, a migration step will read all people in the database and generate corresponding biological parent and spouse relationship edges in the `relationships` store.

```mermaid
graph TD
    DB[(IndexedDB JozorDB)] -->|Upgrade V5| Mig[Migration: Generate Edges from Person arrays]
    Mig -->|Populate| RelTable[(relationships Table)]
    
    SubGraph[Zustand Store / Memory]
        PeopleState[people: Record Person]
        RelState[relationships: Record RelationshipEdge]
    end
    
    RelTable -->|Load| RelState
    
    DB -->|Load people| PeopleState
    
    Click[Add/Modify Rel Action] -->|Domain Reducer| UpdateEdge[Update relationships state & table]
    UpdateEdge -->|Sync Routine| UpdateDenorm[Update person.parents/spouses/children arrays]
```

## Consequences
* **Backward Compatibility**: Fully preserved. Existing components, layout engines, and GEDCOM parsing logic continue to read `person.parents`, `spouses`, and `children` fields.
* **Future-Proofing**: The presence of the `relationships` edge table allows future sprints to support complex blended family configurations and timeline histories of marital/parental links.
* **Enhanced Personalization**: Knowing `ownerPersonId` allows Kindi AI to speak from the user's perspective (e.g. "your grandfather") and enables computing lineage paths relative to the owner.
