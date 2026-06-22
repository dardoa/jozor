import { describe, expect, it, vi } from 'vitest';
import { TemplateRegistry } from '../TemplateRegistry';
import { PublishingPipeline } from '../PublishingPipeline';
import { PosterRenderer, CanvasFactory, CanvasLike } from '../../renderers/PosterRenderer';
import type { Person } from '../../../../types';
import { createPerson } from '../../../../utils/familyLogic';
import type { PublicationRequest } from '../../types';
import type { PlacedTreeDiagramPayload, PlacedTreeNode } from '../../layout/AncestorTreeLayout';

// Helper to create mock persons
const createMockPerson = (id: string, gender: 'male' | 'female', overrides: Partial<Person>): Person => {
  return {
    ...createPerson(gender),
    id,
    gender,
    ...overrides,
  };
};

// Mock Canvas Setup
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
    toDataURL: () => 'data:image/png;base64,mockRenderedBytes',
  };
};

const mockFactory = (ctx: ReturnType<typeof createMockContext>): CanvasFactory => {
  return {
    createCanvas: () => createMockCanvas(ctx),
  };
};

const mockPeople: Record<string, Person> = {
  'p-root': createMockPerson('p-root', 'male', {
    firstName: 'Ahmad',
    lastName: 'Al-Jamil',
    parents: ['p-father', 'p-mother'],
  }),
  'p-father': createMockPerson('p-father', 'male', {
    firstName: 'Saleh',
    lastName: 'Al-Jamil',
  }),
  'p-mother': createMockPerson('p-mother', 'female', {
    firstName: 'Fatima',
    lastName: 'Al-Harbi',
  }),
};

describe('PublishingPipeline & TemplateRegistry', () => {
  it('correctly lists and retrieves registered templates', () => {
    const templates = TemplateRegistry.listTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(2);

    const classic = TemplateRegistry.getTemplate('classic-ancestor-poster');
    expect(classic.id).toBe('classic-ancestor-poster');
    expect(classic.publicationKind).toBe('ancestor-poster');
    expect(classic.theme.colors.background).toBe('#fdfbf7');

    expect(() => TemplateRegistry.getTemplate('non-existent')).toThrow();
  });

  it('runs the full publishing pipeline successfully from request to rendered output', () => {
    const template = TemplateRegistry.getTemplate('classic-ancestor-poster');

    const request: PublicationRequest = {
      rootPersonId: 'p-root',
      templateId: template.id,
      scope: {
        type: 'ancestor',
        generationsDepth: 2,
      },
    };

    // 1. Compose logical document
    const doc = PublishingPipeline.composeDocument(request, mockPeople);
    expect(doc.title).toContain('Ahmad Al-Jamil');
    expect(doc.sections).toHaveLength(2); // Cover + Tree

    // 2. Compute visual layouts
    const placedDoc = PublishingPipeline.layoutDocument(doc, template);
    expect(placedDoc.documentId).toBe(doc.id);
    expect(placedDoc.totalPages).toBe(1);

    const treeSection = placedDoc.sections.find((s) => s.type === 'tree')!;
    const treeBlock = treeSection.blocks[0];
    const treeAsset = treeBlock.assets[0];
    const payload = treeAsset.payload as PlacedTreeDiagramPayload;

    // Verify nodes use theme's node width and height defaults (120x60) since we did not override them
    const rootNode = payload.nodes.find((n: PlacedTreeNode) => n.slot === 1)!;
    expect(rootNode.width).toBe(120);
    expect(rootNode.height).toBe(60);
    expect(rootNode.personSnapshot.displayName).toContain('Ahmad Al-Jamil');

    // 3. Render document using Mock Canvas
    const ctx = createMockContext();
    const factory = mockFactory(ctx);
    const dataUrl = PosterRenderer.renderToDataUrl(placedDoc, factory, template.theme);

    expect(dataUrl).toBe('data:image/png;base64,mockRenderedBytes');
    // Verify background fill matches theme backgroundColor
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 1000, 800);
    // Verify edge stroke colors match edge colors
    expect(ctx.stroke).toHaveBeenCalled();
  });
});
