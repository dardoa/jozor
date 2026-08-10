import type { PosterCardPreset, PosterSceneNode } from './posterSceneTypes';

export interface BoundingBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface CardDetailRowLayout {
  readonly field: 'privacy' | 'years' | 'relationship' | 'person-detail' | 'description';
  readonly className: string;
  readonly label: string;
  readonly yBaseline: number;
  readonly bounds: BoundingBox;
}

export interface CardContentLayoutResult {
  readonly cardWidth: number;
  readonly cardHeight: number;
  readonly avatarBounds: BoundingBox | null;
  readonly avatarCenterY: number;
  readonly avatarRadius: number;
  readonly nameLines: readonly string[];
  readonly nameFontSize: number;
  readonly nameLineHeight: number;
  readonly nameStartY: number;
  readonly nameBounds: BoundingBox;
  readonly detailRows: readonly CardDetailRowLayout[];
  readonly detailRegionBounds: BoundingBox | null;
  readonly minRequiredCardWidth: number;
  readonly minRequiredCardHeight: number;
  readonly fitsInCard: boolean;
  readonly textDirection: 'rtl' | 'ltr';
}

export interface ComputeCardContentLayoutOptions {
  readonly node: Partial<PosterSceneNode> & { displayName: string; previewId: string };
  readonly cardWidth: number;
  readonly cardHeight: number;
  readonly cardPreset: PosterCardPreset;
  readonly language: 'ar' | 'en';
  readonly relationshipLabel?: string;
  readonly minPadding?: number; // Default: 4 scene units
  readonly minReadableFontSize?: number; // Default: 8.5 scene units

  readonly cardX?: number; // Default: 0
  readonly cardY?: number; // Default: 0
}


export function splitTextLines(value: string, maxCharacters: number, maxLines: number): string[] {
  const trimmed = value.trim();
  if (!trimmed) return [''];

  if (maxLines === 1) {
    const characters = Array.from(trimmed);
    if (characters.length <= maxCharacters) return [characters.join('')];
    return [`${characters.slice(0, Math.max(1, maxCharacters - 1)).join('').trimEnd()}\u2026`];
  }

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];

  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (Array.from(candidate).length <= maxCharacters || !current) {
      current = candidate;
      continue;
    }

    lines.push(current);
    current = word;
    if (lines.length === maxLines) break;
  }

  if (lines.length < maxLines && current) {
    lines.push(current);
  }

  const includedWords = lines.join(' ').split(/\s+/).filter(Boolean);
  const totalLength = Array.from(trimmed).length;
  const includedLength = Array.from(lines.join(' ')).length;

  lines.forEach((line, idx) => {
    if (Array.from(line).length > maxCharacters) {
      const chars = Array.from(line);
      lines[idx] = `${chars.slice(0, Math.max(1, maxCharacters - 1)).join('').trimEnd()}\u2026`;
    }
  });

  if ((includedWords.length < words.length || includedLength < totalLength) && lines.length > 0) {
    const lastIdx = lines.length - 1;
    if (!lines[lastIdx].endsWith('\u2026')) {
      lines[lastIdx] = `${lines[lastIdx].replace(/\u2026$/, '').trimEnd()}\u2026`;
    }
  }

  return lines;
}

export function rectsIntersect(a: BoundingBox, b: BoundingBox): boolean {
  return a.x < b.x + b.width - 0.01 &&
    a.x + a.width > b.x + 0.01 &&
    a.y < b.y + b.height - 0.01 &&
    a.y + a.height > b.y + 0.01;
}

export function computeCardContentLayout(options: ComputeCardContentLayoutOptions): CardContentLayoutResult {
  const {
    node,
    cardWidth,
    cardHeight,
    cardPreset,
    language,
    minPadding = 4,
    minReadableFontSize = 8.5,

    cardX = 0,


    cardY = 0,
  } = options;

  const isAr = language === 'ar';
  const textDirection = isAr ? 'rtl' : 'ltr';
  const centerX = cardX + cardWidth / 2;

  // 1. Avatar Region
  const hasAvatar = cardPreset.photo.preferredDiameter > 0;
  const rawRadius = hasAvatar ? cardPreset.photo.preferredDiameter / 2 : 0;
  const maxAllowedRadius = cardHeight < 110
    ? Math.max(0, Math.floor((cardHeight - 20) * 0.20))
    : Math.max(0, Math.floor((cardHeight - 20) * 0.28));
  const avatarRadius = hasAvatar ? Math.min(rawRadius, maxAllowedRadius) : 0;
  let avatarBounds: BoundingBox | null = null;
  let avatarCenterY = cardY;

  if (hasAvatar) {
    avatarCenterY = cardPreset.photo.overlapsCard ? cardY + 5 : cardY + avatarRadius + minPadding + 1;
    avatarBounds = {
      x: centerX - avatarRadius,
      y: avatarCenterY - avatarRadius,
      width: avatarRadius * 2,
      height: avatarRadius * 2,
    };
  }

  // 2. Detail Rows Region (Bottom)
  const isMasked = Boolean(node.isMasked);
  const birthYear = node.birthYear;
  const deathYear = node.deathYear;
  let lifeYears = '';
  if (birthYear || deathYear) {
    if (birthYear && deathYear) {
      lifeYears = `${birthYear} - ${deathYear}`;
    } else if (birthYear) {
      lifeYears = String(birthYear);
    } else {
      lifeYears = String(deathYear);
    }
  }

  const maskedLabel = isAr ? 'محمي بموجب الخصوصية' : 'Privacy Protected';
  const statusSize = cardPreset.typography.statusSize || 10;
  const isDense = (cardPreset.visualStyle as string)?.includes('dense') || (cardPreset.id as string)?.includes('dense') || false;

  const relationshipLabel = options.relationshipLabel !== undefined
    ? options.relationshipLabel
    : (node.relationshipHint ? (typeof node.relationshipHint === 'string' ? node.relationshipHint : String((node.relationshipHint as Record<string, unknown>).label ?? '')) : '');




  const birthPlaceDetail = node.birthPlaceLabel || '';
  const occupationDetail = node.occupationLabel || '';
  const rawCardDetailLabel = birthPlaceDetail && occupationDetail
    ? `${birthPlaceDetail} \u00b7 ${occupationDetail}`
    : birthPlaceDetail
      ? `${isAr ? 'الميلاد' : 'Born'}: ${birthPlaceDetail}`
      : occupationDetail
        ? `${isAr ? 'المهنة' : 'Occupation'}: ${occupationDetail}`
        : '';
  const descriptionLabel = node.descriptionLabel || '';

  const cardDetailLabel = rawCardDetailLabel;


  const rawDetailEntries: Array<{ field: CardDetailRowLayout['field']; className: string; label: string }> = [];

  if (isMasked) {
    rawDetailEntries.push({ field: 'privacy', className: 'poster-status', label: maskedLabel });
  } else {
    if (lifeYears) {
      rawDetailEntries.push({ field: 'years', className: 'poster-years', label: lifeYears });
    }
    if (relationshipLabel) {
      rawDetailEntries.push({ field: 'relationship', className: 'poster-relationship', label: relationshipLabel });
    }
    if (cardDetailLabel) {
      rawDetailEntries.push({ field: 'person-detail', className: 'poster-person-detail', label: cardDetailLabel });
    }
    if (descriptionLabel) {
      rawDetailEntries.push({ field: 'description', className: 'poster-description', label: descriptionLabel });
    }
  }

  const detailLineHeight = Math.max(9, Math.min(11, statusSize));
  const totalDetailHeight = rawDetailEntries.length * detailLineHeight;
  const bottomPadding = minPadding + 4; // safe margin from bottom card edge (>= 4.0 scene units padding)





  let detailStartY = 0;
  let detailRegionBounds: BoundingBox | null = null;
  const detailRows: CardDetailRowLayout[] = [];

  if (rawDetailEntries.length > 0) {
    detailStartY = cardY + cardHeight - (minPadding + 8) - (rawDetailEntries.length - 1) * detailLineHeight;
    const detailTopY = detailStartY - statusSize * 1.4;
    detailRegionBounds = {
      x: cardX + minPadding,
      y: detailTopY,
      width: cardWidth - minPadding * 2,
      height: totalDetailHeight + statusSize * 0.4,
    };

    rawDetailEntries.forEach((entry, idx) => {
      const yBase = detailStartY + idx * detailLineHeight;
      detailRows.push({
        field: entry.field,
        className: entry.className,
        label: entry.label,
        yBaseline: yBase,
        bounds: {
          x: cardX + minPadding,
          y: yBase - statusSize * 0.95,
          width: cardWidth - minPadding * 2,
          height: statusSize * 1.25,
        },
      });
    });
  }

  // 3. Middle Region (Name Layout)
  const topLimit = hasAvatar
    ? (cardPreset.photo.overlapsCard ? avatarCenterY + avatarRadius + 4 : avatarCenterY + avatarRadius + 4)
    : cardY + minPadding + 4;


 // accent line at top

  const bottomLimit = detailRegionBounds
    ? detailRegionBounds.y - minPadding
    : cardY + cardHeight - bottomPadding;

  const availableNameHeight = Math.max(0, bottomLimit - topLimit);

  // Preferred font size
  const preferredNameFontSize = node.nameFontSize || cardPreset.typography.nameSize || 14;

  let chosenNameFontSize = Math.max(minReadableFontSize, preferredNameFontSize);
  let chosenLines: string[] = [];
  let chosenLineHeight = chosenNameFontSize * 1.15;
  let chosenNameStartY = topLimit + chosenNameFontSize;
  let fitsInCard = true;

  // Pass 1: Try single line layout first (reduces vertical clearance requirement)
  let solutionFound = false;
  const startFontSize = Math.max(preferredNameFontSize, minReadableFontSize);

  for (let fontSize = startFontSize; fontSize >= minReadableFontSize - 0.01; fontSize -= 0.5) {
    const lineHeight = fontSize * 1.15;

    const charWidthRatio = options.language === 'ar' ? 0.46 : 0.50;
    const maxCharsPerLine = Math.max(6, Math.floor((cardWidth - minPadding * 2 - 8) / Math.max(4, fontSize * charWidthRatio)));
    const testLines = splitTextLines(node.displayName, maxCharsPerLine, 1);
    const isTruncated = testLines[0]?.endsWith('\u2026');

    if (!isTruncated && testLines.length === 1 && lineHeight <= availableNameHeight) {
      chosenNameFontSize = fontSize;
      chosenLines = testLines;
      chosenLineHeight = lineHeight;
      chosenNameStartY = topLimit + (availableNameHeight - lineHeight) / 2 + fontSize * 0.82 + 2.0;
      solutionFound = true;
      break;
    }
  }

  // Pass 2: Multi-line layout if single line untruncated does not fit
  if (!solutionFound) {
    for (let fontSize = startFontSize; fontSize >= minReadableFontSize - 0.01; fontSize -= 0.5) {
      const lineHeight = fontSize * 1.15;
      const charWidthRatio = options.language === 'ar' ? 0.46 : 0.50;
      const maxCharsPerLine = Math.max(6, Math.floor((cardWidth - minPadding * 2 - 8) / Math.max(4, fontSize * charWidthRatio)));
      const maxPossibleLines = Math.max(1, Math.floor(availableNameHeight / lineHeight));
      const maxLinesToTry = isDense ? 1 : (availableNameHeight < 15 ? 1 : Math.min(3, maxPossibleLines));

      if (maxLinesToTry >= 1) {
        const testLines = splitTextLines(node.displayName, maxCharsPerLine, maxLinesToTry);
        const isTruncated = testLines.some((line) => line.endsWith('\u2026'));
        const totalTextHeight = testLines.length * lineHeight;

        if (!isTruncated && totalTextHeight <= availableNameHeight) {
          chosenNameFontSize = fontSize;
          chosenLines = testLines;
          chosenLineHeight = lineHeight;
          chosenNameStartY = topLimit + (availableNameHeight - totalTextHeight) / 2 + fontSize * 0.82 + 2.0;
          solutionFound = true;
          break;
        }
      }
    }
  }


  if (!solutionFound) {
    fitsInCard = false;
    chosenNameFontSize = minReadableFontSize;
    chosenLineHeight = minReadableFontSize * 1.15;
    const charWidthRatio = options.language === 'ar' ? 0.46 : 0.50;
    const maxCharsPerLine = Math.max(6, Math.floor((cardWidth - minPadding * 2 - 8) / Math.max(4, minReadableFontSize * charWidthRatio)));
    const fallbackMaxLines = Math.max(1, Math.floor(availableNameHeight / chosenLineHeight));
    chosenLines = splitTextLines(node.displayName, maxCharsPerLine, fallbackMaxLines);
    chosenNameStartY = topLimit + minReadableFontSize;
  }

  if (chosenLines.some((line) => line.endsWith('\u2026'))) {
    fitsInCard = false;
  }



  const nameBlockHeight = chosenLines.length * chosenLineHeight;
  const nameBounds: BoundingBox = {
    x: cardX + minPadding,
    y: chosenNameStartY - chosenNameFontSize * 0.82,
    width: cardWidth - minPadding * 2,
    height: nameBlockHeight,
  };

  // Validate Padding & Boundary Integrity
  if (nameBounds.y < cardY + minPadding - 0.5 || nameBounds.y + nameBounds.height > cardY + cardHeight - minPadding + 0.5) {
    fitsInCard = false;
  }

  if (detailRegionBounds && nameBounds.y + nameBounds.height > detailRegionBounds.y - 2.0) {
    fitsInCard = false;
  }

  if (avatarBounds && rectsIntersect(avatarBounds, nameBounds)) {
    fitsInCard = false;
  }

  if (detailRegionBounds && rectsIntersect(nameBounds, detailRegionBounds)) {
    fitsInCard = false;
  }

  // 4. Compute Minimum Required Card Dimensions
  const longestWord = node.displayName.split(/\s+/).reduce((longest, w) => w.length > longest.length ? w : longest, '');
  const longestWordWidth = Array.from(longestWord).length * chosenNameFontSize * 0.55;
  const minRequiredCardWidth = Math.round(Math.max(
    cardPreset.geometry.minWidth,
    avatarRadius * 2 + minPadding * 2 + 8,
    longestWordWidth + minPadding * 2 + 12
  ));

  const minRequiredCardHeight = Math.round(
    (hasAvatar ? (cardPreset.photo.overlapsCard ? avatarRadius + 10 : avatarRadius * 2 + 16) : 20) +
    nameBlockHeight +
    totalDetailHeight +
    minPadding * 2 + 16
  );

  return {
    cardWidth,
    cardHeight,
    avatarBounds,
    avatarCenterY,
    avatarRadius,
    nameLines: chosenLines,
    nameFontSize: chosenNameFontSize,
    nameLineHeight: chosenLineHeight,
    nameStartY: chosenNameStartY,
    nameBounds,
    detailRows,
    detailRegionBounds,
    minRequiredCardWidth,
    minRequiredCardHeight,
    fitsInCard,
    textDirection,
  };
}
