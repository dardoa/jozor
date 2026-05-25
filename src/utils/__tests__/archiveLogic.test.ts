import JSZip from 'jszip';
import { describe, expect, it, vi } from 'vitest';

import { importFromJozorArchive, importJozorArchiveData } from '../archiveLogic';

vi.mock('../../services/googleService', () => ({
  googleMediaService: {
    fetchFileAsBlob: vi.fn(),
  },
}));

const createArchiveFile = async (payload: unknown) => {
  const zip = new JSZip();
  zip.file('family_data.json', JSON.stringify(payload));
  const blob = await zip.generateAsync({ type: 'blob' });
  return new File([blob], 'family.jozor', { type: 'application/zip' });
};

describe('archiveLogic', () => {
  it('imports wrapped Jozor archives exported with a people object', async () => {
    const file = await createArchiveFile({
      people: {
        person_1: {
          id: 'person_1',
          firstName: 'Root',
          lastName: 'Person',
          gender: 'male',
          parents: [],
          children: [],
          spouses: [],
        },
      },
      settings: { treeSettings: { chartType: 'focus' } },
    });

    const people = await importFromJozorArchive(file);

    expect(Object.keys(people)).toEqual(['person_1']);
    expect(people.person_1.firstName).toBe('Root');
    expect(people.person_1.lastName).toBe('Person');
  });

  it('exposes archive settings for cloud tree imports', async () => {
    const file = await createArchiveFile({
      people: {
        person_1: {
          id: 'person_1',
          firstName: 'Root',
          lastName: 'Person',
          gender: 'male',
          parents: [],
          children: [],
          spouses: [],
        },
      },
      settings: { treeSettings: { chartType: 'radial' } },
    });

    const data = await importJozorArchiveData(file);

    expect(data.people.person_1.firstName).toBe('Root');
    expect(data.settings).toEqual({ treeSettings: { chartType: 'radial' } });
  });
});
