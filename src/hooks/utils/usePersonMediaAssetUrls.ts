import { useEffect, useMemo, useRef, useState } from 'react';
import type { PersonMediaAssetRef } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import {
  defaultPersonMediaAssetResolver,
  type PersonMediaAssetRequest,
} from '../../services/personMediaAssetService';

export interface PersonMediaAssetDescriptor {
  readonly personId: string;
  readonly asset: PersonMediaAssetRef;
}

export interface ResolvedPersonMediaAssetUrls {
  readonly urlsByAssetId: Readonly<Record<string, string>>;
  readonly isLoading: boolean;
}

interface PersonMediaResolutionState {
  readonly requestKey: string | null;
  readonly urlsByAssetId: Readonly<Record<string, string>>;
}

const EMPTY_RESOLVED_URLS: Readonly<Record<string, string>> = Object.freeze({});

export function usePersonMediaAssetUrls(
  descriptors: readonly PersonMediaAssetDescriptor[],
  enabled = true
): ResolvedPersonMediaAssetUrls {
  const user = useAppStore((state) => state.user);
  const treeId = useAppStore((state) => state.currentTreeId);
  const role = useAppStore((state) => state.currentUserRole);
  const [resolution, setResolution] = useState<PersonMediaResolutionState>({
    requestKey: null,
    urlsByAssetId: EMPTY_RESOLVED_URLS,
  });
  const descriptorsRef = useRef(descriptors);

  const descriptorKey = useMemo(
    () => descriptors
      .map(({ personId, asset }) => `${personId}:${asset.assetId}:${asset.version}`)
      .sort()
      .join('|'),
    [descriptors]
  );

  useEffect(() => {
    descriptorsRef.current = descriptors;
  }, [descriptors]);

  const requestKey = enabled && descriptorKey && user?.uid && treeId && role
    ? `${user.uid}:${treeId}:${role}:${descriptorKey}`
    : null;

  useEffect(() => {
    const activeDescriptors = descriptorsRef.current;
    if (!requestKey || !user?.uid || !treeId || !role) return undefined;

    let cancelled = false;
    const requests: PersonMediaAssetRequest[] = activeDescriptors.map(({ personId, asset }) => ({
      treeId,
      personId,
      userId: user.uid,
      role,
      asset,
    }));

    void Promise.all(requests.map(async (request) => {
      try {
        const url = await defaultPersonMediaAssetResolver.acquireObjectUrl(request);
        return [request.asset.assetId, url] as const;
      } catch {
        return null;
      }
    })).then((results) => {
      if (cancelled) return;
      setResolution({
        requestKey,
        urlsByAssetId: Object.fromEntries(results.filter((entry) => entry !== null)),
      });
    });

    return () => {
      cancelled = true;
      requests.forEach((request) => defaultPersonMediaAssetResolver.releaseObjectUrl(request));
    };
  }, [requestKey, role, treeId, user?.uid]);

  return {
    urlsByAssetId: requestKey && resolution.requestKey === requestKey
      ? resolution.urlsByAssetId
      : EMPTY_RESOLVED_URLS,
    isLoading: Boolean(requestKey && resolution.requestKey !== requestKey),
  };
}

export function usePersonMediaAssetUrl(
  descriptor: PersonMediaAssetDescriptor | null,
  enabled = true
): string | null {
  const descriptors = descriptor ? [descriptor] : [];
  const { urlsByAssetId } = usePersonMediaAssetUrls(descriptors, enabled);
  return descriptor ? urlsByAssetId[descriptor.asset.assetId] ?? null : null;
}
