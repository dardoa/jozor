import type {
  PosterColorPalette,
  PosterScene,
  PosterSceneConnector,
  PosterSceneNode,
  PosterSceneTheme,
} from './posterSceneTypes';
import { computeCardContentLayout } from './posterCardContentLayout';

interface PosterPaletteTokens {
  readonly background: string;
  readonly foreground: string;
  readonly cardBackground: string;
  readonly cardStroke: string;
  readonly avatarFill: string;
  readonly accent: string;
  readonly connector: string;
  readonly secondaryText: string;
  readonly mutedText: string;
  readonly overviewCard: string;
  readonly branchRootCard: string;
}

const POSTER_PALETTES: Record<PosterColorPalette, PosterPaletteTokens> = {
  'heritage-warm': {
    background: '#f4ead8', foreground: '#26372f', cardBackground: '#fffaf0',
    cardStroke: '#b88a54', avatarFill: '#7c4f2d', accent: '#a86f35',
    connector: '#8d6d4e', secondaryText: '#76583e', mutedText: '#8a6849',
    overviewCard: '#fffaf0', branchRootCard: '#eadfca',
  },
  'gallery-dark': {
    background: '#151918', foreground: '#f7f5ef', cardBackground: '#202622',
    cardStroke: '#76968c', avatarFill: '#4f7f73', accent: '#d8a85f',
    connector: '#86a69d', secondaryText: '#d6ddd9', mutedText: '#b8c8c2',
    overviewCard: '#202622', branchRootCard: '#2a342f',
  },
  evergreen: {
    background: '#edf1ec', foreground: '#20372e', cardBackground: '#f8faf7',
    cardStroke: '#789184', avatarFill: '#315f4d', accent: '#527b64',
    connector: '#698879', secondaryText: '#50665b', mutedText: '#587268',
    overviewCard: '#ffffff', branchRootCard: '#dce8df',
  },
  'monochrome-print': {
    background: '#f7f7f5', foreground: '#171717', cardBackground: '#ffffff',
    cardStroke: '#777777', avatarFill: '#333333', accent: '#111111',
    connector: '#666666', secondaryText: '#4a4a4a', mutedText: '#555555',
    overviewCard: '#ffffff', branchRootCard: '#e8e8e8',
  },
};

function getReadableTextColor(background: string): '#171717' | '#ffffff' {
  const red = Number.parseInt(background.slice(1, 3), 16) / 255;
  const green = Number.parseInt(background.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(background.slice(5, 7), 16) / 255;
  const linear = [red, green, blue].map((channel) => (
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  ));
  const luminance = (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]);
  return luminance > 0.34 ? '#171717' : '#ffffff';
}
import type { PosterImageAsset } from './posterImageAssetResolver';

export interface StudioPosterSvgResources {
  /** A resolver-owned data URI. External font URLs are intentionally rejected. */
  readonly embeddedArabicFontDataUri?: string;
  readonly embeddedArabicFontFormat?: 'truetype' | 'woff2';
  readonly embeddedArabicFontFamily?: PosterScene['fontFamily'];
  readonly embeddedImages?: Readonly<Record<string, PosterImageAsset>>;
}

export interface StudioPosterSvgRenderRequest {
  readonly scene: PosterScene;
  readonly resources?: StudioPosterSvgResources;
  readonly viewport?: {
    readonly rect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
    readonly outputSize: { readonly width: number; readonly height: number };
    readonly physicalSizeMm: { readonly width: number; readonly height: number };
    readonly label?: string;
    readonly printSheet?: {
      readonly cropRect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
      readonly pageLabel: string;
    };
  };
}

export interface StudioPosterSvgRenderResult {
  readonly format: 'svg';
  readonly svg: string;
  readonly scene: PosterScene;
  readonly metadata: {
    readonly rendererId: 'poster-scene-svg';
    readonly dir: 'ltr' | 'rtl';
    readonly theme: PosterSceneTheme;
    readonly visualStyle: PosterScene['cardPreset']['visualStyle'];
    readonly width: number;
    readonly height: number;
    readonly physicalWidthMm: number;
    readonly physicalHeightMm: number;
    readonly nodeCount: number;
    readonly edgeCount: number;
    readonly hasArabicText: boolean;
    readonly hasEmbeddedFont: boolean;
    readonly layoutEngine: PosterScene['layout']['engineId'];
  };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatSvgNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function renderPrintSheetOverlay(
  sheetRect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
  cropRect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
  pageLabel: string
): string {
  const unit = Math.min(sheetRect.width, sheetRect.height);
  const mark = Math.max(8, unit * 0.018);
  const cross = mark * 0.42;
  const x1 = cropRect.x;
  const y1 = cropRect.y;
  const x2 = cropRect.x + cropRect.width;
  const y2 = cropRect.y + cropRect.height;
  const cx = cropRect.x + (cropRect.width / 2);
  const cy = cropRect.y + (cropRect.height / 2);
  const strokeWidth = Math.max(1, unit * 0.0015);
  return `<g class="poster-print-sheet-marks" aria-label="${escapeXml(pageLabel)}" fill="none" stroke="#111827" stroke-width="${strokeWidth.toFixed(2)}">
    <path d="M ${(x1 - mark).toFixed(2)} ${y1.toFixed(2)} H ${x1.toFixed(2)} M ${x1.toFixed(2)} ${(y1 - mark).toFixed(2)} V ${y1.toFixed(2)}" />
    <path d="M ${x2.toFixed(2)} ${y1.toFixed(2)} H ${(x2 + mark).toFixed(2)} M ${x2.toFixed(2)} ${(y1 - mark).toFixed(2)} V ${y1.toFixed(2)}" />
    <path d="M ${(x1 - mark).toFixed(2)} ${y2.toFixed(2)} H ${x1.toFixed(2)} M ${x1.toFixed(2)} ${y2.toFixed(2)} V ${(y2 + mark).toFixed(2)}" />
    <path d="M ${x2.toFixed(2)} ${y2.toFixed(2)} H ${(x2 + mark).toFixed(2)} M ${x2.toFixed(2)} ${y2.toFixed(2)} V ${(y2 + mark).toFixed(2)}" />
    <path d="M ${(cx - cross).toFixed(2)} ${y1.toFixed(2)} H ${(cx + cross).toFixed(2)} M ${cx.toFixed(2)} ${(y1 - cross).toFixed(2)} V ${(y1 + cross).toFixed(2)}" />
    <path d="M ${(cx - cross).toFixed(2)} ${y2.toFixed(2)} H ${(cx + cross).toFixed(2)} M ${cx.toFixed(2)} ${(y2 - cross).toFixed(2)} V ${(y2 + cross).toFixed(2)}" />
    <path d="M ${x1.toFixed(2)} ${(cy - cross).toFixed(2)} V ${(cy + cross).toFixed(2)} M ${(x1 - cross).toFixed(2)} ${cy.toFixed(2)} H ${(x1 + cross).toFixed(2)}" />
    <path d="M ${x2.toFixed(2)} ${(cy - cross).toFixed(2)} V ${(cy + cross).toFixed(2)} M ${(x2 - cross).toFixed(2)} ${cy.toFixed(2)} H ${(x2 + cross).toFixed(2)}" />
    <text x="${cx.toFixed(2)}" y="${(sheetRect.y + sheetRect.height - (mark * 0.35)).toFixed(2)}" fill="#111827" stroke="none" font-size="${(mark * 0.72).toFixed(2)}" text-anchor="middle">${escapeXml(pageLabel)}</text>
  </g>`;
}

function rectsIntersect(
  first: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
  second: { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
): boolean {
  return first.x <= second.x + second.width
    && first.x + first.width >= second.x
    && first.y <= second.y + second.height
    && first.y + first.height >= second.y;
}

function hasArabicText(value: string): boolean {
  return /[\u0600-\u06ff]/.test(value);
}

function assertSafeFontDataUri(value?: string): void {
  if (!value) return;
  if (!/^data:font\/(?:ttf|woff2?|sfnt);base64,[a-z0-9+/=]+$/i.test(value)) {
    throw new Error('Poster SVG embedded font must be a base64 font data URI');
  }
}

function splitTextLines(value: string, maxCharacters: number, maxLines: number): string[] {
  if (maxLines === 1) {
    const characters = Array.from(value.trim());
    if (characters.length <= maxCharacters) return [characters.join('')];
    return [`${characters.slice(0, Math.max(1, maxCharacters - 1)).join('').trimEnd()}\u2026`];
  }

  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];

  const lines: string[] = [];
  let current = '';
  let consumedWords = 0;

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (Array.from(candidate).length <= maxCharacters || !current) {
      current = candidate;
      consumedWords += 1;
      continue;
    }

    lines.push(current);
    current = word;
    consumedWords += 1;
    if (lines.length === maxLines - 1) break;
  }

  if (lines.length < maxLines && current) lines.push(current);
  if (consumedWords < words.length && lines.length > 0) {
    const lastIndex = lines.length - 1;
    lines[lastIndex] = `${lines[lastIndex].replace(/\u2026$/, '')}\u2026`;
  }

  return lines.slice(0, maxLines);
}

function renderTextLines(
  lines: readonly string[],
  x: number,
  startY: number,
  lineHeight: number
): string {
  return lines.map((line, index) => (
    `<tspan x="${x.toFixed(2)}" y="${(startY + (index * lineHeight)).toFixed(2)}">${escapeXml(line)}</tspan>`
  )).join('');
}

function renderConnector(connector: PosterSceneConnector, scene: PosterScene): string {
  const { start, end } = connector;
  const isPeerRelationship = connector.relationshipType === 'spouse' || connector.relationshipType === 'relative';
  const path = isPeerRelationship
    ? `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} L ${end.x.toFixed(2)} ${end.y.toFixed(2)}`
    : scene.connectorPathStyle === 'straight'
      ? `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} L ${end.x.toFixed(2)} ${end.y.toFixed(2)}`
      : scene.connectorPathStyle === 'orthogonal'
        ? scene.layout.direction === 'vertical'
          ? `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} L ${start.x.toFixed(2)} ${((start.y + end.y) / 2).toFixed(2)} L ${end.x.toFixed(2)} ${((start.y + end.y) / 2).toFixed(2)} L ${end.x.toFixed(2)} ${end.y.toFixed(2)}`
          : `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} L ${((start.x + end.x) / 2).toFixed(2)} ${start.y.toFixed(2)} L ${((start.x + end.x) / 2).toFixed(2)} ${end.y.toFixed(2)} L ${end.x.toFixed(2)} ${end.y.toFixed(2)}`
        : scene.layout.direction === 'vertical'
          ? `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} C ${start.x.toFixed(2)} ${((start.y + end.y) / 2).toFixed(2)}, ${end.x.toFixed(2)} ${((start.y + end.y) / 2).toFixed(2)}, ${end.x.toFixed(2)} ${end.y.toFixed(2)}`
          : `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} C ${((start.x + end.x) / 2).toFixed(2)} ${start.y.toFixed(2)}, ${((start.x + end.x) / 2).toFixed(2)} ${end.y.toFixed(2)}, ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;

  return `<path class="poster-connector relationship-${connector.relationshipType}" data-relationship-type="${connector.relationshipType}" data-preview-edge="${escapeXml(`${connector.fromPreviewId}:${connector.toPreviewId}`)}" data-start-x="${start.x.toFixed(2)}" data-start-y="${start.y.toFixed(2)}" data-end-x="${end.x.toFixed(2)}" data-end-y="${end.y.toFixed(2)}" d="${path}" />`;
}

function assertSafeEmbeddedImage(node: PosterSceneNode, image?: PosterImageAsset): void {
  if (!image) return;
  if (image.previewId !== node.previewId || !/^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(image.dataUri)) {
    throw new Error('Poster SVG image resources must be resolver-owned embedded image data');
  }
}

function getRelationshipLabel(node: PosterSceneNode, scene: PosterScene): string {
  const labels: Record<string, string> = scene.content.language === 'ar'
    ? {
        root: '\u0627\u0644\u062c\u0630\u0631',
        parent: '\u0645\u0646 \u0627\u0644\u0648\u0627\u0644\u062f\u064a\u0646',
        child: '\u0645\u0646 \u0627\u0644\u0623\u0628\u0646\u0627\u0621',
        spouse: '\u0632\u0648\u062c / \u0632\u0648\u062c\u0629',
        ancestor: '\u0645\u0646 \u0627\u0644\u0623\u0633\u0644\u0627\u0641',
        descendant: '\u0645\u0646 \u0627\u0644\u0623\u062d\u0641\u0627\u062f',
        relative: '\u0645\u0646 \u0627\u0644\u0623\u0642\u0627\u0631\u0628',
        unknown: '\u0635\u0644\u0629 \u063a\u064a\u0631 \u0645\u062d\u062f\u062f\u0629',
      }
    : {
        root: 'Root person',
        parent: 'Parent',
        child: 'Child',
        spouse: 'Spouse',
        ancestor: 'Ancestor',
        descendant: 'Descendant',
        relative: 'Relative',
        unknown: 'Relationship not specified',
      };
  const key = typeof node.relationshipHint === 'string'
    ? node.relationshipHint
    : String((node.relationshipHint as Record<string, unknown> | undefined)?.type ?? 'unknown');

  return labels[key] ?? labels.unknown;
}


function renderNode(
  node: PosterSceneNode,
  scene: PosterScene,
  resources?: StudioPosterSvgResources
): string {
  const { x, y, width, height } = node.rect;
  const centerX = x + (width / 2);
  const isRoot = node.isRoot;
  const isFocusRoot = isRoot && scene.layout.engineId === 'focus-family';
  const isOverview = scene.cardPreset.visualStyle === 'dense-overview';
  const isBranchIndex = scene.cardPreset.visualStyle === 'branch-index';
  const textDirection = scene.content.language === 'ar' ? 'rtl' : 'ltr';


  if (isOverview) {
    const lifeYearsOverview = scene.content.showYears === false ? '' : node.birthYear && node.deathYear
      ? `${node.birthYear} - ${node.deathYear}`
      : String(node.birthYear ?? node.deathYear ?? '');
    const overviewNameLines = splitTextLines(
      node.displayName,
      Math.max(7, Math.floor((width - 12) / Math.max(4, node.nameFontSize * 0.52))),
      2
    );
    const overviewNameY = y + (lifeYearsOverview ? 23 : 29);
    return `<g class="poster-node poster-overview-node${isRoot ? ' is-root' : ''}${node.isMasked ? ' is-masked' : ''}" data-preview-node="${escapeXml(node.previewId)}" data-generation="${node.generation}" data-scene-x="${x.toFixed(2)}" data-scene-y="${y.toFixed(2)}" data-scene-width="${width.toFixed(2)}" data-scene-height="${height.toFixed(2)}">
      <rect class="poster-card" x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${width.toFixed(2)}" height="${height.toFixed(2)}" rx="${scene.cardPreset.geometry.borderRadius}" />
      <text class="poster-name" direction="${textDirection}" unicode-bidi="plaintext" text-anchor="middle" font-size="${node.nameFontSize}">${renderTextLines(overviewNameLines, centerX, overviewNameY, node.nameFontSize * 1.12)}</text>
      ${lifeYearsOverview && !node.isMasked ? `<text class="poster-years" x="${centerX.toFixed(2)}" y="${(y + height - 7).toFixed(2)}">${escapeXml(lifeYearsOverview)}</text>` : ''}
    </g>`;
  }
  if (isBranchIndex) {
    const indexLines = splitTextLines(
      node.displayName,
      Math.max(12, Math.floor((width - 26) / Math.max(5, node.nameFontSize * 0.52))),
      3
    );
    const indexLineHeight = node.nameFontSize * 1.25;
    const indexNameY = y + (height / 2) - ((indexLines.length - 1) * indexLineHeight / 2) + 5;
    return `<g class="poster-node poster-branch-index-node${isRoot ? ' is-root' : ''}${node.isMasked ? ' is-masked' : ''}" aria-label="${escapeXml(node.displayName)}" data-preview-node="${escapeXml(node.previewId)}" data-generation="${node.generation}" data-scene-x="${x.toFixed(2)}" data-scene-y="${y.toFixed(2)}" data-scene-width="${width.toFixed(2)}" data-scene-height="${height.toFixed(2)}">
      <rect class="poster-card" x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${width.toFixed(2)}" height="${height.toFixed(2)}" rx="${scene.cardPreset.geometry.borderRadius}" />
      <line class="poster-card-accent" x1="${(x + 18).toFixed(2)}" y1="${(y + 14).toFixed(2)}" x2="${(x + width - 18).toFixed(2)}" y2="${(y + 14).toFixed(2)}" />
      <text class="poster-name" direction="${textDirection}" unicode-bidi="plaintext" text-anchor="middle" font-size="${node.nameFontSize}">${renderTextLines(indexLines, centerX, indexNameY, indexLineHeight)}</text>
    </g>`;
  }

  const sceneUnitsToPoints = (scene.document.physicalSizeMm.height / scene.document.sceneSize.height) * (72 / 25.4);
  const minReadableFontSize = Math.max(8.5, Math.ceil((8.0 / sceneUnitsToPoints) * 10) / 10);

  const layoutResult = computeCardContentLayout({
    node: {
      ...node,
      birthPlaceLabel: scene.content.showBirthPlace ? node.birthPlaceLabel : undefined,
      occupationLabel: scene.content.showOccupation ? node.occupationLabel : undefined,
      descriptionLabel: scene.content.showDescription ? node.descriptionLabel : undefined,
      birthYear: scene.content.showYears === false ? undefined : node.birthYear,
      deathYear: scene.content.showYears === false ? undefined : node.deathYear,
    },
    cardWidth: width,
    cardHeight: height,
    cardPreset: scene.cardPreset,
    language: scene.content.language === 'ar' ? 'ar' : 'en',
    relationshipLabel: (scene.layout.engineId === 'radial-generations' && !isRoot) ? '' : (scene.content.showRelationship ? getRelationshipLabel(node, scene) : undefined),
    minReadableFontSize,
    cardX: x,
    cardY: y,
  });


  const image = node.hasPhoto ? resources?.embeddedImages?.[node.previewId] : undefined;
  assertSafeEmbeddedImage(node, image);

  const hasAvatar = Boolean(layoutResult.avatarBounds);
  const avatarRadius = layoutResult.avatarRadius;
  const avatarCenterY = layoutResult.avatarCenterY;
  const clipId = `poster-avatar-${escapeXml(node.previewId)}`;
  const ringRadius = avatarRadius + scene.cardPreset.photo.borderWidth;
  const photoShape = scene.cardPreset.photo.shape;
  const avatarX = centerX - avatarRadius;
  const avatarY = avatarCenterY - avatarRadius;
  const avatarSize = avatarRadius * 2;
  const ringX = centerX - ringRadius;
  const ringY = avatarCenterY - ringRadius;
  const ringSize = ringRadius * 2;
  const avatarCornerRadius = photoShape === 'rounded' ? avatarRadius * 0.42 : 0;
  const ringCornerRadius = photoShape === 'rounded' ? ringRadius * 0.42 : 0;
  const clipShape = photoShape === 'circle'
    ? `<circle cx="${centerX.toFixed(2)}" cy="${avatarCenterY.toFixed(2)}" r="${avatarRadius.toFixed(2)}" />`
    : `<rect x="${avatarX.toFixed(2)}" y="${avatarY.toFixed(2)}" width="${avatarSize.toFixed(2)}" height="${avatarSize.toFixed(2)}" rx="${avatarCornerRadius.toFixed(2)}" />`;
  const ringShape = photoShape === 'circle'
    ? `<circle class="poster-avatar-ring" cx="${centerX.toFixed(2)}" cy="${avatarCenterY.toFixed(2)}" r="${ringRadius.toFixed(2)}" />`
    : `<rect class="poster-avatar-ring" x="${ringX.toFixed(2)}" y="${ringY.toFixed(2)}" width="${ringSize.toFixed(2)}" height="${ringSize.toFixed(2)}" rx="${ringCornerRadius.toFixed(2)}" />`;
  const avatarShape = photoShape === 'circle'
    ? `<circle class="poster-avatar" cx="${centerX.toFixed(2)}" cy="${avatarCenterY.toFixed(2)}" r="${avatarRadius.toFixed(2)}" />`
    : `<rect class="poster-avatar" x="${avatarX.toFixed(2)}" y="${avatarY.toFixed(2)}" width="${avatarSize.toFixed(2)}" height="${avatarSize.toFixed(2)}" rx="${avatarCornerRadius.toFixed(2)}" />`;

  const initialsFontSize = Math.min(11, Math.max(7, Math.floor(avatarRadius * 0.75)));
  const avatarVisual = !hasAvatar
    ? ''
    : image
    ? `<defs><clipPath id="${clipId}">${clipShape}</clipPath></defs>
    ${ringShape}
    ${avatarShape}
    <image class="poster-photo" data-preview-photo="${escapeXml(node.previewId)}" href="${image.dataUri}" x="${avatarX.toFixed(2)}" y="${avatarY.toFixed(2)}" width="${avatarSize.toFixed(2)}" height="${avatarSize.toFixed(2)}" preserveAspectRatio="xMidYMid slice" clip-path="url(#${clipId})" />`
    : `${ringShape}
    ${avatarShape}
    <text class="poster-initials" x="${centerX.toFixed(2)}" y="${avatarCenterY.toFixed(2)}" font-size="${initialsFontSize}" text-anchor="middle" dominant-baseline="central" alignment-baseline="middle">${escapeXml(node.initials)}</text>`;


  const details = layoutResult.detailRows.map((row) => (
    `<text class="${row.className}" data-card-field="${row.field}" x="${centerX.toFixed(2)}" y="${row.yBaseline.toFixed(2)}" text-anchor="middle">${escapeXml(row.label)}</text>`
  )).join('');


  const innerFrameInset = 6;
  const innerFrame = scene.cardFramePreset === 'ornate'
    ? `<rect class="poster-card-inner-frame" x="${(x + innerFrameInset).toFixed(2)}" y="${(y + innerFrameInset).toFixed(2)}" width="${Math.max(0, width - (innerFrameInset * 2)).toFixed(2)}" height="${Math.max(0, height - (innerFrameInset * 2)).toFixed(2)}" rx="${Math.max(0, scene.cardPreset.geometry.borderRadius - 2).toFixed(2)}" />`
    : '';

  const focusRootEmphasis = isFocusRoot
    ? `<rect class="poster-focus-root-emphasis" x="${(x - 7).toFixed(2)}" y="${(y - 7).toFixed(2)}" width="${(width + 14).toFixed(2)}" height="${(height + 14).toFixed(2)}" rx="${scene.cardPreset.geometry.borderRadius + 5}" />`
    : '';

  return `<g class="poster-node${isRoot ? ' is-root' : ''}${isFocusRoot ? ' is-focus-root' : ''}${node.isMasked ? ' is-masked' : ''}" data-preview-node="${escapeXml(node.previewId)}" data-generation="${node.generation}" data-scene-x="${x.toFixed(2)}" data-scene-y="${y.toFixed(2)}" data-scene-width="${width.toFixed(2)}" data-scene-height="${height.toFixed(2)}">
    ${focusRootEmphasis}
    <rect class="poster-card-shadow" x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${width.toFixed(2)}" height="${height.toFixed(2)}" rx="${scene.cardPreset.geometry.borderRadius}" />
    <rect class="poster-card" x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${width.toFixed(2)}" height="${height.toFixed(2)}" rx="${scene.cardPreset.geometry.borderRadius}" />
    ${innerFrame}
    <line class="poster-card-accent" x1="${(x + 16).toFixed(2)}" y1="${(y + 12).toFixed(2)}" x2="${(x + width - 16).toFixed(2)}" y2="${(y + 12).toFixed(2)}" />
    ${avatarVisual}
    <text class="poster-name" direction="${layoutResult.textDirection}" unicode-bidi="plaintext" text-anchor="middle" font-size="${layoutResult.nameFontSize}">${renderTextLines(layoutResult.nameLines, centerX, layoutResult.nameStartY, layoutResult.nameLineHeight)}</text>
    ${details}
  </g>`;

}

function createEmbeddedFontCss(resources?: StudioPosterSvgResources): string {
  const dataUri = resources?.embeddedArabicFontDataUri;
  assertSafeFontDataUri(dataUri);
  if (!dataUri) return '';

  const format = resources?.embeddedArabicFontFormat ?? 'truetype';
  return `@font-face{font-family:"JozorPosterArabic";src:url("${dataUri}") format("${format}");font-weight:400;font-style:normal;}`;
}

function renderClassicHeritageFrame(scene: PosterScene): string {
  const { width, height } = scene.document.sceneSize;
  const inset = Math.max(22, Math.round(Math.min(width, height) * 0.02));
  const innerInset = inset + 13;
  const corner = Math.max(42, Math.round(Math.min(width, height) * 0.04));
  return `<g class="poster-frame" aria-hidden="true">
    <rect class="poster-frame-outer" x="${inset}" y="${inset}" width="${width - (inset * 2)}" height="${height - (inset * 2)}" />
    <rect class="poster-frame-inner" x="${innerInset}" y="${innerInset}" width="${width - (innerInset * 2)}" height="${height - (innerInset * 2)}" />
    <path class="poster-corner" d="M ${innerInset} ${innerInset + corner} L ${innerInset} ${innerInset} L ${innerInset + corner} ${innerInset}" />
    <path class="poster-corner" d="M ${width - innerInset - corner} ${innerInset} L ${width - innerInset} ${innerInset} L ${width - innerInset} ${innerInset + corner}" />
    <path class="poster-corner" d="M ${innerInset} ${height - innerInset - corner} L ${innerInset} ${height - innerInset} L ${innerInset + corner} ${height - innerInset}" />
    <path class="poster-corner" d="M ${width - innerInset - corner} ${height - innerInset} L ${width - innerInset} ${height - innerInset} L ${width - innerInset} ${height - innerInset - corner}" />
  </g>`;
}

function renderModernGalleryFrame(scene: PosterScene): string {
  const { width, height } = scene.document.sceneSize;
  const inset = Math.max(26, Math.round(Math.min(width, height) * 0.024));
  const accentLength = Math.max(120, width * 0.16);
  return `<g class="poster-frame poster-frame-modern" aria-hidden="true">
    <rect class="poster-frame-outer" x="${inset}" y="${inset}" width="${width - (inset * 2)}" height="${height - (inset * 2)}" />
    <line class="poster-gallery-accent" x1="${inset}" y1="${inset}" x2="${(inset + accentLength).toFixed(2)}" y2="${inset}" />
    <line class="poster-gallery-accent" x1="${(width - inset - accentLength).toFixed(2)}" y1="${height - inset}" x2="${width - inset}" y2="${height - inset}" />
  </g>`;
}

function renderDenseGenealogyFrame(scene: PosterScene): string {
  const { width, height } = scene.document.sceneSize;
  const inset = Math.max(18, Math.round(Math.min(width, height) * 0.016));
  return `<g class="poster-frame poster-frame-dense" aria-hidden="true">
    <rect class="poster-frame-outer" x="${inset}" y="${inset}" width="${width - (inset * 2)}" height="${height - (inset * 2)}" />
  </g>`;
}

function renderPosterOrnament(scene: PosterScene): string {
  const { width, height } = scene.document.sceneSize;
  const inset = Math.max(44, Math.min(width, height) * 0.045);
  if (scene.ornament === 'lineage-medallion') {
    const centerX = width / 2;
    const topY = Math.max(38, scene.document.margins.top * 0.56);
    return `<g class="poster-ornament poster-ornament-lineage" aria-hidden="true">
      <circle cx="${centerX.toFixed(2)}" cy="${topY.toFixed(2)}" r="18" />
      <path d="M ${centerX.toFixed(2)} ${(topY - 27).toFixed(2)} L ${(centerX + 27).toFixed(2)} ${topY.toFixed(2)} L ${centerX.toFixed(2)} ${(topY + 27).toFixed(2)} L ${(centerX - 27).toFixed(2)} ${topY.toFixed(2)} Z" />
      <circle cx="${centerX.toFixed(2)}" cy="${topY.toFixed(2)}" r="5" class="poster-ornament-fill" />
    </g>`;
  }
  if (scene.ornament === 'gallery-marks') {
    return `<g class="poster-ornament poster-ornament-gallery" aria-hidden="true">
      <path d="M ${inset.toFixed(2)} ${(inset + 44).toFixed(2)} V ${inset.toFixed(2)} H ${(inset + 118).toFixed(2)}" />
      <path d="M ${(width - inset - 118).toFixed(2)} ${(height - inset).toFixed(2)} H ${(width - inset).toFixed(2)} V ${(height - inset - 44).toFixed(2)}" />
      <circle cx="${(inset + 18).toFixed(2)}" cy="${(inset + 18).toFixed(2)}" r="5" class="poster-ornament-fill" />
      <circle cx="${(width - inset - 18).toFixed(2)}" cy="${(height - inset - 18).toFixed(2)}" r="5" class="poster-ornament-fill" />
    </g>`;
  }
  if (scene.ornament === 'corner-branches') {
    const lowerY = height - inset;
    return `<g class="poster-ornament poster-ornament-branches" aria-hidden="true">
      <path d="M ${inset.toFixed(2)} ${lowerY.toFixed(2)} C ${(inset + 34).toFixed(2)} ${(lowerY - 24).toFixed(2)}, ${(inset + 58).toFixed(2)} ${(lowerY - 64).toFixed(2)}, ${(inset + 92).toFixed(2)} ${(lowerY - 92).toFixed(2)}" />
      <ellipse cx="${(inset + 34).toFixed(2)}" cy="${(lowerY - 27).toFixed(2)}" rx="8" ry="15" transform="rotate(-48 ${(inset + 34).toFixed(2)} ${(lowerY - 27).toFixed(2)})" />
      <ellipse cx="${(inset + 61).toFixed(2)}" cy="${(lowerY - 61).toFixed(2)}" rx="8" ry="15" transform="rotate(-38 ${(inset + 61).toFixed(2)} ${(lowerY - 61).toFixed(2)})" />
      <path d="M ${(width - inset).toFixed(2)} ${inset.toFixed(2)} C ${(width - inset - 34).toFixed(2)} ${(inset + 24).toFixed(2)}, ${(width - inset - 58).toFixed(2)} ${(inset + 64).toFixed(2)}, ${(width - inset - 92).toFixed(2)} ${(inset + 92).toFixed(2)}" />
      <ellipse cx="${(width - inset - 34).toFixed(2)}" cy="${(inset + 27).toFixed(2)}" rx="8" ry="15" transform="rotate(132 ${(width - inset - 34).toFixed(2)} ${(inset + 27).toFixed(2)})" />
      <ellipse cx="${(width - inset - 61).toFixed(2)}" cy="${(inset + 61).toFixed(2)}" rx="8" ry="15" transform="rotate(142 ${(width - inset - 61).toFixed(2)} ${(inset + 61).toFixed(2)})" />
    </g>`;
  }
  return '';
}

export function renderPosterSceneToSvg(
  request: StudioPosterSvgRenderRequest
): StudioPosterSvgRenderResult {
  const { scene, resources, viewport } = request;
  const { document, content, cardPreset } = scene;
  const { sceneSize, physicalSizeMm, margins } = document;
  const renderRect = viewport?.rect ?? { x: 0, y: 0, width: sceneSize.width, height: sceneSize.height };
  const outputSize = viewport?.outputSize ?? sceneSize;
  const outputPhysicalSizeMm = viewport?.physicalSizeMm ?? physicalSizeMm;
  const dir = content.language === 'ar' ? 'rtl' : 'ltr';
  const theme = cardPreset.theme;
  const visualStyle = cardPreset.visualStyle;
  const isDense = visualStyle === 'dense-genealogy'
    || visualStyle === 'dense-overview'
    || visualStyle === 'branch-index';
  const hasEmbeddedFont = Boolean(resources?.embeddedArabicFontDataUri);
  if (resources?.embeddedArabicFontFamily && resources.embeddedArabicFontFamily !== scene.fontFamily) {
    throw new Error('Poster SVG font resource does not match the canonical scene font family');
  }
  const fontCss = createEmbeddedFontCss(resources);
  const titleLength = Array.from(content.title.trim()).length;
  const subtitleLength = Array.from(content.subtitle?.trim() ?? '').length;
  const typographyScale = scene.typographyPreset === 'prominent'
    ? 1.12
    : scene.typographyPreset === 'compact'
      ? 0.9
      : 1;
  const titleSize = Math.round((titleLength > 48 ? 40 : titleLength > 32 ? 46 : 54) * typographyScale);
  const subtitleSize = Math.round((subtitleLength > 80 ? 18 : 22) * typographyScale);
  const headerCenterX = sceneSize.width / 2;
  const headerTitleY = margins.top + 56;
  const headerRuleY = scene.layout.treeBounds.y - 25;
  const footerRuleY = sceneSize.height - margins.bottom - 42;
  const basePalette = POSTER_PALETTES[scene.colorPalette];
  const background = scene.colorOverrides?.background ?? basePalette.background;
  const foreground = scene.colorOverrides?.background
    ? getReadableTextColor(background)
    : basePalette.foreground;
  const cardBackground = scene.colorOverrides?.cardBackground ?? basePalette.cardBackground;
  const cardForeground = scene.colorOverrides?.cardBackground
    ? getReadableTextColor(cardBackground)
    : basePalette.foreground;
  const bronze = scene.colorOverrides?.accent ?? basePalette.accent;
  const cardStroke = scene.colorOverrides?.accent ?? basePalette.cardStroke;
  const avatarFill = scene.colorOverrides?.accent ?? basePalette.avatarFill;
  const avatarText = getReadableTextColor(avatarFill);
  const connectorColor = scene.colorOverrides?.connector ?? basePalette.connector;
  const secondaryText = scene.colorOverrides?.cardBackground
    ? cardForeground
    : basePalette.secondaryText;
  const mutedText = scene.colorOverrides?.cardBackground
    ? cardForeground
    : basePalette.mutedText;
  const overviewCard = scene.colorOverrides?.cardBackground
    ?? basePalette.overviewCard;
  const branchRootCard = scene.colorOverrides?.cardBackground
    ?? basePalette.branchRootCard;
  const connectorAppearance = scene.layout.connectorStyle === 'subtle'
    ? { width: 1.6, opacity: 0.42, spouseWidth: 2.4, spouseOpacity: 0.7 }
    : scene.layout.connectorStyle === 'bold'
      ? { width: 4.2, opacity: 0.88, spouseWidth: 5.2, spouseOpacity: 1 }
      : { width: 2.5, opacity: 0.66, spouseWidth: 3.5, spouseOpacity: 0.9 };
  const cardEffectAppearance = scene.cardEffectPreset === 'elevated'
    ? { dy: 12, blur: 14, floodOpacity: 0.2, opacity: 0.24 }
    : scene.cardEffectPreset === 'soft'
      ? { dy: 7, blur: 8, floodOpacity: 0.14, opacity: 0.13 }
      : { dy: 0, blur: 0, floodOpacity: 0, opacity: 0 };
  const cardFrameAppearance = scene.cardFramePreset === 'ornate'
    ? { width: 2.4, accentOpacity: 1, accentWidth: 2.2, innerOpacity: 0.55 }
    : scene.cardFramePreset === 'classic'
      ? { width: 1.5, accentOpacity: 0.72, accentWidth: 1.5, innerOpacity: 0 }
      : { width: 0.8, accentOpacity: 0, accentWidth: 0, innerOpacity: 0 };
  const pageFrameOuterWidth = scene.pageFramePreset === 'heritage'
    ? 12
    : scene.pageFramePreset === 'gallery'
      ? 3
      : scene.pageFramePreset === 'minimal'
        ? 2
        : 0;
  const visibleNodes = viewport
    ? scene.nodes.filter((node) => rectsIntersect(node.rect, renderRect))
    : scene.nodes;
  const visibleConnectors = viewport
    ? scene.connectors.filter((connector) => rectsIntersect({
        x: Math.min(connector.start.x, connector.end.x),
        y: Math.min(connector.start.y, connector.end.y),
        width: Math.abs(connector.end.x - connector.start.x),
        height: Math.abs(connector.end.y - connector.start.y),
      }, renderRect))
    : scene.connectors;
  const connectors = visibleConnectors.map((connector) => renderConnector(connector, scene)).join('');
  const nodes = visibleNodes.map((node) => renderNode(node, scene, resources)).join('');
  const hasArabic = hasArabicText(content.title)
    || hasArabicText(content.subtitle ?? '')
    || scene.nodes.some((node) => hasArabicText(node.displayName));
  const isDescendantScope = content.scope === 'selected-root-descendants';
  const isFullTreeScope = content.scope === 'full-tree';
  const treeLabel = content.language === 'ar'
    ? (isFullTreeScope ? '\u0627\u0644\u0634\u062c\u0631\u0629 \u0627\u0644\u0639\u0627\u0626\u0644\u064a\u0629 \u0627\u0644\u0643\u0627\u0645\u0644\u0629' : isDescendantScope ? '\u0634\u062c\u0631\u0629 \u0627\u0644\u0623\u062d\u0641\u0627\u062f' : '\u0634\u062c\u0631\u0629 \u0627\u0644\u0623\u0633\u0644\u0627\u0641')
    : (isFullTreeScope ? 'Full family tree' : isDescendantScope ? 'Descendant tree' : 'Ancestor tree');
  const scopeLabel = content.language === 'ar'
    ? (isFullTreeScope ? '\u0627\u0644\u0646\u0637\u0627\u0642: \u0643\u0644 \u0627\u0644\u0639\u0644\u0627\u0642\u0627\u062a' : isDescendantScope ? '\u0627\u0644\u0646\u0637\u0627\u0642: \u0627\u0644\u0623\u062d\u0641\u0627\u062f' : '\u0627\u0644\u0646\u0637\u0627\u0642: \u0627\u0644\u0623\u0633\u0644\u0627\u0641 \u0627\u0644\u0645\u0628\u0627\u0634\u0631\u0648\u0646')
    : (isFullTreeScope ? 'Scope: all relationships' : isDescendantScope ? 'Scope: descendants' : 'Scope: direct ancestors');
  const appLabel = content.language === 'ar' ? '\u0623\u064f\u0646\u0634\u0626\u062a \u0647\u0630\u0647 \u0627\u0644\u0644\u0648\u062d\u0629 \u0641\u064a \u062c\u0630\u0648\u0631' : 'Created in Jozor';
  const showAttribution = content.showJozorAttribution !== false;
  const footerText = content.footerText?.trim();
  const footerMetaY = footerRuleY + (footerText ? 40 : 28);
  const scopeX = showAttribution ? sceneSize.width * 0.75 : sceneSize.width * 0.5;
  const frame = scene.pageFramePreset === 'heritage'
    ? renderClassicHeritageFrame(scene)
    : scene.pageFramePreset === 'gallery'
      ? renderModernGalleryFrame(scene)
      : scene.pageFramePreset === 'minimal'
        ? renderDenseGenealogyFrame(scene)
        : '';
  const ornament = renderPosterOrnament(scene);
  const headerForeground = getReadableTextColor(bronze);
  const safeHeaderWidth = sceneSize.width - margins.left - margins.right;
  const registrySummary = content.language === 'ar'
    ? `${scene.nodes.length} \u0634\u062e\u0635\u064b\u0627 \u00b7 ${content.generationCount} \u0623\u062c\u064a\u0627\u0644`
    : `${scene.nodes.length} people \u00b7 ${content.generationCount} generations`;
  const header = scene.headerPreset === 'gallery-rail'
    ? (() => {
        const railHeight = Math.max(74, Math.min(112, scene.layout.treeBounds.y - margins.top - 24));
        const railY = margins.top;
        const railBoxY = railY - 2;
        return `<g class="poster-header poster-header-gallery-rail" data-header-composition="gallery-rail">
      <rect class="poster-header-rail" x="${margins.left.toFixed(2)}" y="${railBoxY.toFixed(2)}" width="${safeHeaderWidth.toFixed(2)}" height="${(railHeight + 2).toFixed(2)}" rx="4" />
      <text class="poster-header-title" x="${headerCenterX.toFixed(2)}" y="${(railY + 45).toFixed(2)}" text-anchor="middle" font-size="${Math.min(titleSize, 44)}" font-weight="800" direction="${dir}">${escapeXml(content.title)}</text>
      ${content.subtitle ? `<text class="poster-header-subtitle" x="${headerCenterX.toFixed(2)}" y="${(railY + railHeight - 20).toFixed(2)}" text-anchor="middle" font-size="${Math.min(subtitleSize, 18)}" direction="${dir}">${escapeXml(content.subtitle)}</text>` : ''}
    </g>`;
      })()
    : scene.headerPreset === 'registry'
      ? (() => {
          const titleX = content.language === 'ar' ? sceneSize.width - margins.right : margins.left;
          const metaX = content.language === 'ar' ? margins.left : sceneSize.width - margins.right;
          // `start` and `end` follow the active text direction. For RTL, start is
          // the physical right edge and end is the physical left edge.
          const titleAnchor = 'start';
          const metaAnchor = 'end';
          return `<g class="poster-header poster-header-registry" data-header-composition="registry">
      <text class="poster-header-title" x="${titleX.toFixed(2)}" y="${(margins.top + 40).toFixed(2)}" text-anchor="${titleAnchor}" font-size="${Math.min(titleSize, 36)}" font-weight="800" direction="${dir}">${escapeXml(content.title)}</text>
      <text class="poster-header-meta" x="${metaX.toFixed(2)}" y="${(margins.top + 38).toFixed(2)}" text-anchor="${metaAnchor}" font-size="16" direction="${dir}">${escapeXml(registrySummary)}</text>
      ${content.subtitle ? `<text class="poster-header-subtitle" x="${titleX.toFixed(2)}" y="${(margins.top + 90).toFixed(2)}" text-anchor="${titleAnchor}" font-size="${Math.min(subtitleSize, 17)}" direction="${dir}">${escapeXml(content.subtitle)}</text>` : ''}
      <line class="poster-header-rule" x1="${margins.left.toFixed(2)}" y1="${headerRuleY.toFixed(2)}" x2="${(sceneSize.width - margins.right).toFixed(2)}" y2="${headerRuleY.toFixed(2)}" />
    </g>`;
        })()
      : `<g class="poster-header poster-header-ceremonial" data-header-composition="ceremonial">
      <text class="poster-header-title" x="${headerCenterX.toFixed(2)}" y="${headerTitleY.toFixed(2)}" text-anchor="middle" font-size="${titleSize}" font-weight="800" direction="${dir}">${escapeXml(content.title)}</text>
      ${content.subtitle ? `<text class="poster-header-subtitle poster-subtitle" x="${headerCenterX.toFixed(2)}" y="${(headerTitleY + titleSize + 18).toFixed(2)}" text-anchor="middle" font-size="${subtitleSize}" direction="${dir}">${escapeXml(content.subtitle)}</text>` : ''}
      <line class="poster-header-rule" x1="${(headerCenterX - (sceneSize.width * 0.09)).toFixed(2)}" y1="${headerRuleY.toFixed(2)}" x2="${(headerCenterX + (sceneSize.width * 0.09)).toFixed(2)}" y2="${headerRuleY.toFixed(2)}" />
    </g>`;

  const accessibleTitle = viewport?.label ? `${content.title} - ${viewport.label}` : content.title;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${escapeXml(accessibleTitle)}" data-poster-renderer="svg-v1" data-poster-scene-version="${scene.version}" data-poster-layout-engine="${scene.layout.engineId}" data-poster-layout-direction="${scene.layout.direction}" data-poster-connector-style="${scene.layout.connectorStyle}" data-poster-connector-path="${scene.connectorPathStyle}" data-poster-spacing="${scene.layout.spacingPreset}" data-poster-color-palette="${scene.colorPalette}" data-poster-custom-colors="${scene.colorOverrides ? 'true' : 'false'}" data-poster-decoration="${scene.decoration}" data-poster-ornament="${scene.ornament}" data-poster-header="${scene.headerPreset}" data-poster-typography="${scene.typographyPreset}" data-poster-font-family="${scene.fontFamily}" data-poster-card-scale="${scene.cardScalePreset}" data-poster-card-effect="${scene.cardEffectPreset}" data-poster-card-frame="${scene.cardFramePreset}" data-poster-card-corner="${scene.cardCornerPreset}" data-poster-card-layout="${scene.cardLayoutPreset}" data-poster-page-frame="${scene.pageFramePreset}" data-poster-margin-preset="${scene.document.marginPreset}" data-poster-theme="${visualStyle}" data-poster-photo-shape="${scene.cardPreset.photo.shape}" data-physical-width-mm="${outputPhysicalSizeMm.width}" data-physical-height-mm="${outputPhysicalSizeMm.height}" width="${outputSize.width}" height="${outputSize.height}" viewBox="${formatSvgNumber(renderRect.x)} ${formatSvgNumber(renderRect.y)} ${formatSvgNumber(renderRect.width)} ${formatSvgNumber(renderRect.height)}" preserveAspectRatio="xMidYMid meet">
  <title>${escapeXml(content.title)}</title>
  ${content.subtitle ? `<desc>${escapeXml(content.subtitle)}</desc>` : ''}
  <defs>
    <filter id="poster-card-shadow" x="-25%" y="-30%" width="150%" height="170%"><feDropShadow dx="0" dy="${cardEffectAppearance.dy}" stdDeviation="${cardEffectAppearance.blur}" flood-color="#4b2f1c" flood-opacity="${cardEffectAppearance.floodOpacity}" /></filter>
    <pattern id="poster-paper-grain" width="32" height="32" patternUnits="userSpaceOnUse"><circle cx="4" cy="7" r=".8" fill="${bronze}" opacity=".055" /><circle cx="23" cy="19" r=".65" fill="${foreground}" opacity=".04" /></pattern>
    <pattern id="poster-lineage-grid" width="96" height="96" patternUnits="userSpaceOnUse"><path d="M 0 48 H 96 M 48 0 V 96" fill="none" stroke="${bronze}" stroke-width="1" opacity=".08" /><circle cx="48" cy="48" r="2.4" fill="${bronze}" opacity=".12" /></pattern>
  </defs>
  <style>${fontCss}
    .poster-root{font-family:"JozorPosterArabic","Amiri","Noto Naskh Arabic","Segoe UI",Tahoma,Arial,sans-serif;fill:${foreground};color:${foreground};font-variant-ligatures:common-ligatures contextual;}
    .poster-frame-outer{fill:none;stroke:${foreground};stroke-width:${pageFrameOuterWidth};opacity:.92;}
    .poster-frame-inner{fill:none;stroke:${bronze};stroke-width:2;opacity:.78;}
    .poster-corner{fill:none;stroke:${bronze};stroke-width:5;stroke-linecap:square;}
    .poster-gallery-accent{stroke:${bronze};stroke-width:8;stroke-linecap:square;}
    .poster-ornament{fill:none;stroke:${bronze};stroke-width:2.2;opacity:.7;}
    .poster-ornament-fill{fill:${bronze};stroke:none;}
    .poster-ornament-lineage{stroke-width:2;opacity:.62;}
    .poster-ornament-gallery{stroke-width:5;opacity:.78;}
    .poster-ornament-branches{stroke-width:2.4;opacity:.56;stroke-linecap:round;}
    .poster-ornament-branches ellipse{fill:${bronze};stroke:none;opacity:.72;}
    .poster-card-shadow{fill:#4b2f1c;opacity:${cardEffectAppearance.opacity};filter:url(#poster-card-shadow);}
    .poster-card{fill:${cardBackground};stroke:${cardStroke};stroke-width:${cardFrameAppearance.width};}
    .poster-card-inner-frame{fill:none;stroke:${bronze};stroke-width:1;opacity:${cardFrameAppearance.innerOpacity};}
    .poster-node{color:${cardForeground};}
    .poster-card-accent{stroke:${bronze};stroke-width:${cardFrameAppearance.accentWidth};opacity:${isDense ? Math.min(0.35, cardFrameAppearance.accentOpacity) : cardFrameAppearance.accentOpacity};}
    .poster-node.is-root .poster-card{stroke:${bronze};stroke-width:3;}
    .poster-node.is-root .poster-card-accent{stroke-width:2.5;opacity:1;}
    .poster-focus-root-emphasis{fill:none;stroke:${bronze};stroke-width:2;opacity:.42;}
    .poster-node.is-focus-root .poster-card{fill:${branchRootCard};stroke-width:4;}
    .poster-node.is-focus-root .poster-card-shadow{opacity:${Math.min(0.3, cardEffectAppearance.opacity + 0.1)};}
    .poster-node.is-focus-root .poster-name{font-weight:800;}
    .poster-node.is-masked{opacity:.82;}
    .poster-overview-node .poster-card{fill:${overviewCard};stroke-width:1;}
    .poster-overview-node.is-root .poster-card{stroke-width:2.5;}
    .poster-branch-index-node .poster-card{fill:#ffffff;stroke:${cardStroke};stroke-width:2;}
    .poster-branch-index-node.is-root .poster-card{fill:${branchRootCard};stroke:${bronze};stroke-width:3;}
    .poster-connector{fill:none;stroke:${connectorColor};stroke-width:${connectorAppearance.width};stroke-linecap:round;opacity:${connectorAppearance.opacity};}
    .poster-connector.relationship-spouse{stroke:${bronze};stroke-width:${connectorAppearance.spouseWidth};opacity:${connectorAppearance.spouseOpacity};}
    .poster-connector.relationship-relative{stroke-dasharray:8 7;opacity:.58;}
    .poster-avatar-ring{fill:${background};stroke:${bronze};stroke-width:2;}
    .poster-node.is-root .poster-avatar-ring{stroke-width:3;}
    .poster-avatar{fill:${avatarFill};}
    .poster-photo{pointer-events:none;}
    .poster-initials{fill:${avatarText};font-size:12px;font-weight:700;text-anchor:middle;dominant-baseline:middle;}
    .poster-name{fill:currentColor;font-weight:700;}
    .poster-years{fill:${secondaryText};font-family:Georgia,serif;font-size:${cardPreset.typography.yearsSize}px;text-anchor:middle;direction:ltr;unicode-bidi:isolate;}
    .poster-status{fill:${secondaryText};font-size:${cardPreset.typography.statusSize}px;text-anchor:middle;}
    .poster-relationship{fill:${mutedText};font-size:${cardPreset.typography.statusSize}px;text-anchor:middle;}
    .poster-person-detail{fill:${mutedText};font-size:${cardPreset.typography.statusSize}px;text-anchor:middle;}
    .poster-description{fill:${mutedText};font-size:${cardPreset.typography.statusSize}px;font-style:italic;text-anchor:middle;}
    .poster-header-rule{stroke:${bronze};stroke-width:3;}
    .poster-header-rail{fill:${bronze};}
    .poster-header-gallery-rail .poster-header-title,.poster-header-gallery-rail .poster-header-subtitle{fill:${headerForeground};}
    .poster-header-registry .poster-header-meta,.poster-header-registry .poster-header-subtitle{fill:${mutedText};}
    .poster-subtitle,.poster-footer{fill:currentColor;opacity:.76;}
  </style>
  <g class="poster-root" direction="${dir}">
    <rect x="${formatSvgNumber(renderRect.x)}" y="${formatSvgNumber(renderRect.y)}" width="${formatSvgNumber(renderRect.width)}" height="${formatSvgNumber(renderRect.height)}" fill="${background}" />
    ${scene.decoration === 'paper-grain' ? `<rect class="poster-decoration poster-decoration-paper" x="${formatSvgNumber(renderRect.x)}" y="${formatSvgNumber(renderRect.y)}" width="${formatSvgNumber(renderRect.width)}" height="${formatSvgNumber(renderRect.height)}" fill="url(#poster-paper-grain)" />` : ''}
    ${scene.decoration === 'lineage-grid' ? `<rect class="poster-decoration poster-decoration-lineage-grid" x="${formatSvgNumber(renderRect.x)}" y="${formatSvgNumber(renderRect.y)}" width="${formatSvgNumber(renderRect.width)}" height="${formatSvgNumber(renderRect.height)}" fill="url(#poster-lineage-grid)" />` : ''}
    ${ornament}
    ${frame}
    ${header}
    <g aria-label="${escapeXml(treeLabel)}">${connectors}${nodes}</g>
    <line x1="${margins.left.toFixed(2)}" y1="${footerRuleY.toFixed(2)}" x2="${(sceneSize.width - margins.right).toFixed(2)}" y2="${footerRuleY.toFixed(2)}" stroke="${bronze}" stroke-width="1.5" opacity=".72" />
    ${footerText ? `<text class="poster-footer poster-custom-footer" x="${(sceneSize.width * 0.5).toFixed(2)}" y="${(footerRuleY + 19).toFixed(2)}" font-size="15" direction="${dir}" text-anchor="middle">${escapeXml(footerText)}</text>` : ''}
    ${showAttribution ? `<text class="poster-footer poster-attribution" x="${(sceneSize.width * 0.25).toFixed(2)}" y="${footerMetaY.toFixed(2)}" font-size="14" direction="${dir}" text-anchor="middle">${escapeXml(appLabel)}</text>` : ''}
    <text class="poster-footer poster-scope" x="${scopeX.toFixed(2)}" y="${footerMetaY.toFixed(2)}" font-size="14" direction="${dir}" text-anchor="middle">${escapeXml(scopeLabel)}</text>
    ${viewport?.printSheet ? renderPrintSheetOverlay(renderRect, viewport.printSheet.cropRect, viewport.printSheet.pageLabel) : ''}
  </g>
</svg>`;
  const normalizedSvg = svg.replace(/[ \t]+$/gm, '');

  return {
    format: 'svg',
    svg: normalizedSvg,
    scene,
    metadata: {
      rendererId: 'poster-scene-svg',
      dir,
      theme,
      visualStyle,
      width: outputSize.width,
      height: outputSize.height,
      physicalWidthMm: outputPhysicalSizeMm.width,
      physicalHeightMm: outputPhysicalSizeMm.height,
      nodeCount: visibleNodes.length,
      edgeCount: visibleConnectors.length,
      hasArabicText: hasArabic,
      hasEmbeddedFont,
      layoutEngine: scene.layout.engineId,
    },
  };
}
