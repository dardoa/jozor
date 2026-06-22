import { describe, expect, it } from 'vitest';
import { TemplateRegistry } from '../../services/TemplateRegistry';
import { PublishingPipeline } from '../../services/PublishingPipeline';
import { PdfRenderer } from '../PdfRenderer';
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

describe('PdfRenderer Engine (Sprint 8)', () => {
  it('correctly compiles PlacedDocument into a multi-page jsPDF document', () => {
    const template = TemplateRegistry.getTemplate('classic-book-manuscript');
    
    const request: PublicationRequest = {
      rootPersonId: 'p-root',
      templateId: template.id,
      scope: {
        type: 'all',
      },
    };

    // 1. Compose & Layout
    const doc = PublishingPipeline.composeDocument(request, mockPeople);
    const placedDoc = PublishingPipeline.layoutDocument(doc, template);

    // 2. Render
    const pdfInstance = PdfRenderer.renderToPdf(placedDoc, template.theme);

    // Verify it is a valid jsPDF instance
    expect(pdfInstance).toBeDefined();
    expect(typeof pdfInstance.getNumberOfPages).toBe('function');
    
    // jsPDF stores page details in internal methods or properties.
    // In jsPDF, the page count can be fetched usinggetNumberOfPages()
    expect(pdfInstance.getNumberOfPages()).toBe(4);

    // 3. Render to Data URL
    const dataUrl = PdfRenderer.renderToDataUrl(placedDoc, template.theme);
    expect(typeof dataUrl).toBe('string');
    expect(dataUrl.startsWith('data:application/pdf')).toBe(true);
    expect(dataUrl).toContain('base64');
  });
});
