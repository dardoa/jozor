
import { describe, expect, it } from 'vitest';
import type { Person } from '../../types';
import { V3_HALF_CARD_W, V3_PARTNER_GAP } from '../../utils/layout/constants';
import { buildFamilyGraph } from '../familyGraph';
import {
  buildFamilyGraphClusterLayout,
} from '../familyGraphClusterLayout';
import { buildLayoutSemanticsSnapshot } from '../familyGraphSemantics';

const makePerson = (id: string, overrides: Partial<Person> = {}): Person => ({
  id,
  title: '',
  firstName: id,
  middleName: '',
  lastName: 'Person',
  birthName: '',
  nickName: '',
  suffix: '',
  gender: 'male',
  birthDate: '',
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
  ...overrides,
});



function buildMultiSpouseFixture(): Record<string, Person> {
  return {
    father: makePerson('father', {
      spouses: ['wifeA', 'wifeB'],
      children: ['childA1', 'childA2', 'childB1'],
    }),
    wifeA: makePerson('wifeA', {
      gender: 'female',
      spouses: ['father'],
      children: ['childA1', 'childA2'],
    }),
    wifeB: makePerson('wifeB', {
      gender: 'female',
      spouses: ['father'],
      children: ['childB1'],
    }),
    childA1: makePerson('childA1', {
      parents: ['father', 'wifeA'],
      spouses: ['childA1Spouse'],
      children: ['grandchild'],
    }),
    childA1Spouse: makePerson('childA1Spouse', {
      gender: 'female',
      spouses: ['childA1'],
      children: ['grandchild'],
    }),
    childA2: makePerson('childA2', { parents: ['father', 'wifeA'] }),
    childB1: makePerson('childB1', { parents: ['father', 'wifeB'] }),
    grandchild: makePerson('grandchild', { parents: ['childA1', 'childA1Spouse'] }),
  };
}

describe('buildFamilyGraphClusterLayout reference card rules', () => {
  const buildCousinMarriageFixture = (relativeGender: Person['gender'] = 'female'): Record<string, Person> => ({
    grand: makePerson('grand', { spouses: ['grandSpouse'], children: ['leftParent', 'rightParent'] }),
    grandSpouse: makePerson('grandSpouse', {
      gender: 'female',
      spouses: ['grand'],
      children: ['leftParent', 'rightParent'],
    }),
    leftParent: makePerson('leftParent', {
      parents: ['grand', 'grandSpouse'],
      spouses: ['leftSpouse'],
      children: ['leftCousin'],
    }),
    leftSpouse: makePerson('leftSpouse', {
      gender: 'female',
      spouses: ['leftParent'],
      children: ['leftCousin'],
    }),
    rightParent: makePerson('rightParent', {
      parents: ['grand', 'grandSpouse'],
      spouses: ['rightSpouse'],
      children: ['rightCousin'],
    }),
    rightSpouse: makePerson('rightSpouse', {
      gender: 'female',
      spouses: ['rightParent'],
      children: ['rightCousin'],
    }),
    leftCousin: makePerson('leftCousin', {
      parents: ['leftParent', 'leftSpouse'],
      spouses: ['rightCousin'],
      children: ['sharedChild'],
    }),
    rightCousin: makePerson('rightCousin', {
      gender: relativeGender,
      parents: ['rightParent', 'rightSpouse'],
      spouses: ['leftCousin'],
      children: ['sharedChild'],
    }),
    sharedChild: makePerson('sharedChild', { parents: ['leftCousin', 'rightCousin'] }),
  });

  it('uses a reference card for a female relative spouse while preserving her canonical branch', () => {
    const people = buildCousinMarriageFixture('female');
    const graph = buildFamilyGraph(people);
    const semantics = buildLayoutSemanticsSnapshot(graph, 'grand', people);
    const layout = buildFamilyGraphClusterLayout(graph, semantics, 'grand', people);
    const cousinFamily = layout.clusters['family:leftCousin__rightCousin'];
    const referencePartnerId = cousinFamily.parentEntityIds.find((entityId) => entityId.startsWith('ref:'));

    expect(layout.nodes.rightCousin?.renderRole).toBe('canonical');
    expect(referencePartnerId).toBe('ref:family:leftCousin__rightCousin:rightCousin');
    expect(layout.nodes[referencePartnerId!]).toMatchObject({
      personId: 'rightCousin',
      renderRole: 'reference',
    });
    expect(cousinFamily.childEntityIds).toEqual(['sharedChild']);
  });

  it('does not mark a male relative as a local reference card', () => {
    const people = buildCousinMarriageFixture('male');
    const graph = buildFamilyGraph(people);
    const semantics = buildLayoutSemanticsSnapshot(graph, 'grand', people);
    const layout = buildFamilyGraphClusterLayout(graph, semantics, 'grand', people);
    const cousinFamily = layout.clusters['family:leftCousin__rightCousin'];

    expect(cousinFamily.parentEntityIds.some((entityId) => entityId.startsWith('ref:'))).toBe(false);
    expect(layout.nodes.rightCousin?.renderRole).toBe('canonical');
  });

  it('renders a child spouse as a full local canonical card instead of falling back to reference', () => {
    const people: Record<string, Person> = {
      root: makePerson('root', { spouses: ['rootSpouse'], children: ['child'] }),
      rootSpouse: makePerson('rootSpouse', {
        gender: 'female',
        spouses: ['root'],
        children: ['child'],
      }),
      child: makePerson('child', {
        parents: ['root', 'rootSpouse'],
        spouses: ['inLaw'],
        children: ['grandchild'],
      }),
      inLaw: makePerson('inLaw', {
        gender: 'female',
        spouses: ['child'],
        children: ['grandchild'],
      }),
      grandchild: makePerson('grandchild', { parents: ['child', 'inLaw'] }),
    };
    const graph = buildFamilyGraph(people);
    const semantics = buildLayoutSemanticsSnapshot(graph, 'root', people);
    const layout = buildFamilyGraphClusterLayout(graph, semantics, 'root', people);
    const childFamily = layout.clusters['family:child__inLaw'];

    expect(childFamily.parentEntityIds).toContain('inLaw');
    expect(childFamily.parentEntityIds.some((entityId) => entityId.startsWith('ref:'))).toBe(false);
    expect(layout.nodes.inLaw?.renderRole).toBe('canonical');
  });
});

describe.skip('buildFamilyGraphClusterLayout', () => {
  it('keeps a spouse line on the inner edges and puts the marriage point at its midpoint', () => {
    const people = {
      alex: makePerson('alex', { spouses: ['sam'], children: ['casey'] }),
      sam: makePerson('sam', { gender: 'female', spouses: ['alex'], children: ['casey'] }),
      casey: makePerson('casey', { parents: ['alex', 'sam'] }),
    };
    const graph = buildFamilyGraph(people);
    const semantics = buildLayoutSemanticsSnapshot(graph, 'alex', people);
    const layout = buildFamilyGraphClusterLayout(graph, semantics, 'alex');
    const cluster = layout.clusters['family:alex__sam'];

    expect(cluster).toBeDefined();
    expect(cluster.edgePoints.partnerStart?.x).toBe(layout.nodes.alex.x + V3_HALF_CARD_W);
    expect(cluster.edgePoints.partnerEnd?.x).toBe(layout.nodes.sam.x - V3_HALF_CARD_W);
    expect(cluster.marriagePoint.x).toBe(
      ((cluster.edgePoints.partnerStart?.x ?? 0) + (cluster.edgePoints.partnerEnd?.x ?? 0)) / 2
    );
  });

  it('keeps one canonical card for a multi-spouse person and alternates spouses around it', () => {
    const people = buildMultiSpouseFixture();
    const graph = buildFamilyGraph(people);
    const semantics = buildLayoutSemanticsSnapshot(graph, 'father', people);
    const layout = buildFamilyGraphClusterLayout(graph, semantics, 'father');

    const fatherNodes = Object.values(layout.nodes).filter((node) => node.personId === 'father');
    expect(fatherNodes.map((node) => node.entityId)).toEqual(['father']);
    expect(Math.abs(layout.nodes.wifeA.x - layout.nodes.father.x)).toBe(V3_PARTNER_GAP);
    expect(Math.abs(layout.nodes.wifeB.x - layout.nodes.father.x)).toBe(V3_PARTNER_GAP);
    expect(Math.sign(layout.nodes.wifeA.x - layout.nodes.father.x)).toBe(
      -Math.sign(layout.nodes.wifeB.x - layout.nodes.father.x)
    );
  });

  it('partitions multi-spouse children by their parent family and sorts them by birth date', () => {
    const people = {
      father: makePerson('father', {
        spouses: ['wifeA', 'wifeB'],
        children: ['bYoungest', 'aMiddle', 'bOldest', 'aOldest'],
      }),
      wifeA: makePerson('wifeA', {
        gender: 'female',
        spouses: ['father'],
        children: ['aMiddle', 'aOldest'],
      }),
      wifeB: makePerson('wifeB', {
        gender: 'female',
        spouses: ['father'],
        children: ['bYoungest', 'bOldest'],
      }),
      aMiddle: makePerson('aMiddle', {
        parents: ['father', 'wifeA'],
        birthDate: '1935-01-01',
      }),
      aOldest: makePerson('aOldest', {
        parents: ['father', 'wifeA'],
        birthDate: '1930-01-01',
      }),
      bYoungest: makePerson('bYoungest', {
        parents: ['father', 'wifeB'],
        birthDate: '1940-01-01',
      }),
      bOldest: makePerson('bOldest', {
        parents: ['father', 'wifeB'],
        birthDate: '1928-01-01',
      }),
    };
    const graph = buildFamilyGraph(people);
    const semantics = buildLayoutSemanticsSnapshot(graph, 'father', people);
    const layout = buildFamilyGraphClusterLayout(graph, semantics, 'father', people);
    const familyA = layout.clusters['family:father__wifeA'];
    const familyB = layout.clusters['family:father__wifeB'];

    expect(familyA.childEntityIds.map((entityId) => layout.nodes[entityId].personId)).toEqual([
      'aOldest',
      'aMiddle',
    ]);
    expect(familyB.childEntityIds.map((entityId) => layout.nodes[entityId].personId)).toEqual([
      'bOldest',
      'bYoungest',
    ]);
    familyA.childEntityIds.forEach((entityId) => {
      expect(Math.sign(layout.nodes[entityId].x - familyA.marriagePoint.x)).toBe(
        Math.sign(layout.nodes.wifeA.x - layout.nodes.father.x)
      );
    });
    familyB.childEntityIds.forEach((entityId) => {
      expect(Math.sign(layout.nodes[entityId].x - familyB.marriagePoint.x)).toBe(
        Math.sign(layout.nodes.wifeB.x - layout.nodes.father.x)
      );
    });
    familyA.childEntityIds.forEach((entityId) => {
      const childX = layout.nodes[entityId].x;
      expect(childX).toBeGreaterThanOrEqual(familyA.edgePoints.childBandStart!.x);
      expect(childX).toBeLessThanOrEqual(familyA.edgePoints.childBandEnd!.x);
    });
    familyB.childEntityIds.forEach((entityId) => {
      const childX = layout.nodes[entityId].x;
      expect(childX).toBeGreaterThanOrEqual(familyB.edgePoints.childBandStart!.x);
      expect(childX).toBeLessThanOrEqual(familyB.edgePoints.childBandEnd!.x);
    });
  });

  it('keeps a married child and their spouse visible as the parents of their own cluster', () => {
    const people = buildMultiSpouseFixture();
    const graph = buildFamilyGraph(people);
    const semantics = buildLayoutSemanticsSnapshot(graph, 'father', people);
    const layout = buildFamilyGraphClusterLayout(graph, semantics, 'father');
    const cluster = layout.clusters['family:childA1__childA1Spouse'];

    expect(layout.nodes.childA1).toBeDefined();
    expect(layout.nodes.childA1Spouse).toBeDefined();
    expect(cluster.parentEntityIds).toEqual(['childA1', 'childA1Spouse']);
    expect(Math.abs(layout.nodes.childA1Spouse.x - layout.nodes.childA1.x)).toBe(V3_PARTNER_GAP);
  });

  it.skip('derives renderer positions and edges from the same cluster points', () => {});

  it('uses a local reference card for cousin marriage partners from another branch', () => {
    const people = {
      grand: makePerson('grand', { spouses: ['grandSpouse'], children: ['leftParent', 'rightParent'] }),
      grandSpouse: makePerson('grandSpouse', {
        gender: 'female',
        spouses: ['grand'],
        children: ['leftParent', 'rightParent'],
      }),
      leftParent: makePerson('leftParent', {
        parents: ['grand', 'grandSpouse'],
        spouses: ['leftSpouse'],
        children: ['leftCousin'],
      }),
      leftSpouse: makePerson('leftSpouse', {
        gender: 'female',
        spouses: ['leftParent'],
        children: ['leftCousin'],
      }),
      rightParent: makePerson('rightParent', {
        parents: ['grand', 'grandSpouse'],
        spouses: ['rightSpouse'],
        children: ['rightCousin'],
      }),
      rightSpouse: makePerson('rightSpouse', {
        gender: 'female',
        spouses: ['rightParent'],
        children: ['rightCousin'],
      }),
      leftCousin: makePerson('leftCousin', {
        parents: ['leftParent', 'leftSpouse'],
        spouses: ['rightCousin'],
        children: ['sharedChild'],
      }),
      rightCousin: makePerson('rightCousin', {
        parents: ['rightParent', 'rightSpouse'],
        spouses: ['leftCousin'],
        children: ['sharedChild'],
      }),
      sharedChild: makePerson('sharedChild', { parents: ['leftCousin', 'rightCousin'] }),
    };
    const graph = buildFamilyGraph(people);
    const semantics = buildLayoutSemanticsSnapshot(graph, 'grand', people);
    const layout = buildFamilyGraphClusterLayout(graph, semantics, 'grand', people);
    const cousinFamily = layout.clusters['family:leftCousin__rightCousin'];
    const referencePartnerId = cousinFamily.parentEntityIds.find((entityId) => entityId.startsWith('ref:'));

    expect(layout.nodes.leftCousin).toBeDefined();
    expect(layout.nodes.rightCousin).toBeDefined();
    expect(referencePartnerId).toBeDefined();
    expect(layout.nodes[referencePartnerId!].personId).toBe('rightCousin');
    expect(Math.abs(layout.nodes[referencePartnerId!].x - layout.nodes.leftCousin.x)).toBe(V3_PARTNER_GAP);
  });

  it('separates independent clusters without changing spouse spacing', () => {
    const people = {
      root: makePerson('root', { spouses: ['rootSpouse'], children: ['left', 'right'] }),
      rootSpouse: makePerson('rootSpouse', {
        gender: 'female',
        spouses: ['root'],
        children: ['left', 'right'],
      }),
      left: makePerson('left', {
        parents: ['root', 'rootSpouse'],
        spouses: ['leftSpouse'],
        children: ['leftChild1', 'leftChild2', 'leftChild3'],
      }),
      leftSpouse: makePerson('leftSpouse', {
        gender: 'female',
        spouses: ['left'],
        children: ['leftChild1', 'leftChild2', 'leftChild3'],
      }),
      right: makePerson('right', {
        parents: ['root', 'rootSpouse'],
        spouses: ['rightSpouse'],
        children: ['rightChild1', 'rightChild2', 'rightChild3'],
      }),
      rightSpouse: makePerson('rightSpouse', {
        gender: 'female',
        spouses: ['right'],
        children: ['rightChild1', 'rightChild2', 'rightChild3'],
      }),
      leftChild1: makePerson('leftChild1', { parents: ['left', 'leftSpouse'] }),
      leftChild2: makePerson('leftChild2', { parents: ['left', 'leftSpouse'] }),
      leftChild3: makePerson('leftChild3', { parents: ['left', 'leftSpouse'] }),
      rightChild1: makePerson('rightChild1', { parents: ['right', 'rightSpouse'] }),
      rightChild2: makePerson('rightChild2', { parents: ['right', 'rightSpouse'] }),
      rightChild3: makePerson('rightChild3', { parents: ['right', 'rightSpouse'] }),
    };
    const graph = buildFamilyGraph(people);
    const semantics = buildLayoutSemanticsSnapshot(graph, 'root', people);
    const layout = buildFamilyGraphClusterLayout(graph, semantics, 'root');
    const leftCluster = layout.clusters['family:left__leftSpouse'];
    const rightCluster = layout.clusters['family:right__rightSpouse'];

    const leftNodes = [...leftCluster.parentEntityIds, ...leftCluster.childEntityIds]
      .map((entityId) => layout.nodes[entityId]);
    const rightNodes = [...rightCluster.parentEntityIds, ...rightCluster.childEntityIds]
      .map((entityId) => layout.nodes[entityId]);
    leftNodes.forEach((leftNode) => {
      rightNodes
        .filter((rightNode) => rightNode.generation === leftNode.generation)
        .forEach((rightNode) => {
          const gap = Math.abs(rightNode.x - leftNode.x) - (V3_HALF_CARD_W * 2);
          expect(gap).toBeGreaterThanOrEqual(0);
        });
    });
    expect(Math.abs(layout.nodes.leftSpouse.x - layout.nodes.left.x)).toBe(V3_PARTNER_GAP);
    expect(Math.abs(layout.nodes.rightSpouse.x - layout.nodes.right.x)).toBe(V3_PARTNER_GAP);
  });
});

