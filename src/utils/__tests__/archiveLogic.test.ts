import JSZip from 'jszip';
import { describe, expect, it, vi } from 'vitest';

import { importFromJozorArchive, importJozorArchiveData } from '../archiveLogic';
import { buildBlueprintArchive } from '../../services/archiveService';

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

  it('imports current blueprint Jozor archives with tree settings', async () => {
    const { blob } = await buildBlueprintArchive({
      version: 1,
      people: {
        person_1: {
          id: 'person_1',
          firstName: 'Root',
          lastName: 'Person',
          gender: 'male',
          parents: [],
          children: [],
          spouses: [],
        } as any,
      },
      settings: { treeSettings: { chartType: 'radial' } as any },
      focusId: 'person_1',
      metadata: {
        lastModified: Date.parse('2026-05-25T00:00:00.000Z'),
        appName: 'Jozor',
      },
    }, {
      label: 'test-export',
      createdAt: '2026-05-25T00:00:00.000Z',
    });
    const file = new File([blob], 'family.jozor', { type: 'application/octet-stream' });

    const data = await importJozorArchiveData(file);

    expect(data.people.person_1.firstName).toBe('Root');
    expect(data.settings).toEqual({ treeSettings: { chartType: 'radial' } });
  });

  it('does not rehydrate encoded traversal media paths', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const zip = new JSZip();
    zip.file('family_data.json', JSON.stringify({
      people: {
        person_1: {
          id: 'person_1',
          firstName: 'Root',
          lastName: 'Person',
          gender: 'male',
          parents: [],
          children: [],
          spouses: [],
          photoUrl: 'images/%2e%2e/secret.png',
        },
      },
    }));
    zip.file('images/%2e%2e/secret.png', 'not-an-image');
    const blob = await zip.generateAsync({ type: 'blob' });
    const file = new File([blob], 'family.jozor', { type: 'application/zip' });

    const data = await importJozorArchiveData(file);

    expect(data.people.person_1.photoUrl).toBe('images/%2e%2e/secret.png');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid or suspicious media path'));
    warnSpy.mockRestore();
  });
});
