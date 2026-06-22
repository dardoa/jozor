import type { PlacedDocument, PosterTheme } from '../types';
import type { PlacedTreeDiagramPayload } from '../layout/AncestorTreeLayout';

export interface CanvasLike {
  getContext(contextId: '2d'): CanvasRenderingContext2D | null;
  toDataURL(type?: string, quality?: unknown): string;
}

export interface CanvasFactory {
  createCanvas(width: number, height: number): CanvasLike;
}

export const CLASSIC_THEME: PosterTheme = {
  colors: {
    background: '#fdfbf7',
    text: '#1e293b',
    subtext: '#64748b',
  },
  node: {
    male: {
      background: '#e0e7ff',
    },
    female: {
      background: '#fee2e2',
    },
    borderColor: '#cbd5e1',
    width: 120,
    height: 60,
  },
  edge: {
    father: {
      color: '#a5b4fc',
    },
    mother: {
      color: '#fca5a5',
    },
    width: 2,
  },
  fonts: {
    fontFamily: 'system-ui, sans-serif',
    titleSize: '24px',
    nameSize: '13px',
    dateSize: '11px',
  },
};

export const MODERN_THEME: PosterTheme = {
  colors: {
    background: '#0f172a',
    text: '#f8fafc',
    subtext: '#94a3b8',
  },
  node: {
    male: {
      background: '#1e293b',
    },
    female: {
      background: '#334155',
    },
    borderColor: '#475569',
    width: 120,
    height: 60,
  },
  edge: {
    father: {
      color: '#38bdf8',
    },
    mother: {
      color: '#f43f5e',
    },
    width: 2,
  },
  fonts: {
    fontFamily: 'Inter, system-ui, sans-serif',
    titleSize: '26px',
    nameSize: '13px',
    dateSize: '11px',
  },
};

export class PosterRenderer {
  /**
   * Renders the PlacedDocument to a decoupled CanvasLike surface.
   */
  public static renderToCanvas(
    placedDoc: PlacedDocument,
    factory: CanvasFactory,
    theme: PosterTheme = CLASSIC_THEME
  ): CanvasLike {
    const width = placedDoc.pageSize?.width || 1000;
    const height = placedDoc.pageSize?.height || 800;

    const canvas = factory.createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not retrieve 2D drawing context from CanvasFactory.');
    }

    // 1. Fill Background
    ctx.fillStyle = theme.colors.background;
    ctx.fillRect(0, 0, width, height);

    // 2. Process placed assets inside blocks
    for (const section of placedDoc.sections) {
      for (const block of section.blocks) {
        for (const asset of block.assets) {
          if (asset.type === 'tree-diagram') {
            const payload = asset.payload as PlacedTreeDiagramPayload;

            // Draw connecting orthogonal lines
            for (const edge of payload.edges) {
              ctx.beginPath();
              ctx.strokeStyle = edge.type === 'father' ? theme.edge.father.color : theme.edge.mother.color;
              ctx.lineWidth = theme.edge.width;

              const points = edge.points;
              if (points.length > 0) {
                ctx.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; i++) {
                  ctx.lineTo(points[i].x, points[i].y);
                }
              }
              ctx.stroke();
            }

            // Draw cards for nodes
            for (const node of payload.nodes) {
              const snapshot = node.personSnapshot;

              ctx.fillStyle = snapshot.gender === 'male' ? theme.node.male.background : theme.node.female.background;
              ctx.strokeStyle = theme.node.borderColor;
              ctx.lineWidth = 1;

              drawRoundedRect(ctx, node.x, node.y, node.width, node.height, 6);
              ctx.fill();
              ctx.stroke();

              // Draw Node text
              ctx.fillStyle = theme.colors.text;
              ctx.font = `bold ${theme.fonts.nameSize} ${theme.fonts.fontFamily}`;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';

              const dates = formatLifeDates(snapshot.birthDate, snapshot.deathDate);
              const xCenter = node.x + node.width / 2;
              const yCenter = node.y + node.height / 2;

              if (dates) {
                ctx.fillText(snapshot.displayName, xCenter, yCenter - 8);
                ctx.fillStyle = theme.colors.subtext;
                ctx.font = `${theme.fonts.dateSize} ${theme.fonts.fontFamily}`;
                ctx.fillText(dates, xCenter, yCenter + 10);
              } else {
                ctx.fillText(snapshot.displayName, xCenter, yCenter);
              }
            }
          } else if (asset.type === 'text') {
            // Draw title text
            const textPayload = asset.payload as { text: string; subtext?: string };
            ctx.fillStyle = theme.colors.text;
            ctx.font = `bold ${theme.fonts.titleSize} ${theme.fonts.fontFamily}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const xCenter = asset.x + asset.width / 2;
            const yCenter = asset.y + 25;
            ctx.fillText(textPayload.text, xCenter, yCenter);

            if (textPayload.subtext) {
              ctx.fillStyle = theme.colors.subtext;
              ctx.font = `italic ${theme.fonts.dateSize} ${theme.fonts.fontFamily}`;
              ctx.fillText(textPayload.subtext, xCenter, yCenter + 30);
            }
          }
        }
      }
    }

    return canvas;
  }

  /**
   * Renders the PlacedDocument to a Data URL (base64 image).
   */
  public static renderToDataUrl(
    placedDoc: PlacedDocument,
    factory: CanvasFactory,
    theme: PosterTheme = CLASSIC_THEME
  ): string {
    const canvas = this.renderToCanvas(placedDoc, factory, theme);
    return canvas.toDataURL('image/png');
  }
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function formatLifeDates(birthDate?: string, deathDate?: string): string | null {
  if (!birthDate && !deathDate) return null;
  const bYear = birthDate ? birthDate.substring(0, 4) : '?';
  const dYear = deathDate ? deathDate.substring(0, 4) : '';
  if (dYear) {
    return `(${bYear} - ${dYear})`;
  }
  return birthDate ? `(ولد ${bYear})` : '';
}
