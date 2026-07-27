import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const baseUrl = process.env.JOZOR_QA_BASE_URL ?? 'http://127.0.0.1:3000';
const pngDirectory = path.resolve('output/playwright/visual-studio-phase1a');
const pdfDirectory = path.resolve('output/pdf');
const pngPath = path.join(pngDirectory, 'classic-arabic-ancestor-poster-phase1a.png');
const pdfPath = path.join(pdfDirectory, 'classic-arabic-ancestor-poster-phase1a.pdf');
const previewPath = path.join(pngDirectory, 'classic-arabic-ancestor-poster-phase1a-preview.png');
const metadataPath = path.join(pngDirectory, 'classic-arabic-ancestor-poster-phase1a-metadata.json');

await mkdir(pngDirectory, { recursive: true });
await mkdir(pdfDirectory, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 940 }, deviceScaleFactor: 1 });

try {
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });

  const artifacts = await page.evaluate(async () => {
    const { createPosterDocumentSpec } = await import('/src/features/publishing/visualOutputs/posterDocumentSpecs.ts');
    const { createPosterScene } = await import('/src/features/publishing/visualOutputs/posterSceneBuilder.ts');
    const { renderStudioPosterHtml } = await import('/src/features/publishing/visualOutputs/studioPosterRenderer.ts');
    const { exportStudioPoster } = await import('/src/features/publishing/visualOutputs/studioPosterExportAdapter.ts');
    const { createStudioPosterBrowserPngRuntime } = await import('/src/features/publishing/visualOutputs/studioPosterBrowserPngRuntime.ts');
    const { createStudioPosterBrowserPdfRuntime } = await import('/src/features/publishing/visualOutputs/studioPosterBrowserPdfRuntime.ts');

    const names = [
      'سليم النور',
      'سامر سليم النور',
      'فاطمة عبد الله الحمصية',
      'كريم سامر النور',
      'مريم أحمد الدمشقية',
      'عبد الرحمن يوسف النور',
      'شخص مخفي',
      'نادر بن كريم بن سامر النور',
      'خديجة مصطفى الحلبي',
      'يوسف عبد القادر النور',
      'ليلى محمود الشامية',
      'مصطفى عبد الرحمن النور',
      'سعاد إبراهيم الحمصية',
      'صالح يوسف النور',
      'نجلاء حسن الدمشقية',
    ];
    const nodeCount = names.length;
    const nodes = names.map((displayName, index) => {
      const oneBasedIndex = index + 1;
      const generation = Math.floor(Math.log2(oneBasedIndex)) + 1;
      const isMasked = oneBasedIndex === 7;
      return {
        previewId: `preview-node-${oneBasedIndex}`,
        displayName,
        generation,
        relationshipHint: generation === 1 ? 'root' : 'ancestor',
        lifeStatus: isMasked ? 'living' : 'deceased',
        isMasked,
        hasPhoto: false,
        birthYear: isMasked ? undefined : 1895 - (index * 4),
        deathYear: isMasked ? undefined : 1983 - (index * 2),
      };
    });
    const edges = nodes.slice(1).map((node, index) => ({
      fromPreviewId: node.previewId,
      toPreviewId: `preview-node-${Math.floor((index + 2) / 2)}`,
      relationshipType: 'parent-child',
    }));
    const graph = {
      nodes,
      edges,
      warnings: [],
      metadata: {
        truncated: false,
        sanitizedNodeCount: nodeCount,
        policy: {
          privacyMode: 'masked',
          includePhotos: false,
          includeYears: true,
          maxNodes: nodeCount,
          language: 'ar',
        },
      },
    };
    const scene = createPosterScene({
      graph,
      document: createPosterDocumentSpec('A3', 'landscape'),
      content: {
        definitionId: 'classic-ancestor-poster',
        language: 'ar',
        title: 'شجرة أسلاف عائلة سليم النور',
        subtitle: 'أربعة أجيال من السجل العائلي - 1895 إلى 2025',
        scope: 'selected-root-ancestors',
        rootPreviewId: 'preview-node-1',
        generationCount: 4,
        privacyMode: 'masked',
      },
      direction: 'horizontal',
      theme: 'classic',
    });

    const pngResult = await exportStudioPoster(
      { scene, format: 'png', fileName: 'classic-arabic-ancestor-poster-phase1a' },
      createStudioPosterBrowserPngRuntime({ pixelRatio: 2, backgroundColor: '#fbf7ef' })
    );
    const pdfResult = await exportStudioPoster(
      { scene, format: 'pdf', fileName: 'classic-arabic-ancestor-poster-phase1a' },
      createStudioPosterBrowserPdfRuntime({ pixelRatio: 2, backgroundColor: '#fbf7ef' })
    );
    const toBase64 = async (blob) => {
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = '';
      const chunkSize = 0x8000;
      for (let index = 0; index < bytes.length; index += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
      }
      return btoa(binary);
    };
    const renderResult = renderStudioPosterHtml({ scene });
    return {
      pngBase64: await toBase64(pngResult.blob),
      pdfBase64: await toBase64(pdfResult.blob),
      previewHtml: renderResult.html,
      metadata: {
        pageSize: scene.document.pageSize,
        orientation: scene.document.orientation,
        physicalSizeMm: scene.document.physicalSizeMm,
        sceneSize: scene.document.sceneSize,
        direction: scene.layout.direction,
        nodeCount: scene.nodes.length,
        connectorCount: scene.connectors.length,
        maskedCount: scene.nodes.filter((node) => node.isMasked).length,
        pngBytes: pngResult.blob.size,
        pdfBytes: pdfResult.blob.size,
        geometry: scene.nodes.map((node) => ({ previewId: node.previewId, rect: node.rect })),
      },
    };
  });

  await writeFile(pngPath, Buffer.from(artifacts.pngBase64, 'base64'));
  await writeFile(pdfPath, Buffer.from(artifacts.pdfBase64, 'base64'));
  await writeFile(metadataPath, `${JSON.stringify(artifacts.metadata, null, 2)}\n`, 'utf8');

  const previewPage = await browser.newPage({
    viewport: {
      width: artifacts.metadata.sceneSize.width,
      height: artifacts.metadata.sceneSize.height,
    },
  });
  await previewPage.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await previewPage.evaluate((html) => {
    document.open();
    document.write(html);
    document.close();
  }, artifacts.previewHtml);
  await previewPage.evaluate(async () => {
    if (document.fonts) {
      await document.fonts.load('16px "JozorPosterArabic"');
      await document.fonts.ready;
    }
  });
  await previewPage.screenshot({ path: previewPath, fullPage: true });
  await previewPage.close();

  process.stdout.write(`${JSON.stringify({ pngPath, pdfPath, previewPath, metadataPath, ...artifacts.metadata }, null, 2)}\n`);
} finally {
  await browser.close();
}
