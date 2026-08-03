import type {
  PreviewLivePersonRecord,
  PreviewLiveRelationshipRecord,
  PreviewLiveTreeSource,
} from './previewLiveGraphSelectors';

export interface PreviewStorePersonInput {
  readonly rawId: string;
  readonly displayName?: string;
  readonly firstName?: string;
  readonly middleName?: string;
  readonly lastName?: string;
  readonly birthDate?: string;
  readonly deathDate?: string;
  readonly birthPlace?: string;
  readonly occupation?: string;
  readonly description?: string;
  readonly isDeceased?: boolean;
  readonly isPrivate?: boolean;
  readonly hasProfilePhoto?: boolean;
}

export interface PreviewStoreRelationshipInput {
  readonly fromPersonId: string;
  readonly toPersonId: string;
  readonly type: 'BIOLOGICAL_PARENT' | 'ADOPTIVE_PARENT' | 'PARENT_CHILD' | 'SPOUSE' | 'PARTNER' | 'RELATIVE';
}

export interface PreviewStoreSourceInput {
  readonly people: readonly PreviewStorePersonInput[];
  readonly relationships: readonly PreviewStoreRelationshipInput[];
  readonly sourceKind?: PreviewLiveTreeSource['sourceKind'];
  readonly sourceSessionKey?: string;
  readonly defaultRootRawId?: string;
}

const toDisplayName = (person: PreviewStorePersonInput): string =>
  person.displayName ||
  [person.firstName, person.middleName, person.lastName]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ');

const toRelationshipType = (
  type: PreviewStoreRelationshipInput['type']
): PreviewLiveRelationshipRecord['relationshipType'] => {
  if (type === 'SPOUSE' || type === 'PARTNER') return 'spouse';
  if (type === 'RELATIVE') return 'relative';
  return 'parent-child';
};

export function mapPreviewStoreSourceToLiveTreeSource(
  source: PreviewStoreSourceInput
): PreviewLiveTreeSource {
  const people = source.people.reduce<Record<string, PreviewLivePersonRecord>>((acc, person) => {
    acc[person.rawId] = {
      rawId: person.rawId,
      displayName: toDisplayName(person),
      isLiving: person.isDeceased === undefined ? undefined : !person.isDeceased,
      isPrivate: person.isPrivate,
      birthDate: person.birthDate,
      deathDate: person.deathDate,
      birthPlace: person.birthPlace,
      occupation: person.occupation,
      description: person.description,
      hasProfilePhoto: person.hasProfilePhoto,
    };
    return acc;
  }, {});

  return {
    sourceKind: source.sourceKind || 'unknown',
    sourceSessionKey: source.sourceSessionKey,
    defaultRootRawId: source.defaultRootRawId,
    people,
    relationships: source.relationships.map((relationship) => ({
      fromRawId: relationship.fromPersonId,
      toRawId: relationship.toPersonId,
      relationshipType: toRelationshipType(relationship.type),
    })),
  };
}
