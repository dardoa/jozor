import type { 
  PublicationDocument, 
  PlacedDocument, 
  PlacedSection, 
  PlacedBlock, 
  PlacedAsset
} from '../types';
import { AncestorTreeLayout, LayoutOptions } from './AncestorTreeLayout';

export class BookLayout {
  /**
   * Lays out a paginated PublicationDocument into a PlacedDocument.
   * Dynamically assigns page numbers based on section order: section[i] -> pageNumber = i + 1.
   */
  public static layout(
    doc: PublicationDocument,
    options: LayoutOptions
  ): PlacedDocument {
    const leftMargin = options.margins.left;
    const rightMargin = options.margins.right;
    const topMargin = options.margins.top;
    const bottomMargin = options.margins.bottom;

    const pageWidth = options.pageWidth;
    const pageHeight = options.pageHeight;

    const availableWidth = pageWidth - leftMargin - rightMargin;
    const availableHeight = pageHeight - topMargin - bottomMargin;

    const placedSections: PlacedSection[] = doc.sections.map((section, idx) => {
      const pageNumber = idx + 1;
      let placedBlocks: readonly PlacedBlock[] = [];

      switch (section.type) {
        case 'cover': {
          // Center cover block vertically and horizontally on the page
          const blockHeight = 80;
          const blockY = pageHeight / 2 - blockHeight / 2;

          placedBlocks = section.blocks.map((block) => {
            const placedAssets: PlacedAsset[] = block.assets.map((asset) => ({
              assetId: asset.id,
              type: asset.type,
              x: leftMargin,
              y: blockY,
              width: availableWidth,
              height: blockHeight,
              payload: asset.payload,
            }));

            return {
              blockId: block.id,
              type: block.type,
              x: leftMargin,
              y: blockY,
              width: availableWidth,
              height: blockHeight,
              assets: placedAssets,
            };
          });
          break;
        }

        case 'introduction': {
          // Stack blocks vertically starting from the top margin
          let currentY = topMargin;

          placedBlocks = section.blocks.map((block) => {
            const isHeader = block.type === 'header';
            const blockHeight = isHeader ? 50 : 200;
            const blockY = currentY;
            currentY += blockHeight + 20;

            const placedAssets: PlacedAsset[] = block.assets.map((asset) => ({
              assetId: asset.id,
              type: asset.type,
              x: leftMargin,
              y: blockY,
              width: availableWidth,
              height: blockHeight,
              payload: asset.payload,
            }));

            return {
              blockId: block.id,
              type: block.type,
              x: leftMargin,
              y: blockY,
              width: availableWidth,
              height: blockHeight,
              assets: placedAssets,
            };
          });
          break;
        }

        case 'tree': {
          // Wrap only this tree section in a temporary single-page document
          const tempDoc: PublicationDocument = {
            id: doc.id,
            title: doc.title,
            theme: doc.theme,
            type: 'single-page',
            sections: [section],
          };

          // Compute absolute tree layout coordinates matching template dimensions
          const tempPlaced = AncestorTreeLayout.layout(tempDoc, options);
          
          // Extract the resulting tree blocks (which contains nodes/edges) directly
          placedBlocks = tempPlaced.sections[0].blocks;
          break;
        }

        case 'timeline': {
          // Stack timeline event assets vertically in a list
          placedBlocks = section.blocks.map((block) => {
            let currentY = topMargin;

            const placedAssets: PlacedAsset[] = block.assets.map((asset) => {
              const assetY = currentY;
              currentY += 55;

              return {
                assetId: asset.id,
                type: asset.type,
                x: leftMargin,
                y: assetY,
                width: availableWidth,
                height: 45,
                payload: asset.payload,
              };
            });

            return {
              blockId: block.id,
              type: block.type,
              x: leftMargin,
              y: topMargin,
              width: availableWidth,
              height: availableHeight,
              assets: placedAssets,
            };
          });
          break;
        }

        case 'bibliography': {
          let currentY = topMargin;

          placedBlocks = section.blocks.map((block) => {
            const isHeader = block.type === 'header';
            const blockHeight = isHeader ? 60 : Math.max(180, availableHeight - 90);
            const blockY = currentY;
            currentY += blockHeight + 20;

            const placedAssets: PlacedAsset[] = block.assets.map((asset) => ({
              assetId: asset.id,
              type: asset.type,
              x: leftMargin,
              y: blockY,
              width: availableWidth,
              height: blockHeight,
              payload: asset.payload,
            }));

            return {
              blockId: block.id,
              type: block.type,
              x: leftMargin,
              y: blockY,
              width: availableWidth,
              height: blockHeight,
              assets: placedAssets,
            };
          });
          break;
        }

        default: {
          // Fallback: simple vertical stack layout
          let currentY = topMargin;

          placedBlocks = section.blocks.map((block) => {
            const blockHeight = 60;
            const blockY = currentY;
            currentY += blockHeight + 15;

            const placedAssets: PlacedAsset[] = block.assets.map((asset) => ({
              assetId: asset.id,
              type: asset.type,
              x: leftMargin,
              y: blockY,
              width: availableWidth,
              height: blockHeight,
              payload: asset.payload,
            }));

            return {
              blockId: block.id,
              type: block.type,
              x: leftMargin,
              y: blockY,
              width: availableWidth,
              height: blockHeight,
              assets: placedAssets,
            };
          });
          break;
        }
      }

      return {
        sectionId: section.id,
        type: section.type,
        pageNumber,
        x: 0,
        y: 0,
        width: pageWidth,
        height: pageHeight,
        blocks: placedBlocks,
      };
    });

    return {
      documentId: doc.id,
      totalPages: doc.sections.length,
      pageSize: {
        width: pageWidth,
        height: pageHeight,
      },
      sections: placedSections,
    };
  }
}
