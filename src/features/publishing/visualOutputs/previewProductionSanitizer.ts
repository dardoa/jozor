import type { VisualPreviewSanitizer } from './previewSanitizerContract';
import type {
  SanitizedPreviewNode,
  SanitizedPreviewEdge,
  SanitizedPreviewGraph,
  VisualPreviewSanitizerPolicy,
  VisualPreviewRelationshipHint,
  VisualPreviewLifeStatus,
} from './previewSanitizerTypes';

export interface PreviewSanitizerRawNode {
  readonly rawId: string;
  readonly displayName?: string;
  readonly isLiving?: boolean;
  readonly isPrivate?: boolean;
  readonly generation?: number;
  readonly relationshipHint?: VisualPreviewRelationshipHint;
  readonly birthDate?: string; // YYYY-MM-DD or YYYY
  readonly deathDate?: string; // YYYY-MM-DD or YYYY
  readonly birthPlace?: string;
  readonly occupation?: string;
  readonly description?: string;
  readonly hasProfilePhoto?: boolean;
}

export interface PreviewSanitizerRawEdge {
  readonly fromRawId: string;
  readonly toRawId: string;
  readonly relationshipType: 'parent-child' | 'spouse' | 'ancestor' | 'descendant' | 'relative';
}

export interface PreviewSanitizerRawGraph {
  readonly nodes: readonly PreviewSanitizerRawNode[];
  readonly edges: readonly PreviewSanitizerRawEdge[];
}

const extractYearOnly = (dateStr?: string): number | undefined => {
  if (!dateStr) return undefined;
  const match = dateStr.match(/^\d{4}/);
  return match ? parseInt(match[0], 10) : undefined;
};

const sanitizeShortLabel = (value?: string): string | undefined => {
  if (!value) return undefined;
  const normalized = value.replace(/\p{Cc}/gu, ' ').replace(/\s+/g, ' ').trim();
  if (!normalized) return undefined;
  return Array.from(normalized).slice(0, 60).join('');
};

const sanitizeDescriptionLabel = (value?: string): string | undefined => {
  if (!value) return undefined;
  const normalized = value.replace(/\p{Cc}/gu, ' ').replace(/\s+/g, ' ').trim();
  if (!normalized) return undefined;
  const characters = Array.from(normalized);
  return characters.length > 90
    ? `${characters.slice(0, 87).join('')}...`
    : normalized;
};

/**
 * A production-shaped sanitization utility conforming to the VisualPreviewSanitizer contract.
 * IMPORTANT: This implementation is production-shaped but not production-wired.
 * By design, the input PreviewSanitizerRawNode type strictly lacks any contact/media fields.
 */
export const productionPreviewSanitizer: VisualPreviewSanitizer<PreviewSanitizerRawGraph> = {
  sanitize(rawGraph: PreviewSanitizerRawGraph, policy: VisualPreviewSanitizerPolicy): SanitizedPreviewGraph {
    const rawNodes = rawGraph.nodes;
    const maxNodes = policy.maxNodes;
    const isTruncated = rawNodes.length > maxNodes;

    const truncatedRawNodes = rawNodes.slice(0, maxNodes);
    const rawIdToPreviewIdMap = new Map<string, string>();

    // Step 1: Assign session-isolated preview IDs
    truncatedRawNodes.forEach((node, index) => {
      rawIdToPreviewIdMap.set(node.rawId, `preview-node-${index + 1}`);
    });

    // Step 2: Build sanitized node shapes
    const sanitizedNodes: SanitizedPreviewNode[] = truncatedRawNodes.map((rawNode) => {
      const previewId = rawIdToPreviewIdMap.get(rawNode.rawId)!;

      // Determine privacy masking status based on policy privacyMode
      let isMasked = false;
      if (policy.privacyMode === 'masked') {
        isMasked = !!rawNode.isLiving || !!rawNode.isPrivate;
      } else {
        // public or owner-full modes
        isMasked = !!rawNode.isPrivate;
      }

      // Display name masking
      const displayName = isMasked
        ? policy.language === 'ar'
          ? 'شخص مخفي'
          : 'Masked person'
        : rawNode.displayName || '';

      // Extract birth/death years ONLY if public, not living/private, and enabled by policy
      const shouldIncludeYears = policy.includeYears && !isMasked && !rawNode.isLiving;
      const birthYear = shouldIncludeYears ? extractYearOnly(rawNode.birthDate) : undefined;
      const deathYear = shouldIncludeYears ? extractYearOnly(rawNode.deathDate) : undefined;

      // Profile photo indicator ONLY if enabled, unmasked, and exists in raw graph
      const hasPhoto = !!policy.includePhotos && !isMasked && !!rawNode.hasProfilePhoto;
      const canIncludePublicDetails = !isMasked && !rawNode.isLiving;
      const birthPlaceLabel = policy.includeBirthPlace && canIncludePublicDetails
        ? sanitizeShortLabel(rawNode.birthPlace)
        : undefined;
      const occupationLabel = policy.includeOccupation && canIncludePublicDetails
        ? sanitizeShortLabel(rawNode.occupation)
        : undefined;
      const descriptionLabel = policy.includeDescription && canIncludePublicDetails
        ? sanitizeDescriptionLabel(rawNode.description)
        : undefined;

      return {
        previewId,
        displayName,
        generation: rawNode.generation,
        relationshipHint: rawNode.relationshipHint || 'unknown',
        lifeStatus: (rawNode.isLiving ? 'living' : 'deceased') as VisualPreviewLifeStatus,
        isMasked,
        hasPhoto,
        birthYear,
        deathYear,
        birthPlaceLabel,
        occupationLabel,
        descriptionLabel,
      };
    });

    // Step 3: Map relationships and filter out edges linked to truncated nodes
    const sanitizedEdges: SanitizedPreviewEdge[] = [];
    rawGraph.edges.forEach((edge) => {
      const fromPreviewId = rawIdToPreviewIdMap.get(edge.fromRawId);
      const toPreviewId = rawIdToPreviewIdMap.get(edge.toRawId);

      if (fromPreviewId && toPreviewId) {
        sanitizedEdges.push({
          fromPreviewId,
          toPreviewId,
          relationshipType: edge.relationshipType,
        });
      }
    });

    // Warnings list
    const warnings: string[] = [];
    if (isTruncated) {
      warnings.push(
        policy.language === 'ar'
          ? `تم اقتصاص عدد عقد المعاينة إلى ${maxNodes}`
          : `Preview nodes count truncated to ${maxNodes}`
      );
    }

    return {
      nodes: sanitizedNodes,
      edges: sanitizedEdges,
      warnings,
      metadata: {
        truncated: isTruncated,
        originalNodeCount: rawNodes.length,
        sanitizedNodeCount: sanitizedNodes.length,
        policy,
      },
    };
  },
};
