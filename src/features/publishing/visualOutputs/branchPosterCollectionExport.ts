import JSZip from 'jszip';
import type { BranchPosterCollectionManifest } from './branchPosterCollection';
import { renderPosterSceneToSvg, type StudioPosterSvgResources } from './studioPosterSvgRenderer';
import type { PosterScene } from './posterSceneTypes';

export interface BranchPosterCollectionArchiveRequest {
  readonly collection: BranchPosterCollectionManifest;
  readonly resources?: StudioPosterSvgResources;
  readonly fileName?: string;
}

export interface BranchPosterCollectionArchiveResult {
  readonly blob: Blob;
  readonly fileName: string;
  readonly mimeType: 'application/zip';
  readonly fileCount: number;
}

function safeName(value: string): string {
  return value.trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'branch';
}

function getScenePackagingBlocks(scene: PosterScene): string[] {
  return scene.quality.warnings.filter((warning) => (
    warning.startsWith('poster.quality.empty-scene')
    || warning.startsWith('poster.quality.selection-truncated')
    || warning.startsWith('poster.quality.card-overlap')
  ));
}

export function getBranchPosterCollectionBlockingWarnings(
  collection: BranchPosterCollectionManifest
): string[] {
  return [
    ...getScenePackagingBlocks(collection.overviewScene).map((warning) => `overview:${warning}`),
    ...collection.items.flatMap((item) => (
      getScenePackagingBlocks(item.scene).map((warning) => `${item.branchLabel}:${warning}`)
    )),
  ];
}

function assertSceneIsPackagable(scene: PosterScene, label: string): void {
  const structuralBlocks = getScenePackagingBlocks(scene);
  if (structuralBlocks.length > 0) {
    throw new Error(`Branch collection cannot package ${label}: ${structuralBlocks.join(', ')}`);
  }
}

function createReadme(collection: BranchPosterCollectionManifest): string {
  const isArabic = collection.overviewScene.content.language === 'ar';
  const page = collection.overviewScene.document;
  const orderedFiles = collection.items.map((item) => (
    `${String(item.index).padStart(2, '0')}. ${item.branchLabel} (${item.graph.nodes.length})`
  )).join('\n');
  if (isArabic) {
    return `تعليمات مجموعة بوسترات الفروع

ابدأ بملف overview.svg؛ فهو دليل مختصر يطابق رقم كل فرع مع ملفه داخل مجلد branches.
عدد بوسترات الفروع: ${collection.itemCount}
المقاس: ${page.pageSize} ${page.orientation}

ترتيب الفروع (الرقم، اسم الفرع، عدد الأشخاص)
${orderedFiles || 'لا توجد فروع قابلة للتصدير.'}

اطبع ملفات SVG بالحجم الفعلي 100%، وعطّل خيار ملاءمة الصفحة.
كل بوستر فرع يتضمن أحفاد الفرع وشركاءهم المباشرين عندما تكون العلاقة مسجلة.
الصور - عند تفعيلها - تكون مضمّنة داخل SVG ولا تعتمد على روابط تخزين خارجية.
`;
  }
  return `Branch Poster Collection Instructions

Start with overview.svg. It is a concise index matching each branch number to its file in branches/.
Branch posters: ${collection.itemCount}
Page: ${page.pageSize} ${page.orientation}

Branch order (number, branch name, people)
${orderedFiles || 'No printable branches are available.'}

Print SVG files at 100% actual size and disable Fit to Page.
Each branch poster includes branch descendants and their direct partners when recorded.
When enabled, photos are embedded inside SVG and do not depend on external storage URLs.
`;
}

export async function exportBranchPosterCollectionArchive(
  request: BranchPosterCollectionArchiveRequest
): Promise<BranchPosterCollectionArchiveResult> {
  const { collection, resources } = request;
  assertSceneIsPackagable(collection.overviewScene, 'overview');
  collection.items.forEach((item) => assertSceneIsPackagable(item.scene, item.branchLabel));

  const zip = new JSZip();
  const overview = renderPosterSceneToSvg({ scene: collection.overviewScene, resources });
  zip.file('overview.svg', overview.svg);

  const publicItems = collection.items.map((item) => {
    const number = String(item.index).padStart(2, '0');
    const file = `branches/${number}-${safeName(item.branchLabel)}.svg`;
    const rendered = renderPosterSceneToSvg({ scene: item.scene, resources });
    zip.file(file, rendered.svg);
    return {
      index: item.index,
      label: item.branchLabel,
      file,
      people: item.scene.nodes.length,
      relationships: item.scene.connectors.length,
      quality: item.scene.quality.status,
      crossReferenceCount: item.crossReferences.length,
      embeddedPhotoCount: item.scene.nodes.filter((node) => (
        Boolean(resources?.embeddedImages?.[node.previewId])
      )).length,
    };
  });

  const publicManifest = {
    version: collection.version,
    product: collection.product,
    title: collection.title,
    overviewFile: 'overview.svg',
    overviewKind: 'branch-index',
    itemCount: collection.itemCount,
    representedPeople: collection.representedPeople,
    pageSize: collection.overviewScene.document.pageSize,
    pageOrientation: collection.overviewScene.document.orientation,
    warnings: collection.warnings,
    items: publicItems,
  };
  zip.file('manifest.json', JSON.stringify(publicManifest, null, 2));
  zip.file('README.txt', createReadme(collection));

  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/zip',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
  const fileName = `${safeName(request.fileName ?? collection.title)}-branch-collection.zip`;
  return {
    blob: blob.type === 'application/zip' ? blob : new Blob([blob], { type: 'application/zip' }),
    fileName,
    mimeType: 'application/zip',
    fileCount: publicItems.length + 3,
  };
}
