import type { PosterDocumentSpec, PosterRect, PosterScene, PosterSize, PrintQualityReport } from './posterSceneTypes';

export interface TiledWallPosterRequest {
  readonly scene: PosterScene;
  readonly sheetDocument: PosterDocumentSpec;
  readonly rows: number;
  readonly columns: number;
  readonly overlapMm?: number;
  readonly safeMarginMm?: number;
}

export interface TiledWallPosterTile {
  readonly index: number;
  readonly row: number;
  readonly column: number;
  readonly label: string;
  /** Artwork area shared with adjacent sheets. */
  readonly viewport: PosterRect;
  /** Full physical sheet, including the printable assembly margin. */
  readonly sheetViewport: PosterRect;
  readonly treeContent: {
    readonly nodeCount: number;
    readonly connectorCount: number;
  };
}

export interface TiledWallPosterUtilization {
  readonly treeContentSheetCount: number;
  readonly decorativeOnlySheetCount: number;
  readonly decorativeOnlyEdgeSheetCount: number;
  readonly warnings: readonly string[];
}

export interface TiledWallPosterGridRecommendation {
  readonly rows: number;
  readonly columns: number;
  readonly sheetCount: number;
  readonly decorativeOnlyEdgeSheetCount: number;
  readonly minimumFontSizePt: number;
  readonly assembledPhysicalSizeMm: PosterSize;
}

export interface TiledWallPosterPlan {
  readonly version: 1;
  readonly product: 'tiled-wall-poster';
  readonly sourceScene: PosterScene;
  readonly sheetDocument: PosterDocumentSpec;
  readonly rows: number;
  readonly columns: number;
  readonly overlapMm: number;
  readonly safeMarginMm: number;
  readonly assembledPhysicalSizeMm: PosterSize;
  readonly sceneUnitsPerMm: number;
  readonly tiles: readonly TiledWallPosterTile[];
  readonly utilization: TiledWallPosterUtilization;
  readonly quality: PrintQualityReport;
  readonly warnings: readonly string[];
}

function assertIntegerInRange(value: number, label: string): void {
  if (!Number.isInteger(value) || value < 1 || value > 12) {
    throw new Error(`${label} must be an integer between 1 and 12`);
  }
}

function rectsIntersect(first: PosterRect, second: PosterRect): boolean {
  return first.x <= second.x + second.width
    && first.x + first.width >= second.x
    && first.y <= second.y + second.height
    && first.y + first.height >= second.y;
}

function connectorBounds(connector: PosterScene['connectors'][number]): PosterRect {
  return {
    x: Math.min(connector.start.x, connector.end.x),
    y: Math.min(connector.start.y, connector.end.y),
    width: Math.abs(connector.end.x - connector.start.x),
    height: Math.abs(connector.end.y - connector.start.y),
  };
}

export function createTiledWallPosterPlan(request: TiledWallPosterRequest): TiledWallPosterPlan {
  assertIntegerInRange(request.rows, 'Tiled wall poster rows');
  assertIntegerInRange(request.columns, 'Tiled wall poster columns');
  const overlapMm = request.overlapMm ?? 8;
  if (!Number.isFinite(overlapMm) || overlapMm < 0 || overlapMm > 25) {
    throw new Error('Tiled wall poster overlap must be between 0 and 25 mm');
  }

  const sheet = request.sheetDocument.physicalSizeMm;
  if (overlapMm >= sheet.width || overlapMm >= sheet.height) {
    throw new Error('Tiled wall poster overlap must be smaller than the sheet dimensions');
  }
  const safeMarginMm = request.safeMarginMm ?? 10;
  if (!Number.isFinite(safeMarginMm) || safeMarginMm < 5 || safeMarginMm > 25) {
    throw new Error('Tiled wall poster safe margin must be between 5 and 25 mm');
  }
  const printableWidthMm = sheet.width - (safeMarginMm * 2);
  const printableHeightMm = sheet.height - (safeMarginMm * 2);
  if (printableWidthMm <= overlapMm || printableHeightMm <= overlapMm) {
    throw new Error('Tiled wall poster printable area must be larger than the overlap');
  }
  const assembledPhysicalSizeMm = {
    width: (printableWidthMm * request.columns) - (overlapMm * (request.columns - 1)),
    height: (printableHeightMm * request.rows) - (overlapMm * (request.rows - 1)),
  };
  const sceneSize = request.scene.document.sceneSize;
  const sceneUnitsPerMm = Math.max(
    sceneSize.width / assembledPhysicalSizeMm.width,
    sceneSize.height / assembledPhysicalSizeMm.height
  );
  const wallSceneWidth = assembledPhysicalSizeMm.width * sceneUnitsPerMm;
  const wallSceneHeight = assembledPhysicalSizeMm.height * sceneUnitsPerMm;
  const originX = -((wallSceneWidth - sceneSize.width) / 2);
  const originY = -((wallSceneHeight - sceneSize.height) / 2);
  const tileWidth = printableWidthMm * sceneUnitsPerMm;
  const tileHeight = printableHeightMm * sceneUnitsPerMm;
  const stepX = (printableWidthMm - overlapMm) * sceneUnitsPerMm;
  const stepY = (printableHeightMm - overlapMm) * sceneUnitsPerMm;
  const margin = safeMarginMm * sceneUnitsPerMm;

  const tiles = Array.from({ length: request.rows * request.columns }, (_, index) => {
    const row = Math.floor(index / request.columns) + 1;
    const column = (index % request.columns) + 1;
    const viewport = {
      x: originX + ((column - 1) * stepX),
      y: originY + ((row - 1) * stepY),
      width: tileWidth,
      height: tileHeight,
    };
    const sheetViewport = {
      x: viewport.x - margin,
      y: viewport.y - margin,
      width: viewport.width + (margin * 2),
      height: viewport.height + (margin * 2),
    };
    return {
      index: index + 1,
      row,
      column,
      label: `${row}-${column}`,
      viewport,
      sheetViewport,
      treeContent: {
        nodeCount: request.scene.nodes.filter((node) => rectsIntersect(node.rect, sheetViewport)).length,
        connectorCount: request.scene.connectors.filter((connector) => (
          rectsIntersect(connectorBounds(connector), sheetViewport)
        )).length,
      },
    };
  });
  const decorativeOnlyTiles = tiles.filter((tile) => (
    tile.treeContent.nodeCount === 0 && tile.treeContent.connectorCount === 0
  ));
  const decorativeOnlyEdgeTiles = decorativeOnlyTiles.filter((tile) => (
    tile.row === 1
    || tile.row === request.rows
    || tile.column === 1
    || tile.column === request.columns
  ));
  const utilizationWarnings = decorativeOnlyEdgeTiles.length > 0
    ? ['poster.tiled-wall.decorative-only-edge-sheets']
    : [];
  const minimumFontSceneUnits = request.scene.nodes.length > 0
    ? Math.min(...request.scene.nodes.map((node) => node.nameFontSize))
    : 0;
  const minimumFontSizePt = minimumFontSceneUnits > 0
    ? (minimumFontSceneUnits / sceneUnitsPerMm) * (72 / 25.4)
    : 0;
  const warnings = [
    ...(request.scene.source.truncated ? ['poster.tiled-wall.source-scene-truncated'] : []),
    ...(request.scene.nodes.length === 0 ? ['poster.tiled-wall.empty-scene'] : []),
    ...(minimumFontSizePt > 0 && minimumFontSizePt < 5
      ? ['poster.tiled-wall.text-unreadable']
      : minimumFontSizePt > 0 && minimumFontSizePt < 7
        ? ['poster.tiled-wall.text-small']
        : []),
  ];
  const qualityStatus: PrintQualityReport['status'] = request.scene.source.truncated
    || request.scene.nodes.length === 0
    || (minimumFontSizePt > 0 && minimumFontSizePt < 5)
    ? 'blocked'
    : minimumFontSizePt < 7
      ? 'warning'
      : 'pass';

  return {
    version: 1,
    product: 'tiled-wall-poster',
    sourceScene: request.scene,
    sheetDocument: request.sheetDocument,
    rows: request.rows,
    columns: request.columns,
    overlapMm,
    safeMarginMm,
    assembledPhysicalSizeMm,
    sceneUnitsPerMm,
    tiles,
    utilization: {
      treeContentSheetCount: tiles.length - decorativeOnlyTiles.length,
      decorativeOnlySheetCount: decorativeOnlyTiles.length,
      decorativeOnlyEdgeSheetCount: decorativeOnlyEdgeTiles.length,
      warnings: utilizationWarnings,
    },
    quality: {
      status: qualityStatus,
      evaluated: true,
      warnings,
      metrics: {
        minimumFontSizePt,
        connectorCount: request.scene.connectors.length,
      },
    },
    warnings,
  };
}

export function findTiledWallPosterGridRecommendation(
  plan: TiledWallPosterPlan
): TiledWallPosterGridRecommendation | undefined {
  if (plan.utilization.decorativeOnlyEdgeSheetCount === 0 || plan.tiles.length <= 1) {
    return undefined;
  }

  const currentMinimumText = plan.quality.metrics.minimumFontSizePt ?? 0;
  const minimumAcceptedText = Math.max(7, currentMinimumText * 0.75);
  const candidates: TiledWallPosterPlan[] = [];

  for (let rows = 1; rows <= plan.rows; rows += 1) {
    for (let columns = 1; columns <= plan.columns; columns += 1) {
      if ((rows * columns) >= plan.tiles.length) continue;
      const candidate = createTiledWallPosterPlan({
        scene: plan.sourceScene,
        sheetDocument: plan.sheetDocument,
        rows,
        columns,
        overlapMm: plan.overlapMm,
        safeMarginMm: plan.safeMarginMm,
      });
      const candidateMinimumText = candidate.quality.metrics.minimumFontSizePt ?? 0;
      if (candidate.quality.status !== 'pass'
        || candidateMinimumText < minimumAcceptedText
        || candidate.utilization.decorativeOnlyEdgeSheetCount >= plan.utilization.decorativeOnlyEdgeSheetCount) {
        continue;
      }
      candidates.push(candidate);
    }
  }

  const best = candidates.sort((first, second) => (
    first.utilization.decorativeOnlyEdgeSheetCount - second.utilization.decorativeOnlyEdgeSheetCount
    || first.tiles.length - second.tiles.length
    || (second.quality.metrics.minimumFontSizePt ?? 0) - (first.quality.metrics.minimumFontSizePt ?? 0)
  ))[0];
  if (!best) return undefined;

  return {
    rows: best.rows,
    columns: best.columns,
    sheetCount: best.tiles.length,
    decorativeOnlyEdgeSheetCount: best.utilization.decorativeOnlyEdgeSheetCount,
    minimumFontSizePt: best.quality.metrics.minimumFontSizePt ?? 0,
    assembledPhysicalSizeMm: best.assembledPhysicalSizeMm,
  };
}
