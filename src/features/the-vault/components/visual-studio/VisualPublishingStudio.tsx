import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { VisualOutputReadinessNotice } from './VisualOutputReadinessNotice';
import { VisualOutputPreviewPane } from './VisualOutputPreviewPane';
import {
  VisualOutputConfigPanel,
  type StudioWorkspaceSectionId,
} from './VisualOutputConfigPanel';
import { VisualOutputDiagramSelector } from './VisualOutputDiagramSelector';
import { VisualOutputPrintDock } from './VisualOutputPrintDock';
import { useVisualStudioStorePreviewSource } from './useVisualStudioStorePreviewSource';
import { usePosterDesignState } from './usePosterDesignState';
import { useVisualStudioPosterExport } from './useVisualStudioPosterExport';
import { useVisualStudioPosterRuntime } from './useVisualStudioPosterRuntime';
import {
  defaultPosterFontAssetResolver,
  defaultPosterImageAssetResolver,
  type PreviewLiveTreeSource,
  type PosterFontAssetResolver,
  type PosterImageAssetResolver,
  type StudioPosterExportRuntime,
  type StudioPosterSvgResources,
} from '../../../publishing';

interface VisualPublishingStudioProps {
  language: 'ar' | 'en';
  previewSourceMode?: 'fixture' | 'store';
  storePreviewSource?: PreviewLiveTreeSource;
  posterFontAssetResolver?: PosterFontAssetResolver;
  posterImageAssetResolver?: PosterImageAssetResolver;
  posterImageSourceResolver?: (personId: string) => string | undefined;
  posterSvgResources?: StudioPosterSvgResources;
  pngExportRuntime?: StudioPosterExportRuntime;
  pdfExportRuntime?: StudioPosterExportRuntime;
}

interface VisualPublishingStudioInnerProps extends VisualPublishingStudioProps {
  storePreviewSource?: PreviewLiveTreeSource;
}

const VisualPublishingStudioInner: React.FC<VisualPublishingStudioInnerProps> = ({
  language,
  previewSourceMode = 'fixture',
  storePreviewSource,
  posterFontAssetResolver = defaultPosterFontAssetResolver,
  posterImageAssetResolver = defaultPosterImageAssetResolver,
  posterImageSourceResolver,
  posterSvgResources: suppliedPosterSvgResources,
  pngExportRuntime,
  pdfExportRuntime,
}) => {
  const isAr = language === 'ar';

  const studioDesign = usePosterDesignState('classic-heritage');

  const [isMobilePreviewExpanded, setIsMobilePreviewExpanded] = useState(true);
  const [activeConfigSection, setActiveConfigSection] = useState<StudioWorkspaceSectionId>('quick-setup');

  const {
    definitions,
    selectedDefinition,
    selectedPosterRootToken,
    selectedFocalPersonToken,
    posterRootOptions,
    userPosterTitle,
    userPosterSubtitle,
    previewPresentationTitle,
    mappingResult,
    previewModel,
    posterSceneEvaluation,
    posterScene,
    branchPosterCollection,
    branchCollectionBlockingWarnings,
    tiledWallPosterPlan,
    posterSvgResources,
    posterResourceStatus,
  } = useVisualStudioPosterRuntime({
    language,
    designState: studioDesign.state,
    previewSourceMode,
    storePreviewSource,
    posterFontAssetResolver,
    posterImageAssetResolver,
    posterImageSourceResolver,
    suppliedPosterSvgResources,
  });

  const previewPosterScene = studioDesign.state.productMode === 'branch-collection'
    ? branchPosterCollection?.overviewScene ?? posterScene
    : posterScene;
  const productPreview = studioDesign.state.productMode === 'branch-collection' && branchPosterCollection
    ? { kind: 'branch-collection' as const, itemCount: branchPosterCollection.itemCount }
    : studioDesign.state.productMode === 'tiled-wall'
      ? {
          kind: 'tiled-wall' as const,
          rows: studioDesign.state.productBucket.tiledRows,
          columns: studioDesign.state.productBucket.tiledColumns,
          sheetSize: studioDesign.state.productBucket.tiledSheetSize,
        }
      : undefined;

  const {
    exportingFormat,
    exportPoster,
    exportBranchCollection,
    exportTiledWall,
  } = useVisualStudioPosterExport({
    language,
    posterScene,
    posterSvgResources,
    branchPosterCollection,
    tiledWallPosterPlan,
    pngExportRuntime,
    pdfExportRuntime,
  });

  const capacityErrorGuidance = posterSceneEvaluation.capacityError
    ? (isAr
        ? (studioDesign.state.layoutMode === 'radial-generations'
            ? 'تجاوز التخطيط الشعاعي سعة الصفحة. قلّل عدد الحلقات أو اختر مقاسًا أكبر.'
            : 'تجاوز تخطيط العائلة حول شخص سعة الصفحة. قلّل العمق أو اختر مقاسًا أكبر.')
        : (studioDesign.state.layoutMode === 'radial-generations'
            ? 'Radial layout capacity exceeded. Reduce generation rings or choose a larger page.'
            : 'Focus layout capacity exceeded. Reduce depth or choose a larger page.'))
    : undefined;

  const printDock = (
    <VisualOutputPrintDock
      language={language}
      state={studioDesign.state}
      onUpdatePrint={studioDesign.updatePrint}
      selectedDefinition={mappingResult.supported ? selectedDefinition : undefined}
      exportingFormat={exportingFormat}
      quality={posterScene?.quality}
      branchCollectionAvailable={Boolean(branchPosterCollection?.itemCount && branchCollectionBlockingWarnings.length === 0)}
      branchCollectionBlocked={Boolean(branchPosterCollection?.itemCount && branchCollectionBlockingWarnings.length > 0)}
      tiledWallAvailable={Boolean(tiledWallPosterPlan && tiledWallPosterPlan.quality.status !== 'blocked')}
      resourceStatus={posterResourceStatus}
      isBlocked={Boolean(posterSceneEvaluation.capacityError)}
      capacityErrorGuidance={capacityErrorGuidance}
      onExportSvg={mappingResult.supported ? () => void exportPoster('svg') : undefined}
      onExportPng={mappingResult.supported ? () => void exportPoster('png') : undefined}
      onExportPdf={mappingResult.supported ? () => void exportPoster('pdf') : undefined}
      onExportBranchCollection={mappingResult.supported ? () => void exportBranchCollection() : undefined}
      onExportTiledWall={mappingResult.supported ? () => void exportTiledWall() : undefined}
      onUseDensePreset={selectedDefinition.id === 'dense-genealogy-poster'
        ? undefined
        : () => studioDesign.selectPreset('dense-genealogy')}
      onUseLargestPage={mappingResult.posterOptions?.size === 'A0'
        ? undefined
        : () => studioDesign.updatePrint({ size: 'A0', orientation: 'landscape' })}
      onUseBranchCollection={studioDesign.state.productMode === 'branch-collection'
        ? undefined
        : () => studioDesign.switchProductMode('branch-collection')}
      onUseTiledWall={studioDesign.state.productMode === 'tiled-wall'
        ? undefined
        : () => studioDesign.switchProductMode('tiled-wall')}
    />
  );

  return (
    <div className="space-y-4" data-testid="visual-publishing-studio">
      <VisualOutputReadinessNotice
        language={language}
        status={mappingResult.supported ? 'supported' : 'unsupported'}
        reason={mappingResult.reason}
      />

      <VisualOutputDiagramSelector
        language={language}
        state={studioDesign.state}
        onSelectDiagramType={(mode) => {
          studioDesign.selectDiagramType(
            mode,
            mode === 'focus-family' ? selectedFocalPersonToken : undefined
          );
          setActiveConfigSection('tree-layout');
        }}
        onSwitchProductMode={studioDesign.switchProductMode}
        onSwitchScope={studioDesign.switchScope}
        onUpdateRadial={studioDesign.updateRadial}
      />

      <div className="overflow-hidden rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)]">
        <div className="grid items-stretch lg:h-[clamp(420px,calc(100dvh-390px),640px)] lg:grid-cols-[minmax(0,1fr)_320px]" dir="ltr">
        {/* Preview Workspace Area - sticky on desktop, expandable on mobile */}
        <div
          className="flex min-h-0 min-w-0 flex-col bg-[var(--surface-subtle)]"
          data-testid="visual-studio-preview-workspace"
          dir={isAr ? 'rtl' : 'ltr'}
        >
          {/* Mobile preview toggle controls the same canonical preview used on desktop. */}
          <div className="block border-b border-[var(--border-soft)] p-2 lg:hidden">
            <button
              type="button"
              data-testid="visual-studio-mobile-preview-toggle"
              aria-expanded={isMobilePreviewExpanded}
              aria-controls="mobile-preview-container"
              onClick={() => setIsMobilePreviewExpanded(!isMobilePreviewExpanded)}
              className="flex w-full items-center justify-between rounded-md border border-stone-800 bg-stone-900 px-3.5 py-2 text-xs font-medium text-stone-200 hover:bg-stone-800/60"
            >
              <span>{isAr ? 'معاينة البوستر' : 'Poster Preview'}</span>
              {isMobilePreviewExpanded ? (
                <ChevronUp className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
              )}
            </button>
          </div>

          <div
            id="mobile-preview-container"
            className={`${isMobilePreviewExpanded ? 'block' : 'hidden'} min-h-0 flex-1 overflow-auto lg:block`}
          >
            <VisualOutputPreviewPane
              language={language}
              selectedDefinition={selectedDefinition}
              previewModel={previewModel}
              posterScene={previewPosterScene}
              posterSvgResources={posterSvgResources}
              unavailableReason={capacityErrorGuidance}
              presentationTitle={branchPosterCollection?.title ?? previewPresentationTitle}
              productPreview={productPreview}
            />
          </div>
          {printDock}
        </div>

        {/* Settings Workspace Panel */}
        <aside
          className="min-h-0 min-w-0 self-stretch overflow-hidden border-l border-[var(--border-soft)]"
          dir={isAr ? 'rtl' : 'ltr'}
        >
          <VisualOutputConfigPanel
            language={language}
            state={studioDesign.state}
            isModified={studioDesign.isModified}
            canUndo={studioDesign.canUndo}
            canRedo={studioDesign.canRedo}
            onSelectPreset={studioDesign.selectPreset}
            onUpdateContent={studioDesign.updateContent}
            onUpdateLayout={studioDesign.updateLayout}
            onUpdateCards={studioDesign.updateCards}
            onUpdateAppearance={studioDesign.updateAppearance}
            onUpdateFocus={studioDesign.updateFocus}
            onUpdateRadial={studioDesign.updateRadial}
            onResetSection={studioDesign.resetSection}
            onResetPoster={studioDesign.resetPoster}
            onUndo={studioDesign.undo}
            onRedo={studioDesign.redo}
            definitions={definitions}
            posterRootOptions={posterRootOptions}
            selectedPosterRootToken={selectedPosterRootToken}
            selectedFocalPersonToken={selectedFocalPersonToken}
            onSelectPosterRoot={(token) => studioDesign.updateContent({ selectedPosterRootToken: token })}
            posterTitle={userPosterTitle}
            onPosterTitleChange={(value) => studioDesign.updateContent({ headerText: value })}
            posterSubtitle={userPosterSubtitle}
            onPosterSubtitleChange={(value) => studioDesign.updateContent({ subheaderText: value })}
            activeSection={activeConfigSection}
            onActiveSectionChange={setActiveConfigSection}
          />
        </aside>
        </div>

      </div>
    </div>
  );
};

const VisualPublishingStudioWithStore: React.FC<Omit<VisualPublishingStudioProps, 'previewSourceMode'>> = (props) => {
  const storePreviewInput = useVisualStudioStorePreviewSource();

  return (
    <VisualPublishingStudioInner
      {...props}
      previewSourceMode="store"
      storePreviewSource={props.storePreviewSource ?? storePreviewInput.source}
      posterImageSourceResolver={props.posterImageSourceResolver ?? storePreviewInput.resolvePosterImageSource}
    />
  );
};

export const VisualPublishingStudio: React.FC<VisualPublishingStudioProps> = ({
  previewSourceMode = 'fixture',
  ...props
}) => {
  if (previewSourceMode === 'store') {
    return <VisualPublishingStudioWithStore {...props} />;
  }

  return <VisualPublishingStudioInner {...props} previewSourceMode="fixture" />;
};
export default VisualPublishingStudio;
