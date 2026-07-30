import React, { useEffect, useMemo, useState, startTransition } from 'react';
import { VisualOutputReadinessNotice } from './VisualOutputReadinessNotice';
import { VisualOutputPreviewPane } from './VisualOutputPreviewPane';
import { VisualOutputConfigPanel } from './VisualOutputConfigPanel';
import { VisualOutputActionBar } from './VisualOutputActionBar';
import { useVisualStudioStorePreviewSource } from './useVisualStudioStorePreviewSource';
import { usePosterDesignState } from './usePosterDesignState';
import { mapPosterDesignStateToRuntimeOptions } from './posterDesignStateRuntimeAdapter';
import {
  getVisualStudioPosterNodeLimit,
  type VisualStudioPosterRootOption,
} from './visualStudioPosterOptions';
import { downloadFile } from '../../../../utils/fileUtils';
import { toast } from 'sonner';
import {
  createStudioPosterBrowserPngRuntime,
  createStudioPosterBrowserPdfRuntime,
  defaultPosterFontAssetResolver,
  defaultPosterImageAssetResolver,
  createPosterDocumentSpec,
  createPosterScene,
  createBranchPosterCollection,
  getBranchPosterCollectionBlockingWarnings,
  exportBranchPosterCollectionArchive,
  createTiledWallPosterPlan,
  exportTiledWallPosterArchive,
  exportStudioPoster,
  getPosterSvgFontResources,
  normalizePosterFooterText,
  getVisualOutputDefinition,
  listVisualOutputDefinitions,
  getVisualPreviewAdapter,
  getFixtureVisualPreviewGraphSelector,
  productionPreviewSanitizer,
  selectPosterPreviewGraph,
  selectDescendantPosterPreviewGraph,
  selectFullTreePosterPreviewGraph,
  selectSnapshotPreviewGraph,
  descendantFixturePreviewGraphSelector,
  fullTreeFixturePreviewGraphSelector,
  type FixturePreviewSource,
  type PreviewLiveTreeSource,
  type PosterContentSpec,
  type PosterFontAssetResolver,
  type PosterImageAssetRequest,
  type PosterImageAssetResolver,
  type PosterVisualStylePreset,
  type StudioPosterExportFormat,
  type StudioPosterExportRuntime,
  type StudioPosterSvgResources,
  type VisualPreviewModel,
} from '../../../publishing';

interface VisualPublishingStudioProps {
  language: 'ar' | 'en';
  isPreviewOnly?: boolean;
  previewSourceMode?: 'fixture' | 'store';
  posterFontAssetResolver?: PosterFontAssetResolver;
  posterImageAssetResolver?: PosterImageAssetResolver;
  posterImageSourceResolver?: (personId: string) => string | undefined;
  posterSvgResources?: StudioPosterSvgResources;
}

interface VisualPublishingStudioInnerProps extends VisualPublishingStudioProps {
  storePreviewSource?: PreviewLiveTreeSource;
  storeRootPersonId?: string;
}

const STUDIO_PREVIEW_FIXTURE_SOURCE: FixturePreviewSource = {
  nodes: [
    {
      fixtureId: 'fixture-root',
      displayName: 'Preview Root',
      generation: 1,
      relationshipHint: 'root',
      isLiving: true,
      hasProfilePhoto: true,
    },
    {
      fixtureId: 'fixture-father',
      displayName: 'Preview Father',
      generation: 2,
      relationshipHint: 'ancestor',
      birthDate: '1950-01-01',
      deathDate: '2010-01-01',
      hasProfilePhoto: true,
    },
    {
      fixtureId: 'fixture-mother',
      displayName: 'Preview Mother',
      generation: 2,
      relationshipHint: 'ancestor',
      birthDate: '1954-01-01',
      deathDate: '2014-01-01',
    },
    {
      fixtureId: 'fixture-grandfather-a',
      displayName: 'Preview Grandfather A',
      generation: 3,
      relationshipHint: 'ancestor',
      birthDate: '1920-01-01',
      deathDate: '1980-01-01',
    },
    {
      fixtureId: 'fixture-grandmother-a',
      displayName: 'Preview Grandmother A',
      generation: 3,
      relationshipHint: 'ancestor',
      birthDate: '1923-01-01',
      deathDate: '1988-01-01',
    },
    {
      fixtureId: 'fixture-grandfather-b',
      displayName: 'Preview Grandfather B',
      generation: 3,
      relationshipHint: 'ancestor',
      birthDate: '1918-01-01',
      deathDate: '1979-01-01',
    },
    {
      fixtureId: 'fixture-grandmother-b',
      displayName: 'Preview Grandmother B',
      generation: 3,
      relationshipHint: 'ancestor',
      birthDate: '1927-01-01',
      deathDate: '1994-01-01',
    },
  ],
  edges: [
    { fromFixtureId: 'fixture-father', toFixtureId: 'fixture-root', relationshipType: 'parent-child' },
    { fromFixtureId: 'fixture-mother', toFixtureId: 'fixture-root', relationshipType: 'parent-child' },
    { fromFixtureId: 'fixture-grandfather-a', toFixtureId: 'fixture-father', relationshipType: 'parent-child' },
    { fromFixtureId: 'fixture-grandmother-a', toFixtureId: 'fixture-father', relationshipType: 'parent-child' },
    { fromFixtureId: 'fixture-grandfather-b', toFixtureId: 'fixture-mother', relationshipType: 'parent-child' },
    { fromFixtureId: 'fixture-grandmother-b', toFixtureId: 'fixture-mother', relationshipType: 'parent-child' },
  ],
};

const VisualPublishingStudioInner: React.FC<VisualPublishingStudioInnerProps> = ({
  language,
  previewSourceMode = 'fixture',
  storePreviewSource,
  storeRootPersonId,
  posterFontAssetResolver = defaultPosterFontAssetResolver,
  posterImageAssetResolver = defaultPosterImageAssetResolver,
  posterImageSourceResolver,
  posterSvgResources: suppliedPosterSvgResources,
}) => {
  const isAr = language === 'ar';
  const definitions = listVisualOutputDefinitions();

  const studioDesign = usePosterDesignState('classic-heritage');
  const mappingResult = mapPosterDesignStateToRuntimeOptions(studioDesign.state);

  const [exportingFormat, setExportingFormat] = useState<StudioPosterExportFormat | 'branch-collection' | 'tiled-wall' | undefined>(undefined);
  const [isMobilePreviewExpanded, setIsMobilePreviewExpanded] = useState(false);

  const posterOptions = mappingResult.posterOptions;

  const selectedDefinition = useMemo(() => {
    const isDescendant = studioDesign.state.scope === 'descendants';
    if (studioDesign.state.activePresetId === 'modern-gallery') {
      return getVisualOutputDefinition(isDescendant ? 'modern-descendant-poster' : 'modern-ancestor-poster')
        || getVisualOutputDefinition('modern-ancestor-poster')
        || definitions[0];
    }
    return getVisualOutputDefinition(isDescendant ? 'classic-descendant-poster' : 'classic-ancestor-poster')
      || getVisualOutputDefinition('classic-ancestor-poster')
      || definitions[0];
  }, [studioDesign.state.activePresetId, studioDesign.state.scope, definitions]);

  const selectedPosterStyle: PosterVisualStylePreset = selectedDefinition.id.startsWith('modern')
    ? 'modern-gallery'
    : 'classic-heritage';

  const [resolvedPosterSvgResources, setResolvedPosterSvgResources] = useState<StudioPosterSvgResources>();
  const [resolvedPosterImages, setResolvedPosterImages] = useState<StudioPosterSvgResources['embeddedImages']>();

  const resolvedPosterFontFamily = !posterOptions || posterOptions.fontFamily === 'style-default'
    ? selectedDefinition.id === 'modern-ancestor-poster' || selectedDefinition.id === 'modern-descendant-poster'
      ? 'noto-sans-arabic'
      : 'amiri'
    : posterOptions.fontFamily;

  const matchingResolvedPosterSvgResources =
    resolvedPosterSvgResources?.embeddedArabicFontDataUri
      ? resolvedPosterSvgResources
      : undefined;

  useEffect(() => {
    if (suppliedPosterSvgResources) return undefined;

    let isCancelled = false;

    void posterFontAssetResolver.resolveArabicFont(resolvedPosterFontFamily)
      .then((asset) => {
        if (!isCancelled) {
          const nextResources = getPosterSvgFontResources(asset);
          startTransition(() => {
            setResolvedPosterSvgResources(nextResources);
          });
        }
      })
      .catch(() => {
        if (!isCancelled) {
          startTransition(() => {
            setResolvedPosterSvgResources(undefined);
          });
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [posterFontAssetResolver, resolvedPosterFontFamily, suppliedPosterSvgResources]);

  const posterRootMappings = useMemo(() => {
    const candidates = previewSourceMode === 'store' && storePreviewSource
      ? Object.values(storePreviewSource.people).map((person) => ({ rawId: person.rawId, label: person.displayName || '' }))
      : STUDIO_PREVIEW_FIXTURE_SOURCE.nodes.map((person) => ({ rawId: person.fixtureId, label: person.displayName }));

    return candidates.map((candidate, index) => ({
      ...candidate,
      token: `preview-root-${index + 1}`,
    }));
  }, [previewSourceMode, storePreviewSource]);

  const preferredPosterRoot = posterRootMappings.find((option) => option.rawId === storeRootPersonId)
    ?? posterRootMappings[0];
  const effectiveSelectedPosterRootToken = previewSourceMode === 'store' && studioDesign.state.shared.selectedPosterRootToken === 'preview-root-1' && preferredPosterRoot
    ? preferredPosterRoot.token
    : studioDesign.state.shared.selectedPosterRootToken;
  const selectedPosterRoot = posterRootMappings.find((option) => option.token === effectiveSelectedPosterRootToken)
    ?? preferredPosterRoot;
  const posterRootOptions: VisualStudioPosterRootOption[] = posterRootMappings.map(({ token, label }, index) => ({
    token,
    label: label || (isAr ? `شخص ${index + 1}` : `Person ${index + 1}`),
  }));
  const selectedRootLabel = selectedPosterRoot?.label?.trim();
  const selectedRootPrivacyRecord = selectedPosterRoot
    ? (previewSourceMode === 'store'
        ? storePreviewSource?.people[selectedPosterRoot.rawId]
        : STUDIO_PREVIEW_FIXTURE_SOURCE.nodes.find((node) => node.fixtureId === selectedPosterRoot.rawId))
    : undefined;
  const selectedRootIsMasked = Boolean(
    selectedRootPrivacyRecord?.isPrivate
      || (posterOptions?.privacyMode === 'masked' && selectedRootPrivacyRecord?.isLiving)
  );
  const safeSelectedRootLabel = selectedRootIsMasked ? undefined : selectedRootLabel;
  const isDescendantScope = studioDesign.state.scope === 'descendants';
  const isFullTreeScope = studioDesign.state.scope === 'full-tree';
  const defaultPosterTitle = isAr
    ? (isFullTreeScope
        ? 'الشجرة العائلية الكاملة'
        : safeSelectedRootLabel
        ? `${isDescendantScope ? 'شجرة أحفاد' : 'شجرة أسلاف'} ${safeSelectedRootLabel}`
        : (isDescendantScope ? 'شجرة الأحفاد' : 'شجرة الأسلاف'))
    : (isFullTreeScope
        ? 'Full Family Tree'
        : safeSelectedRootLabel
        ? `${safeSelectedRootLabel} ${isDescendantScope ? 'Descendant' : 'Ancestor'} Tree`
        : `${isDescendantScope ? 'Descendant' : 'Ancestor'} Tree`);
  const defaultPosterSubtitle = isAr
    ? (isFullTreeScope
        ? 'كل الأشخاص والعلاقات المسجلة في الشجرة'
        : posterOptions?.generationDepth === 'all'
        ? 'كل الأجيال المتاحة في السجل العائلي'
        : posterOptions?.generationDepth === 1
        ? 'جيل واحد من السجل العائلي'
        : `${posterOptions?.generationDepth ?? 4} أجيال من السجل العائلي`)
    : isFullTreeScope
      ? 'All people and relationships recorded in the tree'
      : posterOptions?.generationDepth === 'all'
      ? 'All available generations from the family record'
      : `${posterOptions?.generationDepth ?? 4} ${posterOptions?.generationDepth === 1 ? 'generation' : 'generations'} from the family record`;
  const [userPosterTitle, setUserPosterTitle] = useState('');
  const [userPosterSubtitle, setUserPosterSubtitle] = useState('');

  const posterTitle = userPosterTitle.trim() || defaultPosterTitle;
  const posterSubtitle = userPosterSubtitle.trim() || defaultPosterSubtitle;

  const previewData = useMemo(() => {
    if (!posterOptions) return undefined;

    const adapter = getVisualPreviewAdapter(selectedDefinition.productType);
    const selectorProduct = selectedDefinition.productType === 'snapshot' ? 'snapshot' : 'poster';
    const storeNodeIds = storePreviewSource ? Object.keys(storePreviewSource.people) : [];
    const availablePosterNodeCount = previewSourceMode === 'store'
      ? storeNodeIds.length
      : STUDIO_PREVIEW_FIXTURE_SOURCE.nodes.length;
    const configuredPosterLimit = getVisualStudioPosterNodeLimit(
      posterOptions.generationDepth,
      posterOptions.scope
    );
    const maxNodes = selectorProduct === 'poster'
      ? posterOptions.scope === 'ancestors' && posterOptions.generationDepth !== 'all'
        ? configuredPosterLimit
        : Math.max(configuredPosterLimit, availablePosterNodeCount)
      : 12;
    const privacyMode = selectorProduct === 'poster' ? posterOptions.privacyMode : 'masked';
    const rawGraph =
      previewSourceMode === 'store' && storePreviewSource
        ? (selectorProduct === 'snapshot'
            ? selectSnapshotPreviewGraph
            : isFullTreeScope
              ? selectFullTreePosterPreviewGraph
              : isDescendantScope
              ? selectDescendantPosterPreviewGraph
              : selectPosterPreviewGraph).selectRawGraph(
            storePreviewSource,
            {
              productType: selectorProduct,
              definitionId: selectedDefinition.id,
              rootPersonId: selectedPosterRoot?.rawId ?? storeRootPersonId ?? storeNodeIds[0],
              visibleNodeIds: storeNodeIds.slice(0, maxNodes),
              maxDepth: selectorProduct === 'poster'
                ? (isFullTreeScope ? 'all' : posterOptions.generationDepth)
                : 3,
              maxNodes,
              language,
            }
          )
        : (selectorProduct === 'poster' && isFullTreeScope
            ? fullTreeFixturePreviewGraphSelector
            : selectorProduct === 'poster' && isDescendantScope
              ? descendantFixturePreviewGraphSelector
            : getFixtureVisualPreviewGraphSelector(selectorProduct)).selectRawGraph(STUDIO_PREVIEW_FIXTURE_SOURCE, {
            productType: selectorProduct,
            definitionId: selectedDefinition.id,
            rootPersonId: selectedPosterRoot?.rawId ?? 'fixture-root',
            visibleNodeIds: STUDIO_PREVIEW_FIXTURE_SOURCE.nodes.map((node) => node.fixtureId).slice(0, maxNodes),
            maxDepth: selectorProduct === 'poster'
              ? (isFullTreeScope ? 'all' : posterOptions.generationDepth)
              : 3,
            maxNodes,
            language,
          });

    const sanitizedGraph = productionPreviewSanitizer.sanitize(rawGraph, {
      privacyMode,
      includePhotos: posterOptions.includePhotos,
      includeYears: posterOptions.showYears,
      maxNodes,
      language,
    });

    const previewModel = adapter ? adapter.createPreviewModel({
      definitionId: selectedDefinition.id,
      mode: 'sanitized-data',
      privacyMode: privacyMode === 'masked' ? 'masked' : 'owner-full',
      language,
      maxNodes,
      sanitizedGraph,
    }) : undefined;

    return {
      graph: sanitizedGraph,
      previewModel,
      definition: selectedDefinition,
      language,
    };
  }, [
    isDescendantScope,
    isFullTreeScope,
    language,
    posterOptions,
    previewSourceMode,
    selectedDefinition,
    selectedPosterRoot?.rawId,
    storePreviewSource,
    storeRootPersonId,
  ]);

  const previewModel = useMemo(
    () => ({
      data: previewData,
      definition: selectedDefinition,
      isLanguageRtl: isAr,
    }),
    [isAr, previewData, selectedDefinition]
  );

  const posterDocumentSpec = useMemo(() => {
    if (!posterOptions || selectedDefinition.productType === 'snapshot') return undefined;

    return createPosterDocumentSpec(
      posterOptions.size || 'A3',
      posterOptions.orientation || 'landscape',
      posterOptions.marginPreset || 'balanced'
    );
  }, [posterOptions, selectedDefinition.productType]);

  const posterScene = useMemo(() => {
    if (!posterOptions || !posterDocumentSpec || !previewData?.graph) return undefined;

    const opt = <T extends string>(val: T | undefined): Exclude<T, 'style-default'> | undefined =>
      val && val !== 'style-default' ? (val as Exclude<T, 'style-default'>) : undefined;

    const content: PosterContentSpec = {
      definitionId: selectedDefinition.id,
      language,
      generationCount: typeof posterOptions.generationDepth === 'number' ? posterOptions.generationDepth : 4,
      privacyMode: posterOptions.privacyMode,
      title: posterTitle,
      subtitle: posterSubtitle,
      footerText: normalizePosterFooterText(posterOptions.footerText || ''),
      showJozorAttribution: posterOptions.showJozorAttribution,
      scope: posterOptions.scope === 'ancestors'
        ? 'selected-root-ancestors'
        : posterOptions.scope === 'descendants'
          ? 'selected-root-descendants'
          : 'full-tree',
      showYears: posterOptions.showYears,
      showRelationship: posterOptions.showRelationship,
      showBirthPlace: posterOptions.showBirthPlace,
      showOccupation: posterOptions.showOccupation,
      showDescription: posterOptions.showDescription,
    };

    return createPosterScene({
      graph: previewData.graph,
      document: posterDocumentSpec,
      content,
      stylePreset: selectedPosterStyle,
      photoShape: posterOptions.photoShape,
      connectorStyle: posterOptions.connectorStyle,
      connectorPathStyle: opt(posterOptions.connectorPath),
      colorPalette: opt(posterOptions.colorPalette),
      colorOverrides: posterOptions.colorOverrides,
      decoration: opt(posterOptions.decoration),
      ornament: opt(posterOptions.ornament),
      typographyPreset: posterOptions.typography,
      fontFamily: opt(posterOptions.fontFamily),
      cardScalePreset: posterOptions.cardScale,
      cardEffectPreset: opt(posterOptions.cardEffect),
      cardFramePreset: opt(posterOptions.cardFrame),
      cardCornerPreset: opt(posterOptions.cardCorner),
      cardLayoutPreset: opt(posterOptions.cardLayout),
      pageFramePreset: opt(posterOptions.pageFrame),
      headerPreset: opt(posterOptions.header),
      spacingPreset: opt(posterOptions.spacing),
      direction: posterOptions.direction,
    });
  }, [posterDocumentSpec, previewData?.graph, selectedDefinition.id, language, posterOptions, posterTitle, posterSubtitle, selectedPosterStyle]);

  const branchPosterCollection = useMemo(() => {
    if (!posterOptions || !posterDocumentSpec || studioDesign.state.productMode !== 'branch-collection' || !previewData?.graph) {
      return undefined;
    }

    const anchorNode = previewData.graph.nodes.find((n) => n.generation === 1)
      ?? previewData.graph.nodes.find((n) => n.relationshipHint === 'root')
      ?? previewData.graph.nodes[0];

    return createBranchPosterCollection({
      graph: previewData.graph,
      anchorPreviewId: anchorNode?.previewId || '',
      collectionTitle: posterOptions.branchCollectionIndexTitle || posterTitle,
      language,
      document: posterDocumentSpec,
    });
  }, [language, posterDocumentSpec, posterOptions, posterTitle, previewData?.graph, studioDesign.state.productMode]);

  const branchCollectionBlockingWarnings = useMemo(() => {
    if (!branchPosterCollection) return [];
    return getBranchPosterCollectionBlockingWarnings(branchPosterCollection);
  }, [branchPosterCollection]);

  const tiledWallPosterPlan = useMemo(() => {
    if (!posterOptions || !posterDocumentSpec || posterOptions.productMode !== 'tiled-wall' || !posterScene) {
      return undefined;
    }

    return createTiledWallPosterPlan({
      scene: posterScene,
      sheetDocument: posterDocumentSpec,
      rows: posterOptions.tiledRows,
      columns: posterOptions.tiledColumns,
      overlapMm: posterOptions.tiledOverlapMm,
    });
  }, [posterDocumentSpec, posterOptions, posterScene]);

  const imageRequests = useMemo(() => {
    if (!posterScene?.nodes) return [];

    const requests: PosterImageAssetRequest[] = [];
    for (const node of posterScene.nodes) {
      if (!node.hasPhoto) continue;
      const rawSource = posterImageSourceResolver?.(node.previewId) || '';
      requests.push({
        previewId: node.previewId,
        source: rawSource,
      });
    }

    return requests;
  }, [posterImageSourceResolver, posterScene?.nodes]);

  useEffect(() => {
    if (suppliedPosterSvgResources?.embeddedImages !== undefined) {
      if (resolvedPosterImages !== undefined) {
        startTransition(() => {
          setResolvedPosterImages(undefined);
        });
      }
      return undefined;
    }
    if (imageRequests.length === 0) {
      if (resolvedPosterImages !== undefined) {
        startTransition(() => {
          setResolvedPosterImages(undefined);
        });
      }
      return undefined;
    }

    let isCancelled = false;
    void posterImageAssetResolver.resolveImages(imageRequests)
      .then((resolution) => {
        if (!isCancelled) {
          startTransition(() => {
            setResolvedPosterImages(resolution.assets);
          });
        }
      })
      .catch(() => {
        if (!isCancelled) {
          startTransition(() => {
            setResolvedPosterImages(undefined);
          });
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [imageRequests, posterImageAssetResolver, resolvedPosterImages, suppliedPosterSvgResources?.embeddedImages]);

  const posterSvgResources: StudioPosterSvgResources | undefined = useMemo(() => {
    const primaryResources = suppliedPosterSvgResources ?? matchingResolvedPosterSvgResources;
    if (!primaryResources && !resolvedPosterImages) return undefined;

    return {
      ...(primaryResources || {}),
      embeddedImages: suppliedPosterSvgResources?.embeddedImages ?? resolvedPosterImages,
    };
  }, [suppliedPosterSvgResources, matchingResolvedPosterSvgResources, resolvedPosterImages]);

  const handleExport = async (format: StudioPosterExportFormat) => {
    if (!posterScene) return;

    setExportingFormat(format);
    try {
      if (format === 'svg') {
        const result = await exportStudioPoster(
          {
            scene: posterScene,
            resources: posterSvgResources,
            format: 'svg',
          },
          {} as StudioPosterExportRuntime
        );
        downloadFile(result.blob, result.fileName, result.mimeType);
        toast.success(isAr ? 'تم تنزيل ملف SVG بنجاح' : 'SVG file downloaded successfully');
      } else if (format === 'png') {
        const runtime = createStudioPosterBrowserPngRuntime();
        const result = await exportStudioPoster(
          {
            scene: posterScene,
            resources: posterSvgResources,
            format: 'png',
          },
          runtime
        );
        downloadFile(result.blob, result.fileName, result.mimeType);
        toast.success(isAr ? 'تم تنزيل صورة PNG بنجاح' : 'PNG image downloaded successfully');
      } else if (format === 'pdf') {
        const runtime = createStudioPosterBrowserPdfRuntime({});
        const result = await exportStudioPoster(
          {
            scene: posterScene,
            resources: posterSvgResources,
            format: 'pdf',
          },
          runtime
        );
        downloadFile(result.blob, result.fileName, result.mimeType);
        toast.success(isAr ? 'تم تنزيل ملف PDF بنجاح' : 'PDF file downloaded successfully');
      }
    } catch {
      toast.error(isAr ? 'عذراً، تعذر تصدير الملف' : 'Sorry, failed to export file');
    } finally {
      setExportingFormat(undefined);
    }
  };

  const handleBranchCollectionExport = async () => {
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

  const handleTiledWallExport = async () => {
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

  return (
    <div className="space-y-4" data-testid="visual-publishing-studio">
      <div className="flex flex-col gap-1 text-start min-w-0">
        <h4 className="text-[16px] font-bold tracking-tight text-[var(--text-main)]">
          {isAr ? 'معاينة المخرجات البصرية' : 'Visual outputs preview'}
        </h4>
        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
          {isAr
            ? 'اختر نوع المخرج وخصص البوستر قبل تنزيله بصيغ SVG أو PNG أو PDF. تبقى الإجراءات الحالية أدناه للمخرجات الأخرى.'
            : 'Choose an output type and customize the poster before downloading SVG, PNG, or PDF. Current actions below remain available for other outputs.'}
        </p>
      </div>

      <VisualOutputReadinessNotice
        language={language}
        status={mappingResult.supported ? 'supported' : 'unsupported'}
        reason={mappingResult.reason}
      />

      <div className="grid gap-4 lg:grid-cols-12 items-start">
        {/* Preview Workspace Area - sticky on desktop, expandable on mobile */}
        <div className="min-w-0 lg:col-span-7 xl:col-span-8 lg:sticky lg:top-4" data-testid="visual-studio-preview-workspace">
          {/* Mobile Expandable Toggle */}
          <div className="block lg:hidden mb-3">
            <button
              type="button"
              data-testid="visual-studio-mobile-preview-toggle"
              aria-expanded={isMobilePreviewExpanded}
              aria-controls="mobile-preview-container"
              onClick={() => setIsMobilePreviewExpanded(!isMobilePreviewExpanded)}
              className="w-full flex items-center justify-between px-3.5 py-2 bg-stone-900 border border-stone-800 rounded-xl text-xs font-medium text-stone-200 hover:bg-stone-800/60"
            >
              <span>{isAr ? 'معاينة البوستر' : 'Poster Preview'}</span>
              <span className="text-amber-400 font-bold">{isMobilePreviewExpanded ? '▲' : '▼'}</span>
            </button>
            {isMobilePreviewExpanded && (
              <div id="mobile-preview-container" className="mt-2 max-h-80 overflow-y-auto rounded-xl border border-stone-800">
                <VisualOutputPreviewPane
                  language={language}
                  selectedDefinition={selectedDefinition}
                  previewModel={previewModel as unknown as VisualPreviewModel}
                  posterScene={posterScene}
                  posterSvgResources={posterSvgResources}
                />
              </div>
            )}
          </div>

          {/* Desktop Always-Visible Preview */}
          <div className="hidden lg:block">
            <VisualOutputPreviewPane
              language={language}
              selectedDefinition={selectedDefinition}
              previewModel={previewModel as unknown as VisualPreviewModel}
              posterScene={posterScene}
              posterSvgResources={posterSvgResources}
            />
          </div>
        </div>

        {/* Settings Workspace Panel */}
        <div className="min-w-0 lg:col-span-5 xl:col-span-4 h-full max-h-[calc(100vh-6rem)] overflow-y-auto">
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
            onUpdatePrint={studioDesign.updatePrint}
            onSwitchProductMode={studioDesign.switchProductMode}
            onSwitchScope={studioDesign.switchScope}
            onResetSection={studioDesign.resetSection}
            onResetPoster={studioDesign.resetPoster}
            onUndo={studioDesign.undo}
            onRedo={studioDesign.redo}
            definitions={definitions}
            posterRootOptions={posterRootOptions}
            selectedPosterRootToken={effectiveSelectedPosterRootToken}
            onSelectPosterRoot={(token) => studioDesign.updateContent({ selectedPosterRootToken: token })}
            posterTitle={userPosterTitle}
            onPosterTitleChange={setUserPosterTitle}
            posterSubtitle={userPosterSubtitle}
            onPosterSubtitleChange={setUserPosterSubtitle}
            tiledWallPlan={tiledWallPosterPlan}
          />
        </div>
      </div>

      <VisualOutputActionBar
        language={language}
        selectedDefinition={mappingResult.supported ? selectedDefinition : undefined}
        exportingFormat={exportingFormat}
        quality={posterScene?.quality}
        branchCollectionAvailable={Boolean(branchPosterCollection?.itemCount && branchCollectionBlockingWarnings.length === 0)}
        branchCollectionBlocked={Boolean(branchPosterCollection?.itemCount && branchCollectionBlockingWarnings.length > 0)}
        tiledWallAvailable={Boolean(tiledWallPosterPlan && tiledWallPosterPlan.quality.status !== 'blocked')}
        onExportSvg={mappingResult.supported ? () => void handleExport('svg') : undefined}
        onExportPng={mappingResult.supported ? () => void handleExport('png') : undefined}
        onExportPdf={mappingResult.supported ? () => void handleExport('pdf') : undefined}
        onExportBranchCollection={mappingResult.supported ? () => void handleBranchCollectionExport() : undefined}
        onExportTiledWall={mappingResult.supported ? () => void handleTiledWallExport() : undefined}
        onUseDensePreset={selectedDefinition.id === 'dense-genealogy-poster'
          ? undefined
          : () => studioDesign.selectPreset('classic-heritage')}
        onUseLargestPage={posterOptions?.size === 'A0'
          ? undefined
          : () => studioDesign.updatePrint({ size: 'A0', orientation: 'landscape' })}
        onSetUpLargeTreeProducts={isFullTreeScope
          ? undefined
          : () => {
              studioDesign.switchProductMode('full-tree-overview');
              studioDesign.updatePrint({ size: 'A0', orientation: 'landscape' });
            }}
      />
    </div>
  );
};

const VisualPublishingStudioWithStore: React.FC<Omit<VisualPublishingStudioProps, 'previewSourceMode'>> = (props) => {
  const storePreviewInput = useVisualStudioStorePreviewSource();

  return (
    <VisualPublishingStudioInner
      {...props}
      previewSourceMode="store"
      storePreviewSource={storePreviewInput.source}
      storeRootPersonId={storePreviewInput.rootPersonId}
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
