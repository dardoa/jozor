# Visual Publishing Studio Store Shape Discovery

- **Status**: `Discovery Complete (Privacy regression fixture added)`
- **Connectivity**: `No Runtime Store Wiring`
- **Date**: 2026-07-09

---

## 1. Purpose

This document records the store and domain shapes discovered for future live preview selectors. It does not approve implementation of live selectors. It only documents which shapes future selectors may read and which fields must be excluded before data crosses into `productionPreviewSanitizer`.

---

## 2. Canonical Store Entry Points

Primary store module:

```text
src/store/useAppStore.ts
```

Relevant selectors already exported by the store:

- `selectPeople`
- `selectFocusId`
- `selectCurrentTreeId`
- `selectTreeSettings`

Relevant store slice:

```text
src/store/slices/familySlice.ts
```

Relevant family state fields:

- `people: Record<string, Person>`
- `confirmedPeople: Record<string, Person>`
- `relationships: Record<string, RelationshipEdge>`
- `focusId: string`
- `treeName: string`
- `peopleVersion: number`

---

## 3. Person Shape Discovery

Source:

```text
src/types/person.ts
```

The `Person` type contains safe and unsafe fields. Future preview selectors must not pass `Person` objects downstream.

### Potentially Allowed for Selector Mapping

These may be read by live selectors and mapped into `PreviewSanitizerRawNode`:

- `id` -> `rawId` only inside the selector/sanitizer boundary
- `firstName`
- `middleName`
- `lastName`
- `nickName`
- `birthDate`
- `deathDate`
- `isDeceased`
- `isPrivate`
- `parents`
- `spouses`
- `children`
- `photoUrl` / `photoPath` only as a boolean source for `hasProfilePhoto`

### Forbidden Downstream Fields

These must never enter `PreviewSanitizerRawGraph`:

- `email`
- `website`
- `blog`
- `address`
- `birthPlace`
- `deathPlace`
- `burialPlace`
- `residence`
- `currentResidence`
- `workplace`
- `company`
- `profession`
- `interests`
- `bio`
- `photoUrl`
- `photoPath`
- `gallery`
- `voiceNotes`
- `sources`
- `events`
- `metadata`

Notes/source/event fields are especially sensitive because they may contain free-form private text.

---

## 4. Relationship Shape Discovery

Source:

```text
src/types/relationship.ts
```

The `RelationshipEdge` type contains:

- `id`
- `treeId`
- `fromPersonId`
- `toPersonId`
- `type`
- `status`
- `metadata`
- `createdAt`
- `updatedAt`

Future selectors may use `fromPersonId`, `toPersonId`, and `type` to construct `PreviewSanitizerRawEdge`.

Forbidden downstream:

- `id`
- `treeId`
- `metadata`
- `createdAt`
- `updatedAt`
- relationship status notes or timing metadata

Relationship IDs are internal and must never enter preview adapters.

---

## 5. Settings Shape Discovery

Source:

```text
src/types/tree.ts
```

Potentially relevant `TreeSettings` fields:

- `showPhotos`
- `showDates`
- `showBirthDate`
- `showDeathDate`
- `generationLimit`
- `privacyMode`
- `isLowGraphicsMode`
- `ownerPersonId`
- `layoutMode`
- `chartType`

Future privacy policy mapper may map:

- `showPhotos` -> `VisualPreviewSanitizerPolicy.includePhotos`
- date visibility flags -> `includeYears`
- privacy settings/current role -> `privacyMode`
- generation limit -> selector `maxDepth`

Forbidden downstream:

- `sync_metadata`
- any raw settings wrapper metadata

---

## 6. Proposed Selector Input Shape

Future live selectors should not accept the full `AppStore` directly in adapter-facing code. Instead, create a minimal source shape:

```typescript
interface PreviewLiveTreeSource {
  readonly people: Record<string, Person>;
  readonly relationships: Record<string, RelationshipEdge>;
  readonly focusId: string;
  readonly treeSettings: TreeSettings;
}
```

This source shape may exist only at the selector layer. It must not be passed to sanitizer, adapter, or Studio components.

---

## 7. Mapping Rules

Future live selector mapping to `PreviewSanitizerRawNode`:

- `rawId`: `person.id`
- `displayName`: formatted from allowed name fields only
- `isLiving`: `!person.isDeceased`
- `isPrivate`: `person.isPrivate`
- `generation`: computed by product selector logic
- `relationshipHint`: computed from selector context
- `birthDate`: `person.birthDate`
- `deathDate`: `person.deathDate`
- `hasProfilePhoto`: boolean from presence of `photoUrl` or `photoPath`

Future live selector mapping to `PreviewSanitizerRawEdge`:

- `fromRawId`: parent/source person id
- `toRawId`: child/target person id
- `relationshipType`: mapped from `RelationshipEdge.type`

---

## 8. Required Tests Before Live Selector Reads

Before selectors can read from `useAppStore`, tests must prove:

- no `Person` objects are returned directly
- no `RelationshipEdge` objects are returned directly
- no contact fields are serialized in output
- no media URL/path is serialized in output
- no note/source/event text is serialized in output
- relationship IDs are not serialized
- private/living people are masked by sanitizer
- generated `PreviewSanitizerRawGraph` passes through `productionPreviewSanitizer`

---

## 9. Decision

- **Approved**: Store/domain shape discovery.
- **Blocked**: Live selector reads.
- **Privacy Regression Result**: `Phase 4I - Live Selector Privacy Regression Tests` added store-shaped fixture tests without live store reads.
- **Next Step**: `Phase 4J - Live Selector Review Gate`.
