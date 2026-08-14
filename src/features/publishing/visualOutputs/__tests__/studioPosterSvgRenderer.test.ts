import { describe, expect, it } from 'vitest';

import { posterPreviewAdapter } from '../previewAdapterRegistry';
import { renderPosterSceneToSvg } from '../studioPosterSvgRenderer';
import { createTestPosterScene } from './studioPosterTestFixtures';

const model = posterPreviewAdapter.createPreviewModel({
  definitionId: 'classic-ancestor-poster',
  mode: 'sanitized-data',
  privacyMode: 'masked',
  language: 'ar',
  maxNodes: 7,
  sanitizedGraph: {
    nodes: [
      {
        previewId: 'preview-node-1',
        displayName: '\u0631\u0645\u0636\u0627\u0646 \u0627\u0644\u0642\u0631\u062c\u064a',
        generation: 1,
        relationshipHint: 'root',
        lifeStatus: 'deceased',
        isMasked: false,
        hasPhoto: false,
        birthYear: 1895,
        deathYear: 1983,
      },
      {
        previewId: 'preview-node-2',
        displayName: '\u0634\u062e\u0635 \u0645\u062e\u0641\u064a',
        generation: 2,
        relationshipHint: 'parent',
        lifeStatus: 'living',
        isMasked: true,
        hasPhoto: false,
      },
    ],
    edges: [{
      fromPreviewId: 'preview-node-2',
      toPreviewId: 'preview-node-1',
      relationshipType: 'parent-child',
    }],
    warnings: [],
    metadata: {
      sanitizedNodeCount: 2,
      truncated: false,
      policy: {
        privacyMode: 'masked',
        language: 'ar',
        maxNodes: 7,
        includePhotos: false,
        includeYears: true,
      },
    },
  },
});

const scene = createTestPosterScene({
  model,
  language: 'ar',
  title: '\u0634\u062c\u0631\u0629 \u0623\u0633\u0644\u0627\u0641 \u0639\u0627\u0626\u0644\u0629 \u0631\u0645\u0636\u0627\u0646 \u0627\u0644\u0642\u0631\u062c\u064a',
  subtitle: '\u0630\u0627\u0643\u0631\u0629 \u0623\u0631\u0628\u0639\u0629 \u0623\u062c\u064a\u0627\u0644',
});

describe('studioPosterSvgRenderer', () => {
  it('renders PosterScene as the canonical deterministic SVG document', () => {
    const first = renderPosterSceneToSvg({ scene });
    const second = renderPosterSceneToSvg({ scene });

    expect(first.format).toBe('svg');
    expect(first.svg).toBe(second.svg);
    expect(first.scene).toBe(scene);
    expect(first.metadata.rendererId).toBe('poster-scene-svg');
    expect(first.metadata.visualStyle).toBe('classic-heritage');
    expect(first.svg).toContain('data-poster-renderer="svg-v1"');
    expect(first.svg).toContain('data-poster-theme="classic-heritage"');
    expect(first.svg).toContain(`viewBox="0 0 ${scene.document.sceneSize.width} ${scene.document.sceneSize.height}"`);
    expect(first.svg).toContain('data-physical-width-mm="210"');
    expect(first.svg).toContain('data-physical-height-mm="297"');
  });

  it('uses exact scene node and connector geometry without layout recalculation', () => {
    const result = renderPosterSceneToSvg({ scene });

    for (const node of scene.nodes) {
      expect(result.svg).toContain(`data-preview-node="${node.previewId}"`);
      expect(result.svg).toContain(`x="${node.rect.x.toFixed(2)}"`);
      expect(result.svg).toContain(`y="${node.rect.y.toFixed(2)}"`);
    }
    for (const connector of scene.connectors) {
      expect(result.svg).toContain(`data-preview-edge="${connector.fromPreviewId}:${connector.toPreviewId}"`);
      expect(result.svg).toContain(`data-start-x="${connector.start.x.toFixed(2)}"`);
      expect(result.svg).toContain(`data-end-y="${connector.end.y.toFixed(2)}"`);
    }
  });

  it('applies owner connector presets without changing canonical geometry', () => {
    const subtleScene = createTestPosterScene({
      model,
      language: 'ar',
      title: '\u0634\u062c\u0631\u0629 \u0628\u062e\u0637\u0648\u0637 \u0646\u0627\u0639\u0645\u0629',
      connectorStyle: 'subtle',
    });
    const boldScene = createTestPosterScene({
      model,
      language: 'ar',
      title: '\u0634\u062c\u0631\u0629 \u0628\u062e\u0637\u0648\u0637 \u0628\u0627\u0631\u0632\u0629',
      connectorStyle: 'bold',
    });
    const subtle = renderPosterSceneToSvg({ scene: subtleScene });
    const bold = renderPosterSceneToSvg({ scene: boldScene });

    expect(subtleScene.nodes.map((node) => node.rect)).toEqual(boldScene.nodes.map((node) => node.rect));
    expect(subtleScene.connectors).toEqual(boldScene.connectors);
    expect(subtle.svg).toContain('data-poster-connector-style="subtle"');
    expect(subtle.svg).toContain('stroke-width:1.6');
    expect(bold.svg).toContain('data-poster-connector-style="bold"');
    expect(bold.svg).toContain('stroke-width:4.2');
  });

  it('changes generation connector paths while preserving canonical endpoints', () => {
    const straightScene = createTestPosterScene({
      model,
      language: 'ar',
      title: '\u0645\u0633\u0627\u0631 \u0645\u0633\u062a\u0642\u064a\u0645',
      connectorPathStyle: 'straight',
    });
    const orthogonalScene = createTestPosterScene({
      model,
      language: 'ar',
      title: '\u0645\u0633\u0627\u0631 \u0645\u062a\u062f\u0631\u062c',
      connectorPathStyle: 'orthogonal',
    });
    const curvedScene = createTestPosterScene({
      model,
      language: 'ar',
      title: '\u0645\u0633\u0627\u0631 \u0645\u0646\u062d\u0646\u064a',
      connectorPathStyle: 'curved',
    });
    const straight = renderPosterSceneToSvg({ scene: straightScene }).svg;
    const orthogonal = renderPosterSceneToSvg({ scene: orthogonalScene }).svg;
    const curved = renderPosterSceneToSvg({ scene: curvedScene }).svg;

    expect(orthogonalScene.connectors).toEqual(straightScene.connectors);
    expect(curvedScene.connectors).toEqual(straightScene.connectors);
    expect(straight).toContain('data-poster-connector-path="straight"');
    expect(straight).toMatch(/data-preview-edge="preview-node-2:preview-node-1"[^>]+d="M [^"]+ L [^"]+"/);
    expect(orthogonal).toContain('data-poster-connector-path="orthogonal"');
    expect(orthogonal).toMatch(/data-preview-edge="preview-node-2:preview-node-1"[^>]+d="M [^"]+ L [^"]+ L [^"]+ L [^"]+"/);
    expect(curved).toContain('data-poster-connector-path="curved"');
    expect(curved).toMatch(/data-preview-edge="preview-node-2:preview-node-1"[^>]+d="M [^"]+ C [^"]+"/);
  });

  it.each([
    {
      language: 'en' as const,
      title: 'Family Focus',
      treeLabel: 'Family around the focal person',
      scopeLabel: 'Scope: family around focal person',
    },
    {
      language: 'ar' as const,
      title: 'لوحة العائلة حول شخص',
      treeLabel: 'العائلة حول الشخص المحوري',
      scopeLabel: 'النطاق: حول الشخص المحوري',
    },
  ])('renders Focus-specific tree and scope semantics in $language', ({ language, title, treeLabel, scopeLabel }) => {
    const focusScene = {
      ...scene,
      content: {
        ...scene.content,
        language,
        title,
        scope: 'selected-root-focus' as const,
      },
      layout: {
        ...scene.layout,
        engineId: 'focus-family' as const,
      },
    };

    const result = renderPosterSceneToSvg({ scene: focusScene });

    expect(result.svg).toContain(`<g aria-label="${treeLabel}">`);
    expect(result.svg).toContain(`>${scopeLabel}</text>`);
  });

  it('applies print palettes without changing canonical geometry', () => {
    const warmScene = createTestPosterScene({
      model,
      language: 'ar',
      title: '\u0644\u0648\u062d\u0629 \u062f\u0627\u0641\u0626\u0629',
      colorPalette: 'heritage-warm',
    });
    const monochromeScene = createTestPosterScene({
      model,
      language: 'ar',
      title: '\u0644\u0648\u062d\u0629 \u0623\u062d\u0627\u062f\u064a\u0629',
      colorPalette: 'monochrome-print',
    });
    const warm = renderPosterSceneToSvg({ scene: warmScene });
    const monochrome = renderPosterSceneToSvg({ scene: monochromeScene });

    expect(warmScene.nodes.map((node) => node.rect)).toEqual(monochromeScene.nodes.map((node) => node.rect));
    expect(warmScene.connectors).toEqual(monochromeScene.connectors);
    expect(warm.svg).toContain('data-poster-color-palette="heritage-warm"');
    expect(warm.svg).toContain('fill="#f4ead8"');
    expect(monochrome.svg).toContain('data-poster-color-palette="monochrome-print"');
    expect(monochrome.svg).toContain('fill="#f7f7f5"');
  });

  it('applies safe custom colors with automatic readable text and unchanged geometry', () => {
    const baseScene = createTestPosterScene({
      model,
      language: 'ar',
      title: '\u0644\u0648\u062d\u0629 \u0623\u0644\u0648\u0627\u0646',
      colorPalette: 'heritage-warm',
    });
    const customScene = createTestPosterScene({
      model,
      language: 'ar',
      title: '\u0644\u0648\u062d\u0629 \u0623\u0644\u0648\u0627\u0646',
      colorPalette: 'heritage-warm',
      colorOverrides: {
        background: '#112233',
        cardBackground: '#fefefe',
        accent: '#cc5500',
        connector: '#008877',
      },
    });
    const result = renderPosterSceneToSvg({ scene: customScene });

    expect(customScene.nodes.map((node) => node.rect)).toEqual(baseScene.nodes.map((node) => node.rect));
    expect(customScene.connectors).toEqual(baseScene.connectors);
    expect(result.svg).toContain('data-poster-custom-colors="true"');
    expect(result.svg).toContain('fill="#112233"');
    expect(result.svg).toContain('.poster-root{font-family:');
    expect(result.svg).toContain('color:#ffffff');
    expect(result.svg).toContain('.poster-node{color:#171717;}');
    expect(result.svg).toContain('.poster-card{fill:#fefefe;stroke:#cc5500');
    expect(result.svg).toContain('.poster-connector{fill:none;stroke:#008877');
    expect(result.svg).not.toContain('javascript:');
  });

  it('applies SVG-native background treatments without changing canonical geometry', () => {
    const paperScene = createTestPosterScene({
      model,
      language: 'ar',
      title: '\u0644\u0648\u062d\u0629 \u062a\u0631\u0627\u062b\u064a\u0629',
      decoration: 'paper-grain',
    });
    const cleanScene = createTestPosterScene({
      model,
      language: 'ar',
      title: '\u0644\u0648\u062d\u0629 \u0646\u0638\u064a\u0641\u0629',
      decoration: 'clean',
    });
    const gridScene = createTestPosterScene({
      model,
      language: 'ar',
      title: '\u0644\u0648\u062d\u0629 \u0628\u0634\u0628\u0643\u0629 \u0646\u0633\u0628',
      decoration: 'lineage-grid',
    });
    const paper = renderPosterSceneToSvg({ scene: paperScene }).svg;
    const clean = renderPosterSceneToSvg({ scene: cleanScene }).svg;
    const grid = renderPosterSceneToSvg({ scene: gridScene }).svg;

    expect(cleanScene.nodes.map((node) => node.rect)).toEqual(paperScene.nodes.map((node) => node.rect));
    expect(gridScene.nodes.map((node) => node.rect)).toEqual(paperScene.nodes.map((node) => node.rect));
    expect(cleanScene.connectors).toEqual(paperScene.connectors);
    expect(gridScene.connectors).toEqual(paperScene.connectors);
    expect(paper).toContain('data-poster-decoration="paper-grain"');
    expect(paper).toContain('class="poster-decoration poster-decoration-paper"');
    expect(clean).toContain('data-poster-decoration="clean"');
    expect(clean).not.toContain('class="poster-decoration');
    expect(grid).toContain('data-poster-decoration="lineage-grid"');
    expect(grid).toContain('class="poster-decoration poster-decoration-lineage-grid"');
    expect(grid).toContain('fill="url(#poster-lineage-grid)"');
    expect(grid).not.toMatch(/(?:href|src)=["']https?:|url\(["']?https?:/);
  });

  it('renders SVG-native poster ornaments without changing tree geometry', () => {
    const noneScene = createTestPosterScene({ model, language: 'ar', title: '\u0644\u0648\u062d\u0629', ornament: 'none' });
    const lineageScene = createTestPosterScene({ model, language: 'ar', title: '\u0644\u0648\u062d\u0629', ornament: 'lineage-medallion' });
    const galleryScene = createTestPosterScene({ model, language: 'ar', title: '\u0644\u0648\u062d\u0629', ornament: 'gallery-marks' });
    const branchesScene = createTestPosterScene({ model, language: 'ar', title: '\u0644\u0648\u062d\u0629', ornament: 'corner-branches' });
    const none = renderPosterSceneToSvg({ scene: noneScene }).svg;
    const lineage = renderPosterSceneToSvg({ scene: lineageScene }).svg;
    const gallery = renderPosterSceneToSvg({ scene: galleryScene }).svg;
    const branches = renderPosterSceneToSvg({ scene: branchesScene }).svg;

    expect(branchesScene.nodes.map((node) => node.rect)).toEqual(noneScene.nodes.map((node) => node.rect));
    expect(lineage).toContain('data-poster-ornament="lineage-medallion"');
    expect(lineage).toContain('poster-ornament-lineage');
    expect(gallery).toContain('poster-ornament-gallery');
    expect(branches).toContain('poster-ornament-branches');
    expect(none).toContain('data-poster-ornament="none"');
    expect(none).not.toContain('<g class="poster-ornament');
    expect(`${lineage}${gallery}${branches}`).not.toMatch(/(?:href|src)=["']https?:|url\(["']?https?:/);
  });

  it('applies print-gated typography density through the shared scene', () => {
    const balancedScene = createTestPosterScene({
      model,
      language: 'ar',
      title: '\u0644\u0648\u062d\u0629 \u0645\u062a\u0648\u0627\u0632\u0646\u0629',
      typographyPreset: 'balanced',
    });
    const prominentScene = createTestPosterScene({
      model,
      language: 'ar',
      title: '\u0644\u0648\u062d\u0629 \u0628\u0623\u0633\u0645\u0627\u0621 \u0623\u0648\u0636\u062d',
      typographyPreset: 'prominent',
    });
    const compactScene = createTestPosterScene({
      model,
      language: 'ar',
      title: '\u0644\u0648\u062d\u0629 \u0645\u0636\u063a\u0648\u0637\u0629',
      typographyPreset: 'compact',
    });
    const prominent = renderPosterSceneToSvg({ scene: prominentScene }).svg;
    const compact = renderPosterSceneToSvg({ scene: compactScene }).svg;

    expect(prominentScene.nodes.map((node) => node.rect)).toEqual(balancedScene.nodes.map((node) => node.rect));
    expect(compactScene.nodes.map((node) => node.rect)).toEqual(balancedScene.nodes.map((node) => node.rect));
    expect(prominentScene.cardPreset.typography.nameSize).toBeGreaterThan(balancedScene.cardPreset.typography.nameSize);
    expect(compactScene.cardPreset.typography.nameSize).toBeLessThan(balancedScene.cardPreset.typography.nameSize);
    expect(prominent).toContain('data-poster-typography="prominent"');
    expect(compact).toContain('data-poster-typography="compact"');
    expect(prominentScene.quality.evaluated).toBe(true);
    expect(compactScene.quality.evaluated).toBe(true);
  });

  it('publishes the canonical embedded font family and rejects a mismatched resource', () => {
    const kufiScene = createTestPosterScene({
      model,
      language: 'ar',
      title: '\u0634\u062c\u0631\u0629 \u0627\u0644\u0639\u0627\u0626\u0644\u0629',
      fontFamily: 'noto-kufi-arabic',
    });
    const matchingResources = {
      embeddedArabicFontDataUri: 'data:font/ttf;base64,QUJDRA==',
      embeddedArabicFontFormat: 'truetype' as const,
      embeddedArabicFontFamily: 'noto-kufi-arabic' as const,
    };
    const rendered = renderPosterSceneToSvg({ scene: kufiScene, resources: matchingResources });

    expect(rendered.svg).toContain('data-poster-font-family="noto-kufi-arabic"');
    expect(rendered.svg).toContain('@font-face{font-family:"JozorPosterArabic"');
    expect(() => renderPosterSceneToSvg({
      scene: kufiScene,
      resources: { ...matchingResources, embeddedArabicFontFamily: 'amiri' },
    })).toThrow('does not match');
  });

  it('renders owner-selected card scale from canonical scene geometry', () => {
    const smallScene = createTestPosterScene({
      model,
      language: 'ar',
      title: '\u0628\u0637\u0627\u0642\u0627\u062a \u0635\u063a\u064a\u0631\u0629',
      cardScalePreset: 'compact',
    });
    const largeScene = createTestPosterScene({
      model,
      language: 'ar',
      title: '\u0628\u0637\u0627\u0642\u0627\u062a \u0643\u0628\u064a\u0631\u0629',
      cardScalePreset: 'large',
    });
    const small = renderPosterSceneToSvg({ scene: smallScene }).svg;
    const large = renderPosterSceneToSvg({ scene: largeScene }).svg;

    expect(smallScene.cardPreset.geometry.height).toBeLessThan(largeScene.cardPreset.geometry.height);
    expect(smallScene.cardPreset.photo.preferredDiameter).toBeLessThan(largeScene.cardPreset.photo.preferredDiameter);
    expect(small).toContain('data-poster-card-scale="compact"');
    expect(large).toContain('data-poster-card-scale="large"');
    for (const node of largeScene.nodes) {
      expect(large).toContain(`data-scene-width="${node.rect.width.toFixed(2)}"`);
      expect(large).toContain(`data-scene-height="${node.rect.height.toFixed(2)}"`);
    }
  });

  it('applies card depth effects without changing canonical geometry', () => {
    const flatScene = createTestPosterScene({
      model,
      language: 'ar',
      title: '\u0628\u0637\u0627\u0642\u0627\u062a \u0645\u0633\u0637\u062d\u0629',
      cardEffectPreset: 'flat',
    });
    const elevatedScene = createTestPosterScene({
      model,
      language: 'ar',
      title: '\u0628\u0637\u0627\u0642\u0627\u062a \u0628\u0627\u0631\u0632\u0629',
      cardEffectPreset: 'elevated',
    });
    const flat = renderPosterSceneToSvg({ scene: flatScene }).svg;
    const elevated = renderPosterSceneToSvg({ scene: elevatedScene }).svg;

    expect(elevatedScene.nodes.map((node) => node.rect)).toEqual(flatScene.nodes.map((node) => node.rect));
    expect(elevatedScene.connectors).toEqual(flatScene.connectors);
    expect(flat).toContain('data-poster-card-effect="flat"');
    expect(flat).toContain('.poster-card-shadow{fill:#4b2f1c;opacity:0;');
    expect(elevated).toContain('data-poster-card-effect="elevated"');
    expect(elevated).toContain('dy="12" stdDeviation="14"');
    expect(elevated).toContain('.poster-card-shadow{fill:#4b2f1c;opacity:0.24;');
  });

  it('applies card frame detail without changing canonical geometry', () => {
    const minimalScene = createTestPosterScene({
      model,
      language: 'ar',
      title: '\u0625\u0637\u0627\u0631 \u0628\u0633\u064a\u0637',
      cardFramePreset: 'minimal',
    });
    const ornateScene = createTestPosterScene({
      model,
      language: 'ar',
      title: '\u0625\u0637\u0627\u0631 \u0645\u0632\u062e\u0631\u0641',
      cardFramePreset: 'ornate',
    });
    const minimal = renderPosterSceneToSvg({ scene: minimalScene }).svg;
    const ornate = renderPosterSceneToSvg({ scene: ornateScene }).svg;

    expect(ornateScene.nodes.map((node) => node.rect)).toEqual(minimalScene.nodes.map((node) => node.rect));
    expect(ornateScene.connectors).toEqual(minimalScene.connectors);
    expect(minimal).toContain('data-poster-card-frame="minimal"');
    expect(minimal).toContain('.poster-card-accent{stroke:');
    expect(minimal).toContain('stroke-width:0;opacity:0;');
    expect(minimal).not.toContain('class="poster-card-inner-frame"');
    expect(ornate).toContain('data-poster-card-frame="ornate"');
    expect(ornate).toContain('class="poster-card-inner-frame"');
    expect(ornate).toContain('.poster-card{fill:');
    expect(ornate).toContain('stroke-width:2.4;');
  });

  it('renders owner-selected card corners through the shared SVG scene', () => {
    const squareScene = createTestPosterScene({
      model,
      language: 'ar',
      title: '\u0632\u0648\u0627\u064a\u0627 \u062d\u0627\u062f\u0629',
      cardCornerPreset: 'square',
    });
    const roundedScene = createTestPosterScene({
      model,
      language: 'ar',
      title: '\u0632\u0648\u0627\u064a\u0627 \u0645\u0633\u062a\u062f\u064a\u0631\u0629',
      cardCornerPreset: 'rounded',
    });
    const square = renderPosterSceneToSvg({ scene: squareScene }).svg;
    const rounded = renderPosterSceneToSvg({ scene: roundedScene }).svg;

    expect(roundedScene.nodes.map((node) => node.rect)).toEqual(squareScene.nodes.map((node) => node.rect));
    expect(roundedScene.connectors).toEqual(squareScene.connectors);
    expect(square).toContain('data-poster-card-corner="square"');
    expect(square).toMatch(/class="poster-card"[^>]+rx="0"/);
    expect(rounded).toContain('data-poster-card-corner="rounded"');
    expect(rounded).toMatch(/class="poster-card"[^>]+rx="[1-9][\d.]*"/);
  });

  it('renders photo-focused and text-minimal card content layouts from the canonical scene', () => {
    const photoFocusedScene = createTestPosterScene({
      model,
      language: 'en',
      title: 'Poster',
      cardLayoutPreset: 'photo-focused',
    });
    const textMinimalScene = createTestPosterScene({
      model,
      language: 'en',
      title: 'Poster',
      cardLayoutPreset: 'text-minimal',
    });
    const photoFocused = renderPosterSceneToSvg({ scene: photoFocusedScene }).svg;
    const textMinimal = renderPosterSceneToSvg({ scene: textMinimalScene }).svg;

    expect(photoFocused).toContain('data-poster-card-layout="photo-focused"');
    expect(photoFocused).toContain('class="poster-avatar"');
    expect(textMinimal).toContain('data-poster-card-layout="text-minimal"');
    expect(textMinimal).not.toContain('class="poster-avatar"');
    expect(textMinimal).not.toContain('class="poster-photo"');
  });

  it('publishes the canonical print-margin preset in the shared SVG', () => {
    const compactScene = createTestPosterScene({
      model,
      language: 'ar',
      title: '\u0647\u0648\u0627\u0645\u0634 \u0645\u062f\u0645\u062c\u0629',
      marginPreset: 'compact',
    });
    const generousScene = createTestPosterScene({
      model,
      language: 'ar',
      title: '\u0647\u0648\u0627\u0645\u0634 \u0648\u0627\u0633\u0639\u0629',
      marginPreset: 'generous',
    });
    const compact = renderPosterSceneToSvg({ scene: compactScene }).svg;
    const generous = renderPosterSceneToSvg({ scene: generousScene }).svg;

    expect(compact).toContain('data-poster-margin-preset="compact"');
    expect(generous).toContain('data-poster-margin-preset="generous"');
    expect(compactScene.bounds.content.width).toBeGreaterThan(generousScene.bounds.content.width);
  });

  it('publishes owner-selected spacing through the shared SVG scene', () => {
    const compactScene = createTestPosterScene({
      model,
      language: 'ar',
      title: '\u062a\u0648\u0632\u064a\u0639 \u0645\u062f\u0645\u062c',
      spacingPreset: 'compact',
    });
    const airyScene = createTestPosterScene({
      model,
      language: 'ar',
      title: '\u062a\u0648\u0632\u064a\u0639 \u0631\u062d\u0628',
      spacingPreset: 'airy',
    });
    const compact = renderPosterSceneToSvg({ scene: compactScene }).svg;
    const airy = renderPosterSceneToSvg({ scene: airyScene }).svg;

    expect(compact).toContain('data-poster-spacing="compact"');
    expect(airy).toContain('data-poster-spacing="airy"');
  });

  it('switches the poster page frame without changing tree geometry', () => {
    const noFrameScene = createTestPosterScene({
      model,
      language: 'ar',
      title: '\u0644\u0648\u062d\u0629 \u0628\u062f\u0648\u0646 \u0625\u0637\u0627\u0631',
      pageFramePreset: 'none',
    });
    const heritageScene = createTestPosterScene({
      model,
      language: 'ar',
      title: '\u0625\u0637\u0627\u0631 \u062a\u0631\u0627\u062b\u064a',
      pageFramePreset: 'heritage',
    });
    const galleryScene = createTestPosterScene({
      model,
      language: 'ar',
      title: '\u0625\u0637\u0627\u0631 \u0645\u0639\u0631\u0636',
      pageFramePreset: 'gallery',
    });
    const noFrame = renderPosterSceneToSvg({ scene: noFrameScene }).svg;
    const heritage = renderPosterSceneToSvg({ scene: heritageScene }).svg;
    const gallery = renderPosterSceneToSvg({ scene: galleryScene }).svg;

    expect(heritageScene.nodes.map((node) => node.rect)).toEqual(noFrameScene.nodes.map((node) => node.rect));
    expect(galleryScene.connectors).toEqual(noFrameScene.connectors);
    expect(noFrame).toContain('data-poster-page-frame="none"');
    expect(noFrame).not.toContain('class="poster-frame');
    expect(heritage).toContain('data-poster-page-frame="heritage"');
    expect(heritage).toContain('class="poster-frame"');
    expect(heritage).toContain('.poster-frame-outer{fill:none;stroke:');
    expect(heritage).toContain('stroke-width:12;');
    expect(gallery).toContain('data-poster-page-frame="gallery"');
    expect(gallery).toContain('class="poster-frame poster-frame-modern"');
    expect(gallery).toContain('stroke-width:3;');
  });

  it('renders ceremonial, gallery-rail, and registry title systems from PosterScene', () => {
    const longArabicTitle = '\u0634\u062c\u0631\u0629 \u0623\u0633\u0644\u0627\u0641 \u0639\u0627\u0626\u0644\u0629 \u0627\u0644\u0642\u0631\u062c\u064a \u0639\u0628\u0631 \u0623\u0631\u0628\u0639\u0629 \u0623\u062c\u064a\u0627\u0644 \u0645\u0646 \u0627\u0644\u0630\u0627\u0643\u0631\u0629 \u0627\u0644\u0639\u0627\u0626\u0644\u064a\u0629';
    const ceremonialScene = createTestPosterScene({
      model,
      language: 'ar',
      title: longArabicTitle,
      subtitle: '\u0644\u0648\u062d\u0629 \u062c\u062f\u0627\u0631\u064a\u0629',
      headerPreset: 'ceremonial',
    });
    const galleryScene = createTestPosterScene({
      model,
      language: 'ar',
      title: longArabicTitle,
      subtitle: '\u0644\u0648\u062d\u0629 \u062c\u062f\u0627\u0631\u064a\u0629',
      headerPreset: 'gallery-rail',
    });
    const registryScene = createTestPosterScene({
      model,
      language: 'ar',
      title: longArabicTitle,
      subtitle: '\u0644\u0648\u062d\u0629 \u062c\u062f\u0627\u0631\u064a\u0629',
      headerPreset: 'registry',
    });
    const ceremonial = renderPosterSceneToSvg({ scene: ceremonialScene }).svg;
    const gallery = renderPosterSceneToSvg({ scene: galleryScene }).svg;
    const registry = renderPosterSceneToSvg({ scene: registryScene }).svg;

    expect(galleryScene.nodes.map((node) => node.rect)).toEqual(ceremonialScene.nodes.map((node) => node.rect));
    expect(registryScene.connectors).toEqual(ceremonialScene.connectors);
    expect(ceremonial).toContain('data-poster-header="ceremonial"');
    expect(ceremonial).toContain('poster-header-ceremonial');
    expect(gallery).toContain('data-poster-header="gallery-rail"');
    expect(gallery).toContain('poster-header-rail');
    expect(registry).toContain('data-poster-header="registry"');
    expect(registry).toContain('class="poster-header-title"');
    expect(registry).toContain('text-anchor="start" font-size="36"');
    expect(registry).toContain('class="poster-header-meta"');
    expect(registry).toContain('text-anchor="end" font-size="16"');
    expect(registry).toContain('\u0634\u062e\u0635\u064b\u0627');
    expect(registry).toContain('\u0623\u062c\u064a\u0627\u0644');
    expect(registry).not.toContain('people');

    const readHeaderMetrics = (svg: string) => {
      const title = svg.match(/class="poster-header-title"[^>]* y="([\d.]+)"[^>]* font-size="([\d.]+)"/);
      const subtitle = svg.match(/class="poster-header-subtitle[^"]*"[^>]* y="([\d.]+)"/);
      expect(title).not.toBeNull();
      expect(subtitle).not.toBeNull();
      return {
        titleY: Number(title?.[1]),
        titleSize: Number(title?.[2]),
        subtitleY: Number(subtitle?.[1]),
      };
    };

    [ceremonial, gallery, registry].forEach((svg) => {
      const metrics = readHeaderMetrics(svg);
      expect(metrics.subtitleY - metrics.titleY).toBeGreaterThanOrEqual(metrics.titleSize);
    });
  });

  it('culls off-sheet artwork while preserving canonical scene coordinates', () => {
    const rootNode = scene.nodes.find((node) => node.previewId === 'preview-node-1')!;
    const result = renderPosterSceneToSvg({
      scene,
      viewport: {
        rect: rootNode.rect,
        outputSize: { width: 1200, height: 1697 },
        physicalSizeMm: { width: 210, height: 297 },
        label: 'Tile 1-1',
      },
    });

    expect(result.metadata.nodeCount).toBe(1);
    expect(result.svg).toContain('data-preview-node="preview-node-1"');
    expect(result.svg).not.toContain('data-preview-node="preview-node-2"');
    expect(result.svg).toContain(`data-scene-x="${rootNode.rect.x.toFixed(2)}"`);
  });

  it('renders the Classic Heritage wall-poster treatment from scene tokens', () => {
    const result = renderPosterSceneToSvg({ scene });

    expect(scene.cardPreset.id).toBe('classic-heritage');
    expect(scene.cardPreset.photo.overlapsCard).toBe(true);
    expect(result.svg).toContain('class="poster-frame"');
    expect(result.svg).toContain('class="poster-corner"');
    expect(result.svg).toContain('id="poster-card-shadow"');
    expect(result.svg).toContain('class="poster-node is-root"');
    expect(result.svg).toContain('class="poster-avatar-ring"');
    expect(result.svg).toContain('class="poster-card-accent"');
  });

  it('keeps inherited text legible on the dark Modern Gallery surface', () => {
    const modernScene = createTestPosterScene({
      model,
      language: 'ar',
      title: '\u0634\u062c\u0631\u0629 \u0627\u0644\u0639\u0627\u0626\u0644\u0629 \u0627\u0644\u0639\u0635\u0631\u064a\u0629',
      subtitle: '\u0630\u0627\u0643\u0631\u0629 \u0639\u0627\u0626\u0644\u064a\u0629 \u0644\u0644\u0637\u0628\u0627\u0639\u0629',
      theme: 'modern',
    });
    const result = renderPosterSceneToSvg({ scene: modernScene });

    expect(modernScene.colorPalette).toBe('gallery-dark');
    expect(result.svg).toContain('data-poster-theme="modern-gallery"');
    expect(result.svg).toContain('data-poster-color-palette="gallery-dark"');
    expect(result.svg).toContain('fill:#f7f5ef;color:#f7f5ef');
    expect(result.svg).toContain('.poster-name{fill:currentColor');
    expect(result.svg).toContain('.poster-subtitle,.poster-footer{fill:currentColor');
  });

  it('keeps Dense Genealogy names clear of compact avatars', () => {
    const denseScene = createTestPosterScene({
      model,
      language: 'ar',
      title: '\u0644\u0648\u062d\u0629 \u0627\u0644\u0623\u0646\u0633\u0627\u0628 \u0627\u0644\u0643\u062b\u064a\u0641\u0629',
      pageSize: 'A3',
      orientation: 'landscape',
      stylePreset: 'dense-genealogy',
      direction: 'horizontal',
    });
    const result = renderPosterSceneToSvg({ scene: denseScene });
    const avatar = result.svg.match(/poster-avatar-ring" cx="[\d.]+" cy="([\d.]+)" r="([\d.]+)"/);
    const name = result.svg.match(/<text class="poster-name"[^>]*><tspan x="[\d.]+" y="([\d.]+)"/);

    expect(denseScene.cardPreset.geometry.height).toBe(124);
    expect(denseScene.cardPreset.photo.preferredDiameter).toBe(34);
    expect(avatar).not.toBeNull();
    expect(name).not.toBeNull();
    expect(Number(name![1])).toBeGreaterThan(Number(avatar![1]) + Number(avatar![2]) + 8);
  });

  it('preserves Arabic text, ligature styling, masked labels, and LTR years', () => {
    const result = renderPosterSceneToSvg({ scene });

    expect(result.metadata.dir).toBe('rtl');
    expect(result.metadata.hasArabicText).toBe(true);
    expect(result.svg).toContain('\u0634\u062c\u0631\u0629 \u0623\u0633\u0644\u0627\u0641');
    expect(result.svg).toContain('\u0631\u0645\u0636\u0627\u0646 \u0627\u0644\u0642\u0631\u062c\u064a');
    expect(result.svg).toContain('1895 - 1983');
    expect(result.svg).toContain('\u0645\u062d\u0645\u064a \u0628\u0645\u0648\u062c\u0628 \u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629');
    expect(result.svg).toContain('font-variant-ligatures:common-ligatures contextual');
    expect(result.svg).toContain('direction:ltr;unicode-bidi:isolate');
  });

  it('contains no scripts, foreignObject blocks, external URLs, or raw person fields', () => {
    const result = renderPosterSceneToSvg({ scene });

    expect(result.svg).not.toContain('<script');
    expect(result.svg).not.toContain('<foreignObject');
    expect(result.svg).not.toMatch(/(?:href|src)=["']https?:|url\(["']?https?:/);
    expect(result.svg).not.toContain('photoUrl');
    expect(result.svg).not.toContain('rawId');
    expect(result.svg).not.toContain('email');
  });

  it('renders an escaped owner footer and supports optional Jozor attribution', () => {
    const customizedScene = {
      ...scene,
      content: {
        ...scene.content,
        footerText: '<Family & memory>',
        showJozorAttribution: false,
      },
    };
    const result = renderPosterSceneToSvg({ scene: customizedScene });

    expect(result.svg).toContain('class="poster-footer poster-custom-footer"');
    expect(result.svg).toContain('&lt;Family &amp; memory&gt;');
    expect(result.svg).not.toContain('<Family & memory>');
    expect(result.svg).not.toContain('Created in Jozor');
    expect(result.svg).not.toContain('poster-attribution');
    expect(result.svg).toContain('poster-scope');
  });

  it('accepts resolver-owned embedded font data and rejects external font URLs', () => {
    const embedded = renderPosterSceneToSvg({
      scene,
      resources: {
        embeddedArabicFontDataUri: 'data:font/ttf;base64,QUJDRA==',
        embeddedArabicFontFormat: 'truetype',
      },
    });

    expect(embedded.metadata.hasEmbeddedFont).toBe(true);
    expect(embedded.svg).toContain('@font-face');
    expect(embedded.svg).toContain('data:font/ttf;base64,QUJDRA==');
    expect(() => renderPosterSceneToSvg({
      scene,
      resources: {
        embeddedArabicFontDataUri: 'https://storage.example.com/amiri.ttf',
      },
    })).toThrow('base64 font data URI');
  });

  it('renders resolver-owned embedded photos and falls back without exposing source URLs', () => {
    const photoScene = {
      ...scene,
      nodes: scene.nodes.map((node, index) => index === 0 ? { ...node, hasPhoto: true } : node),
    };
    const result = renderPosterSceneToSvg({
      scene: photoScene,
      resources: {
        embeddedImages: {
          'preview-node-1': {
            previewId: 'preview-node-1',
            mimeType: 'image/jpeg',
            dataUri: 'data:image/jpeg;base64,/9j/AA==',
            byteLength: 4,
          },
        },
      },
    });

    expect(result.svg).toContain('data-preview-photo="preview-node-1"');
    expect(result.svg).toContain('href="data:image/jpeg;base64,/9j/AA=="');
    expect(result.svg).not.toContain('storage.example.com');

    expect(() => renderPosterSceneToSvg({
      scene: photoScene,
      resources: {
        embeddedImages: {
          'preview-node-1': {
            previewId: 'preview-node-1',
            mimeType: 'image/jpeg',
            dataUri: 'https://storage.example.com/private.jpg',
            byteLength: 4,
          },
        },
      },
    })).toThrow('resolver-owned embedded image data');
  });

  it.each([
    ['circle', '<circle class="poster-avatar"'],
    ['square', '<rect class="poster-avatar"'],
    ['rounded', '<rect class="poster-avatar"'],
  ] as const)('renders %s photo geometry from the canonical scene', (photoShape, expectedShape) => {
    const shapedScene = createTestPosterScene({
      model,
      language: 'ar',
      title: '\u0634\u062c\u0631\u0629 \u0627\u0644\u0639\u0627\u0626\u0644\u0629',
      photoShape,
    });
    const result = renderPosterSceneToSvg({ scene: shapedScene });

    expect(result.svg).toContain(`data-poster-photo-shape="${photoShape}"`);
    expect(result.svg).toContain(expectedShape);
    if (photoShape === 'square') {
      expect(result.svg).toContain('rx="0.00"');
    }
    if (photoShape === 'rounded') {
      expect(result.svg).toMatch(/poster-avatar"[^>]+rx="[1-9][\d.]*"/);
    }
  });

  it('renders localized safe relationship labels and can omit life years', () => {
    const customizedScene = {
      ...scene,
      content: {
        ...scene.content,
        showYears: false,
        showRelationship: true,
      },
    };
    const result = renderPosterSceneToSvg({ scene: customizedScene });

    expect(result.svg).not.toContain('class="poster-years"');
    expect(result.svg).toContain('data-card-field="relationship"');
    expect(result.svg).toContain('\u0627\u0644\u062c\u0630\u0631');
    expect(result.svg).toContain('\u0645\u062d\u0645\u064a \u0628\u0645\u0648\u062c\u0628 \u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629');
    expect(result.svg).not.toContain('relationshipHint');
  });

  it('labels selected branch output accurately and omits disabled relationship details', () => {
    const englishScene = createTestPosterScene({
      model,
      language: 'en',
      title: 'Selected Family Branch',
    });
    const selectedBranchScene = {
      ...englishScene,
      content: {
        ...englishScene.content,
        scope: 'selected-branch' as const,
        showRelationship: false,
      },
    };
    const englishResult = renderPosterSceneToSvg({ scene: selectedBranchScene });

    expect(englishResult.svg).toContain('aria-label="Selected family branch"');
    expect(englishResult.svg).toContain('Scope: selected branch');
    expect(englishResult.svg).not.toContain('data-card-field="relationship"');

    const arabicResult = renderPosterSceneToSvg({
      scene: {
        ...selectedBranchScene,
        content: {
          ...selectedBranchScene.content,
          language: 'ar',
        },
      },
    });
    expect(arabicResult.svg).toContain('\u0627\u0644\u0641\u0631\u0639 \u0627\u0644\u0639\u0627\u0626\u0644\u064a \u0627\u0644\u0645\u062d\u062f\u062f');
    expect(arabicResult.svg).toContain('\u0627\u0644\u0646\u0637\u0627\u0642: \u0627\u0644\u0641\u0631\u0639 \u0627\u0644\u0645\u062d\u062f\u062f');
  });

  it('fits the complete optional detail set inside Dense Genealogy cards', () => {
    const denseScene = createTestPosterScene({
      model,
      language: 'en',
      title: 'Dense Family Poster',
      stylePreset: 'dense-genealogy',
      pageSize: 'A3',
      orientation: 'landscape',
    });
    const detailedScene = {
      ...denseScene,
      content: {
        ...denseScene.content,
        showYears: true,
        showRelationship: true,
        showBirthPlace: true,
        showOccupation: true,
        showDescription: true,
      },
      nodes: denseScene.nodes.map((node, index) => index === 0 ? {
        ...node,
        displayName: 'A deliberately long family display name',
        birthPlaceLabel: 'Damascus',
        occupationLabel: 'Historian',
        descriptionLabel: 'Keeper of the family archive',
      } : node),
    };
    const result = renderPosterSceneToSvg({ scene: detailedScene });
    const rootMarkup = result.svg.match(/<g class="poster-node is-root"[\s\S]*?<\/g>/)?.[0] ?? '';
    const nameYs = [...rootMarkup.matchAll(/<tspan x="[\d.]+" y="([\d.]+)"/g)]
      .map((match) => Number(match[1]));
    const detailYs = [...rootMarkup.matchAll(/data-card-field="[^"]+" x="[\d.]+" y="([\d.]+)"/g)]
      .map((match) => Number(match[1]));
    const cardBottom = detailedScene.nodes[0].rect.y + detailedScene.nodes[0].rect.height;

    expect(nameYs).toHaveLength(1);

    expect(detailYs).toHaveLength(4);
    expect(Math.min(...detailYs) - Math.max(...nameYs)).toBeGreaterThanOrEqual(10);
    expect(Math.max(...detailYs)).toBeLessThan(cardBottom);
    expect(rootMarkup).toContain('Damascus \u00b7 Historian');
    expect(rootMarkup).toContain('data-card-field="description"');
    expect(rootMarkup).toContain('Keeper of the family archive');
    expect(rootMarkup).toContain('A deliberately');





  });


  it('escapes owner-authored XML content', () => {
    const unsafeScene = {
      ...scene,
      content: { ...scene.content, title: '<Family & Poster>' },
    };
    const result = renderPosterSceneToSvg({ scene: unsafeScene });

    expect(result.svg).toContain('&lt;Family &amp; Poster&gt;');
    expect(result.svg).not.toContain('<Family & Poster>');
  });
});
