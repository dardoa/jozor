import type {
  PosterScene,
  PosterSceneConnector,
  PosterSceneNode,
  PosterSceneTheme,
} from './posterSceneTypes';

export type StudioPosterTheme = PosterSceneTheme;

export interface StudioPosterPageSize {
  readonly width: number;
  readonly height: number;
}

export interface StudioPosterRenderRequest {
  readonly scene: PosterScene;
}

export interface StudioPosterRenderResult {
  readonly html: string;
  readonly scene: PosterScene;
  readonly metadata: {
    readonly dir: 'ltr' | 'rtl';
    readonly theme: StudioPosterTheme;
    readonly width: number;
    readonly height: number;
    readonly physicalWidthMm: number;
    readonly physicalHeightMm: number;
    readonly nodeCount: number;
    readonly edgeCount: number;
    readonly hasArabicText: boolean;
    readonly layoutEngine: PosterScene['layout']['engineId'];
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function hasArabicText(value: string): boolean {
  return /[\u0600-\u06ff]/.test(value);
}

function renderNode(node: PosterSceneNode, scene: PosterScene): string {
  const language = scene.content.language;
  const maskedLabel = language === 'ar' ? 'محجوب' : 'Masked';
  const name = escapeHtml(node.displayName);
  const avatarInitials = escapeHtml(node.initials);
  const lifeYears = node.birthYear && node.deathYear
    ? `${node.birthYear} - ${node.deathYear}`
    : String(node.birthYear ?? node.deathYear ?? '');

  return `
    <article
      class="poster-node${node.isMasked ? ' is-masked' : ''}"
      data-preview-node="${escapeHtml(node.previewId)}"
      data-generation="${node.generation}"
      style="left:${node.rect.x.toFixed(2)}px;top:${node.rect.y.toFixed(2)}px;width:${node.rect.width.toFixed(2)}px;height:${node.rect.height.toFixed(2)}px;"
    >
      <div class="poster-avatar" aria-hidden="true">${avatarInitials}</div>
      <div class="poster-node-name" style="font-size:${node.nameFontSize}px">${name}</div>
      ${lifeYears ? `<div class="poster-node-years">${escapeHtml(lifeYears)}</div>` : ''}
      ${node.isMasked ? `<div class="poster-node-status">${escapeHtml(maskedLabel)}</div>` : ''}
    </article>
  `;
}

function renderConnector(connector: PosterSceneConnector): string {
  const deltaX = connector.end.x - connector.start.x;
  const deltaY = connector.end.y - connector.start.y;
  const length = Math.hypot(deltaX, deltaY);
  const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

  return `
    <div
      class="poster-edge"
      data-preview-edge="${escapeHtml(`${connector.fromPreviewId}:${connector.toPreviewId}`)}"
      style="left:${connector.start.x.toFixed(2)}px;top:${connector.start.y.toFixed(2)}px;width:${length.toFixed(2)}px;transform:rotate(${angle.toFixed(3)}deg);"
      aria-hidden="true"
    ></div>
  `;
}

function buildThemeClass(theme: StudioPosterTheme): string {
  return theme === 'modern' ? 'theme-modern' : 'theme-classic';
}

export function renderStudioPosterHtml(request: StudioPosterRenderRequest): StudioPosterRenderResult {
  const { scene } = request;
  const { document, content, cardPreset } = scene;
  const { sceneSize, physicalSizeMm, margins } = document;
  const theme = cardPreset.theme;
  const dir = content.language === 'ar' ? 'rtl' : 'ltr';
  const escapedTitle = escapeHtml(content.title);
  const escapedSubtitle = content.subtitle ? escapeHtml(content.subtitle) : '';
  const titleLength = Array.from(content.title.trim()).length;
  const subtitleLength = Array.from(content.subtitle?.trim() ?? '').length;
  const titleFontSize = titleLength > 48 ? 40 : titleLength > 32 ? 46 : 54;
  const subtitleFontSize = subtitleLength > 80 ? 20 : 24;
  const hasArabic = hasArabicText(content.title)
    || hasArabicText(content.subtitle ?? '')
    || scene.nodes.some((node) => hasArabicText(node.displayName));
  const headerHeight = scene.layout.treeBounds.y - margins.top - 24;
  const footerBottom = margins.bottom;
  const footerLeft = margins.left;
  const footerWidth = sceneSize.width - margins.left - margins.right;
  const treeLabel = content.language === 'ar' ? 'شجرة البوستر' : 'Poster tree';
  const appLabel = content.language === 'ar' ? 'جذور' : 'Jozor';
  const peopleLabel = content.language === 'ar'
    ? `عدد الأشخاص: ${scene.nodes.length}`
    : `People: ${scene.nodes.length}`;
  const connectors = scene.connectors.map(renderConnector).join('');
  const nodes = scene.nodes.map((node) => renderNode(node, scene)).join('');

  const html = `<!doctype html>
<html lang="${content.language}" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapedTitle}</title>
  <style>
    @font-face {
      font-family: "JozorPosterArabic";
      src: url("/fonts/Amiri-Regular.ttf") format("truetype");
      font-weight: 400;
      font-style: normal;
      font-display: block;
    }
    @page { size: ${physicalSizeMm.width}mm ${physicalSizeMm.height}mm; margin: 0; }
    * { box-sizing: border-box; }
    html, body { width: ${sceneSize.width}px; height: ${sceneSize.height}px; }
    body {
      margin: 0;
      background: #e9e2d4;
      color: #1f2933;
      font-family: "JozorPosterArabic", "Noto Naskh Arabic", "Segoe UI", Tahoma, Arial, sans-serif;
      font-variant-ligatures: common-ligatures contextual;
    }
    .poster-page {
      position: relative;
      width: ${sceneSize.width}px;
      height: ${sceneSize.height}px;
      overflow: hidden;
    }
    .poster-page.theme-classic { background: #fbf7ef; color: #2f261b; }
    .poster-page.theme-modern { background: #101827; color: #f8fafc; }
    .poster-header {
      position: absolute;
      top: ${margins.top.toFixed(2)}px;
      left: ${margins.left.toFixed(2)}px;
      width: ${footerWidth.toFixed(2)}px;
      height: ${headerHeight.toFixed(2)}px;
      text-align: center;
      border-bottom: 2px solid currentColor;
      padding-bottom: 24px;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }
    .poster-title {
      margin: 0;
      font-size: ${titleFontSize}px;
      line-height: 1.25;
      font-weight: 800;
      letter-spacing: 0;
    }
    .poster-subtitle {
      margin: 14px 0 0;
      font-size: ${subtitleFontSize}px;
      line-height: 1.5;
      opacity: 0.74;
    }
    .poster-tree { position: absolute; inset: 0; }
    .poster-node {
      position: absolute;
      z-index: 2;
      border: 1px solid rgba(47, 38, 27, 0.2);
      border-radius: ${cardPreset.geometry.borderRadius}px;
      background: #fffdf8;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 14px;
      text-align: center;
      box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
      break-inside: avoid;
      page-break-inside: avoid;
    }
    .poster-edge {
      position: absolute;
      z-index: 1;
      height: 2px;
      border-top: 2px solid currentColor;
      opacity: 0.26;
      transform-origin: 0 50%;
    }
    .theme-modern .poster-node {
      border-color: rgba(148, 163, 184, 0.32);
      background: #111b2d;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.28);
    }
    .poster-avatar {
      width: 34px;
      height: 34px;
      border-radius: 999px;
      background: #8a5a2b;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8px;
      font-weight: 700;
    }
    .theme-modern .poster-avatar { background: #60a5fa; color: #0f172a; }
    .poster-node-name {
      width: 100%;
      max-width: 100%;
      line-height: 1.35;
      font-weight: 700;
      overflow-wrap: anywhere;
      word-break: normal;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 3;
      overflow: hidden;
      max-height: 4.05em;
      unicode-bidi: plaintext;
    }
    .poster-node-status { font-size: ${cardPreset.typography.statusSize}px; opacity: 0.62; }
    .poster-node-years {
      font-size: ${cardPreset.typography.yearsSize}px;
      line-height: 1.2;
      opacity: 0.68;
      direction: ltr;
    }
    .poster-footer {
      position: absolute;
      left: ${footerLeft.toFixed(2)}px;
      bottom: ${footerBottom.toFixed(2)}px;
      width: ${footerWidth.toFixed(2)}px;
      display: flex;
      justify-content: space-between;
      gap: 20px;
      font-size: 18px;
      opacity: 0.7;
      border-top: 1px solid currentColor;
      padding-top: 18px;
    }
  </style>
</head>
<body>
  <main
    class="poster-page ${buildThemeClass(theme)}"
    data-studio-poster-renderer="v2"
    data-poster-scene-version="${scene.version}"
    data-poster-layout-engine="${scene.layout.engineId}"
    data-poster-layout-direction="${scene.layout.direction}"
  >
    <header class="poster-header">
      <h1 class="poster-title">${escapedTitle}</h1>
      ${escapedSubtitle ? `<p class="poster-subtitle">${escapedSubtitle}</p>` : ''}
    </header>
    <section class="poster-tree" aria-label="${escapeHtml(treeLabel)}">
      ${connectors}${nodes}
    </section>
    <footer class="poster-footer">
      <span>${escapeHtml(appLabel)}</span>
      <span>${escapeHtml(peopleLabel)}</span>
    </footer>
  </main>
</body>
</html>`;

  return {
    html,
    scene,
    metadata: {
      dir,
      theme,
      width: sceneSize.width,
      height: sceneSize.height,
      physicalWidthMm: physicalSizeMm.width,
      physicalHeightMm: physicalSizeMm.height,
      nodeCount: scene.nodes.length,
      edgeCount: scene.connectors.length,
      hasArabicText: hasArabic,
      layoutEngine: scene.layout.engineId,
    },
  };
}
