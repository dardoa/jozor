
import React from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { V3FamilyGraphRenderer } from '../V3FamilyGraphRenderer';
import type { Person, TreeSettings } from '../../../types';
import type { V3RendererPipeline } from '../../../hooks/tree/useV3RendererPipeline';

const nodeComponentMock = vi.hoisted(() => vi.fn(() => null));

vi.mock('../../tree/node/NodeComponent', () => ({
  NodeComponent: nodeComponentMock,
}));

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

const settings: TreeSettings = {
  nodeWidth: 180,
  isCompact: false,
  boxColorLogic: 'none',
  showFirstName: true,
  showMiddleName: true,
  showLastName: true,
  showNickname: true,
  showSuffix: true,
  showDates: true,
  showMarriageDate: true,
  showBirthPlace: true,
  showResidence: true,
  showMarriagePlace: true,
  showBurialPlace: true,
  showOccupation: true,
  showPhotos: true,
  privacyMode: false,
  showGender: true,
  textSize: 12,
} as TreeSettings;

const pipeline: V3RendererPipeline = {
  projectedNodes: [{
    uniqueEntityId: 'person:root-person',
    personId: 'root-person',
    x: 24,
    y: 48,
    isCanonical: true,
    isReference: false,
  }],
  familyNodes: [],
  edgeEntities: [],
  collapseControls: [],
  bounds: { minX: 24, minY: 48, maxX: 24, maxY: 48 },
};

const renderGraph = (
  person: Person,
  people = { [person.id]: person },
  pipelineOverride: V3RendererPipeline = pipeline,
  settingsOverride: TreeSettings = settings,
) => (
  <svg>
    <V3FamilyGraphRenderer
      people={people}
      settings={settingsOverride}
      pipeline={pipelineOverride}
      focusPersonId={person.id}
      onSelect={() => undefined}
      onNodeContextMenu={() => undefined}
    />
  </svg>
);

describe('V3FamilyGraphRenderer node stability', () => {
  beforeEach(() => {
    nodeComponentMock.mockClear();
  });

  it('reuses unchanged TreeNode objects across people map refreshes', () => {
    const person = buildPerson();
    const { rerender } = render(renderGraph(person));

    const initialNode = (nodeComponentMock as any).mock.calls[0][0].node;

    rerender(renderGraph(person, { [person.id]: person }));

    const refreshedNode = (nodeComponentMock as any).mock.calls.at(-1)?.[0].node;
    expect(refreshedNode).toBe(initialNode);
  });

  it('replaces the TreeNode object when the rendered person changes', () => {
    const person = buildPerson();
    const { rerender } = render(renderGraph(person));

    const initialNode = (nodeComponentMock as any).mock.calls[0][0].node;
    const renamedPerson = { ...person, firstName: 'Noura' };

    rerender(renderGraph(renamedPerson));

    const refreshedNode = (nodeComponentMock as any).mock.calls.at(-1)?.[0].node;
    expect(refreshedNode).not.toBe(initialNode);
    expect(refreshedNode.data).toBe(renamedPerson);
  });

  it('keeps the original V3 step path and applies line thickness', () => {
    const person = buildPerson();
    const edgePipeline: V3RendererPipeline = {
      ...pipeline,
      edgeEntities: [{
        id: 'edge-1',
        type: 'child-drop',
        pathData: 'M 0 0 L 0 80 L 120 80',
        metadata: {
          familyId: 'family:root',
          sourcePersonId: null,
          targetPersonId: person.id,
        },
      }],
      bounds: { minX: 0, minY: 0, maxX: 120, maxY: 80 },
    };

    const { container } = render(renderGraph(
      person,
      { [person.id]: person },
      edgePipeline,
      { ...settings, lineStyle: 'step', lineThickness: 5 },
    ));

    const edge = container.querySelector('[data-edge-id="edge-1"]');
    expect(edge).toHaveAttribute('stroke-width', '5');
    expect(edge).toHaveAttribute('d', 'M 0 0 L 0 80 L 120 80');
  });

  it('rounds corners for curved V3 edges without collapsing intermediate routing points', () => {
    const person = buildPerson();
    const edgePipeline: V3RendererPipeline = {
      ...pipeline,
      edgeEntities: [{
        id: 'edge-1',
        type: 'family-trunk',
        pathData: 'M 0 0 L 0 80 L 120 80 L 120 160',
        metadata: {
          familyId: 'family:root',
          sourcePersonId: null,
          targetPersonId: person.id,
        },
      }],
      bounds: { minX: 0, minY: 0, maxX: 120, maxY: 160 },
    };

    const { container } = render(renderGraph(
      person,
      { [person.id]: person },
      edgePipeline,
      { ...settings, lineStyle: 'curved', lineThickness: 3 },
    ));

    const edge = container.querySelector('[data-edge-id="edge-1"]');
    const pathData = edge?.getAttribute('d') ?? '';

    expect(edge).toHaveAttribute('stroke-width', '3');
    expect(pathData).toContain('Q');
    expect(pathData).toMatch(/^M 0 0/);
    expect(pathData).toMatch(/L 120 160$/);
    expect(pathData).not.toBe('M 0 0 L 120 160');
  });

  it('replaces family bars and child drops with visible curved family connectors', () => {
    const person = buildPerson();
    const edgePipeline: V3RendererPipeline = {
      ...pipeline,
      edgeEntities: [
        {
          id: 'family-trunk-1',
          type: 'family-trunk',
          pathData: 'M 60 0 L 60 80',
          metadata: {
            familyId: 'family:root',
            sourcePersonId: null,
            targetPersonId: null,
          },
        },
        {
          id: 'sibling-bar-1',
          type: 'sibling-bar',
          pathData: 'M 0 80 L 120 80',
          metadata: {
            familyId: 'family:root',
            sourcePersonId: null,
            targetPersonId: null,
          },
        },
        {
          id: 'child-drop-left',
          type: 'child-drop',
          pathData: 'M 0 80 L 0 160',
          metadata: {
            familyId: 'family:root',
            sourcePersonId: null,
            targetPersonId: person.id,
          },
        },
        {
          id: 'child-drop-right',
          type: 'child-drop',
          pathData: 'M 120 80 L 120 160',
          metadata: {
            familyId: 'family:root',
            sourcePersonId: null,
            targetPersonId: person.id,
          },
        },
      ],
      bounds: { minX: 0, minY: 0, maxX: 120, maxY: 160 },
    };

    const { container } = render(renderGraph(
      person,
      { [person.id]: person },
      edgePipeline,
      { ...settings, lineStyle: 'curved', lineThickness: 2 },
    ));

    expect(container.querySelector('[data-edge-id="sibling-bar-1"]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-edge-id="family-trunk-1"]')).not.toBeInTheDocument();

    const leftDrop = container.querySelector('[data-edge-id="child-drop-left"]');
    const rightDrop = container.querySelector('[data-edge-id="child-drop-right"]');
    expect(leftDrop?.getAttribute('d')).toMatch(/^M 60 0 L 60 119 C 60 140.32 0 140.32 0 160$/);
    expect(rightDrop?.getAttribute('d')).toMatch(/^M 60 0 L 60 119 C 60 140.32 120 140.32 120 160$/);
  });
});

