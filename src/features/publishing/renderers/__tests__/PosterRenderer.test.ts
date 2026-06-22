import { describe, expect, it, vi } from 'vitest';
import { 
  PosterRenderer, 
  CanvasFactory, 
  CanvasLike, 
  CLASSIC_THEME 
} from '../PosterRenderer';
import type { PlacedDocument } from '../../types';

// Create a Mock Canvas Context to record drawing actions without browser dependencies
const createMockContext = () => {
  return {
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: '',
    textBaseline: '',
  };
};

const createMockCanvas = (ctx: ReturnType<typeof createMockContext>): CanvasLike => {
  return {
    getContext: (contextId: '2d') => {
      if (contextId === '2d') return ctx as unknown as CanvasRenderingContext2D;
      return null;
    },
    toDataURL: () => 'data:image/png;base64,mockImageBytes',
  };
};

const mockFactory = (ctx: ReturnType<typeof createMockContext>): CanvasFactory => {
  return {
    createCanvas: () => createMockCanvas(ctx),
  };
};

const mockPlacedDoc: PlacedDocument = {
  documentId: 'doc-123',
  totalPages: 1,
  pageSize: {
    width: 1000,
    height: 800,
  },
  sections: [
    {
      sectionId: 'sec-cover',
      type: 'cover',
      pageNumber: 1,
      x: 0,
      y: 0,
      width: 1000,
      height: 800,
      blocks: [
        {
          blockId: 'blk-cover',
          type: 'header',
          x: 50,
          y: 50,
          width: 900,
          height: 80,
          assets: [
            {
              assetId: 'asset-title',
              type: 'text',
              x: 50,
              y: 50,
              width: 900,
              height: 80,
              payload: {
                text: 'سلالة عائلية',
                subtext: 'محرك النشر الجديد',
              },
            },
          ],
        },
      ],
    },
    {
      sectionId: 'sec-tree',
      type: 'tree',
      pageNumber: 1,
      x: 0,
      y: 0,
      width: 1000,
      height: 800,
      blocks: [
        {
          blockId: 'blk-tree',
          type: 'tree',
          x: 50,
          y: 150,
          width: 900,
          height: 600,
          assets: [
            {
              assetId: 'asset-tree',
              type: 'tree-diagram',
              x: 50,
              y: 150,
              width: 900,
              height: 600,
              payload: {
                rootPersonId: 'p-1',
                nodes: [
                  {
                    id: 'p-1@ahnentafel:1',
                    personId: 'p-1',
                    x: 440,
                    y: 700,
                    width: 120,
                    height: 60,
                    slot: 1,
                    level: 0,
                    personSnapshot: {
                      id: 'p-1',
                      displayName: 'الابن المختار',
                      gender: 'male',
                      birthDate: '1990-05-05',
                      deathDate: undefined,
                    },
                  },
                ],
                edges: [
                  {
                    id: 'edge-2-1',
                    fromNodeId: 'p-2@ahnentafel:2',
                    toNodeId: 'p-1@ahnentafel:1',
                    type: 'father',
                    points: [
                      { x: 250, y: 430 },
                      { x: 250, y: 550 },
                      { x: 500, y: 550 },
                      { x: 500, y: 670 },
                    ],
                  },
                ],
              },
            },
          ],
        },
      ],
    },
  ],
};

describe('PosterRenderer', () => {
  it('correctly executes canvas drawing operations in a decoupled manner', () => {
    const ctx = createMockContext();
    const factory = mockFactory(ctx);

    const canvas = PosterRenderer.renderToCanvas(mockPlacedDoc, factory, CLASSIC_THEME);
    expect(canvas).toBeDefined();

    // Verify background fill
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1000, 800);

    // Verify text drawings (Title, subtitle, and nodes)
    expect(ctx.fillText).toHaveBeenCalledWith('سلالة عائلية', 500, 75);
    expect(ctx.fillText).toHaveBeenCalledWith('محرك النشر الجديد', 500, 105);
    expect(ctx.fillText).toHaveBeenCalledWith('الابن المختار', 500, 722);
    expect(ctx.fillText).toHaveBeenCalledWith('(ولد 1990)', 500, 740);

    // Verify edge drawing (moveTo and lineTo)
    expect(ctx.beginPath).toHaveBeenCalled();
    expect(ctx.moveTo).toHaveBeenCalledWith(250, 430);
    expect(ctx.lineTo).toHaveBeenCalledWith(250, 550);
    expect(ctx.lineTo).toHaveBeenCalledWith(500, 550);
    expect(ctx.lineTo).toHaveBeenCalledWith(500, 670);
    expect(ctx.stroke).toHaveBeenCalled();
  });

  it('correctly renders document directly to data URL', () => {
    const ctx = createMockContext();
    const factory = mockFactory(ctx);

    const dataUrl = PosterRenderer.renderToDataUrl(mockPlacedDoc, factory, CLASSIC_THEME);
    expect(dataUrl).toBe('data:image/png;base64,mockImageBytes');
  });
});
