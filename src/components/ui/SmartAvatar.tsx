import { memo, useMemo, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useCachedImage } from '../../hooks/utils/useCachedImage';
import { usePersonMediaAssetUrl } from '../../hooks/utils/usePersonMediaAssetUrls';
import { isPersonMediaAssetRef } from '../../types';

import type { Person } from '../../types';
import { stringToGradient } from '../../utils/stringToColor';
import {
  FEMALE_ADULT_PATHS,
  FEMALE_CHILD_PATHS,
  FEMALE_SENIOR_PATHS,
  FEMALE_YOUNG_PATHS,
  MALE_ADULT_PATHS,
  MALE_CHILD_PATHS,
  MALE_SENIOR_PATHS,
  MALE_YOUNG_PATHS,
} from './smartAvatarPaths';

type AgeBand = 'child' | 'young' | 'adult' | 'senior';
type AvatarGender = 'male' | 'female';

interface SmartAvatarProps {
  person: Pick<Person, 'id' | 'firstName' | 'lastName' | 'gender' | 'birthDate' | 'photoUrl' | 'photoAsset' | 'children' | 'parents' | 'spouses'>;
  size: number;
  className?: string;
}

const SILHOUETTE_FILL = 'rgba(255,255,255,0.7)';
const DEFAULT_SILHOUETTE_VIEW_BOX = '0 0 400 400';
const FEMALE_ADULT_VIEW_BOXES = [
  '30 5 335 430',
  '15 -5 385 405',
  '0 -5 380 415',
] as const;

const calculateAge = (birthDate: string): number => {
  const date = new Date(birthDate);
  if (Number.isNaN(date.getTime())) return -1;

  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const hasHadBirthday =
    now.getMonth() > date.getMonth() ||
    (now.getMonth() === date.getMonth() && now.getDate() >= date.getDate());

  if (!hasHadBirthday) age -= 1;
  return age;
};

const getAgeBand = (
  person: SmartAvatarProps['person'],
  people?: Record<string, Person>
): AgeBand => {
  // 1. Direct check if birthDate exists
  if (person.birthDate) {
    const age = calculateAge(person.birthDate);
    if (age >= 0) {
      if (age <= 12) return 'child';
      if (age <= 25) return 'young';
      if (age <= 60) return 'adult';
      return 'senior';
    }
  }

  // 2. Generational Heuristics (if no valid birthDate)
  if (people) {
    const childrenIds = person.children || [];

    // Check for Grandchildren -> Senior
    const hasGrandchildren = childrenIds.some(
      (childId) => (people[childId]?.children?.length ?? 0) > 0
    );
    if (hasGrandchildren) return 'senior';

    // Check for Adult Children -> Senior
    const hasAdultChildren = childrenIds.some((childId) => {
      const child = people[childId];
      if (!child) return false;
      if ((child.children?.length ?? 0) > 0 || (child.spouses?.length ?? 0) > 0) return true;
      if (child.birthDate && calculateAge(child.birthDate) > 18) return true;
      return false;
    });
    if (hasAdultChildren) return 'senior';

    // Has children but no grandchildren/adult children yet -> Adult
    if (childrenIds.length > 0) return 'adult';

    // Is child of a Senior -> Young or Adult
    const parentIds = person.parents || [];
    const isChildOfSenior = parentIds.some((parentId) => {
      const parent = people[parentId];
      if (!parent) return false;
      if (parent.birthDate && calculateAge(parent.birthDate) > 55) return true;
      if (parent.children?.some((cid) => (people[cid]?.children?.length ?? 0) > 0)) return true;
      return false;
    });

    if (isChildOfSenior) {
      return 'young';
    }
  }

  return 'adult';
};

const getGender = (person: Pick<Person, 'gender'>): AvatarGender => (person.gender === 'female' ? 'female' : 'male');

const SILHOUETTE_PATHS: Record<AvatarGender, Record<AgeBand, readonly string[]>> = {
  female: {
    child: FEMALE_CHILD_PATHS,
    young: FEMALE_YOUNG_PATHS,
    adult: FEMALE_ADULT_PATHS,
    senior: FEMALE_SENIOR_PATHS,
  },
  male: {
    child: MALE_CHILD_PATHS,
    young: MALE_YOUNG_PATHS,
    adult: MALE_ADULT_PATHS,
    senior: MALE_SENIOR_PATHS,
  },
};

const getStableIndex = (id: string, length: number) => {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash % length;
};

const getSilhouetteVariant = (personId: string, gender: AvatarGender, ageBand: AgeBand) => {
  const paths = SILHOUETTE_PATHS[gender][ageBand];
  const index = getStableIndex(personId, paths.length);
  return { index, path: paths[index] };
};

const getPathViewBox = (pathData: string, gender: AvatarGender, ageBand: AgeBand, variantIndex: number) => {
  if (gender === 'female' && ageBand === 'adult') {
    return FEMALE_ADULT_VIEW_BOXES[variantIndex] ?? FEMALE_ADULT_VIEW_BOXES[0];
  }

  const numbers = pathData.match(/-?\d+(?:\.\d+)?/g)?.map(Number);
  if (!numbers || numbers.length < 4) return DEFAULT_SILHOUETTE_VIEW_BOX;

  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < numbers.length - 1; i += 2) {
    xs.push(numbers[i]);
    ys.push(numbers[i + 1]);
  }

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const width = maxX - minX;
  const height = maxY - minY;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return DEFAULT_SILHOUETTE_VIEW_BOX;
  }

  const padding = Math.max(width, height) * 0.08;
  return `${minX - padding} ${minY - padding} ${width + padding * 2} ${height + padding * 2}`;
};

export const SmartAvatar = memo<SmartAvatarProps>(({ person, size, className = '' }) => {
  const [failedPhotoKey, setFailedPhotoKey] = useState<string | null>(null);
  const privateAsset = isPersonMediaAssetRef(person.photoAsset) ? person.photoAsset : null;
  const privateDescriptor = useMemo(
    () => privateAsset ? { personId: person.id, asset: privateAsset } : null,
    [person.id, privateAsset]
  );
  const privatePhotoUrl = usePersonMediaAssetUrl(privateDescriptor);
  const legacyPhotoUrl = privateAsset ? undefined : person.photoUrl?.trim();
  const photoKey = privateAsset
    ? `${privateAsset.assetId}:${privateAsset.version}`
    : legacyPhotoUrl || null;
  const displayName = [person.firstName, person.lastName].filter(Boolean).join(' ') || 'Person';

  // Only subscribe to people if we actually need it for heuristic
  const people = useAppStore((state) => (person.birthDate ? undefined : state.people));

  const isImageFailed = photoKey ? failedPhotoKey === photoKey : false;

  const ageBand = useMemo(() => getAgeBand(person, people), [person, people]);
  const gender = getGender(person);
  const background = useMemo(() => stringToGradient(person.id), [person.id]);
  const silhouetteVariant = useMemo(() => getSilhouetteVariant(person.id, gender, ageBand), [ageBand, gender, person.id]);
  const silhouetteViewBox = useMemo(
    () => getPathViewBox(silhouetteVariant.path, gender, ageBand, silhouetteVariant.index),
    [ageBand, gender, silhouetteVariant.index, silhouetteVariant.path]
  );

  const style = useMemo(
    () => ({
      width: size,
      height: size,
      background,
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -18px 34px rgba(0,0,0,0.08)',
    }),
    [background, size]
  );

  const { cachedUrl } = useCachedImage(isImageFailed ? undefined : legacyPhotoUrl, { width: size, height: size });
  const displayUrl = privatePhotoUrl || cachedUrl || legacyPhotoUrl;

  if (displayUrl && !isImageFailed) {
    return (
      <img
        src={displayUrl}
        alt={displayName}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        onError={() => photoKey && setFailedPhotoKey(photoKey)}
        className={`block shrink-0 object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden ${className}`}
      style={style}
      role="img"
      aria-label={displayName}
      data-age-band={ageBand}
      data-avatar-gender={gender}
    >
      <svg
        viewBox={silhouetteViewBox}
        aria-hidden="true"
        className="h-[78%] w-[78%]"
        preserveAspectRatio="xMidYMid meet"
      >
        <path d={silhouetteVariant.path} fill={SILHOUETTE_FILL} />
      </svg>
    </div>
  );
});

SmartAvatar.displayName = 'SmartAvatar';
