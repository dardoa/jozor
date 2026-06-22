import { describe, expect, it, vi } from 'vitest';
import { TemplateRegistry } from '../TemplateRegistry';
import { PublishingPipeline } from '../PublishingPipeline';
import type { Person } from '../../../../types';
import { createPerson } from '../../../../utils/familyLogic';
import type { PublicationRequest } from '../../types';

// Helper to create mock persons
const createMockPerson = (id: string, gender: 'male' | 'female', overrides: Partial<Person>): Person => {
  return {
    ...createPerson(gender),
    id,
    gender,
    ...overrides,
  };
};

const mockPeople: Record<string, Person> = {
  'p-root': createMockPerson('p-root', 'male', {
    firstName: 'Ahmad',
    lastName: 'Al-Jamil',
    parents: ['p-father', 'p-mother'],
    birthDate: '1990-05-15',
  }),
  'p-father': createMockPerson('p-father', 'male', {
    firstName: 'Saleh',
    lastName: 'Al-Jamil',
    birthDate: '1960-01-01',
  }),
  'p-mother': createMockPerson('p-mother', 'female', {
    firstName: 'Fatima',
    lastName: 'Al-Harbi',
    birthDate: '1965-02-02',
  }),
};

describe('Template Composition Engine (Sprint 6)', () => {
  it('correctly registers and retrieves the classic book manuscript template', () => {
    const template = TemplateRegistry.getTemplate('classic-book-manuscript');
    expect(template.id).toBe('classic-book-manuscript');
    expect(template.publicationKind).toBe('book-manuscript');
    expect(template.documentType).toBe('paginated');
    expect(template.sections).toHaveLength(4);
    expect(template.sections[0].type).toBe('cover');
    expect(template.sections[1].type).toBe('introduction');
    expect(template.sections[2].type).toBe('tree');
    expect(template.sections[3].type).toBe('timeline');
  });

  it('composes a single-page poster document dynamically from template sections', () => {
    const template = TemplateRegistry.getTemplate('classic-ancestor-poster');
    
    const request: PublicationRequest = {
      rootPersonId: 'p-root',
      templateId: template.id,
      scope: {
        type: 'ancestor',
        generationsDepth: 2,
      },
    };

    const doc = PublishingPipeline.composeDocument(request, mockPeople);
    expect(doc.type).toBe('single-page');
    expect(doc.title).toContain('Ahmad Al-Jamil');
    expect(doc.sections).toHaveLength(2);
    expect(doc.sections[0].type).toBe('cover');
    expect(doc.sections[1].type).toBe('tree');

    const treeSection = doc.sections[1];
    const treeBlock = treeSection.blocks[0];
    const treeAsset = treeBlock.assets[0];
    const payload = treeAsset.payload as {
      rootPersonId: string;
      people: Record<string, Person>;
    };

    expect(payload.rootPersonId).toBe('p-root');
    expect(Object.keys(payload.people)).toHaveLength(3); // Ahmad, father, mother
  });

  it('composes a paginated book document with all 4 pages/sections dynamically from templates', () => {
    const template = TemplateRegistry.getTemplate('classic-book-manuscript');
    
    const request: PublicationRequest = {
      rootPersonId: 'p-root',
      templateId: template.id,
      scope: {
        type: 'all',
      },
    };

    const doc = PublishingPipeline.composeDocument(request, mockPeople);
    expect(doc.type).toBe('paginated');
    expect(doc.title).toBe('كتاب عائلة Al-Jamil');
    expect(doc.sections).toHaveLength(4);

    // 1. Page 1: Cover
    const coverSection = doc.sections[0];
    expect(coverSection.type).toBe('cover');
    expect(coverSection.blocks[0].type).toBe('header');
    const coverPayload = coverSection.blocks[0].assets[0].payload as { text: string; subtext?: string };
    expect(coverPayload.text).toContain('Ahmad Al-Jamil');

    // 2. Page 2: Introduction
    const introSection = doc.sections[1];
    expect(introSection.type).toBe('introduction');
    expect(introSection.blocks).toHaveLength(2);
    expect(introSection.blocks[0].type).toBe('header');
    expect(introSection.blocks[1].type).toBe('paragraph');
    const introPayload = introSection.blocks[1].assets[0].payload as { text: string; body?: string };
    expect(introPayload.body).toContain('شجرة النسب والتسلسل العائلي');

    // 3. Page 3: Tree
    const treeSection = doc.sections[2];
    expect(treeSection.type).toBe('tree');
    expect(treeSection.blocks[0].assets[0].type).toBe('tree-diagram');

    // 4. Page 4: Timeline
    const timelineSection = doc.sections[3];
    expect(timelineSection.type).toBe('timeline');
    expect(timelineSection.blocks[0].type).toBe('timeline');
    // أحمد (1990), ابوه (1960), امه (1965) -> 3 events
    expect(timelineSection.blocks[0].assets).toHaveLength(3);
  });

  it('enforces strict type guards validation on tree section options', () => {
    // Modify a temporary template section definition to have invalid options
    const template = TemplateRegistry.getTemplate('classic-book-manuscript');
    
    const badTemplate = {
      ...template,
      sections: [
        {
          type: 'tree' as const,
          options: {
            variant: 'invalid-variant' as unknown as 'ancestor' | 'branch', // invalid option
          },
        },
      ],
    };

    // Override the registry or mock TemplateRegistry retrieve (we can check composition logic directly)
    const request: PublicationRequest = {
      rootPersonId: 'p-root',
      templateId: 'classic-book-manuscript',
      scope: { type: 'all' },
    };

    // Test with bad options to ensure type guard throws an error
    const spy = vi.spyOn(TemplateRegistry, 'getTemplate').mockReturnValue(badTemplate);

    expect(() => PublishingPipeline.composeDocument(request, mockPeople)).toThrow(
      'Invalid options passed to tree section definition.'
    );

    spy.mockRestore();
  });
});
