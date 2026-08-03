import { useMemo } from 'react';
import {
  deriveRelationshipsFromPeople,
  type RelationshipEdgeType,
} from '../../../../types/relationship';
import { useAppStore } from '../../../../store/useAppStore';
import { getPersonPhoto } from '../../../../utils/mediaUtils';
import {
  mapPreviewStoreSourceToLiveTreeSource,
  type PreviewStorePersonInput,
  type PreviewStoreRelationshipInput,
  type PreviewLiveTreeSource,
} from '../../../publishing';

export interface VisualStudioStorePreviewInput {
  readonly source: PreviewLiveTreeSource;
  readonly resolvePosterImageSource: (personId: string) => string | undefined;
}

const toDisplayName = (person: {
  readonly title?: string;
  readonly firstName?: string;
  readonly middleName?: string;
  readonly lastName?: string;
  readonly suffix?: string;
}): string =>
  [person.title, person.firstName, person.middleName, person.lastName, person.suffix]
    .map((part) => part?.trim())
    .filter(Boolean)
  .join(' ');

const toPreviewRelationshipType = (
  type: RelationshipEdgeType
): PreviewStoreRelationshipInput['type'] => {
  if (type === 'SPOUSE') return 'SPOUSE';
  if (type === 'PARTNER') return 'PARTNER';
  if (type === 'ADOPTIVE_PARENT') return 'ADOPTIVE_PARENT';
  return 'BIOLOGICAL_PARENT';
};

/**
 * Hidden Studio bridge from the app store to PreviewLiveTreeSource.
 *
 * This hook intentionally extracts only preview-approved fields and immediately
 * drops contact details, raw media paths, citations, event text, and metadata.
 * The optional biography value can only cross into PosterScene after sanitizer
 * masking, normalization, and one-line truncation.
 */
export function useVisualStudioStorePreviewSource(): VisualStudioStorePreviewInput {
  const people = useAppStore((state) => state.people);
  const currentTreeId = useAppStore((state) => state.currentTreeId);
  const focusId = useAppStore((state) => state.focusId);

  return useMemo(() => {
    const personInputs: PreviewStorePersonInput[] = Object.values(people).map((person) => ({
      rawId: person.id,
      displayName: toDisplayName(person),
      birthDate: person.birthDate,
      deathDate: person.deathDate,
      birthPlace: person.birthPlace,
      occupation: person.occupation || person.profession,
      description: person.bio,
      isDeceased: person.isDeceased,
      isPrivate: person.isPrivate,
      hasProfilePhoto: Boolean(person.photoUrl || person.photoPath),
    }));

    const relationshipInputs: PreviewStoreRelationshipInput[] = Object.values(
      deriveRelationshipsFromPeople(currentTreeId || 'preview-tree', people)
    ).map((relationship) => ({
      fromPersonId: relationship.fromPersonId,
      toPersonId: relationship.toPersonId,
      type: toPreviewRelationshipType(relationship.type),
    }));

    return {
      source: mapPreviewStoreSourceToLiveTreeSource({
        sourceKind: 'store',
        sourceSessionKey: currentTreeId || 'preview-tree',
        defaultRootRawId: focusId && people[focusId] ? focusId : Object.keys(people)[0],
        people: personInputs,
        relationships: relationshipInputs,
      }),
      resolvePosterImageSource: (personId: string) => getPersonPhoto(people[personId]) ?? undefined,
    };
  }, [currentTreeId, focusId, people]);
}
