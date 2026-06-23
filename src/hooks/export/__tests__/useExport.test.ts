import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useExport } from '../useExport';
import { downloadFile } from '../../../utils/fileUtils';
import type { Person } from '../../../types';

vi.mock('../../../utils/fileUtils', () => ({
  downloadFile: vi.fn(),
}));

vi.mock('../../../utils/calendarLogic', () => ({
  generateICS: vi.fn(() => 'mock-ics-data'),
}));

vi.mock('../../../utils/gedcomLogic', () => ({
  exportToGEDCOM: vi.fn(() => 'mock-gedcom-data'),
}));

vi.mock('../../../features/publishing', () => ({
  PublishingTracker: {
    startTracking: vi.fn(() => ({ id: 'track-1', manifest: {} })),
    endTracking: vi.fn(),
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
});
