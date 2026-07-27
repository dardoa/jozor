import { createTieredPosterLayout } from './ancestorTieredPosterLayout';
import type { PosterLayoutEngine } from './posterSceneTypes';

export const descendantTieredPosterLayoutEngine: PosterLayoutEngine = {
  id: 'descendant-tiered',
  createLayout: (request) => createTieredPosterLayout(request, 'descendant'),
};
