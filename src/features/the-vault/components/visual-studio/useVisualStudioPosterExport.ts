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

const getExportFailureMessage = (
  error: unknown,
  language: 'ar' | 'en',
  fallback: { ar: string; en: string }
): string => {
  const message = error instanceof Error ? error.message.toLowerCase() : '';
  if (message.includes('memory') || message.includes('canvas') || message.includes('allocation')) {
    return language === 'ar'
      ? 'تعذر إنشاء الملف بهذه الدقة. جرّب دقة أو مقاسًا أصغر.'
      : 'This file exceeds the available rendering memory. Try a smaller size or resolution.';
  }
  if (message.includes('font')) {
    return language === 'ar'
      ? 'تعذر تجهيز الخط للطباعة. أعد المحاولة بعد اكتمال تحميل الخط.'
      : 'The print font could not be prepared. Retry after the font finishes loading.';
  }
  if (message.includes('image') || message.includes('photo')) {
    return language === 'ar'
      ? 'تعذر تجهيز إحدى الصور. أخفِ الصور أو أعد المحاولة.'
      : 'A poster image could not be prepared. Hide photos or retry.';
  }
  return language === 'ar' ? fallback.ar : fallback.en;
};

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
        const result = await exportStudioPoster({
          scene: posterScene,
          resources: posterSvgResources,
          format,
        });
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
    } catch (error) {
      toast.error(getExportFailureMessage(error, language, {
        ar: 'عذراً، تعذر تصدير الملف',
        en: 'Sorry, failed to export file',
      }));
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
    } catch (error) {
      toast.error(getExportFailureMessage(error, language, {
        ar: 'عذراً، تعذر تصدير حزمة الفروع',
        en: 'Sorry, failed to export branch collection archive',
      }));
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
    } catch (error) {
      toast.error(getExportFailureMessage(error, language, {
        ar: 'عذراً، تعذر تصدير اللوحة المقسمة',
        en: 'Sorry, failed to export tiled wall archive',
      }));
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
