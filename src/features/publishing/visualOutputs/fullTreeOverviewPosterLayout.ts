import { familyNetworkPosterLayoutEngine } from './familyNetworkPosterLayout';
import type { PosterLayoutEngine } from './posterSceneTypes';

/**
 * Full-tree overview keeps the complete sanitized network but uses compact
 * overview cards supplied by PosterSceneBuilder. It is intentionally a
 * separate product layout so Classic detail limits do not leak into it.
 */
export const fullTreeOverviewPosterLayoutEngine: PosterLayoutEngine = {
  id: 'full-tree-overview',
  createLayout(request) {
    return familyNetworkPosterLayoutEngine.createLayout(request);
  },
};
