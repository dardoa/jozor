import type {
  PosterDocumentSpec,
  PosterLayoutSpec,
  PosterRect,
  PosterSceneConnector,
  PosterSceneNode,
  PrintQualityReport,
} from './posterSceneTypes';

const MM_PER_INCH = 25.4;
const POINTS_PER_INCH = 72;
const DEFAULT_RASTER_SCALE = 2;
const MINIMUM_PRINT_FONT_PT = 8;
const PREFERRED_PRINT_FONT_PT = 9;
const MINIMUM_RASTER_DPI = 120;
const PREFERRED_RASTER_DPI = 240;
const WARNING_MEMORY_BYTES = 128 * 1024 * 1024;
const BLOCKED_MEMORY_BYTES = 256 * 1024 * 1024;
const A3_PAGE_AREA_MM2 = 297 * 420;
const FULL_TREE_OVERVIEW_NODES_PER_A3 = 48;

export interface EvaluatePosterPrintQualityRequest {
  readonly document: PosterDocumentSpec;
  readonly nodes: readonly PosterSceneNode[];
  readonly connectors?: readonly PosterSceneConnector[];
  readonly layoutEngineId?: PosterLayoutSpec['engineId'];
  readonly truncated: boolean;
  readonly rasterScale?: number;
}

function rectanglesOverlap(a: PosterRect, b: PosterRect): boolean {
  const tolerance = 0.5;
  return a.x < b.x + b.width - tolerance
    && a.x + a.width > b.x + tolerance
    && a.y < b.y + b.height - tolerance
    && a.y + a.height > b.y + tolerance;
}

function countOverlappingPairs(nodes: readonly PosterSceneNode[]): number {
  let count = 0;
  for (let index = 0; index < nodes.length; index += 1) {
    for (let candidate = index + 1; candidate < nodes.length; candidate += 1) {
      if (rectanglesOverlap(nodes[index].rect, nodes[candidate].rect)) count += 1;
    }
  }
  return count;
}

export function evaluatePosterPrintQuality(
  request: EvaluatePosterPrintQualityRequest
): PrintQualityReport {
  const rasterScale = request.rasterScale ?? DEFAULT_RASTER_SCALE;
  const { document, nodes } = request;
  const effectiveDpi = (document.sceneSize.width * rasterScale)
    / (document.physicalSizeMm.width / MM_PER_INCH);
  const sceneUnitsToPoints = (document.physicalSizeMm.height / document.sceneSize.height)
    * (POINTS_PER_INCH / MM_PER_INCH);
  const minimumFontSizePt = nodes.length > 0
    ? Math.min(...nodes.map((node) => node.nameFontSize * sceneUnitsToPoints))
    : 0;
  const estimatedMemoryBytes = Math.ceil(
    document.sceneSize.width
      * rasterScale
      * document.sceneSize.height
      * rasterScale
      * 4
  );
  const overlappingCardPairs = countOverlappingPairs(nodes);
  const connectorCount = request.connectors?.length ?? 0;
  const physicalPageAreaMm2 = document.physicalSizeMm.width * document.physicalSizeMm.height;
  const fullTreeOverviewNodeCapacity = Math.max(
    1,
    Math.floor((physicalPageAreaMm2 / A3_PAGE_AREA_MM2) * FULL_TREE_OVERVIEW_NODES_PER_A3)
  );
  const warnings: string[] = [];
  let blocked = false;

  if (nodes.length === 0) {
    warnings.push('poster.quality.empty-scene');
    blocked = true;
  }
  if (request.truncated) {
    warnings.push('poster.quality.selection-truncated');
    blocked = true;
  }
  if (overlappingCardPairs > 0) {
    warnings.push(`poster.quality.card-overlap:${overlappingCardPairs}`);
    blocked = true;
  }
  if (
    request.layoutEngineId === 'family-network-tiered'
    && (nodes.length > 48 || connectorCount > 80)
  ) {
    warnings.push(`poster.quality.network-too-dense:${nodes.length}:${connectorCount}`);
    blocked = true;
  }
  if (
    request.layoutEngineId === 'full-tree-overview'
    && nodes.length > fullTreeOverviewNodeCapacity
  ) {
    warnings.push(
      `poster.quality.overview-page-too-dense:${nodes.length}:${fullTreeOverviewNodeCapacity}`
    );
    blocked = true;
  }
  if (minimumFontSizePt < MINIMUM_PRINT_FONT_PT) {
    warnings.push(`poster.quality.font-too-small:${minimumFontSizePt.toFixed(1)}pt`);
    blocked = true;
  } else if (minimumFontSizePt < PREFERRED_PRINT_FONT_PT) {
    warnings.push(`poster.quality.font-small:${minimumFontSizePt.toFixed(1)}pt`);
  }
  if (effectiveDpi < MINIMUM_RASTER_DPI) {
    warnings.push(`poster.quality.raster-dpi-too-low:${Math.round(effectiveDpi)}dpi`);
    blocked = true;
  } else if (effectiveDpi < PREFERRED_RASTER_DPI) {
    warnings.push(`poster.quality.raster-dpi-low:${Math.round(effectiveDpi)}dpi`);
  }
  if (estimatedMemoryBytes > BLOCKED_MEMORY_BYTES) {
    warnings.push('poster.quality.raster-memory-blocked');
    blocked = true;
  } else if (estimatedMemoryBytes > WARNING_MEMORY_BYTES) {
    warnings.push('poster.quality.raster-memory-high');
  }

  return {
    status: blocked ? 'blocked' : warnings.length > 0 ? 'warning' : 'pass',
    evaluated: true,
    warnings,
    metrics: {
      effectiveDpi: Math.round(effectiveDpi),
      minimumFontSizePt: Math.round(minimumFontSizePt * 10) / 10,
      estimatedMemoryBytes,
      overlappingCardPairs,
      connectorCount,
    },
  };
}
