import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useExport } from '../useExport';
import { downloadFile } from '../../../utils/fileUtils';
import type { Person } from '../../../types';
import { generateICS } from '../../../utils/calendarLogic';
import { exportToGEDCOM } from '../../../utils/gedcomLogic';
import { buildBlueprintArchive } from '../../../services/archiveService';
import {
  HtmlManuscriptRenderer,
  ManuscriptStructureBuilder,
  PdfRenderer,
  PublishingPipeline,
  PublishingTracker,
} from '../../../features/publishing';

vi.mock('../../../utils/fileUtils', () => ({
  downloadFile: vi.fn(),
}));

vi.mock('../../../utils/calendarLogic', () => ({
  generateICS: vi.fn(() => 'mock-ics-data'),
}));

vi.mock('../../../utils/gedcomLogic', () => ({
  exportToGEDCOM: vi.fn(() => 'mock-gedcom-data'),
}));

vi.mock('../../../services/archiveService', () => ({
  buildBlueprintArchive: vi.fn(async (payload: unknown) => ({
    blob: new Blob([JSON.stringify(payload)], { type: 'application/octet-stream' }),
    manifest: {},
  })),
}));

vi.mock('../../../features/publishing', () => ({
  PublishingTracker: {
    startTracking: vi.fn(() => ({ id: 'track-1', manifest: {} })),
    endTracking: vi.fn(),
  },
  TemplateRegistry: {
    getTemplate: vi.fn(() => ({
      id: 'classic-book-manuscript',
      name: 'كتاب العائلة الكلاسيكي المصغر',
      publicationKind: 'book-manuscript',
      outputFamily: 'document',
      documentType: 'paginated',
      theme: {
        colors: { background: '#fff', text: '#111', subtext: '#666' },
        node: {
          male: { background: '#eef' },
          female: { background: '#fee' },
          borderColor: '#ccc',
          width: 120,
          height: 60,
        },
        edge: {
          father: { color: '#88f' },
          mother: { color: '#f88' },
          width: 2,
        },
        fonts: {
          fontFamily: 'system-ui',
          titleSize: '24px',
          nameSize: '13px',
          dateSize: '11px',
        },
      },
      sections: [{ type: 'cover' }],
      defaultLayoutOptions: {
        pageWidth: 595,
        pageHeight: 842,
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
      },
    })),
  },
  PublishingPipeline: {
    composeDocument: vi.fn(() => ({
      id: 'doc-1',
      title: 'mock publication',
      theme: 'classic',
      type: 'paginated',
      sections: [],
    })),
    layoutDocument: vi.fn(() => ({
      documentId: 'doc-1',
      totalPages: 1,
      sections: [],
    })),
  },
  PosterRenderer: {
    renderToCanvas: vi.fn(() => ({
      toDataURL: () => 'data:image/png;base64,mock',
    })),
  },
  PdfRenderer: {
    renderToPdf: vi.fn(() => ({
      save: vi.fn(),
    })),
  },
  ManuscriptStructureBuilder: {
    buildModel: vi.fn(() => ({
      id: 'manuscript-1',
      title: 'Family Manuscript',
      rootPersonId: 'person-1',
      chapters: [
        {
          id: 'people',
          type: 'people',
          title: 'People',
          people: [],
        },
        {
          id: 'timeline',
          type: 'timeline',
          title: 'Timeline',
          timeline: [],
        },
        {
          id: 'evidence',
          type: 'evidence',
          title: 'Evidence',
          citations: [],
        },
      ],
    })),
  },
  HtmlManuscriptRenderer: {
    renderToHtml: vi.fn(() => '<!doctype html><html><body>Arabic manuscript</body></html>'),
  },
}));

const { mockStore } = vi.hoisted(() => ({
  mockStore: {
    treeSettings: { theme: 'classic' },
    darkMode: false,
    user: { supabaseToken: 'token-123' },
    currentUserRole: 'owner',
    setExportStatus: vi.fn(),
    people: {},
    focusId: '',
    relationships: {},
    sources: {},
    citations: {},
    currentTreeId: 'tree-1',
  },
}));

vi.mock('../../../store/useAppStore', () => ({
  useAppStore: Object.assign(
    (selector: (state: typeof mockStore) => unknown) => selector(mockStore),
    {
      getState: () => mockStore,
      setState: (updates: Partial<typeof mockStore>) => {
        Object.assign(mockStore, updates);
      },
    }
  ),
}));

const mockPeople = {
  'person-1': {
    id: 'person-1',
    firstName: 'John',
    middleName: '',
    lastName: 'Doe',
    birthName: '',
    nickName: '',
    title: '',
    suffix: '',
    gender: 'male' as const,
    birthDate: '1990-01-01', // living person, so will be masked
    birthPlace: 'New York',
    birthSource: '',
    marriageDate: '',
    marriagePlace: '',
    deathDate: '',
    deathPlace: '',
    deathSource: '',
    burialPlace: '',
    residence: '',
    currentResidence: '',
    occupation: '',
    workplace: '',
    profession: '',
    company: '',
    interests: '',
    bio: '',
    parents: [],
    children: [],
    spouses: [],
    email: '',
    website: '',
    blog: '',
    address: '',
    gallery: [],
    voiceNotes: [],
    sources: [],
    events: [],
  },
} as unknown as Record<string, Person>;

describe('useExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStore.currentUserRole = 'owner';
    mockStore.people = mockPeople;
    mockStore.focusId = '';
    mockStore.relationships = {};
    mockStore.sources = {};
    mockStore.citations = {};
  });

  it('exports raw names for owner role', async () => {
    const svgRef = { current: null };
    const { result } = renderHook(() => useExport(mockPeople, svgRef));

    await act(async () => {
      await result.current.handleExport('json');
    });

    expect(downloadFile).toHaveBeenCalled();
    const [data] = vi.mocked(downloadFile).mock.calls[0];
    const parsed = JSON.parse(data as string);
    expect(parsed.people['person-1'].firstName).toBe('John');
  });

  it('exports masked names for viewer role', async () => {
    mockStore.currentUserRole = 'viewer';
    const svgRef = { current: null };
    const { result } = renderHook(() => useExport(mockPeople, svgRef));

    await act(async () => {
      await result.current.handleExport('json');
    });

    expect(downloadFile).toHaveBeenCalled();
    const [data] = vi.mocked(downloadFile).mock.calls[0];
    const parsed = JSON.parse(data as string);
    // John Doe should be masked to 'Private'
    expect(parsed.people['person-1'].firstName).toBe('Private');
    expect(parsed.people['person-1'].birthDate).toBe('');
  });

  it('passes masked people to GEDCOM and ICS exports for viewer role', async () => {
    mockStore.currentUserRole = 'viewer';
    const svgRef = { current: null };
    const { result } = renderHook(() => useExport(mockPeople, svgRef));

    await act(async () => {
      await result.current.handleExport('gedcom');
      await result.current.handleExport('ics');
    });

    const gedcomPeople = vi.mocked(exportToGEDCOM).mock.calls[0][0];
    const icsPeople = vi.mocked(generateICS).mock.calls[0][0];
    expect(gedcomPeople['person-1'].firstName).toBe('Private');
    expect(icsPeople['person-1'].firstName).toBe('Private');
  });

  it('passes masked people to JOZOR archive exports for viewer role', async () => {
    mockStore.currentUserRole = 'viewer';
    const svgRef = { current: null };
    const { result } = renderHook(() => useExport(mockPeople, svgRef));

    await act(async () => {
      await result.current.handleExport('jozor');
    });

    const archivePayload = vi.mocked(buildBlueprintArchive).mock.calls[0][0] as {
      people: Record<string, Person>;
    };
    expect(archivePayload.people['person-1'].firstName).toBe('Private');
    expect(archivePayload.people['person-1'].birthDate).toBe('');
  });

  it('passes masked people and current relationships to publishing exports for viewer role', async () => {
    mockStore.currentUserRole = 'viewer';
    mockStore.relationships = {
      'edge-1': {
        id: 'edge-1',
        treeId: 'tree-1',
        fromPersonId: 'person-parent',
        toPersonId: 'person-1',
        type: 'BIOLOGICAL_PARENT',
        status: 'ACTIVE',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    };
    mockStore.sources = {
      'source-1': {
        id: 'source-1',
        treeId: 'tree-1',
        type: 'DOCUMENT',
        title: 'Birth registry',
        normalizedKey: 'tree-1:DOCUMENT:birth registry',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    };
    mockStore.citations = {
      'citation-1': {
        id: 'citation-1',
        treeId: 'tree-1',
        sourceId: 'source-1',
        targetType: 'PERSON',
        targetId: 'person-1',
        targetField: 'person.birth.date',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    };
    const svgRef = { current: null };
    const { result } = renderHook(() => useExport(mockPeople, svgRef));

    await act(async () => {
      await result.current.handlePublishingExport({ templateId: 'classic-book-manuscript', format: 'pdf' });
    });

    const [, peopleArg, relationshipsArg, evidenceArg] = vi.mocked(PublishingPipeline.composeDocument).mock.calls[0];
    expect(peopleArg['person-1'].firstName).toBe('Private');
    expect(relationshipsArg).toBe(mockStore.relationships);
    expect(evidenceArg).toEqual({ sources: mockStore.sources, citations: mockStore.citations });
    expect(PublishingTracker.startTracking).toHaveBeenCalledWith(expect.objectContaining({
      templateId: 'classic-book-manuscript',
      exportType: 'publishing',
      people: expect.objectContaining({
        'person-1': expect.objectContaining({ firstName: 'Private' }),
      }),
      relationships: mockStore.relationships,
      sources: mockStore.sources,
      citations: mockStore.citations,
      userRole: 'viewer',
      treeId: 'tree-1',
    }));
    expect(PdfRenderer.renderToPdf).toHaveBeenCalled();
  });

  it('opens the enhanced HTML manuscript print pipeline with masked viewer data', async () => {
    mockStore.currentUserRole = 'viewer';
    const printDocument = document.implementation.createHTMLDocument('print');
    const printWindow = {
      document: printDocument,
      focus: vi.fn(),
      print: vi.fn(),
      setTimeout: window.setTimeout.bind(window),
    } as unknown as Window;
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(printWindow);
    const svgRef = { current: null };
    const { result } = renderHook(() => useExport(mockPeople, svgRef));

    await act(async () => {
      await result.current.handlePublishingExport({
        templateId: 'classic-book-manuscript',
        format: 'pdf',
        renderer: 'html-print',
      });
    });

    expect(openSpy).toHaveBeenCalled();
    expect(ManuscriptStructureBuilder.buildModel).toHaveBeenCalledWith(expect.objectContaining({
      rootPersonId: 'person-1',
      people: expect.objectContaining({
        'person-1': expect.objectContaining({ firstName: 'Private' }),
      }),
      relationshipEdges: mockStore.relationships,
      evidence: { sources: mockStore.sources, citations: mockStore.citations },
    }));
    expect(HtmlManuscriptRenderer.renderToHtml).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Family Manuscript' }),
      expect.objectContaining({ language: 'en', title: 'Family Manuscript' })
    );
    expect(PdfRenderer.renderToPdf).not.toHaveBeenCalled();
    expect(printWindow.print).toHaveBeenCalled();
    expect(PublishingTracker.endTracking).toHaveBeenCalledWith(
      expect.anything(),
      true,
      [],
      [expect.objectContaining({ name: 'Family Manuscript.pdf', format: 'pdf' })]
    );

    openSpy.mockRestore();
  });

  it('builds an HTML manuscript preview with masked viewer data', async () => {
    mockStore.currentUserRole = 'viewer';
    const svgRef = { current: null };
    const { result } = renderHook(() => useExport(mockPeople, svgRef));

    let preview: Awaited<ReturnType<typeof result.current.handlePublishingPreview>>;
    await act(async () => {
      preview = await result.current.handlePublishingPreview({
        templateId: 'classic-book-manuscript',
        renderer: 'html-print',
      });
    });

    expect(preview!.title).toBe('Family Manuscript');
    expect(preview!.html).toContain('Arabic manuscript');
    expect(preview!.pageEstimate).toBeGreaterThan(0);
    expect(ManuscriptStructureBuilder.buildModel).toHaveBeenCalledWith(expect.objectContaining({
      people: expect.objectContaining({
        'person-1': expect.objectContaining({ firstName: 'Private' }),
      }),
    }));
    expect(HtmlManuscriptRenderer.renderToHtml).toHaveBeenCalled();
  });

  it('filters HTML manuscript preview chapters with manuscript options', async () => {
    const svgRef = { current: null };
    const { result } = renderHook(() => useExport(mockPeople, svgRef));

    await act(async () => {
      await result.current.handlePublishingPreview({
        templateId: 'classic-book-manuscript',
        renderer: 'html-print',
        manuscriptOptions: {
          includeTimeline: false,
          includeEvidence: false,
        },
      });
    });

    const lastRenderCall = vi.mocked(HtmlManuscriptRenderer.renderToHtml).mock.calls.at(-1);
    expect(lastRenderCall?.[0].chapters.map((chapter) => chapter.type)).toEqual(['people']);
  });
});
