import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Maximize2, Scan, X, ZoomIn, ZoomOut } from 'lucide-react';
import {
  renderPosterSceneToSvg,
  type PosterScene,
  type StudioPosterSvgResources,
  type VisualOutputDefinition,
  type VisualPreviewModel,
} from '../../../publishing';

interface VisualOutputPreviewPaneProps {
  language: 'ar' | 'en';
  selectedDefinition?: VisualOutputDefinition;
  previewModel?: VisualPreviewModel;
  posterScene?: PosterScene;
  posterSvgResources?: StudioPosterSvgResources;
  unavailableReason?: string;
}

const ar = {
  peopleVisible: '\u0627\u0644\u0623\u0634\u062e\u0627\u0635 \u0627\u0644\u0638\u0627\u0647\u0631\u0648\u0646',
  relationshipsVisible: '\u0627\u0644\u0639\u0644\u0627\u0642\u0627\u062a \u0627\u0644\u0638\u0627\u0647\u0631\u0629',
  previewSimplified: '\u0627\u0644\u0645\u0639\u0627\u064a\u0646\u0629 \u0645\u062e\u062a\u0635\u0631\u0629',
};

export const VisualOutputPreviewPane: React.FC<VisualOutputPreviewPaneProps> = ({
  language,
  selectedDefinition,
  previewModel,
  posterScene,
  posterSvgResources,
  unavailableReason,
}) => {
  const isAr = language === 'ar';
  const [previewZoom, setPreviewZoom] = React.useState(1);
  const [isPreviewExpanded, setIsPreviewExpanded] = React.useState(false);
  const expandButtonRef = React.useRef<HTMLButtonElement>(null);
  const expandedDialogRef = React.useRef<HTMLElement>(null);
  const expandedCloseButtonRef = React.useRef<HTMLButtonElement>(null);
  const displayName = selectedDefinition?.displayName[language] || '';
  const description = selectedDefinition?.description[language] || '';
  const previewAlt = selectedDefinition?.previewAsset?.alt[language] || '';
  const productType = selectedDefinition?.productType || 'poster';
  const posterOrientation = posterScene?.document.orientation ?? 'portrait';

  const nodeCount = previewModel?.nodes?.length ?? (previewModel as unknown as { data?: { graph?: { nodes?: unknown[] } } })?.data?.graph?.nodes?.length ?? 0;
  const edgeCount = previewModel?.edges?.length ?? (previewModel as unknown as { data?: { graph?: { edges?: unknown[] } } })?.data?.graph?.edges?.length ?? 0;
  const isTruncated = previewModel?.metadata?.truncated ?? false;
  const posterRender = productType === 'poster' && posterScene
    ? renderPosterSceneToSvg({ scene: posterScene, resources: posterSvgResources })
    : undefined;
  const previewAspectRatio = posterRender
    ? `${posterRender.metadata.width} / ${posterRender.metadata.height}`
    : undefined;
  const previewMaxWidth = posterOrientation === 'portrait' ? 640 : 980;

  React.useEffect(() => {
    if (!isPreviewExpanded) return undefined;

    const triggerButton = expandButtonRef.current;
    expandedCloseButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        setIsPreviewExpanded(false);
        return;
      }

      if (event.key !== 'Tab') return;

      const focusableElements = Array.from(
        expandedDialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter((element) => element.offsetParent !== null || element === expandedCloseButtonRef.current);

      if (focusableElements.length === 0) {
        event.preventDefault();
        expandedCloseButtonRef.current?.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement;
      const shouldWrapBackward = event.shiftKey && activeElement === firstElement;
      const shouldWrapForward = !event.shiftKey && activeElement === lastElement;

      if (shouldWrapBackward || shouldWrapForward) {
        event.preventDefault();
        (shouldWrapBackward ? lastElement : firstElement).focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      triggerButton?.focus();
    };
  }, [isPreviewExpanded]);

  return (
    <>
    <div
      className="flex h-full min-h-[68vh] flex-col items-center gap-3 bg-[var(--surface-subtle)] p-3 text-center select-none sm:p-5"
      data-testid="visual-studio-preview-pane"
    >
      <div
        className="relative flex min-h-[430px] w-full flex-1 items-center justify-center overflow-auto bg-[var(--surface-panel)] p-3 md:min-h-[560px] lg:min-h-[620px] lg:p-6"
        data-testid="visual-preview-frame"
        aria-label={previewAlt}
      >
        {productType === 'poster' && posterRender && (
          <div
            className="absolute start-3 top-3 z-10 flex gap-1 rounded-md border border-[var(--border-soft)] bg-[var(--surface-panel)]/95 p-1 shadow-sm backdrop-blur"
            role="group"
            aria-label={isAr ? 'أدوات تكبير المعاينة' : 'Preview zoom controls'}
            data-testid="poster-preview-zoom-controls"
          >
            <button
              type="button"
              aria-label={isAr ? 'تصغير المعاينة' : 'Zoom out preview'}
              title={isAr ? 'تصغير' : 'Zoom out'}
              disabled={previewZoom <= 0.75}
              onClick={() => setPreviewZoom((value) => Math.max(0.75, value - 0.25))}
              className="inline-flex h-8 w-8 items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-500)] disabled:opacity-35"
            >
              <ZoomOut className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={isAr ? 'ملاءمة الورقة داخل المعاينة' : 'Fit poster in preview'}
              title={isAr ? 'ملاءمة' : 'Fit'}
              onClick={() => setPreviewZoom(1)}
              className="inline-flex h-8 w-8 items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-500)]"
            >
              <Scan className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label={isAr ? 'تكبير المعاينة' : 'Zoom in preview'}
              title={isAr ? 'تكبير' : 'Zoom in'}
              disabled={previewZoom >= 1.5}
              onClick={() => setPreviewZoom((value) => Math.min(1.5, value + 0.25))}
              className="inline-flex h-8 w-8 items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-500)] disabled:opacity-35"
            >
              <ZoomIn className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              ref={expandButtonRef}
              type="button"
              aria-label={isAr ? 'فتح معاينة كبيرة' : 'Open large poster preview'}
              title={isAr ? 'معاينة كبيرة' : 'Large preview'}
              onClick={() => setIsPreviewExpanded(true)}
              className="inline-flex h-8 w-8 items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-500)]"
              data-testid="poster-preview-expand"
            >
              <Maximize2 className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}
        {productType === 'poster' && posterRender ? (
          <div
            dir="ltr"
            className="max-h-full w-full shrink-0 overflow-hidden border border-[var(--border-soft)] bg-white shadow-md transition-[max-width,aspect-ratio] duration-200"
            data-testid="studio-poster-page-frame"
            data-poster-scene-version={posterScene?.version}
            style={{
              width: `${previewZoom * 100}%`,
              maxWidth: previewMaxWidth * previewZoom,
              aspectRatio: previewAspectRatio,
            }}
          >
            <div
              role="img"
              aria-label={previewAlt || displayName}
              data-testid="studio-poster-renderer-preview"
              className="h-full w-full border-0 [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
              data-poster-renderer="svg-v1"
              dangerouslySetInnerHTML={{ __html: posterRender.svg }}
            />
          </div>
        ) : productType === 'poster' && unavailableReason ? (
          <div
            className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-5 py-6 text-amber-950"
            role="alert"
            data-testid="poster-preview-unavailable"
          >
            <AlertTriangle className="h-6 w-6 text-amber-700" aria-hidden="true" />
            <strong className="text-sm font-bold">
              {isAr ? 'تحتاج المعاينة إلى تعديل' : 'Preview needs adjustment'}
            </strong>
            <p className="text-xs font-medium leading-relaxed">{unavailableReason}</p>
          </div>
        ) : (
          <div
            className="w-[300px] h-[190px] rounded-xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] shadow-md flex flex-col p-2 relative overflow-hidden"
            data-testid="snapshot-preview-composition"
          >
            <div className="flex items-center gap-1 border-b border-[var(--border-soft)] pb-1 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
              <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
              <div className="text-[7px] text-[var(--text-muted)] font-mono ml-1">Jozor Workspace</div>
            </div>

            <div className="flex-1 grid grid-cols-3 gap-2 p-2 relative bg-[var(--surface-panel)] border border-[var(--border-soft)]/40 rounded">
              <div className="flex flex-col gap-3 justify-center items-center">
                <div className="w-9 h-4 rounded bg-[var(--primary-500)]/10 border border-[var(--primary-500)]/30" />
                <div className="w-9 h-4 rounded bg-[var(--primary-500)]/10 border border-[var(--primary-500)]/30" />
              </div>
              <div className="flex flex-col justify-center items-center">
                <div className="w-12 h-6 rounded bg-[var(--primary-500)]/20 border border-[var(--primary-500)]/50" />
              </div>
              <div className="flex flex-col gap-3 justify-center items-center">
                <div className="w-9 h-4 rounded bg-[var(--primary-500)]/10 border border-[var(--primary-500)]/30" />
                <div className="w-9 h-4 rounded bg-[var(--primary-500)]/10 border border-[var(--primary-500)]/30" />
              </div>
              <div className="absolute inset-0 bg-grid opacity-[0.03] pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-1 text-center">
        <h5 className="text-sm font-bold text-[var(--text-main)]">
          {displayName}
        </h5>
        <p className="text-[11px] text-[var(--text-secondary)] max-w-[360px] leading-normal font-medium mx-auto">
          {description}
        </p>

        {previewModel && (
          <div className="mt-2 flex flex-col items-center gap-1.5">
            <span className="text-[10px] font-semibold text-[var(--text-muted)] select-none">
              {isAr
                ? `${ar.peopleVisible}: ${nodeCount} | ${ar.relationshipsVisible}: ${edgeCount}`
                : `People visible: ${nodeCount} | Relationships visible: ${edgeCount}`}
            </span>
            {isTruncated && (
              <span className="text-indigo-600 dark:text-indigo-300 bg-indigo-500/5 border border-indigo-500/20 px-2 py-0.5 rounded text-[10px] font-bold select-none">
                {isAr ? ar.previewSimplified : 'Preview simplified'}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
    {isPreviewExpanded && posterRender && createPortal(
      <div
        className="fixed inset-0 z-[calc(var(--z-index-drawer)+10)] flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm sm:p-6"
        data-testid="poster-preview-expanded-backdrop"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) setIsPreviewExpanded(false);
        }}
      >
        <section
          ref={expandedDialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={isAr ? 'معاينة البوستر بالحجم الكبير' : 'Large poster preview'}
          className="flex h-full w-full max-w-[1600px] flex-col overflow-hidden rounded-lg border border-white/20 bg-[var(--surface-panel)] shadow-2xl"
          data-testid="poster-preview-expanded-dialog"
        >
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--border-soft)] px-4 py-3">
            <div className="min-w-0 text-start">
              <h5 className="truncate text-sm font-bold text-[var(--text-main)]">
                {displayName}
              </h5>
              <p className="text-[10px] font-medium text-[var(--text-muted)]">
                {isAr ? 'مراجعة بصرية موسعة لنفس ملف SVG' : 'Expanded review of the same SVG output'}
              </p>
            </div>
            <button
              ref={expandedCloseButtonRef}
              type="button"
              aria-label={isAr ? 'إغلاق المعاينة الكبيرة' : 'Close large poster preview'}
              onClick={() => setIsPreviewExpanded(false)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[var(--border-soft)] text-[var(--text-secondary)] hover:bg-[var(--surface-subtle)] hover:text-[var(--text-main)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary-500)]"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </header>
          <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-[var(--surface-subtle)] p-4 sm:p-6">
            <div
              dir="ltr"
              role="img"
              aria-label={previewAlt || displayName}
              className={`flex max-h-full max-w-full items-center justify-center overflow-hidden border border-[var(--border-soft)] bg-white shadow-xl [&>svg]:block [&>svg]:max-h-full [&>svg]:max-w-full ${
                posterOrientation === 'portrait'
                  ? 'h-full w-auto [&>svg]:h-full [&>svg]:w-auto'
                  : 'h-auto w-full [&>svg]:h-auto [&>svg]:w-full'
              }`}
              style={{ aspectRatio: previewAspectRatio }}
              dangerouslySetInnerHTML={{ __html: posterRender.svg }}
              data-testid="poster-preview-expanded-svg"
            />
          </div>
        </section>
      </div>,
      document.body
    )}
    </>
  );
};
