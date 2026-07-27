import type { VisualPreviewSanitizer } from './previewSanitizerContract';
import type {
  SanitizedPreviewNode,
  SanitizedPreviewEdge,
  SanitizedPreviewGraph,
  VisualPreviewSanitizerPolicy,
  VisualPreviewRelationshipHint,
  VisualPreviewLifeStatus,
} from './previewSanitizerTypes';

export interface MockPreviewRawNode {
  readonly rawId: string;
  readonly name?: string;
  readonly isLiving?: boolean;
  readonly isPrivate?: boolean;
  readonly generation?: number;
  readonly relationshipHint?: VisualPreviewRelationshipHint;
  readonly lifeStatus?: string;
  readonly birthDate?: string; // YYYY-MM-DD or YYYY
  readonly deathDate?: string; // YYYY-MM-DD or YYYY
  readonly photoUrl?: string;
  readonly email?: string;
  readonly phone?: string;
  readonly address?: string;
  readonly notes?: string;
}

export interface MockPreviewRawGraph {
  readonly nodes: readonly MockPreviewRawNode[];
  readonly edges: readonly {
    readonly fromRawId: string;
    readonly toRawId: string;
    readonly relationshipType: 'parent-child' | 'spouse' | 'ancestor' | 'descendant' | 'relative';
  }[];
}

const extractYearOnly = (dateStr?: string): number | undefined => {
  if (!dateStr) return undefined;
  const match = dateStr.match(/^\d{4}/);
  return match ? parseInt(match[0], 10) : undefined;
};

/**
 * A static test and mockup sanitization utility conforming to the VisualPreviewSanitizer contract.
 * IMPORTANT: This is a mock utility for preview validation and testing, not the production tree database sanitizer.
 */
export const mockPreviewSanitizer: VisualPreviewSanitizer<MockPreviewRawGraph> = {
  sanitize(rawGraph: MockPreviewRawGraph, policy: VisualPreviewSanitizerPolicy): SanitizedPreviewGraph {
    const rawNodes = rawGraph.nodes;
    const maxNodes = policy.maxNodes;
    const isTruncated = rawNodes.length > maxNodes;

    const truncatedRawNodes = rawNodes.slice(0, maxNodes);
    const rawIdToPreviewIdMap = new Map<string, string>();

    // Step 1: Assign session-isolated preview IDs
    truncatedRawNodes.forEach((node, index) => {
      rawIdToPreviewIdMap.set(node.rawId, `preview-node-${index + 1}`);
    });

    // Step 2: Build sanitized node shapes complying with privacy exclusions
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
        : rawNode.name || '';

      // Extract birth/death years ONLY if public, not living/private, and enabled by policy
      const shouldIncludeYears = policy.includeYears && !isMasked && !rawNode.isLiving;
      const birthYear = shouldIncludeYears ? extractYearOnly(rawNode.birthDate) : undefined;
      const deathYear = shouldIncludeYears ? extractYearOnly(rawNode.deathDate) : undefined;

      // Profile photo indicator ONLY if enabled, unmasked, and exists in raw graph
      const hasPhoto = !!policy.includePhotos && !isMasked && !!rawNode.photoUrl;

      return {
        previewId,
        displayName,
        generation: rawNode.generation,
        relationshipHint: rawNode.relationshipHint || 'unknown',
        lifeStatus: (rawNode.lifeStatus as VisualPreviewLifeStatus) || (rawNode.isLiving ? 'living' : 'deceased'),
        isMasked,
        hasPhoto,
        birthYear,
        deathYear,
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
