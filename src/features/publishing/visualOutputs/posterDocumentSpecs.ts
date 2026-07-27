import type {
  PosterDocumentSpec,
  PosterInsets,
  PosterMarginPreset,
  PosterOrientation,
  PosterPageSize,
  PosterSize,
} from './posterSceneTypes';

const PORTRAIT_PHYSICAL_SIZES_MM: Record<PosterPageSize, PosterSize> = {
  A4: { width: 210, height: 297 },
  A3: { width: 297, height: 420 },
  A2: { width: 420, height: 594 },
  A1: { width: 594, height: 841 },
  A0: { width: 841, height: 1189 },
};

const PORTRAIT_SCENE_SIZES: Record<PosterPageSize, PosterSize> = {
  A4: { width: 1200, height: 1697 },
  A3: { width: 1600, height: 2263 },
  A2: { width: 2263, height: 3200 },
  A1: { width: 3200, height: 4525 },
  A0: { width: 4525, height: 6400 },
};

const MARGIN_MM: Record<PosterPageSize, number> = {
  A4: 12.6,
  A3: 15,
  A2: 20,
  A1: 28,
  A0: 36,
};

const MARGIN_SCALE: Record<PosterMarginPreset, number> = {
  compact: 0.7,
  balanced: 1,
  generous: 1.4,
};

const RASTER_SCALE: Record<PosterPageSize, number> = {
  A4: 2,
  A3: 2,
  A2: 1.5,
  A1: 1,
  A0: 1,
};

function orient(size: PosterSize, orientation: PosterOrientation): PosterSize {
  return orientation === 'portrait'
    ? size
    : { width: size.height, height: size.width };
}

function createUniformInsets(value: number): PosterInsets {
  return { top: value, right: value, bottom: value, left: value };
}

export function createPosterDocumentSpec(
  pageSize: PosterPageSize,
  orientation: PosterOrientation,
  marginPreset: PosterMarginPreset = 'balanced'
): PosterDocumentSpec {
  const physicalSizeMm = orient(PORTRAIT_PHYSICAL_SIZES_MM[pageSize], orientation);
  const sceneSize = orient(PORTRAIT_SCENE_SIZES[pageSize], orientation);
  const pixelsPerMm = sceneSize.width / physicalSizeMm.width;
  const marginMm = Math.round(MARGIN_MM[pageSize] * MARGIN_SCALE[marginPreset] * 10) / 10;
  const margin = marginMm * pixelsPerMm;

  return {
    pageSize,
    orientation,
    marginPreset,
    physicalSizeMm,
    sceneSize,
    marginsMm: createUniformInsets(marginMm),
    margins: createUniformInsets(margin),
  };
}

export function getPosterRasterScale(pageSize: PosterPageSize): number {
  return RASTER_SCALE[pageSize];
}
