import JSZip from 'jszip';
import { renderPosterSceneToSvg, type StudioPosterSvgResources } from './studioPosterSvgRenderer';
import {
  findTiledWallPosterGridRecommendation,
  type TiledWallPosterGridRecommendation,
  type TiledWallPosterPlan,
} from './tiledWallPoster';

export interface TiledWallPosterArchiveRequest {
  readonly plan: TiledWallPosterPlan;
  readonly resources?: StudioPosterSvgResources;
  readonly fileName?: string;
}

export interface TiledWallPosterArchiveResult {
  readonly blob: Blob;
  readonly fileName: string;
  readonly mimeType: 'application/zip';
  readonly fileCount: number;
}

function safeName(value: string): string {
  return value.trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, '-').replace(/-+/g, '-') || 'wall-poster';
}

function tileFileName(index: number, label: string): string {
  return `tiles/${String(index).padStart(2, '0')}-${label}.svg`;
}

function createAssemblyMap(plan: TiledWallPosterPlan): string {
  return Array.from({ length: plan.rows }, (_, rowIndex) => plan.tiles
    .filter((tile) => tile.row === rowIndex + 1)
    .map((tile) => `[${String(tile.index).padStart(2, '0')} ${tile.label}]`)
    .join(' ')).join('\n');
}

function createReadme(
  plan: TiledWallPosterPlan,
  recommendation?: TiledWallPosterGridRecommendation
): string {
  const isArabic = plan.sourceScene.content.language === 'ar';
  const sheet = `${plan.sheetDocument.pageSize} ${plan.sheetDocument.orientation}`;
  const finalWidthCm = (plan.assembledPhysicalSizeMm.width / 10).toFixed(1);
  const finalHeightCm = (plan.assembledPhysicalSizeMm.height / 10).toFixed(1);
  const map = createAssemblyMap(plan);
  const decorativeNote = plan.utilization.decorativeOnlySheetCount > 0
    ? (isArabic
        ? `\nملاحظة: ${plan.utilization.decorativeOnlySheetCount} ورقة حافة/زخرفة لا تحتوي بطاقات أشخاص، لكنها تكمل العنوان أو الإطار أو مساحة اللوحة المقصودة.\n`
        : `\nNote: ${plan.utilization.decorativeOnlySheetCount} edge/decorative sheets contain no person cards but complete the intended title, frame, or poster field.\n`)
    : '';
  const recommendationNote = recommendation
    ? (isArabic
        ? `\nاقتراح اختياري لتقليل التكلفة: ${recommendation.rows} صفوف × ${recommendation.columns} أعمدة (${recommendation.sheetCount} ورقة)، مع أصغر نص متوقع ${recommendation.minimumFontSizePt.toFixed(1)} pt.\n`
        : `\nOptional lower-cost grid: ${recommendation.rows} rows x ${recommendation.columns} columns (${recommendation.sheetCount} sheets), with an estimated minimum text size of ${recommendation.minimumFontSizePt.toFixed(1)} pt.\n`)
    : '';

  if (isArabic) {
    return `تعليمات تجميع اللوحة الجدارية المقسمة

المقاس: ${sheet}
عدد الأوراق: ${plan.tiles.length} (${plan.rows} صفوف × ${plan.columns} أعمدة)
الحجم النهائي بعد القص والتجميع: ${finalWidthCm} × ${finalHeightCm} سم
هامش الطباعة الآمن: ${plan.safeMarginMm} مم
منطقة التداخل بين الأوراق: ${plan.overlapMm} مم

خريطة التجميع
${map}

الخطوات
1. اطبع كل ملف SVG بالحجم الفعلي 100%. عطّل خيار "ملاءمة للصفحة" أو أي تكبير/تصغير تلقائي.
2. تأكد أن إعداد الورق هو ${sheet} لكل الملفات.
3. اختبر ورقتين متجاورتين أولًا قبل طباعة الحزمة كاملة.
4. قص الهوامش على علامات القص، ثم طابق علامات منتصف الحواف مع إبقاء تداخل قدره ${plan.overlapMm} مم.
5. رتّب الصفوف من الأعلى إلى الأسفل. العمود 1 هو أقصى يسار اللوحة، والعمود ${plan.columns} هو أقصى يمينها.
6. تحقق من استمرارية الخطوط والنص العربي قبل تثبيت الأوراق نهائيًا.
${decorativeNote}${recommendationNote}
تفاصيل هندسية إضافية متاحة في assembly.json.
`;
  }

  return `Tiled Wall Poster Assembly Instructions

Sheet: ${sheet}
Sheets: ${plan.tiles.length} (${plan.rows} rows x ${plan.columns} columns)
Final trimmed size: ${finalWidthCm} x ${finalHeightCm} cm
Safe print margin: ${plan.safeMarginMm} mm
Artwork overlap: ${plan.overlapMm} mm

Assembly map
${map}

Steps
1. Print every SVG at 100% actual size. Disable Fit to Page and automatic scaling.
2. Confirm the paper setting is ${sheet} for every file.
3. Proof two adjacent sheets before printing the complete package.
4. Trim on the crop marks, match the edge-center marks, and retain ${plan.overlapMm} mm of overlap.
5. Assemble rows from top to bottom. Column 1 is the far-left sheet and column ${plan.columns} is the far-right sheet.
6. Check connector and text continuity before permanently mounting the sheets.
${decorativeNote}${recommendationNote}
Additional geometry is available in assembly.json.
`;
}

export async function exportTiledWallPosterArchive(
  request: TiledWallPosterArchiveRequest
): Promise<TiledWallPosterArchiveResult> {
  if (request.plan.quality.status === 'blocked') {
    throw new Error(`Tiled wall poster is not printable: ${request.plan.quality.warnings.join(', ')}`);
  }
  const zip = new JSZip();
  const sheet = request.plan.sheetDocument;
  const recommendation = findTiledWallPosterGridRecommendation(request.plan);
  for (const tile of request.plan.tiles) {
    const result = renderPosterSceneToSvg({
      scene: request.plan.sourceScene,
      resources: request.resources,
      viewport: {
        rect: tile.sheetViewport,
        outputSize: sheet.sceneSize,
        physicalSizeMm: sheet.physicalSizeMm,
        label: `Tile ${tile.label}`,
        printSheet: {
          cropRect: tile.viewport,
          pageLabel: `${tile.index} / ${request.plan.tiles.length} \u00b7 ${tile.label}`,
        },
      },
    });
    zip.file(tileFileName(tile.index, tile.label), result.svg);
  }
  zip.file('assembly.json', JSON.stringify({
    version: request.plan.version,
    product: request.plan.product,
    rows: request.plan.rows,
    columns: request.plan.columns,
    overlapMm: request.plan.overlapMm,
    safeMarginMm: request.plan.safeMarginMm,
    sheetSize: request.plan.sheetDocument.pageSize,
    sheetOrientation: request.plan.sheetDocument.orientation,
    assembledPhysicalSizeMm: request.plan.assembledPhysicalSizeMm,
    minimumFontSizePt: request.plan.quality.metrics.minimumFontSizePt,
    quality: request.plan.quality.status,
    utilization: request.plan.utilization,
    gridRecommendation: recommendation,
    order: request.plan.tiles.map(({ index, row, column, label, treeContent }) => ({
      index,
      row,
      column,
      label,
      file: tileFileName(index, label),
      treeContent,
    })),
  }, null, 2));
  zip.file('README.txt', createReadme(request.plan, recommendation));
  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/zip',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  return {
    blob: blob.type === 'application/zip' ? blob : new Blob([blob], { type: 'application/zip' }),
    fileName: `${safeName(request.fileName ?? request.plan.sourceScene.content.title)}-tiled-wall.zip`,
    mimeType: 'application/zip',
    fileCount: request.plan.tiles.length + 2,
  };
}
