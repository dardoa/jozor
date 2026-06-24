import { jsPDF } from 'jspdf';
import type { PlacedDocument, PublicationTheme } from '../types';
import type { PlacedTreeDiagramPayload } from '../layout/AncestorTreeLayout';
import { CLASSIC_THEME } from './PosterRenderer';

export class PdfRenderer {
  /**
   * Renders the PlacedDocument to a jsPDF vector instance.
   */
  public static renderToPdf(
    placedDoc: PlacedDocument,
    theme: PublicationTheme = CLASSIC_THEME
  ): jsPDF {
    const pageWidth = placedDoc.pageSize?.width || 595.28; // default A4 width in pt
    const pageHeight = placedDoc.pageSize?.height || 841.89; // default A4 height in pt

    // Sort sections by page number to guarantee sequential page generation
    const sortedSections = [...placedDoc.sections].sort((a, b) => a.pageNumber - b.pageNumber);

    const pdf = new jsPDF({
      orientation: pageWidth > pageHeight ? 'landscape' : 'portrait',
      unit: 'pt',
      format: [pageWidth, pageHeight],
    });

    let isFirstPage = true;

    for (const section of sortedSections) {
      if (!isFirstPage) {
        // Add a new page matching the current dimensions and orientation
        pdf.addPage(
          [pageWidth, pageHeight],
          pageWidth > pageHeight ? 'landscape' : 'portrait'
        );
      }
      isFirstPage = false;

      // 1. Fill page background using theme color
      pdf.setFillColor(theme.colors.background);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      renderPageChrome(pdf, {
        pageWidth,
        pageHeight,
        pageNumber: section.pageNumber,
        totalPages: sortedSections.length,
        sectionType: section.type,
        theme,
      });

      // 2. Render blocks and assets
      for (const block of section.blocks) {
        for (const asset of block.assets) {
          switch (asset.type) {
            case 'text': {
              const payload = asset.payload as { text: string; subtext?: string; body?: string };
              
              if (section.type === 'cover') {
                // Centered text for cover page
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(26);
                pdf.setTextColor(theme.colors.text);
                const xCenter = asset.x + asset.width / 2;
                pdf.text(payload.text, xCenter, asset.y + 20, { align: 'center' });

                if (payload.subtext) {
                  pdf.setFont('helvetica', 'normal');
                  pdf.setFontSize(14);
                  pdf.setTextColor(theme.colors.subtext);
                  pdf.text(payload.subtext, xCenter, asset.y + 55, { align: 'center' });
                }
              } else {
                // Normal stacked text page (Introduction / general headers)
                if (block.type === 'header') {
                  pdf.setFont('helvetica', 'bold');
                  pdf.setFontSize(18);
                  pdf.setTextColor(theme.colors.text);
                  writeText(pdf, payload.text, asset.x, asset.y + 15, asset.width, theme, { bold: true, fontSize: 18 });

                  if (payload.subtext) {
                    pdf.setFont('helvetica', 'italic');
                    pdf.setFontSize(11);
                    pdf.setTextColor(theme.colors.subtext);
                    writeText(pdf, payload.subtext, asset.x, asset.y + 35, asset.width, theme, { italic: true, fontSize: 11, subtext: true });
                  }
                } else if (block.type === 'paragraph') {
                  if (section.type === 'biography' || section.type === 'bibliography') {
                    pdf.setFillColor('#fffaf0');
                    pdf.setDrawColor('#eadcc6');
                    pdf.roundedRect(asset.x - 8, asset.y - 2, asset.width + 16, asset.height, 6, 6, 'FD');
                  }

                  pdf.setFont('helvetica', 'normal');
                  pdf.setFontSize(11);
                  pdf.setTextColor(theme.colors.text);
                  
                  if (payload.body) {
                    // Wrap text based on asset width
                    const lines = pdf.splitTextToSize(payload.body, asset.width);
                    writeLines(pdf, lines, payload.body, asset.x, asset.y + 15, asset.width, theme);
                  }
                }
              }
              break;
            }

            case 'tree-diagram': {
              const payload = asset.payload as PlacedTreeDiagramPayload;

              // Draw edges connecting parent lines
              pdf.setLineWidth(theme.edge.width);
              for (const edge of payload.edges) {
                const edgeColor = edge.type === 'father' ? theme.edge.father.color : theme.edge.mother.color;
                pdf.setDrawColor(edgeColor);

                const points = edge.points;
                if (points.length > 0) {
                  for (let i = 0; i < points.length - 1; i++) {
                    pdf.line(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
                  }
                }
              }

              // Draw node cards and centered text
              for (const node of payload.nodes) {
                const snap = node.personSnapshot;
                const nodeBgColor = snap.gender === 'male' ? theme.node.male.background : theme.node.female.background;
                
                pdf.setFillColor(nodeBgColor);
                pdf.setDrawColor(theme.node.borderColor);
                pdf.setLineWidth(1);
                pdf.roundedRect(node.x, node.y, node.width, node.height, 4, 4, 'FD');

                // Centered text inside node box
                pdf.setTextColor(theme.colors.text);
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(9);
                const xCenter = node.x + node.width / 2;
                const yCenter = node.y + node.height / 2;

                const bYear = snap.birthDate ? snap.birthDate.substring(0, 4) : '?';
                const dYear = snap.deathDate ? snap.deathDate.substring(0, 4) : '';
                const dates = snap.birthDate || snap.deathDate ? `(${bYear} - ${dYear})` : '';

                if (dates) {
                  pdf.text(snap.displayName, xCenter, yCenter - 2, { align: 'center' });
                  pdf.setFont('helvetica', 'normal');
                  pdf.setFontSize(7);
                  pdf.setTextColor(theme.colors.subtext);
                  pdf.text(dates, xCenter, yCenter + 8, { align: 'center' });
                } else {
                  pdf.text(snap.displayName, xCenter, yCenter + 2, { align: 'center' });
                }
              }
              break;
            }

            case 'event': {
              const payload = asset.payload as { personName: string; title: string; date: string; place?: string };

              pdf.setFont('helvetica', 'bold');
              pdf.setFontSize(11);
              pdf.setTextColor(theme.colors.text);
              pdf.text(`${payload.personName} - ${payload.title}`, asset.x, asset.y + 12);

              pdf.setFont('helvetica', 'normal');
              pdf.setFontSize(9);
              pdf.setTextColor(theme.colors.subtext);
              const loc = payload.place ? ` (${payload.place})` : '';
              pdf.text(`${payload.date}${loc}`, asset.x, asset.y + 26);
              break;
            }

            default:
              break;
          }
        }
      }
    }

    return pdf;
  }

  /**
   * Renders the PlacedDocument to a Data URL (base64).
   */
  public static renderToDataUrl(
    placedDoc: PlacedDocument,
    theme: PublicationTheme = CLASSIC_THEME
  ): string {
    const pdf = this.renderToPdf(placedDoc, theme);
    return pdf.output('dataurlstring');
  }
}

function renderPageChrome(
  pdf: jsPDF,
  options: {
    readonly pageWidth: number;
    readonly pageHeight: number;
    readonly pageNumber: number;
    readonly totalPages: number;
    readonly sectionType: string;
    readonly theme: PublicationTheme;
  }
): void {
  if (options.sectionType === 'cover') return;

  const marginX = 40;
  pdf.setDrawColor('#eadcc6');
  pdf.setLineWidth(0.5);
  pdf.line(marginX, 34, options.pageWidth - marginX, 34);
  pdf.line(marginX, options.pageHeight - 34, options.pageWidth - marginX, options.pageHeight - 34);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(options.theme.colors.subtext);
  pdf.text(sectionLabel(options.sectionType), marginX, 24);
  pdf.text(
    `${options.pageNumber} / ${options.totalPages}`,
    options.pageWidth - marginX,
    options.pageHeight - 18,
    { align: 'right' }
  );
}

function sectionLabel(sectionType: string): string {
  switch (sectionType) {
    case 'introduction':
      return 'Introduction';
    case 'tree':
      return 'Family tree';
    case 'biography':
      return 'People chapters';
    case 'timeline':
      return 'Timeline';
    case 'bibliography':
      return 'Bibliography';
    default:
      return sectionType;
  }
}

function isLikelyRtl(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

function writeText(
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number,
  theme: PublicationTheme,
  options: { readonly bold?: boolean; readonly italic?: boolean; readonly fontSize?: number; readonly subtext?: boolean } = {}
): void {
  const style = options.bold ? 'bold' : options.italic ? 'italic' : 'normal';
  pdf.setFont('helvetica', style);
  pdf.setFontSize(options.fontSize ?? 11);
  pdf.setTextColor(options.subtext ? theme.colors.subtext : theme.colors.text);

  if (isLikelyRtl(text)) {
    pdf.text(text, x + width, y, { align: 'right' });
  } else {
    pdf.text(text, x, y);
  }
}

function writeLines(
  pdf: jsPDF,
  lines: string[],
  originalText: string,
  x: number,
  y: number,
  width: number,
  theme: PublicationTheme
): void {
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(11);
  pdf.setTextColor(theme.colors.text);

  if (isLikelyRtl(originalText)) {
    pdf.text(lines, x + width, y, { align: 'right' });
  } else {
    pdf.text(lines, x, y);
  }
}
