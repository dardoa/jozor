import { describe, expect, it } from 'vitest';

import { posterPreviewAdapter } from '../previewAdapterRegistry';
import { renderStudioPosterHtml } from '../studioPosterRenderer';
import { createTestPosterScene } from './studioPosterTestFixtures';

describe('studioPosterRenderer', () => {
  it('renders an Arabic poster as HTML text without canvas, svg, script, or raw English headings', () => {
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
            displayName: 'سليم النور',
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
            displayName: 'شخص مخفي',
            generation: 2,
            relationshipHint: 'parent',
            lifeStatus: 'living',
            isMasked: true,
            hasPhoto: false,
          },
        ],
        edges: [
          { fromPreviewId: 'preview-node-2', toPreviewId: 'preview-node-1', relationshipType: 'parent-child' },
        ],
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
      title: 'شجرة أسلاف سليم النور',
      subtitle: 'نسخة تجريبية من استوديو المخرجات البصرية',
      theme: 'classic',
    });
    const result = renderStudioPosterHtml({ scene });

    expect(result.metadata.dir).toBe('rtl');
    expect(result.metadata.hasArabicText).toBe(true);
    expect(result.html).toContain('<meta charset="utf-8"');
    expect(result.html).toContain('dir="rtl"');
    expect(result.html).toContain('شجرة أسلاف سليم النور');
    expect(result.html).toContain('سليم النور');
    expect(result.html).toContain('1895 - 1983');
    expect(result.html).toContain('شخص مخفي');
    expect(result.html).toContain('data-preview-edge="preview-node-2:preview-node-1"');
    expect(result.scene).toBe(scene);
    expect(result.metadata.layoutEngine).toBe('ancestor-tiered');
    expect(result.html).not.toContain('poster-generation');
    expect(result.html).not.toContain('Family tree');
    expect(result.html).not.toContain('<canvas');
    expect(result.html).not.toContain('<svg');
    expect(result.html).not.toContain('<script');
  });

  it('renders one CSS connector for every visible parent-child relationship', () => {
    const model = posterPreviewAdapter.createPreviewModel({
      definitionId: 'classic-ancestor-poster',
      mode: 'static-mock',
      privacyMode: 'masked',
      language: 'en',
      maxNodes: 15,
    });

    const scene = createTestPosterScene({
      model,
      language: 'en',
      title: 'Ancestor poster',
    });
    const result = renderStudioPosterHtml({ scene });

    expect(result.html.match(/data-preview-node=/g)).toHaveLength(7);
    expect(result.html.match(/data-preview-edge=/g)).toHaveLength(6);
    expect(result.html).not.toContain('<svg');
    expect(result.html).not.toContain('<canvas');
  });

  it('keeps a complete four-generation poster inside one dense layout', () => {
    const nodes = Array.from({ length: 15 }, (_, index) => ({
      previewId: `preview-node-${index + 1}`,
      displayName: `Person ${index + 1}`,
      generation: index === 0 ? 1 : index < 3 ? 2 : index < 7 ? 3 : 4,
      relationshipHint: index === 0 ? 'root' as const : 'ancestor' as const,
      lifeStatus: 'deceased' as const,
      isMasked: false,
      hasPhoto: index % 2 === 0,
      birthYear: 1900 - index,
      deathYear: 1970 - index,
    }));
    const edges = Array.from({ length: 7 }, (_, childIndex) => [
      {
        fromPreviewId: `preview-node-${(childIndex * 2) + 2}`,
        toPreviewId: `preview-node-${childIndex + 1}`,
        relationshipType: 'parent-child' as const,
      },
      {
        fromPreviewId: `preview-node-${(childIndex * 2) + 3}`,
        toPreviewId: `preview-node-${childIndex + 1}`,
        relationshipType: 'parent-child' as const,
      },
    ]).flat();
    const model = posterPreviewAdapter.createPreviewModel({
      definitionId: 'classic-ancestor-poster',
      mode: 'sanitized-data',
      privacyMode: 'masked',
      language: 'en',
      maxNodes: 15,
      sanitizedGraph: {
        nodes,
        edges,
        warnings: [],
        metadata: {
          sanitizedNodeCount: 15,
          truncated: false,
          policy: {
            privacyMode: 'masked',
            language: 'en',
            maxNodes: 15,
            includePhotos: true,
            includeYears: true,
          },
        },
      },
    });

    const scene = createTestPosterScene({
      model,
      language: 'en',
      title: 'Four generation ancestor tree',
      generationCount: 4,
    });
    const result = renderStudioPosterHtml({ scene });

    expect(result.metadata.nodeCount).toBe(15);
    expect(result.metadata.edgeCount).toBe(14);
    expect(result.html.match(/data-preview-node=/g)).toHaveLength(15);
    expect(result.html.match(/data-preview-edge=/g)).toHaveLength(14);
    expect(result.html).toContain('class="poster-avatar"');
    expect(result.html).toContain('>P1</div>');
    expect(result.html).not.toContain('has-photo');
  });

  it('renders a single known year without a dangling range separator', () => {
    const model = posterPreviewAdapter.createPreviewModel({
      definitionId: 'classic-ancestor-poster',
      mode: 'sanitized-data',
      privacyMode: 'public',
      language: 'en',
      sanitizedGraph: {
        nodes: [{
          previewId: 'preview-node-1',
          displayName: 'Root Person',
          generation: 1,
          relationshipHint: 'root',
          lifeStatus: 'living',
          isMasked: false,
          hasPhoto: false,
          birthYear: 1982,
        }],
        edges: [],
        warnings: [],
        metadata: {
          sanitizedNodeCount: 1,
          truncated: false,
          policy: {
            privacyMode: 'public',
            language: 'en',
            maxNodes: 1,
            includePhotos: false,
            includeYears: true,
          },
        },
      },
    });

    const result = renderStudioPosterHtml({
      scene: createTestPosterScene({ model, language: 'en', title: 'Poster' }),
    });

    expect(result.html).toContain('<div class="poster-node-years">1982</div>');
    expect(result.html).not.toContain('1982 -');
  });

  it('reduces heading sizes for long owner-authored poster copy', () => {
    const model = posterPreviewAdapter.createPreviewModel({
      definitionId: 'classic-ancestor-poster',
      mode: 'static-mock',
      privacyMode: 'masked',
      language: 'en',
      maxNodes: 7,
    });

    const scene = createTestPosterScene({
      model,
      language: 'en',
      title: 'A deliberately long family ancestor poster title for framing',
      subtitle: 'A deliberately long subtitle that provides archival context across several generations of the recorded family tree.',
    });
    const result = renderStudioPosterHtml({ scene });

    expect(result.html).toContain('font-size: 40px');
    expect(result.html).toContain('font-size: 20px');
  });

  it('escapes user-visible strings before injecting them into the poster HTML', () => {
    const model = posterPreviewAdapter.createPreviewModel({
      definitionId: 'classic-ancestor-poster',
      mode: 'sanitized-data',
      privacyMode: 'masked',
      language: 'en',
      sanitizedGraph: {
        nodes: [
          {
            previewId: 'preview-node-1',
            displayName: '<Root & Family>',
            generation: 1,
            relationshipHint: 'root',
            lifeStatus: 'unknown',
            isMasked: false,
            hasPhoto: false,
          },
        ],
        edges: [],
        warnings: [],
        metadata: {
          sanitizedNodeCount: 1,
          truncated: false,
          policy: {
            privacyMode: 'masked',
            language: 'en',
            maxNodes: 10,
            includePhotos: false,
            includeYears: true,
          },
        },
      },
    });

    const scene = createTestPosterScene({
      model,
      language: 'en',
      title: 'Family <Poster>',
    });
    const result = renderStudioPosterHtml({ scene });

    expect(result.html).toContain('Family &lt;Poster&gt;');
    expect(result.html).toContain('&lt;Root &amp; Family&gt;');
    expect(result.html).not.toContain('<Root & Family>');
  });

  it('returns the exact PosterScene instance consumed by the renderer', () => {
    const model = posterPreviewAdapter.createPreviewModel({
      definitionId: 'classic-ancestor-poster',
      mode: 'static-mock',
      privacyMode: 'masked',
      language: 'en',
      maxNodes: 7,
    });
    const scene = createTestPosterScene({ model, language: 'en', title: 'Poster' });

    expect(renderStudioPosterHtml({ scene }).scene).toBe(scene);
  });
});
