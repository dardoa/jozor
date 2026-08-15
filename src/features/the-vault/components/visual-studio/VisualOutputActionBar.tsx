import React from 'react';
import {
  Archive,
  FileCode2,
  FileText,
  Grid3X3,
  ImageIcon,
  LayoutGrid,
  Loader2,
  Maximize2,
  Network,
} from 'lucide-react';
import type {
  PosterProductMode,
  PrintQualityReport,
  VisualOutputDefinition,
} from '../../../publishing';

export interface VisualOutputActionBarProps {
  language: 'ar' | 'en';
  selectedDefinition?: VisualOutputDefinition;
  exportingFormat?: 'svg' | 'png' | 'pdf' | 'branch-collection' | 'tiled-wall';
  outputMode?: PosterProductMode;
  quality?: PrintQualityReport;
  branchCollectionAvailable?: boolean;
  branchCollectionBlocked?: boolean;
  tiledWallAvailable?: boolean;
  isBlocked?: boolean;
  capacityErrorGuidance?: string;
  onExportSvg?: () => void;
  onExportPng?: () => void;
  onExportPdf?: () => void;
  onExportBranchCollection?: () => void;
  onExportTiledWall?: () => void;
  onUseDensePreset?: () => void;
  onUseLargestPage?: () => void;
  onSetUpLargeTreeProducts?: () => void;
}

export const VisualOutputActionBar: React.FC<VisualOutputActionBarProps> = ({
  language,
  selectedDefinition,
  exportingFormat,
  outputMode,
  quality,
  branchCollectionAvailable = false,
  branchCollectionBlocked = false,
  tiledWallAvailable = false,
  isBlocked = false,
  capacityErrorGuidance,
  onExportSvg,
  onExportPng,
  onExportPdf,
  onExportBranchCollection,
  onExportTiledWall,
  onUseDensePreset,
  onUseLargestPage,
  onSetUpLargeTreeProducts,
}) => {
  const isAr = language === 'ar';
  const supportsSvg = selectedDefinition?.capabilities.rendererTargets.includes('svg') ?? false;
  const supportsPng = selectedDefinition?.capabilities.rendererTargets.includes('png') ?? false;
  const supportsPdf = selectedDefinition?.capabilities.rendererTargets.includes('pdf') ?? false;
  const isExporting = Boolean(exportingFormat);
  const isBranchCollection = outputMode === 'branch-collection';
  const isTiledWall = outputMode === 'tiled-wall';
  const isPackageOutput = isBranchCollection || isTiledWall;
  const isPrintBlocked = isBranchCollection
    ? branchCollectionBlocked || !branchCollectionAvailable
    : isTiledWall
      ? !tiledWallAvailable
      : isBlocked || quality?.status === 'blocked';
  const hasPrintWarning = !isPackageOutput && quality?.status === 'warning';
  const hasLargeTreeAlternative = branchCollectionAvailable || tiledWallAvailable;
  const hasGuidedRecovery = Boolean(
    onUseDensePreset || onUseLargestPage || onSetUpLargeTreeProducts
  );
  const exportStatusAnnouncement = isExporting
    ? (isAr ? `جاري تصدير ${exportingFormat}...` : `Exporting ${exportingFormat}...`)
    : isPrintBlocked
      ? (isAr
          ? 'تصدير البوستر متوقف حتى معالجة مشكلة جودة الطباعة'
          : 'Poster export is blocked until the print quality issue is resolved')
      : isBranchCollection
        ? (isAr ? 'مجموعة الفروع جاهزة للتنزيل' : 'Branch collection ready to download')
        : isTiledWall
          ? (isAr ? 'اللوحة المقسمة جاهزة للتنزيل' : 'Tiled wall poster ready to download')
      : hasPrintWarning
        ? (isAr ? 'راجع جودة الطباعة قبل تصدير البوستر' : 'Review print quality before exporting the poster')
        : (isAr ? 'الاستوديو جاهز للتصدير' : 'Studio ready for export');

  if (selectedDefinition?.productType !== 'poster' || (!supportsSvg && !supportsPng && !supportsPdf)) {
    return null;
  }

  return (
    <div
      className="flex flex-col gap-3 border-t border-[var(--border-soft)] pt-4 lg:flex-row lg:items-center lg:justify-between min-w-0 w-full"
      data-testid="visual-studio-action-bar"
    >
      {/* Live Region for Export Status Announcements */}
      <div
        role="status"
        aria-live="polite"
        className="sr-only"
        data-testid="visual-studio-export-status-live-region"
      >
        {exportStatusAnnouncement}
      </div>

      <span
        id="poster-format-guidance"
        className="sr-only"
        data-testid="poster-format-guidance"
      >
        {isAr
          ? 'SVG للطباعة المتجهة، PNG للصورة عالية الدقة، وPDF للطباعة المباشرة.'
          : 'SVG for vector printing, PNG for a high-resolution image, and PDF for direct printing.'}
      </span>

      {!isPackageOutput && (capacityErrorGuidance || isPrintBlocked || hasPrintWarning) && (
      <div className="flex min-w-0 w-full flex-col gap-1 text-start lg:max-w-md">
        {capacityErrorGuidance && (
          <span
            className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 whitespace-normal break-words"
            data-testid="poster-capacity-error-guidance"
          >
            {capacityErrorGuidance}
          </span>
        )}
        {(isPrintBlocked || hasPrintWarning) && (
          <span
            className={isPrintBlocked ? 'text-[10px] font-semibold text-red-700 whitespace-normal break-words' : 'text-[10px] font-semibold text-amber-700 whitespace-normal break-words'}
            data-testid="poster-print-quality-notice"
            data-quality-warnings={JSON.stringify(quality?.warnings || [])}
          >
            {isPrintBlocked
              ? (hasLargeTreeAlternative
                  ? (isAr
                      ? 'الصفحة الواحدة لا تكفي لهذه الشجرة. استخدم مجموعة الفروع أو اللوحة المقسمة.'
                      : 'One sheet is too small for this tree. Use the branch collection or tiled wall poster.')
                  : (isAr
                      ? 'هذا التخطيط غير مناسب للطباعة بهذا المقاس. قلّل الأجيال أو اختر مقاسًا أكبر.'
                      : 'This layout is not printable at the selected size. Reduce generations or choose a larger page.'))
              : (isAr
                  ? 'راجع كثافة البوستر ووضوح النص قبل الطباعة.'
                  : 'Review poster density and text readability before printing.')}
          </span>
        )}
        {isPrintBlocked && hasGuidedRecovery && (
          <div
            className="mt-2 flex max-w-2xl flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-amber-950"
            data-testid="poster-large-tree-guidance"
          >
            <div>
              <div className="text-[11px] font-bold">
                {isAr ? 'اختر مسارًا أوضح لهذه الشجرة' : 'Choose a clearer route for this tree'}
              </div>
              <div className="text-[9px] font-medium leading-relaxed text-amber-800">
                {isAr
                  ? 'هذه الخيارات تعدّل إعدادات المعاينة فقط، ولن تبدأ أي تنزيل.'
                  : 'These options only adjust the preview settings; they do not start a download.'}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {onUseDensePreset && (
                <button
                  type="button"
                  onClick={onUseDensePreset}
                  aria-label={isAr ? 'استخدام قالب الأنساب الكثيف' : 'Use Dense Genealogy'}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-amber-300 bg-white px-2.5 text-[10px] font-bold transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
                  {isAr ? 'استخدام قالب الأنساب الكثيف' : 'Use Dense Genealogy'}
                </button>
              )}
              {onUseLargestPage && (
                <button
                  type="button"
                  onClick={onUseLargestPage}
                  aria-label={isAr ? 'تجربة A0 أفقي' : 'Try A0 landscape'}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-amber-300 bg-white px-2.5 text-[10px] font-bold transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {isAr ? 'تجربة A0 أفقي' : 'Try A0 landscape'}
                </button>
              )}
              {onSetUpLargeTreeProducts && (
                <button
                  type="button"
                  onClick={onSetUpLargeTreeProducts}
                  aria-label={isAr ? 'تهيئة منتجات الشجرة الكبيرة' : 'Set up large-tree products'}
                  className="inline-flex min-h-8 items-center gap-1.5 rounded-md border border-amber-300 bg-white px-2.5 text-[10px] font-bold transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                >
                  <Network className="h-3.5 w-3.5" aria-hidden="true" />
                  {isAr ? 'تهيئة منتجات الشجرة الكبيرة' : 'Set up large-tree products'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
      )}
      <div role="group" aria-label={isAr ? 'إجراءات التنزيل والتصدير' : 'Download and export actions'} className="grid w-full grid-cols-2 gap-2 sm:grid-cols-2 lg:flex lg:flex-wrap lg:justify-end min-w-0 max-w-full" data-testid="visual-studio-action-group">
        {branchCollectionBlocked && (
          <span
            className="col-span-2 max-w-72 text-[10px] font-semibold leading-relaxed text-amber-700 whitespace-normal break-words"
            data-testid="branch-collection-quality-notice"
          >
            {isAr
              ? 'مجموعة الفروع تحتاج مقاسًا أكبر أو قالب الأنساب الكثيف قبل التنزيل.'
              : 'The branch collection needs a larger page or the Dense Genealogy preset before download.'}
          </span>
        )}
        {branchCollectionAvailable && onExportBranchCollection && (
          <button
            type="button"
            onClick={onExportBranchCollection}
            disabled={isExporting}
            aria-label={isAr ? 'تنزيل مجموعة الفروع' : 'Download branch collection'}
            className="col-span-2 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[var(--primary-600)] px-4 py-2 text-xs font-bold text-[var(--primary-700)] transition-colors hover:bg-[var(--primary-500)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-500)] disabled:cursor-wait disabled:opacity-65 lg:col-span-1"
          >
            {exportingFormat === 'branch-collection'
              ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              : <Archive className="h-4 w-4" aria-hidden="true" />}
            {exportingFormat === 'branch-collection'
              ? (isAr ? 'جاري إعداد المجموعة...' : 'Creating collection...')
              : (isAr ? 'تنزيل مجموعة الفروع' : 'Download branch collection')}
          </button>
        )}
        {tiledWallAvailable && onExportTiledWall && (
          <button
            type="button"
            onClick={onExportTiledWall}
            disabled={isExporting}
            aria-label={isAr ? 'تنزيل لوحة مقسمة' : 'Download tiled wall poster'}
            className="col-span-2 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[var(--primary-600)] px-4 py-2 text-xs font-bold text-[var(--primary-700)] transition-colors hover:bg-[var(--primary-500)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-500)] disabled:cursor-wait disabled:opacity-65 lg:col-span-1"
          >
            {exportingFormat === 'tiled-wall'
              ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              : <Grid3X3 className="h-4 w-4" aria-hidden="true" />}
            {exportingFormat === 'tiled-wall'
              ? (isAr ? 'جاري إعداد اللوحة...' : 'Creating wall sheets...')
              : (isAr ? 'تنزيل لوحة مقسمة' : 'Download tiled wall poster')}
          </button>
        )}
        {!isPackageOutput && supportsSvg && onExportSvg && (
          <button
            type="button"
            onClick={onExportSvg}
            disabled={isExporting || isPrintBlocked}
            aria-describedby="poster-format-guidance"
            aria-label={isAr ? 'تنزيل SVG' : 'Download SVG'}
            title={isAr ? 'الأفضل للطباعة الكبيرة' : 'Best for large-format printing'}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[var(--primary-600)] px-4 py-2 text-xs font-bold text-[var(--primary-700)] transition-colors hover:bg-[var(--primary-500)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-500)] disabled:cursor-wait disabled:opacity-65"
          >
            {exportingFormat === 'svg' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileCode2 className="h-4 w-4" aria-hidden="true" />}
            {exportingFormat === 'svg'
              ? (isAr ? 'جاري SVG...' : 'Creating SVG...')
              : (isAr ? 'تنزيل SVG' : 'Download SVG')}
          </button>
        )}
        {!isPackageOutput && supportsPng && onExportPng && (
          <button
            type="button"
            onClick={onExportPng}
            disabled={isExporting || isPrintBlocked}
            aria-describedby="poster-format-guidance"
            aria-label={isAr ? 'تنزيل PNG' : 'Download PNG'}
            title={isAr ? 'صورة عالية الدقة' : 'High-resolution image'}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[var(--primary-600)] px-4 py-2 text-xs font-bold text-[var(--primary-700)] transition-colors hover:bg-[var(--primary-500)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-500)] disabled:cursor-wait disabled:opacity-65"
          >
            {exportingFormat === 'png' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ImageIcon className="h-4 w-4" aria-hidden="true" />}
            {exportingFormat === 'png'
              ? (isAr ? 'جاري PNG...' : 'Creating PNG...')
              : (isAr ? 'تنزيل PNG' : 'Download PNG')}
          </button>
        )}
        {!isPackageOutput && supportsPdf && onExportPdf && (
          <button
            type="button"
            onClick={onExportPdf}
            disabled={isExporting || isPrintBlocked}
            aria-describedby="poster-format-guidance"
            aria-label={isAr ? 'تنزيل PDF' : 'Download PDF'}
            title={isAr ? 'ملف PDF نقطي من نفس التصميم' : 'Raster PDF from the same design'}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--primary-600)] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[var(--primary-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-500)] disabled:cursor-wait disabled:opacity-65"
          >
            {exportingFormat === 'pdf' ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FileText className="h-4 w-4" aria-hidden="true" />}
            {exportingFormat === 'pdf'
              ? (isAr ? 'جاري PDF...' : 'Creating PDF...')
              : (isAr ? 'تنزيل PDF' : 'Download PDF')}
          </button>
        )}
      </div>
    </div>
  );
};
