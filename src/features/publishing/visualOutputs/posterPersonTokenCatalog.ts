import type { PosterPrivacyMode } from './posterStateContracts';
import type {
  PosterPersonTokenCatalog,
  PosterPersonTokenOption,
} from './posterSceneTypes';

export interface PosterPersonTokenSource {
  readonly rawId: string;
  readonly displayName?: string;
  readonly isLiving?: boolean;
  readonly isPrivate?: boolean;
  readonly birthDate?: string;
  readonly deathDate?: string;
}

export interface PosterPersonTokenLabelPolicy {
  readonly language: 'ar' | 'en';
  readonly privacyMode: PosterPrivacyMode;
  readonly audience?: 'poster-content' | 'owner-control';
}

export interface PosterPersonTokenCatalogBoundary extends PosterPersonTokenCatalog {
  readonly hasToken: (token: string) => boolean;
  readonly resolveTokenInsideBoundary: (token: string) => string | undefined;
}

export interface PosterPersonTokenCatalogSession {
  readonly createCatalog: (
    nodes: readonly PosterPersonTokenSource[],
    policy: PosterPersonTokenLabelPolicy,
    defaultRawId?: string
  ) => PosterPersonTokenCatalogBoundary;
  readonly dispose: () => void;
}

let catalogSessionSequence = 0;

const createSessionNonce = (): string => {
  catalogSessionSequence += 1;
  return `${Date.now().toString(36)}-${catalogSessionSequence.toString(36)}`;
};

const extractYear = (value?: string): string | undefined => {
  const match = value?.match(/^\s*(\d{4})/);
  return match?.[1];
};

const getOwnerControlLabel = (
  node: PosterPersonTokenSource,
  fallback: string
): string => {
  const displayName = node.displayName || fallback;
  const birthYear = extractYear(node.birthDate);
  const deathYear = extractYear(node.deathDate);
  if (!birthYear && !deathYear) return displayName;
  return `${displayName} (${birthYear ?? ''}\u2013${deathYear ?? ''})`;
};

/**
 * Owns opaque person-token mappings for one active tree session. Labels may be
 * regenerated for language/privacy changes without rotating token identity.
 */
export function createPosterPersonTokenCatalogSession(
  nonce = createSessionNonce()
): PosterPersonTokenCatalogSession {
  const rawIdToToken = new Map<string, string>();
  let disposed = false;

  return {
    createCatalog(nodes, policy, defaultRawId) {
      if (disposed) {
        throw new Error('Poster person token catalog session has been disposed.');
      }

      const tokenToRawId = new Map<string, string>();
      let defaultToken: string | undefined;
      const tokens: PosterPersonTokenOption[] = nodes.map((node, index) => {
        let token = rawIdToToken.get(node.rawId);
        if (!token) {
          token = `session-token-${nonce}-${(rawIdToToken.size + 1).toString(36)}`;
          rawIdToToken.set(node.rawId, token);
        }
        tokenToRawId.set(token, node.rawId);
        if (defaultRawId === node.rawId) defaultToken = token;

        const shouldMask = policy.audience !== 'owner-control' && Boolean(
          node.isPrivate || (policy.privacyMode === 'masked' && node.isLiving)
        );
        return {
          token,
          label: policy.audience === 'owner-control'
            ? getOwnerControlLabel(
                node,
                policy.language === 'ar' ? `شخص ${index + 1}` : `Person ${index + 1}`
              )
            : shouldMask
            ? policy.language === 'ar' ? 'شخص مخفي' : 'Masked person'
            : node.displayName || (policy.language === 'ar' ? `شخص ${index + 1}` : `Person ${index + 1}`),
        };
      });

      return {
        tokens,
        defaultToken: defaultToken ?? tokens[0]?.token,
        hasToken: (token) => tokenToRawId.has(token),
        resolveTokenInsideBoundary: (token) => tokenToRawId.get(token),
      };
    },
    dispose() {
      disposed = true;
      rawIdToToken.clear();
    },
  };
}
