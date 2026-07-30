import React from 'react';
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
}) => {
  const isAr = language === 'ar';
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
  const previewMaxWidth = posterOrientation === 'portrait' ? 460 : 760;

  return (
    <div
      className="flex flex-col items-center gap-4 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-4 text-center select-none"
      data-testid="visual-studio-preview-pane"
    >
      <div
        className="flex min-h-[360px] w-full items-center justify-center rounded-lg border border-[var(--border-soft)]/60 bg-[var(--surface-panel)] p-3 md:min-h-[440px]"
        data-testid="visual-preview-frame"
        aria-label={previewAlt}
      >
        {productType === 'poster' && posterRender ? (
          <div
            dir="ltr"
            className="w-full shrink-0 overflow-hidden border border-[var(--border-soft)] bg-white shadow-md transition-[max-width,aspect-ratio] duration-200"
            data-testid="studio-poster-page-frame"
            data-poster-scene-version={posterScene?.version}
            style={{ maxWidth: previewMaxWidth, aspectRatio: previewAspectRatio }}
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

      <div className="flex flex-col gap-1 text-center">
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
  );
};
