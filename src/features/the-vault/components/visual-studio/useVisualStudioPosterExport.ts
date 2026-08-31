import { useState } from 'react';
import { toast } from 'sonner';
import { downloadFile } from '@/utils/fileUtils';
import {
  exportBranchPosterCollectionArchive,
  exportTiledWallPosterArchive,
  type BranchPosterCollectionManifest,
  type PosterScene,
  type StudioPosterExportFormat,
  type StudioPosterExportRuntime,
  type StudioPosterSvgResources,
  type TiledWallPosterPlan,
} from '../../../publishing';
import { createStudioPosterBrowserPngRuntime } from '../../../publishing/visualOutputs/studioPosterBrowserPngRuntime';
import { createStudioPosterBrowserPdfRuntime } from '../../../publishing/visualOutputs/studioPosterBrowserPdfRuntime';
import { exportStudioPoster } from '../../../publishing/visualOutputs/studioPosterExportAdapter';

export type VisualStudioExportingFormat = StudioPosterExportFormat | 'branch-collection' | 'tiled-wall';

interface UseVisualStudioPosterExportOptions {
  language: 'ar' | 'en';
  posterScene?: PosterScene;
  posterSvgResources?: StudioPosterSvgResources;
  branchPosterCollection?: BranchPosterCollectionManifest;
  tiledWallPosterPlan?: TiledWallPosterPlan;
  pngExportRuntime?: StudioPosterExportRuntime;
  pdfExportRuntime?: StudioPosterExportRuntime;
}

export function useVisualStudioPosterExport({
  language,
  posterScene,
  posterSvgResources,
  branchPosterCollection,
  tiledWallPosterPlan,
  pngExportRuntime,
  pdfExportRuntime,
}: UseVisualStudioPosterExportOptions) {
  const isAr = language === 'ar';
  const [exportingFormat, setExportingFormat] = useState<VisualStudioExportingFormat>();

  const exportPoster = async (format: StudioPosterExportFormat) => {
    if (!posterScene) return;

    setExportingFormat(format);
    try {
      if (format === 'svg') {
        const result = await exportStudioPoster(
          {
            scene: posterScene,
            resources: posterSvgResources,
            format,
          },
          {} as StudioPosterExportRuntime
        );
        downloadFile(result.blob, result.fileName, result.mimeType);
        toast.success(isAr ? 'تم تنزيل ملف SVG بنجاح' : 'SVG file downloaded successfully');
        return;
      }

      if (format === 'png') {
        const runtime = pngExportRuntime?.renderPng
          ? pngExportRuntime
          : createStudioPosterBrowserPngRuntime();
        const result = await exportStudioPoster(
          {
            scene: posterScene,
            resources: posterSvgResources,
            format,
          },
          runtime
        );
        downloadFile(result.blob, result.fileName, result.mimeType);
        toast.success(isAr ? 'تم تنزيل صورة PNG بنجاح' : 'PNG image downloaded successfully');
        return;
      }

      const runtime = pdfExportRuntime?.renderPdf
        ? pdfExportRuntime
        : createStudioPosterBrowserPdfRuntime({});
      const result = await exportStudioPoster(
        {
          scene: posterScene,
          resources: posterSvgResources,
          format,
        },
        runtime
      );
      downloadFile(result.blob, result.fileName, result.mimeType);
      toast.success(isAr ? 'تم تنزيل ملف PDF بنجاح' : 'PDF file downloaded successfully');
    } catch {
      toast.error(isAr ? 'عذراً، تعذر تصدير الملف' : 'Sorry, failed to export file');
    } finally {
      setExportingFormat(undefined);
    }
  };

  const exportBranchCollection = async () => {
    if (!branchPosterCollection) return;

    setExportingFormat('branch-collection');
    try {
      const result = await exportBranchPosterCollectionArchive({
        collection: branchPosterCollection,
        resources: posterSvgResources,
      });
      downloadFile(result.blob, result.fileName, result.mimeType);
      toast.success(isAr ? 'تم تصدير حزمة الفروع بنجاح' : 'Branch collection archive exported successfully');
    } catch {
      toast.error(isAr ? 'عذراً، تعذر تصدير حزمة الفروع' : 'Sorry, failed to export branch collection archive');
    } finally {
      setExportingFormat(undefined);
    }
  };

  const exportTiledWall = async () => {
    if (!tiledWallPosterPlan) return;

    setExportingFormat('tiled-wall');
    try {
      const result = await exportTiledWallPosterArchive({
        plan: tiledWallPosterPlan,
        resources: posterSvgResources,
      });
      downloadFile(result.blob, result.fileName, result.mimeType);
      toast.success(isAr ? 'تم تصدير أوراق اللوحة المقسمة بنجاح' : 'Tiled wall archive exported successfully');
    } catch {
      toast.error(isAr ? 'عذراً، تعذر تصدير اللوحة المقسمة' : 'Sorry, failed to export tiled wall archive');
    } finally {
      setExportingFormat(undefined);
    }
  };

  return {
    exportingFormat,
    exportPoster,
    exportBranchCollection,
    exportTiledWall,
  };
}
