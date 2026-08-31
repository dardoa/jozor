import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import {
  createBranchPosterCollection,
  createPosterDocumentSpec,
  createPosterPersonTokenCatalogSession,
  createPosterScene,
  createRawGraphFromFixtureSource,
  createRawGraphFromLiveSource,
  createTiledWallPosterPlan,
  descendantFixturePreviewGraphSelector,
  FocusLayoutCapacityError,
  fullTreeFixturePreviewGraphSelector,
  getBranchPosterCollectionBlockingWarnings,
  getFixtureVisualPreviewGraphSelector,
  getPosterSvgFontResources,
  getVisualOutputDefinition,
  getVisualPreviewAdapter,
  listVisualOutputDefinitions,
  normalizePosterFooterText,
  sanitizeProductionPreviewGraphBoundary,
  RadialLayoutCapacityError,
  selectBranchPosterPreviewGraph,
  selectDescendantPosterPreviewGraph,
  selectFocusGraphBoundary,
  selectFullTreePosterPreviewGraph,
  selectPosterPreviewGraph,
  selectRadialGraphBoundary,
  selectSnapshotPreviewGraph,
  branchFixturePreviewGraphSelector,
  type FixturePreviewSource,
  type PosterContentSpec,
  type PosterDesignState,
  type PosterFontAssetResolver,
  type PosterImageAssetRequest,
  type PosterImageAssetResolver,
  type PosterVisualStylePreset,
  type PreviewLiveTreeSource,
  type StudioPosterSvgResources,
} from '../../../publishing';
import { mapPosterDesignStateToRuntimeOptions } from './posterDesignStateRuntimeAdapter';
import {
  getVisualStudioPosterNodeLimit,
  type BaseStudioPosterOptions,
} from './visualStudioPosterOptions';

interface UseVisualStudioPosterRuntimeOptions {
  language: 'ar' | 'en';
  designState: PosterDesignState;
  previewSourceMode: 'fixture' | 'store';
  storePreviewSource?: PreviewLiveTreeSource;
  posterFontAssetResolver: PosterFontAssetResolver;
  posterImageAssetResolver: PosterImageAssetResolver;
  posterImageSourceResolver?: (personId: string) => string | undefined;
  suppliedPosterSvgResources?: StudioPosterSvgResources;
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
    {
      fixtureId: 'fixture-spouse',
      displayName: 'Preview Spouse',
      generation: 1,
      relationshipHint: 'spouse',
      isLiving: true,
      hasProfilePhoto: true,
    },
    {
      fixtureId: 'fixture-child',
      displayName: 'Preview Child',
      generation: 1,
      relationshipHint: 'descendant',
      isLiving: true,
    },
    {
      fixtureId: 'fixture-sibling',
      displayName: 'Preview Sibling',
      generation: 1,
      relationshipHint: 'relative',
      isLiving: true,
    },
  ],
  edges: [
    { fromFixtureId: 'fixture-father', toFixtureId: 'fixture-root', relationshipType: 'parent-child' },
    { fromFixtureId: 'fixture-mother', toFixtureId: 'fixture-root', relationshipType: 'parent-child' },
    { fromFixtureId: 'fixture-grandfather-a', toFixtureId: 'fixture-father', relationshipType: 'parent-child' },
    { fromFixtureId: 'fixture-grandmother-a', toFixtureId: 'fixture-father', relationshipType: 'parent-child' },
    { fromFixtureId: 'fixture-grandfather-b', toFixtureId: 'fixture-mother', relationshipType: 'parent-child' },
    { fromFixtureId: 'fixture-grandmother-b', toFixtureId: 'fixture-mother', relationshipType: 'parent-child' },
    { fromFixtureId: 'fixture-root', toFixtureId: 'fixture-spouse', relationshipType: 'spouse' },
    { fromFixtureId: 'fixture-root', toFixtureId: 'fixture-child', relationshipType: 'parent-child' },
    { fromFixtureId: 'fixture-father', toFixtureId: 'fixture-sibling', relationshipType: 'parent-child' },
  ],
};

const isFocusCapacityError = (error: unknown): boolean => {
  if (error instanceof FocusLayoutCapacityError) return true;
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: unknown; message?: unknown };
  return candidate.code === 'FOCUS_LAYOUT_CAPACITY_EXCEEDED'
    || (typeof candidate.message === 'string' && candidate.message.startsWith('Focus layout capacity exceeded:'));
};

const isRadialCapacityError = (error: unknown): boolean => {
  if (error instanceof RadialLayoutCapacityError) return true;
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: unknown; message?: unknown };
  return candidate.code === 'RADIAL_LAYOUT_CAPACITY_EXCEEDED'
    || (typeof candidate.message === 'string' && candidate.message.startsWith('Radial layout capacity exceeded:'));
};

export function useVisualStudioPosterRuntime({
  language,
  designState,
  previewSourceMode,
  storePreviewSource,
  posterFontAssetResolver,
  posterImageAssetResolver,
  posterImageSourceResolver,
  suppliedPosterSvgResources,
}: UseVisualStudioPosterRuntimeOptions) {
  const isAr = language === 'ar';
  const definitions = listVisualOutputDefinitions();

  const selectedDefinition = useMemo(() => {
    if (designState.activePresetId === 'dense-genealogy') {
      return getVisualOutputDefinition('dense-genealogy-poster')
        || getVisualOutputDefinition('classic-ancestor-poster')
        || definitions[0];
    }
    if (designState.activePresetId === 'modern-gallery') {
      return getVisualOutputDefinition('modern-ancestor-poster')
        || definitions[0];
    }
    return getVisualOutputDefinition('classic-ancestor-poster')
      || definitions[0];
  }, [designState.activePresetId, definitions]);

  const selectedPosterStyle: PosterVisualStylePreset = designState.activePresetId === 'dense-genealogy'
    ? 'dense-genealogy'
    : designState.activePresetId === 'modern-gallery'
      ? 'modern-gallery'
      : 'classic-heritage';

  const isDescendantScope = designState.scope === 'descendants';
  const isSelectedBranchScope = designState.scope === 'selected-branch';
  const isFullTreeScope = designState.scope === 'full-tree';

  const configuredPosterLimit = useMemo(() => {
    const depth = designState.tiered.generationDepth;
    return getVisualStudioPosterNodeLimit(
      (typeof depth === 'number' ? depth : 4) as 1 | 2 | 3 | 4 | 'all',
      designState.scope ?? 'ancestors'
    );
  }, [designState.scope, designState.tiered.generationDepth]);

  const completeRawSourceGraph = useMemo(() => {
    return previewSourceMode === 'store' && storePreviewSource
      ? createRawGraphFromLiveSource(storePreviewSource)
      : createRawGraphFromFixtureSource(STUDIO_PREVIEW_FIXTURE_SOURCE);
  }, [previewSourceMode, storePreviewSource]);

  const tokenCatalogSessionKey = previewSourceMode === 'store'
    ? (storePreviewSource?.sourceSessionKey ?? storePreviewSource)
    : STUDIO_PREVIEW_FIXTURE_SOURCE;
  const posterTokenCatalogSession = useMemo(
    () => {
      void tokenCatalogSessionKey;
      return createPosterPersonTokenCatalogSession();
    },
    [tokenCatalogSessionKey]
  );

  const tokenCatalogLifecycleRef = useRef<{
    session: typeof posterTokenCatalogSession;
    epoch: number;
  } | undefined>(undefined);
  useEffect(() => {
    const previousSession = tokenCatalogLifecycleRef.current?.session;
    if (previousSession && previousSession !== posterTokenCatalogSession) {
      previousSession.dispose();
    }

    const epoch = (tokenCatalogLifecycleRef.current?.epoch ?? 0) + 1;
    tokenCatalogLifecycleRef.current = { session: posterTokenCatalogSession, epoch };

    return () => {
      queueMicrotask(() => {
        const active = tokenCatalogLifecycleRef.current;
        if (active?.session === posterTokenCatalogSession && active.epoch === epoch) {
          posterTokenCatalogSession.dispose();
        }
      });
    };
  }, [posterTokenCatalogSession]);

  const posterTokenCatalog = useMemo(() => {
    if (!completeRawSourceGraph?.nodes?.length) return undefined;
    return posterTokenCatalogSession.createCatalog(
      completeRawSourceGraph.nodes,
      {
        language,
        privacyMode: designState.shared.privacyMode,
      },
      completeRawSourceGraph.defaultRawId
    );
  }, [completeRawSourceGraph, language, posterTokenCatalogSession, designState.shared.privacyMode]);

  const ownerSelectionTokenCatalog = useMemo(() => {
    if (!completeRawSourceGraph?.nodes?.length) return undefined;
    return posterTokenCatalogSession.createCatalog(
      completeRawSourceGraph.nodes,
      {
        language,
        privacyMode: 'owner-full',
        audience: 'owner-control',
      },
      completeRawSourceGraph.defaultRawId
    );
  }, [completeRawSourceGraph, language, posterTokenCatalogSession]);

  const selectedPosterRootToken = useMemo(() => {
    const currentToken = designState.shared.selectedPosterRootToken;
    return posterTokenCatalog?.hasToken(currentToken)
      ? currentToken
      : posterTokenCatalog?.defaultToken ?? '';
  }, [posterTokenCatalog, designState.shared.selectedPosterRootToken]);

  const rawGraphData = useMemo(() => {
    const selectorProduct = (selectedDefinition.productType === 'snapshot' ? 'snapshot' : 'poster') as 'poster' | 'snapshot';
    const maxNodes = selectorProduct === 'poster'
      ? isFullTreeScope
        ? 150
        : configuredPosterLimit
      : 12;

    return previewSourceMode === 'store' && storePreviewSource
      ? (selectorProduct === 'snapshot'
          ? selectSnapshotPreviewGraph
          : isFullTreeScope
            ? selectFullTreePosterPreviewGraph
            : isSelectedBranchScope
            ? selectBranchPosterPreviewGraph
            : isDescendantScope
            ? selectDescendantPosterPreviewGraph
            : selectPosterPreviewGraph).selectRawGraph(
          storePreviewSource,
          {
            productType: selectorProduct,
            definitionId: selectedDefinition.id,
            rootPersonToken: selectedPosterRootToken,
            tokenCatalog: posterTokenCatalog,
            maxDepth: selectorProduct === 'poster'
              ? (isFullTreeScope ? 'all' : designState.tiered.generationDepth ?? 4)
              : 3,
            maxNodes,
            language,
          }
        )
      : (selectorProduct === 'poster' && isFullTreeScope
          ? fullTreeFixturePreviewGraphSelector
          : selectorProduct === 'poster' && isSelectedBranchScope
            ? branchFixturePreviewGraphSelector
          : selectorProduct === 'poster' && isDescendantScope
            ? descendantFixturePreviewGraphSelector
          : getFixtureVisualPreviewGraphSelector(selectorProduct)).selectRawGraph(STUDIO_PREVIEW_FIXTURE_SOURCE, {
          productType: selectorProduct,
          definitionId: selectedDefinition.id,
          rootPersonId: isSelectedBranchScope ? undefined : 'fixture-root',
          rootPersonToken: isSelectedBranchScope ? selectedPosterRootToken : undefined,
          tokenCatalog: isSelectedBranchScope ? posterTokenCatalog : undefined,
          maxDepth: selectorProduct === 'poster'
            ? (isFullTreeScope ? 'all' : designState.tiered.generationDepth ?? 4)
            : 3,
          maxNodes,
          language,
        });
  }, [
    configuredPosterLimit,
    isDescendantScope,
    isFullTreeScope,
    isSelectedBranchScope,
    language,
    posterTokenCatalog,
    previewSourceMode,
    selectedDefinition,
    selectedPosterRootToken,
    storePreviewSource,
    designState.tiered.generationDepth,
  ]);

  const selectedFocalPersonToken = useMemo(() => {
    const currentToken = designState.focus.focalPersonToken;
    return posterTokenCatalog?.hasToken(currentToken)
      ? currentToken
      : posterTokenCatalog?.defaultToken ?? '';
  }, [posterTokenCatalog, designState.focus.focalPersonToken]);

  const posterRootOptions = useMemo(() => {
    return ownerSelectionTokenCatalog?.tokens ?? [];
  }, [ownerSelectionTokenCatalog]);

  const focusSelectionResult = useMemo(() => {
    if (designState.layoutMode !== 'focus-family' || !completeRawSourceGraph?.nodes?.length) {
      return undefined;
    }
    if (!posterTokenCatalog || !selectedFocalPersonToken) return undefined;

    try {
      const selection = selectFocusGraphBoundary(completeRawSourceGraph, posterTokenCatalog, {
        focalPersonToken: selectedFocalPersonToken,
        ancestorDepth: designState.focus.ancestorDepth,
        descendantDepth: designState.focus.descendantDepth,
        includeSpouses: designState.focus.includeSpouses,
        includeSiblings: designState.focus.includeSiblings,
        privacyMode: designState.shared.privacyMode,
        language,
        includePhotos: designState.shared.includePhotos,
        hideLivingPhotos: designState.shared.hideLivingPhotos,
        includeYears: designState.shared.showYears,
      });
      return { selection, error: undefined };
    } catch (err) {
      if (isFocusCapacityError(err)) {
        return {
          selection: undefined,
          error: err instanceof FocusLayoutCapacityError ? err : new FocusLayoutCapacityError('Exceeded focus capacity.'),
        };
      }
      throw err;
    }
  }, [completeRawSourceGraph, language, posterTokenCatalog, selectedFocalPersonToken, designState.focus, designState.layoutMode, designState.shared]);

  const radialSelectionResult = useMemo(() => {
    if (designState.layoutMode !== 'radial-generations' || !completeRawSourceGraph?.nodes?.length) {
      return undefined;
    }
    if (!posterTokenCatalog || !selectedPosterRootToken) return undefined;

    const radialScope = designState.scope === 'descendants' ? 'descendants' : 'ancestors';

    try {
      const selection = selectRadialGraphBoundary(completeRawSourceGraph, posterTokenCatalog, {
        rootPersonToken: selectedPosterRootToken,
        scope: radialScope,
        generationRings: designState.radial.generationRings,
        privacyMode: designState.shared.privacyMode,
        language,
        includePhotos: designState.shared.includePhotos,
        hideLivingPhotos: designState.shared.hideLivingPhotos,
        includeYears: designState.shared.showYears,
        includeBirthPlace: designState.shared.showBirthPlace,
        includeOccupation: designState.shared.showOccupation,
        includeDescription: designState.shared.showDescription,
      });
      return { selection, error: undefined };
    } catch (err) {
      if (isRadialCapacityError(err)) {
        return {
          selection: undefined,
          error: err instanceof RadialLayoutCapacityError ? err : new RadialLayoutCapacityError('Exceeded radial capacity.'),
        };
      }
      throw err;
    }
  }, [completeRawSourceGraph, language, posterTokenCatalog, selectedPosterRootToken, designState.layoutMode, designState.radial, designState.scope, designState.shared]);

  const [userPosterTitle, setUserPosterTitle] = useState('');
  const [userPosterSubtitle, setUserPosterSubtitle] = useState('');

  const defaultPosterTitle = designState.layoutMode === 'focus-family'
    ? (isAr ? 'لوحة العائلة حول شخص' : 'Family Focus')
    : designState.layoutMode === 'radial-generations'
    ? (designState.scope === 'descendants'
        ? (isAr ? 'شجرة الأحفاد الشعاعية' : 'Radial Descendant Tree')
        : (isAr ? 'شجرة الأسلاف الشعاعية' : 'Radial Ancestor Tree'))
    : isSelectedBranchScope
    ? (isAr ? 'فرع العائلة' : 'Selected Family Branch')
    : designState.scope === 'descendants'
    ? (isAr ? 'شجرة الأحفاد' : 'Descendant Tree')
    : isAr
    ? (isFullTreeScope ? 'الشجرة العائلية الكاملة' : 'شجرة الأسلاف')
    : (isFullTreeScope ? 'Full Family Tree' : 'Ancestor Tree');

  const defaultPosterSubtitle = isAr
    ? 'السجل العائلي'
    : 'Family Record';

  const posterTitle = userPosterTitle.trim() || defaultPosterTitle;
  const posterSubtitle = userPosterSubtitle.trim() || defaultPosterSubtitle;
  const previewPresentationTitle = designState.layoutMode === 'focus-family'
    || designState.layoutMode === 'radial-generations'
    || designState.scope !== 'ancestors'
    ? posterTitle
    : undefined;

  const focalPreviewId =
    designState.layoutMode === 'radial-generations'
      ? radialSelectionResult?.selection?.focalPreviewId
      : focusSelectionResult?.selection?.focalPreviewId;

  const mappingResult = useMemo(() => {
    return mapPosterDesignStateToRuntimeOptions(designState, {
      focalPreviewId,
      definitionId: selectedDefinition.id,
      language,
      title: posterTitle,
      subtitle: posterSubtitle,
    });
  }, [focalPreviewId, language, posterSubtitle, posterTitle, selectedDefinition.id, designState]);

  const posterOptions = mappingResult.posterOptions;

  const [resolvedPosterSvgResources, setResolvedPosterSvgResources] = useState<StudioPosterSvgResources>();
  const [resolvedPosterImages, setResolvedPosterImages] = useState<StudioPosterSvgResources['embeddedImages']>();

  const resolvedPosterFontFamily = !posterOptions || posterOptions.fontFamily === 'style-default'
    ? selectedDefinition.id === 'modern-ancestor-poster'
      ? 'noto-sans-arabic'
      : 'amiri'
    : posterOptions.fontFamily;

  const matchingResolvedPosterSvgResources =
    resolvedPosterSvgResources?.embeddedArabicFontDataUri
      && resolvedPosterSvgResources.embeddedArabicFontFamily === resolvedPosterFontFamily
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

  const adapter = useMemo(
    () => getVisualPreviewAdapter(selectedDefinition.productType),
    [selectedDefinition.productType]
  );

  const previewData = useMemo(() => {
    const selectorProduct = selectedDefinition.productType;
    const maxNodes = selectorProduct === 'poster' ? (isFullTreeScope ? 150 : configuredPosterLimit) : 12;
    const privacyMode = selectorProduct === 'poster' ? (designState.shared.privacyMode ?? 'masked') : 'masked';

    const sanitizationBoundary = radialSelectionResult?.selection
      ?? focusSelectionResult?.selection
      ?? sanitizeProductionPreviewGraphBoundary(rawGraphData, {
          privacyMode,
          includePhotos: designState.shared.includePhotos,
          hideLivingPhotos: designState.shared.hideLivingPhotos,
          includeYears: designState.shared.showYears,
          includeBirthPlace: designState.shared.showBirthPlace,
          includeOccupation: designState.shared.showOccupation,
          includeDescription: designState.shared.showDescription,
          maxNodes,
          language,
        });
    const sanitizedGraph = sanitizationBoundary.sanitizedGraph;

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
      focalPreviewId,
      resolvePreviewIdInsideBoundary: sanitizationBoundary.resolvePreviewIdInsideBoundary,
      previewModel,
      definition: selectedDefinition,
      language,
    };
  }, [
    adapter,
    configuredPosterLimit,
    focalPreviewId,
    focusSelectionResult,
    isFullTreeScope,
    language,
    radialSelectionResult,
    rawGraphData,
    selectedDefinition,
    designState.shared.includePhotos,
    designState.shared.hideLivingPhotos,
    designState.shared.privacyMode,
    designState.shared.showBirthPlace,
    designState.shared.showDescription,
    designState.shared.showOccupation,
    designState.shared.showYears,
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
    if (!mappingResult.posterOptions || selectedDefinition.productType === 'snapshot') return undefined;

    return createPosterDocumentSpec(
      designState.shared.size || 'A3',
      designState.shared.orientation || 'landscape',
      designState.shared.marginPreset || 'balanced'
    );
  }, [mappingResult.posterOptions, selectedDefinition.productType, designState.shared]);

  const posterSceneEvaluation = useMemo(() => {
    if (designState.layoutMode === 'radial-generations' && radialSelectionResult?.error) {
      return { scene: undefined, capacityError: radialSelectionResult.error };
    }
    if (designState.layoutMode === 'focus-family' && focusSelectionResult?.error) {
      return { scene: undefined, capacityError: focusSelectionResult.error };
    }
    if (!mappingResult.posterOptions || !posterDocumentSpec || !previewData?.graph) {
      return { scene: undefined, capacityError: undefined };
    }

    const opt = <T extends string>(val: T | undefined): Exclude<T, 'style-default'> | undefined =>
      val && val !== 'style-default' ? (val as Exclude<T, 'style-default'>) : undefined;

    if (mappingResult.posterOptions.engineId === 'radial-generations' && radialSelectionResult?.selection) {
      try {
        const scene = createPosterScene({
          graph: radialSelectionResult.selection.sanitizedGraph,
          document: posterDocumentSpec,
          content: mappingResult.posterOptions.content,
          engineId: 'radial-generations',
          radialOptions: mappingResult.posterOptions.radialOptions,
          stylePreset: selectedPosterStyle,
          photoShape: designState.shared.photoShape,
          connectorStyle: designState.shared.connectorStyle,
          connectorPathStyle: opt(designState.shared.connectorPath),
          colorPalette: opt(designState.shared.colorPalette),
          colorOverrides: designState.shared.colorOverrides,
          decoration: opt(designState.shared.decoration),
          ornament: opt(designState.shared.ornament),
          typographyPreset: designState.shared.typography,
          fontFamily: opt(designState.shared.fontFamily),
          cardScalePreset: designState.shared.cardScale,
          cardEffectPreset: opt(designState.shared.cardEffect),
          cardFramePreset: opt(designState.shared.cardFrame),
          cardCornerPreset: opt(designState.shared.cardCorner),
          cardLayoutPreset: opt(designState.shared.cardLayout),
          pageFramePreset: opt(designState.shared.pageFrame),
          headerPreset: opt(designState.shared.header),
          spacingPreset: opt(designState.shared.spacing),
          direction: designState.shared.direction,
        });
        return { scene, capacityError: undefined };
      } catch (err) {
        if (isRadialCapacityError(err)) {
          return {
            scene: undefined,
            capacityError: err instanceof RadialLayoutCapacityError ? err : new RadialLayoutCapacityError('Exceeded radial capacity.'),
          };
        }
        throw err;
      }
    }

    if (mappingResult.posterOptions.engineId === 'focus-family' && focusSelectionResult?.selection) {
      try {
        const scene = createPosterScene({
          graph: focusSelectionResult.selection.sanitizedGraph,
          document: posterDocumentSpec,
          content: {
            ...mappingResult.posterOptions.content,
            scope: 'selected-root-focus',
          },
          engineId: 'focus-family',
          focusOptions: mappingResult.posterOptions.focusOptions,
          stylePreset: selectedPosterStyle,
          photoShape: designState.shared.photoShape,
          connectorStyle: designState.shared.connectorStyle,
          connectorPathStyle: opt(designState.shared.connectorPath),
          colorPalette: opt(designState.shared.colorPalette),
          colorOverrides: designState.shared.colorOverrides,
          decoration: opt(designState.shared.decoration),
          ornament: opt(designState.shared.ornament),
          typographyPreset: designState.shared.typography,
          fontFamily: opt(designState.shared.fontFamily),
          cardScalePreset: designState.shared.cardScale,
          cardEffectPreset: opt(designState.shared.cardEffect),
          cardFramePreset: opt(designState.shared.cardFrame),
          cardCornerPreset: opt(designState.shared.cardCorner),
          cardLayoutPreset: opt(designState.shared.cardLayout),
          pageFramePreset: opt(designState.shared.pageFrame),
          headerPreset: opt(designState.shared.header),
          spacingPreset: opt(designState.shared.spacing),
          direction: designState.shared.direction,
        });
        return { scene, capacityError: undefined };
      } catch (err) {
        if (isFocusCapacityError(err)) {
          return {
            scene: undefined,
            capacityError: err instanceof FocusLayoutCapacityError ? err : new FocusLayoutCapacityError('Exceeded focus capacity.'),
          };
        }
        throw err;
      }
    }

    const content: PosterContentSpec = {
      definitionId: selectedDefinition.id,
      language,
      generationCount: typeof (mappingResult.posterOptions as BaseStudioPosterOptions)?.generationDepth === 'number' ? ((mappingResult.posterOptions as BaseStudioPosterOptions).generationDepth as number) : 4,
      privacyMode: designState.shared.privacyMode,
      title: posterTitle,
      subtitle: posterSubtitle,
      footerText: normalizePosterFooterText(designState.shared.footerText || ''),
      showJozorAttribution: designState.shared.showJozorAttribution,
      scope: designState.scope === 'ancestors'
        ? 'selected-root-ancestors'
        : designState.scope === 'descendants'
          ? 'selected-root-descendants'
          : designState.scope === 'selected-branch'
            ? 'selected-branch'
          : 'full-tree',
      showYears: designState.shared.showYears,
      showRelationship: designState.shared.showRelationship,
      showBirthPlace: designState.shared.showBirthPlace,
      showOccupation: designState.shared.showOccupation,
      showDescription: designState.shared.showDescription,
    };

    return {
      scene: createPosterScene({
        graph: previewData.graph,
        document: posterDocumentSpec,
        content,
        stylePreset: selectedPosterStyle,
        photoShape: designState.shared.photoShape,
        connectorStyle: designState.shared.connectorStyle,
        connectorPathStyle: opt(designState.shared.connectorPath),
        colorPalette: opt(designState.shared.colorPalette),
        colorOverrides: designState.shared.colorOverrides,
        decoration: opt(designState.shared.decoration),
        ornament: opt(designState.shared.ornament),
        typographyPreset: designState.shared.typography,
        fontFamily: opt(designState.shared.fontFamily),
        cardScalePreset: designState.shared.cardScale,
        cardEffectPreset: opt(designState.shared.cardEffect),
        cardFramePreset: opt(designState.shared.cardFrame),
        cardCornerPreset: opt(designState.shared.cardCorner),
        cardLayoutPreset: opt(designState.shared.cardLayout),
        pageFramePreset: opt(designState.shared.pageFrame),
        headerPreset: opt(designState.shared.header),
        spacingPreset: opt(designState.shared.spacing),
        direction: designState.shared.direction,
      }),
      capacityError: undefined,
    };
  }, [radialSelectionResult, focusSelectionResult, mappingResult.posterOptions, posterDocumentSpec, previewData, selectedDefinition.id, language, posterTitle, posterSubtitle, selectedPosterStyle, designState]);

  const posterScene = posterSceneEvaluation.scene;

  const branchPosterCollection = useMemo(() => {
    if (!posterOptions || !posterDocumentSpec || designState.productMode !== 'branch-collection' || !previewData?.graph) {
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
  }, [language, posterDocumentSpec, posterOptions, posterTitle, previewData, designState.productMode]);

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
      const sourcePersonId = previewData?.resolvePreviewIdInsideBoundary(node.previewId);
      const rawSource = sourcePersonId
        ? posterImageSourceResolver?.(sourcePersonId) || ''
        : '';
      requests.push({
        previewId: node.previewId,
        source: rawSource,
      });
    }

    return requests;
  }, [posterImageSourceResolver, posterScene, previewData]);

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

  return {
    definitions,
    selectedDefinition,
    isFullTreeScope,
    selectedPosterRootToken,
    selectedFocalPersonToken,
    posterRootOptions,
    userPosterTitle,
    setUserPosterTitle,
    userPosterSubtitle,
    setUserPosterSubtitle,
    previewPresentationTitle,
    mappingResult,
    previewModel,
    posterSceneEvaluation,
    posterScene,
    branchPosterCollection,
    branchCollectionBlockingWarnings,
    tiledWallPosterPlan,
    posterSvgResources,
  };
}
