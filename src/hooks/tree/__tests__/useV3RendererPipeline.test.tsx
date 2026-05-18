
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useV3RendererPipeline } from '../useV3RendererPipeline';
import type { Person } from '../../../types';

const buildPerson = (overrides: Partial<Person> = {}): Person => ({
  id: 'root-person',
  title: '',
  firstName: 'Salem',
  middleName: '',
  lastName: 'Alharbi',
  birthName: '',
  nickName: '',
  suffix: '',
  gender: 'male',
  birthDate: '1948-01-01',
  birthPlace: '',
  birthSource: '',
  marriageDate: '',
  marriagePlace: '',
  deathDate: '',
  deathPlace: '',
  deathSource: '',
  burialPlace: '',
  residence: '',
  isDeceased: false,
  profession: '',
  company: '',
  interests: '',
  bio: '',
  photoUrl: '',
  gallery: [],
  voiceNotes: [],
  sources: [],
  events: [],
  email: '',
  website: '',
  blog: '',
  address: '',
  parents: [],
  spouses: [],
  children: [],
  partnerDetails: {},
  ...overrides,
});

describe('useV3RendererPipeline memoization', () => {
  it('keeps the same pipeline for visual-only person updates', () => {
    const root = buildPerson();
    const { result, rerender } = renderHook(
      ({ people }) => useV3RendererPipeline({ people, focusId: root.id }),
      { initialProps: { people: { [root.id]: root } } },
    );

    const initialPipeline = result.current;

    rerender({
      people: {
        [root.id]: {
          ...root,
          firstName: 'Renamed',
          photoUrl: 'https://example.com/root.jpg',
          profession: 'Historian',
        },
      },
    });

    expect(result.current).toBe(initialPipeline);
  });

  it('recomputes the pipeline when a layout-significant field changes', () => {
    const root = buildPerson();
    const { result, rerender } = renderHook(
      ({ people }) => useV3RendererPipeline({ people, focusId: root.id }),
      { initialProps: { people: { [root.id]: root } } },
    );

    const initialPipeline = result.current;

    rerender({
      people: {
        [root.id]: {
          ...root,
          birthDate: '1938-01-01',
        },
      },
    });

    expect(result.current).not.toBe(initialPipeline);
    expect(result.current?.projectedNodes).toHaveLength(1);
  });

  it('applies Appearance Lab spacing to projected geometry', () => {
    const child = buildPerson({ id: 'child-person', firstName: 'Child', parents: ['root-person'] });
    const root = buildPerson({ children: [child.id] });

    const { result, rerender } = renderHook(
      ({ settings }) => useV3RendererPipeline({
        people: { [root.id]: root, [child.id]: child },
        focusId: root.id,
        settings,
      }),
      { initialProps: { settings: { nodeSpacingX: 120, nodeSpacingY: 400, generationLimit: 5 } } },
    );

    const initialChild = result.current?.projectedNodes.find((node) => node.personId === child.id);

    rerender({ settings: { nodeSpacingX: 120, nodeSpacingY: 800, generationLimit: 5 } });

    const expandedChild = result.current?.projectedNodes.find((node) => node.personId === child.id);
    expect(expandedChild?.y).toBeGreaterThan(initialChild?.y ?? 0);
  });

  it('uses generationLimit to cap V3 traversal depth', () => {
    const grandchild = buildPerson({ id: 'grandchild-person', firstName: 'Grand', parents: ['child-person'] });
    const child = buildPerson({
      id: 'child-person',
      firstName: 'Child',
      parents: ['root-person'],
      children: [grandchild.id],
    });
    const root = buildPerson({ children: [child.id] });

    const { result } = renderHook(() => useV3RendererPipeline({
      people: {
        [root.id]: root,
        [child.id]: child,
        [grandchild.id]: grandchild,
      },
      focusId: root.id,
      settings: { nodeSpacingX: 120, nodeSpacingY: 400, generationLimit: 1 },
    }));

    expect(result.current?.projectedNodes.map((node) => node.personId)).toEqual([root.id]);
  });
});

