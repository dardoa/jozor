import { describe, expect, it } from 'vitest';
import {
  computeV3PipelineData,
  buildPeopleLayoutSignature,
} from '../v3LayoutPipeline';
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

describe('v3LayoutPipeline core logic', () => {
  describe('buildPeopleLayoutSignature', () => {
    it('produces the same signature for visual-only person updates', () => {
      const root = buildPerson();
      const initialSignature = buildPeopleLayoutSignature({ [root.id]: root });

      const updatedRoot = {
        ...root,
        firstName: 'Renamed',
        photoUrl: 'https://example.com/root.jpg',
        profession: 'Historian',
      };

      const updatedSignature = buildPeopleLayoutSignature({ [root.id]: updatedRoot });
      expect(updatedSignature).toBe(initialSignature);
    });

    it('produces a different signature when a layout-significant field changes', () => {
      const root = buildPerson();
      const initialSignature = buildPeopleLayoutSignature({ [root.id]: root });

      const updatedRoot = {
        ...root,
        birthDate: '1938-01-01', // Layout-significant for order
      };

      const updatedSignature = buildPeopleLayoutSignature({ [root.id]: updatedRoot });
      expect(updatedSignature).not.toBe(initialSignature);
    });
  });

  describe('computeV3PipelineData', () => {
    it('applies Appearance Lab spacing to projected geometry', () => {
      const child = buildPerson({ id: 'child-person', firstName: 'Child', parents: ['root-person'] });
      const root = buildPerson({ children: [child.id] });

      const initialPipeline = computeV3PipelineData({
        people: { [root.id]: root, [child.id]: child },
        focusId: root.id,
        collapsePoints: [],
        settings: { nodeSpacingX: 120, nodeSpacingY: 400, generationLimit: 5 },
      });

      const initialChild = initialPipeline?.projectedNodes.find((node) => node.personId === child.id);

      const expandedPipeline = computeV3PipelineData({
        people: { [root.id]: root, [child.id]: child },
        focusId: root.id,
        collapsePoints: [],
        settings: { nodeSpacingX: 120, nodeSpacingY: 800, generationLimit: 5 },
      });

      const expandedChild = expandedPipeline?.projectedNodes.find((node) => node.personId === child.id);
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

      const pipeline = computeV3PipelineData({
        people: {
          [root.id]: root,
          [child.id]: child,
          [grandchild.id]: grandchild,
        },
        focusId: root.id,
        collapsePoints: [],
        settings: { nodeSpacingX: 120, nodeSpacingY: 400, generationLimit: 1 },
      });

      expect(pipeline?.projectedNodes.map((node) => node.personId)).toEqual([root.id]);
    });
  });
});
