import React, { useEffect, useMemo, useState } from 'react';
import { VisualOutputReadinessNotice } from './VisualOutputReadinessNotice';
import { VisualOutputPreviewPane } from './VisualOutputPreviewPane';
import { VisualOutputConfigPanel } from './VisualOutputConfigPanel';
import { VisualOutputActionBar } from './VisualOutputActionBar';
import { useVisualStudioStorePreviewSource } from './useVisualStudioStorePreviewSource';
import {
  DEFAULT_VISUAL_STUDIO_POSTER_OPTIONS,
  getVisualStudioPosterNodeLimit,
  type VisualStudioPosterOptions,
  type VisualStudioPosterRootOption,
} from './visualStudioPosterOptions';
import { downloadFile } from '../../../../utils/fileUtils';
import { showToast } from '../../../../utils/showToast';
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
  getPosterRasterScale,
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
  type PosterFontAssetResolver,
  type PosterImageAssetRequest,
  type PosterImageAssetResolver,
  type PosterVisualStylePreset,
  type StudioPosterExportFormat,
  type StudioPosterSvgResources,
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

  const [selectedDefinitionId, setSelectedDefinitionId] = useState('classic-ancestor-poster');
  const [exportingFormat, setExportingFormat] = useState<'svg' | 'png' | 'pdf' | 'branch-collection' | 'tiled-wall'>();
  const [posterOptions, setPosterOptions] = useState<VisualStudioPosterOptions>(
    DEFAULT_VISUAL_STUDIO_POSTER_OPTIONS
  );
  const [selectedPosterRootToken, setSelectedPosterRootToken] = useState<string>();
  const [posterTitleOverride, setPosterTitleOverride] = useState('');
  const [posterSubtitleOverride, setPosterSubtitleOverride] = useState('');
  const [resolvedPosterSvgResources, setResolvedPosterSvgResources] = useState<StudioPosterSvgResources>();
  const [resolvedPosterImages, setResolvedPosterImages] = useState<StudioPosterSvgResources['embeddedImages']>();
  const resolvedPosterFontFamily = posterOptions.fontFamily === 'style-default'
    ? selectedDefinitionId === 'classic-ancestor-poster'
      ? 'amiri'
      : 'noto-sans-arabic'
    : posterOptions.fontFamily;
  const matchingResolvedPosterSvgResources =
    resolvedPosterSvgResources?.embeddedArabicFontFamily === resolvedPosterFontFamily
      ? resolvedPosterSvgResources
      : undefined;
  const basePosterSvgResources = suppliedPosterSvgResources ?? matchingResolvedPosterSvgResources;

  useEffect(() => {
    if (suppliedPosterSvgResources) return undefined;

    let isCancelled = false;
    setResolvedPosterSvgResources(undefined);

    void posterFontAssetResolver.resolveArabicFont(resolvedPosterFontFamily)
      .then((asset) => {
        if (!isCancelled) setResolvedPosterSvgResources(getPosterSvgFontResources(asset));
      })
      .catch(() => {
        if (!isCancelled) setResolvedPosterSvgResources(undefined);
      });

    return () => {
      isCancelled = true;
    };
  }, [posterFontAssetResolver, resolvedPosterFontFamily, suppliedPosterSvgResources]);

  const fallbackDefinition = getVisualOutputDefinition('classic-ancestor-poster') || definitions[0];
  const selectedDefinition = getVisualOutputDefinition(selectedDefinitionId) || fallbackDefinition;
  const selectedPosterStyle: PosterVisualStylePreset = selectedDefinition.id === 'modern-ancestor-poster'
    ? 'modern-gallery'
    : selectedDefinition.id === 'dense-genealogy-poster'
      ? 'dense-genealogy'
      : 'classic-heritage';

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
  const selectedPosterRoot = posterRootMappings.find((option) => option.token === selectedPosterRootToken)
    ?? preferredPosterRoot;
  const posterRootOptions: VisualStudioPosterRootOption[] = posterRootMappings.map(({ token, label }, index) => ({
    token,
    label: label || (isAr ? `\u0634\u062e\u0635 ${index + 1}` : `Person ${index + 1}`),
  }));
  const selectedRootLabel = selectedPosterRoot?.label?.trim();
  const selectedRootPrivacyRecord = selectedPosterRoot
    ? (previewSourceMode === 'store'
        ? storePreviewSource?.people[selectedPosterRoot.rawId]
        : STUDIO_PREVIEW_FIXTURE_SOURCE.nodes.find((node) => node.fixtureId === selectedPosterRoot.rawId))
    : undefined;
  const selectedRootIsMasked = Boolean(
    selectedRootPrivacyRecord?.isPrivate
      || (posterOptions.privacyMode === 'masked' && selectedRootPrivacyRecord?.isLiving)
  );
  const safeSelectedRootLabel = selectedRootIsMasked ? undefined : selectedRootLabel;
  const isDescendantScope = posterOptions.scope === 'descendants';
  const isFullTreeScope = posterOptions.scope === 'full-tree';
  const defaultPosterTitle = isAr
    ? (isFullTreeScope
        ? '\u0627\u0644\u0634\u062c\u0631\u0629 \u0627\u0644\u0639\u0627\u0626\u0644\u064a\u0629 \u0627\u0644\u0643\u0627\u0645\u0644\u0629'
        : safeSelectedRootLabel
        ? `${isDescendantScope ? '\u0634\u062c\u0631\u0629 \u0623\u062d\u0641\u0627\u062f' : '\u0634\u062c\u0631\u0629 \u0623\u0633\u0644\u0627\u0641'} ${safeSelectedRootLabel}`
        : (isDescendantScope ? '\u0634\u062c\u0631\u0629 \u0627\u0644\u0623\u062d\u0641\u0627\u062f' : '\u0634\u062c\u0631\u0629 \u0627\u0644\u0623\u0633\u0644\u0627\u0641'))
    : (isFullTreeScope
        ? 'Full Family Tree'
        : safeSelectedRootLabel
        ? `${safeSelectedRootLabel} ${isDescendantScope ? 'Descendant' : 'Ancestor'} Tree`
        : `${isDescendantScope ? 'Descendant' : 'Ancestor'} Tree`);
  const defaultPosterSubtitle = isAr
    ? (isFullTreeScope
        ? '\u0643\u0644 \u0627\u0644\u0623\u0634\u062e\u0627\u0635 \u0648\u0627\u0644\u0639\u0644\u0627\u0642\u0627\u062a \u0627\u0644\u0645\u0633\u062c\u0644\u0629 \u0641\u064a \u0627\u0644\u0634\u062c\u0631\u0629'
        : posterOptions.generationDepth === 'all'
        ? '\u0643\u0644 \u0627\u0644\u0623\u062c\u064a\u0627\u0644 \u0627\u0644\u0645\u062a\u0627\u062d\u0629 \u0641\u064a \u0627\u0644\u0633\u062c\u0644 \u0627\u0644\u0639\u0627\u0626\u0644\u064a'
        : posterOptions.generationDepth === 1
        ? '\u062c\u064a\u0644 \u0648\u0627\u062d\u062f \u0645\u0646 \u0627\u0644\u0633\u062c\u0644 \u0627\u0644\u0639\u0627\u0626\u0644\u064a'
        : `${posterOptions.generationDepth} \u0623\u062c\u064a\u0627\u0644 \u0645\u0646 \u0627\u0644\u0633\u062c\u0644 \u0627\u0644\u0639\u0627\u0626\u0644\u064a`)
    : isFullTreeScope
      ? 'All people and relationships recorded in the tree'
      : posterOptions.generationDepth === 'all'
      ? 'All available generations from the family record'
      : `${posterOptions.generationDepth} ${posterOptions.generationDepth === 1 ? 'generation' : 'generations'} from the family record`;
  const posterTitle = posterTitleOverride.trim() || defaultPosterTitle;
  const posterSubtitle = posterSubtitleOverride.trim() || defaultPosterSubtitle;

  const previewData = useMemo(() => {
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
            visibleNodeIds: ['fixture-root', 'fixture-father', 'fixture-mother'],
            maxDepth: selectorProduct === 'poster'
              ? (isFullTreeScope ? 'all' : posterOptions.generationDepth)
              : 3,
            maxNodes,
            language,
          });
    const sanitizedGraph = productionPreviewSanitizer.sanitize(rawGraph, {
      privacyMode,
      includePhotos: selectorProduct === 'poster' && posterOptions.includePhotos,
      includeYears: posterOptions.showYears,
      includeBirthPlace: posterOptions.showBirthPlace,
      includeOccupation: posterOptions.showOccupation,
      includeDescription: posterOptions.showDescription,
      maxNodes,
      language,
    });

    const model = adapter?.createPreviewModel({
      definitionId: selectedDefinition.id,
      mode: 'sanitized-data',
      privacyMode,
      language,
      maxNodes,
      sanitizedGraph,
    });

    const imageRequests: PosterImageAssetRequest[] = selectorProduct === 'poster'
      && posterOptions.includePhotos
      && posterImageSourceResolver
      ? rawGraph.nodes.slice(0, maxNodes).flatMap((rawNode, index) => {
          const sanitizedNode = sanitizedGraph.nodes[index];
          if (!sanitizedNode?.hasPhoto || (posterOptions.hideLivingPhotos && rawNode.isLiving)) return [];
          const source = posterImageSourceResolver(rawNode.rawId);
          return source ? [{ previewId: sanitizedNode.previewId, source }] : [];
        })
      : [];

    return { model, sanitizedGraph, imageRequests };
  }, [isDescendantScope, isFullTreeScope, language, posterImageSourceResolver, posterOptions, previewSourceMode, selectedDefinition, selectedPosterRoot, storePreviewSource, storeRootPersonId]);

  useEffect(() => {
    if (suppliedPosterSvgResources?.embeddedImages) return undefined;
    if (previewData.imageRequests.length === 0) {
      setResolvedPosterImages(undefined);
      return undefined;
    }

    let isCancelled = false;
    void posterImageAssetResolver.resolveImages(previewData.imageRequests)
      .then((resolution) => {
        if (!isCancelled) setResolvedPosterImages(resolution.assets);
      })
      .catch(() => {
        if (!isCancelled) setResolvedPosterImages(undefined);
      });

    return () => {
      isCancelled = true;
    };
  }, [posterImageAssetResolver, previewData.imageRequests, suppliedPosterSvgResources?.embeddedImages]);

  const posterSvgResources = useMemo<StudioPosterSvgResources | undefined>(() => {
    if (!basePosterSvgResources && !resolvedPosterImages) return undefined;
    return {
      ...basePosterSvgResources,
      embeddedImages: suppliedPosterSvgResources?.embeddedImages ?? resolvedPosterImages,
    };
  }, [basePosterSvgResources, resolvedPosterImages, suppliedPosterSvgResources?.embeddedImages]);

  const previewModel = previewData.model;
  const posterScene = useMemo(() => {
    if (selectedDefinition.productType !== 'poster') return undefined;

    const document = createPosterDocumentSpec(
      posterOptions.size,
      posterOptions.orientation,
      posterOptions.marginPreset
    );
    const rootPreviewId = previewData.sanitizedGraph.nodes.find((node) => node.relationshipHint === 'root')?.previewId
      ?? previewData.sanitizedGraph.nodes.find((node) => (node.generation ?? 1) === 1)?.previewId;
    const actualGenerationCount = Math.max(
      1,
      ...previewData.sanitizedGraph.nodes.map((node) => node.generation ?? 1)
    );

    return createPosterScene({
      graph: previewData.sanitizedGraph,
      document,
      content: {
        definitionId: selectedDefinition.id,
        language,
        title: posterTitle,
        subtitle: posterSubtitle,
        scope: isFullTreeScope
          ? 'full-tree'
          : isDescendantScope
            ? 'selected-root-descendants'
            : 'selected-root-ancestors',
        rootPreviewId,
        generationCount: isFullTreeScope || posterOptions.generationDepth === 'all'
          ? actualGenerationCount
          : posterOptions.generationDepth,
        privacyMode: posterOptions.privacyMode,
        showYears: posterOptions.showYears,
        showRelationship: posterOptions.showRelationship,
        showBirthPlace: posterOptions.showBirthPlace,
        showOccupation: posterOptions.showOccupation,
        showDescription: posterOptions.showDescription,
        footerText: normalizePosterFooterText(posterOptions.footerText) || undefined,
        showJozorAttribution: posterOptions.showJozorAttribution,
      },
      stylePreset: selectedPosterStyle,
      photoShape: posterOptions.photoShape,
      connectorStyle: posterOptions.connectorStyle,
      connectorPathStyle: posterOptions.connectorPath === 'style-default' ? undefined : posterOptions.connectorPath,
      spacingPreset: posterOptions.spacing === 'style-default' ? undefined : posterOptions.spacing,
      colorPalette: posterOptions.colorPalette === 'style-default' ? undefined : posterOptions.colorPalette,
      colorOverrides: posterOptions.colorOverrides,
      decoration: posterOptions.decoration === 'style-default' ? undefined : posterOptions.decoration,
      ornament: posterOptions.ornament === 'style-default' ? undefined : posterOptions.ornament,
      typographyPreset: posterOptions.typography,
      fontFamily: resolvedPosterFontFamily,
      cardScalePreset: posterOptions.cardScale,
      cardEffectPreset: posterOptions.cardEffect === 'style-default' ? undefined : posterOptions.cardEffect,
      cardFramePreset: posterOptions.cardFrame === 'style-default' ? undefined : posterOptions.cardFrame,
      cardCornerPreset: posterOptions.cardCorner === 'style-default' ? undefined : posterOptions.cardCorner,
      cardLayoutPreset: posterOptions.cardLayout === 'style-default' ? undefined : posterOptions.cardLayout,
      pageFramePreset: posterOptions.pageFrame === 'style-default' ? undefined : posterOptions.pageFrame,
      headerPreset: posterOptions.header === 'style-default' ? undefined : posterOptions.header,
      direction: posterOptions.direction,
    });
  }, [isDescendantScope, isFullTreeScope, language, posterOptions, posterSubtitle, posterTitle, previewData.sanitizedGraph, resolvedPosterFontFamily, selectedDefinition, selectedPosterStyle]);

  const branchPosterCollection = useMemo(() => {
    if (!isFullTreeScope || selectedDefinition.productType !== 'poster') return undefined;
    const rootPreviewId = previewData.sanitizedGraph.nodes.find((node) => node.relationshipHint === 'root')?.previewId
      ?? previewData.sanitizedGraph.nodes.find((node) => (node.generation ?? 1) === 1)?.previewId;
    if (!rootPreviewId) return undefined;

    return createBranchPosterCollection({
      graph: previewData.sanitizedGraph,
      anchorPreviewId: rootPreviewId,
      collectionTitle: posterTitle,
      language,
      document: createPosterDocumentSpec(
        posterOptions.size,
        posterOptions.orientation,
        posterOptions.marginPreset
      ),
      direction: posterOptions.direction,
      stylePreset: selectedPosterStyle,
      photoShape: posterOptions.photoShape,
      connectorStyle: posterOptions.connectorStyle,
      connectorPathStyle: posterOptions.connectorPath === 'style-default' ? undefined : posterOptions.connectorPath,
      spacingPreset: posterOptions.spacing === 'style-default' ? undefined : posterOptions.spacing,
      colorPalette: posterOptions.colorPalette === 'style-default' ? undefined : posterOptions.colorPalette,
      colorOverrides: posterOptions.colorOverrides,
      decoration: posterOptions.decoration === 'style-default' ? undefined : posterOptions.decoration,
      ornament: posterOptions.ornament === 'style-default' ? undefined : posterOptions.ornament,
      typographyPreset: posterOptions.typography,
      fontFamily: resolvedPosterFontFamily,
      cardScalePreset: posterOptions.cardScale,
      cardEffectPreset: posterOptions.cardEffect === 'style-default' ? undefined : posterOptions.cardEffect,
      cardFramePreset: posterOptions.cardFrame === 'style-default' ? undefined : posterOptions.cardFrame,
      cardCornerPreset: posterOptions.cardCorner === 'style-default' ? undefined : posterOptions.cardCorner,
      cardLayoutPreset: posterOptions.cardLayout === 'style-default' ? undefined : posterOptions.cardLayout,
      pageFramePreset: posterOptions.pageFrame === 'style-default' ? undefined : posterOptions.pageFrame,
      headerPreset: posterOptions.header === 'style-default' ? undefined : posterOptions.header,
      showYears: posterOptions.showYears,
      showRelationship: posterOptions.showRelationship,
      showBirthPlace: posterOptions.showBirthPlace,
      showOccupation: posterOptions.showOccupation,
      showDescription: posterOptions.showDescription,
      footerText: normalizePosterFooterText(posterOptions.footerText) || undefined,
      showJozorAttribution: posterOptions.showJozorAttribution,
    });
  }, [isFullTreeScope, language, posterOptions, posterTitle, previewData.sanitizedGraph, resolvedPosterFontFamily, selectedDefinition.productType, selectedPosterStyle]);

  const tiledWallPosterPlan = useMemo(() => {
    if (!isFullTreeScope || !posterScene || selectedDefinition.productType !== 'poster') return undefined;
    return createTiledWallPosterPlan({
      scene: posterScene,
      sheetDocument: createPosterDocumentSpec(posterOptions.tiledSheetSize, posterOptions.orientation),
      rows: posterOptions.tiledRows,
      columns: posterOptions.tiledColumns,
      overlapMm: posterOptions.tiledOverlapMm,
    });
  }, [isFullTreeScope, posterOptions, posterScene, selectedDefinition.productType]);

  const branchCollectionBlockingWarnings = useMemo(
    () => branchPosterCollection
      ? getBranchPosterCollectionBlockingWarnings(branchPosterCollection)
      : [],
    [branchPosterCollection]
  );

  const handleExport = async (format: StudioPosterExportFormat) => {
    if (
      !posterScene
      || posterScene.quality.status === 'blocked'
      || selectedDefinition.productType !== 'poster'
      || exportingFormat
    ) return;

    setExportingFormat(format);
    try {
      const fontResources = posterSvgResources
        ?? getPosterSvgFontResources(await posterFontAssetResolver.resolveArabicFont(posterScene.fontFamily));
      const embeddedImages = suppliedPosterSvgResources?.embeddedImages
        ?? (previewData.imageRequests.length > 0
          ? (await posterImageAssetResolver.resolveImages(previewData.imageRequests)).assets
          : undefined);
      const resources: StudioPosterSvgResources = {
        ...fontResources,
        embeddedImages,
      };
      const rasterScale = getPosterRasterScale(posterScene.document.pageSize);
      const runtime = format === 'svg'
        ? {}
        : format === 'png'
          ? createStudioPosterBrowserPngRuntime({ pixelRatio: rasterScale })
          : createStudioPosterBrowserPdfRuntime({
              pixelRatio: rasterScale,
            });
      const result = await exportStudioPoster(
        {
          scene: posterScene,
          resources,
          format,
          fileName: posterTitle,
        },
        runtime
      );

      downloadFile(result.blob, result.fileName, result.mimeType);
      showToast.success(isAr ? '\u062a\u0645 \u062a\u0646\u0632\u064a\u0644 \u0627\u0644\u0628\u0648\u0633\u062a\u0631.' : 'Poster downloaded.');
    } catch (error) {
      showToast.error(
        error instanceof Error
          ? error.message
          : (isAr ? '\u062a\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u0645\u0639\u0627\u064a\u0646\u0629 \u0627\u0644\u0628\u0648\u0633\u062a\u0631.' : 'Unable to create the poster preview.')
      );
    } finally {
      setExportingFormat(undefined);
    }
  };

  const handleBranchCollectionExport = async () => {
    if (!branchPosterCollection || branchPosterCollection.itemCount === 0 || exportingFormat) return;

    setExportingFormat('branch-collection');
    try {
      const fontResources = posterSvgResources
        ?? getPosterSvgFontResources(await posterFontAssetResolver.resolveArabicFont(branchPosterCollection.overviewScene.fontFamily));
      const embeddedImages = suppliedPosterSvgResources?.embeddedImages
        ?? (previewData.imageRequests.length > 0
          ? (await posterImageAssetResolver.resolveImages(previewData.imageRequests)).assets
          : undefined);
      const result = await exportBranchPosterCollectionArchive({
        collection: branchPosterCollection,
        resources: { ...fontResources, embeddedImages },
        fileName: posterTitle,
      });
      downloadFile(result.blob, result.fileName, result.mimeType);
      showToast.success(isAr ? '\u062a\u0645 \u062a\u0646\u0632\u064a\u0644 \u0645\u062c\u0645\u0648\u0639\u0629 \u0627\u0644\u0641\u0631\u0648\u0639.' : 'Branch collection downloaded.');
    } catch (error) {
      showToast.error(
        error instanceof Error
          ? error.message
          : (isAr ? '\u062a\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u0645\u062c\u0645\u0648\u0639\u0629 \u0627\u0644\u0641\u0631\u0648\u0639.' : 'Unable to create the branch collection.')
      );
    } finally {
      setExportingFormat(undefined);
    }
  };

  const handleTiledWallExport = async () => {
    if (!tiledWallPosterPlan || exportingFormat) return;
    setExportingFormat('tiled-wall');
    try {
      const fontResources = posterSvgResources
        ?? getPosterSvgFontResources(await posterFontAssetResolver.resolveArabicFont(tiledWallPosterPlan.sourceScene.fontFamily));
      const embeddedImages = suppliedPosterSvgResources?.embeddedImages
        ?? (previewData.imageRequests.length > 0
          ? (await posterImageAssetResolver.resolveImages(previewData.imageRequests)).assets
          : undefined);
      const result = await exportTiledWallPosterArchive({
        plan: tiledWallPosterPlan,
        resources: { ...fontResources, embeddedImages },
        fileName: posterTitle,
      });
      downloadFile(result.blob, result.fileName, result.mimeType);
      showToast.success(isAr ? '\u062a\u0645 \u062a\u0646\u0632\u064a\u0644 \u0645\u0644\u0641\u0627\u062a \u0627\u0644\u0644\u0648\u062d\u0629 \u0627\u0644\u0645\u0642\u0633\u0645\u0629.' : 'Tiled wall poster downloaded.');
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : (isAr ? '\u062a\u0639\u0630\u0631 \u0625\u0646\u0634\u0627\u0621 \u0627\u0644\u0644\u0648\u062d\u0629 \u0627\u0644\u0645\u0642\u0633\u0645\u0629.' : 'Unable to create the tiled wall poster.'));
    } finally {
      setExportingFormat(undefined);
    }
  };

  return (
    <div
      className="flex flex-col gap-4 rounded-[20px] border border-[var(--primary-500)]/20 bg-gradient-to-br from-[var(--surface-panel)] via-[var(--surface-panel)] to-[var(--primary-500)]/5 p-3 sm:p-5 shadow-sm relative overflow-hidden"
      data-testid="visual-publishing-studio"
    >
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

      <VisualOutputReadinessNotice language={language} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">
          <VisualOutputPreviewPane
            language={language}
            selectedDefinition={selectedDefinition}
            previewModel={previewModel}
            posterScene={posterScene}
            posterSvgResources={posterSvgResources}
          />
        </div>
        <div className="min-w-0">
          <VisualOutputConfigPanel
            language={language}
            definitions={definitions}
            selectedDefinitionId={selectedDefinitionId}
            selectedDefinition={selectedDefinition}
            onSelectDefinition={setSelectedDefinitionId}
            posterOptions={posterOptions}
            onPosterOptionsChange={setPosterOptions}
            posterRootOptions={posterRootOptions}
            selectedPosterRootToken={selectedPosterRoot?.token}
            onSelectPosterRoot={setSelectedPosterRootToken}
            posterTitle={posterTitle}
            posterSubtitle={posterSubtitle}
            onPosterTitleChange={setPosterTitleOverride}
            onPosterSubtitleChange={setPosterSubtitleOverride}
            tiledWallPlan={tiledWallPosterPlan}
          />
        </div>
      </div>

      <VisualOutputActionBar
        language={language}
        selectedDefinition={selectedDefinition}
        exportingFormat={exportingFormat}
        quality={posterScene?.quality}
        branchCollectionAvailable={Boolean(
          branchPosterCollection?.itemCount && branchCollectionBlockingWarnings.length === 0
        )}
        branchCollectionBlocked={Boolean(
          branchPosterCollection?.itemCount && branchCollectionBlockingWarnings.length > 0
        )}
        tiledWallAvailable={Boolean(tiledWallPosterPlan && tiledWallPosterPlan.quality.status !== 'blocked')}
        onExportSvg={() => void handleExport('svg')}
        onExportPng={() => void handleExport('png')}
        onExportPdf={() => void handleExport('pdf')}
        onExportBranchCollection={() => void handleBranchCollectionExport()}
        onExportTiledWall={() => void handleTiledWallExport()}
        onUseDensePreset={selectedDefinition.id === 'dense-genealogy-poster'
          ? undefined
          : () => setSelectedDefinitionId('dense-genealogy-poster')}
        onUseLargestPage={posterOptions.size === 'A0'
          ? undefined
          : () => setPosterOptions((current) => ({
              ...current,
              size: 'A0',
              orientation: 'landscape',
            }))}
        onSetUpLargeTreeProducts={isFullTreeScope
          ? undefined
          : () => {
              setSelectedDefinitionId('dense-genealogy-poster');
              setPosterOptions((current) => ({
                ...current,
                scope: 'full-tree',
                generationDepth: 'all',
                size: 'A0',
                orientation: 'landscape',
              }));
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
