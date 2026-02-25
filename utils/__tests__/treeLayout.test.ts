import { describe, it, expect } from 'vitest';
import { calculateTreeLayout } from '../treeLayout';
import { TreeSettings, Person } from '../../types';

const defaultSettings: TreeSettings = {
    showPhotos: true,
    showDates: true,
    showMiddleName: true,
    showLastName: true,
    showMinimap: false,
    layoutMode: 'vertical',
    isCompact: false,
    chartType: 'descendant',
    theme: 'modern',
};

// Mock Data
const mockPerson: Person = {
    id: 'root',
    firstName: 'Root',
    lastName: 'User',
    gender: 'male',
    birthDate: '1980-01-01',
    birthPlace: '',
    parents: [],
    spouses: ['spouse1'],
    children: ['child1'],
    title: '',
    middleName: '',
    birthName: '',
    nickName: '',
    suffix: '',
    birthSource: '',
    deathDate: '',
    deathPlace: '',
    deathSource: '',
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
};

const mockSpouse: Person = {
    ...mockPerson,
    id: 'spouse1',
    firstName: 'Spouse',
    gender: 'female',
    spouses: ['root'],
    children: ['child1'],
};

const mockChild: Person = {
    ...mockPerson,
    id: 'child1',
    firstName: 'Child',
    gender: 'male',
    parents: ['root', 'spouse1'],
    spouses: [],
    children: [],
};

const mockFamily = {
    root: mockPerson,
    spouse1: mockSpouse,
    child1: mockChild,
};

describe('Tree Layout - Basic Functionality', () => {
    it('should calculate descendant layout with nodes and links', () => {
        const { nodes, links } = calculateTreeLayout(mockFamily, 'root', defaultSettings);

        expect(nodes.length).toBeGreaterThanOrEqual(3);

        const rootNode = nodes.find(n => n.id === 'root');
        const spouseNode = nodes.find(n => n.id.includes('spouse1'));
        const childNode = nodes.find(n => n.id === 'child1');

        expect(rootNode).toBeDefined();
        expect(spouseNode).toBeDefined();
        expect(childNode).toBeDefined();

        expect(links.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle single person tree', () => {
        const singleData = {
            p1: { ...mockPerson, id: 'p1', spouse: [], children: [], parents: [], spouses: [] }
        };
        const { nodes } = calculateTreeLayout(singleData, 'p1', defaultSettings);
        expect(nodes.length).toBe(1);
        expect(nodes[0].id).toBe('p1');
    });

    it('should switch to pedigree layout', () => {
        const settings = { ...defaultSettings, chartType: 'pedigree' as const };
        const { nodes } = calculateTreeLayout(mockFamily, 'child1', settings);

        const childNode = nodes.find(n => n.id === 'child1');
        const fatherNode = nodes.find(n => n.id === 'root');
        const motherNode = nodes.find(n => n.id === 'spouse1');

        expect(childNode?.type).toBe('focus');
        expect(fatherNode?.type).toBe('ancestor');
        expect(motherNode?.type).toBe('ancestor');
    });
});

describe('Tree Layout - Edge Cases', () => {
    it('should handle empty people object', () => {
        const { nodes, links } = calculateTreeLayout({}, 'nonexistent', defaultSettings);
        expect(nodes).toHaveLength(0);
        expect(links).toHaveLength(0);
    });

    it('should handle nonexistent focus ID', () => {
        const { nodes } = calculateTreeLayout(mockFamily, 'nonexistent', defaultSettings);
        expect(nodes).toHaveLength(0);
    });

    it('should handle collapsed nodes', () => {
        const collapsedIds = new Set(['root:spouse1']);
        const { nodes } = calculateTreeLayout(mockFamily, 'root', defaultSettings, collapsedIds);

        // Child should not appear when parent-spouse relationship is collapsed
        const childNode = nodes.find(n => n.id === 'child1');
        expect(childNode).toBeUndefined();
    });

    it('should handle person with multiple children', () => {
        const largeFamily = {
            parent: { ...mockPerson, id: 'parent', children: ['c1', 'c2', 'c3', 'c4'] },
            c1: { ...mockChild, id: 'c1', parents: ['parent'] },
            c2: { ...mockChild, id: 'c2', parents: ['parent'] },
            c3: { ...mockChild, id: 'c3', parents: ['parent'] },
            c4: { ...mockChild, id: 'c4', parents: ['parent'] },
        };
        const { nodes, links } = calculateTreeLayout(largeFamily, 'parent', defaultSettings);

        expect(nodes.length).toBeGreaterThanOrEqual(5);
        expect(links.filter(l => l.type === 'parent-child').length).toBeGreaterThanOrEqual(4);
    });

    it('should handle person with multiple spouses', () => {
        const multiSpouseFamily = {
            person: {
                ...mockPerson,
                id: 'person',
                spouses: ['s1', 's2'],
                children: ['c1', 'c2'],
            },
            s1: { ...mockSpouse, id: 's1', spouses: ['person'], children: ['c1'] },
            s2: { ...mockSpouse, id: 's2', spouses: ['person'], children: ['c2'] },
            c1: { ...mockChild, id: 'c1', parents: ['person', 's1'] },
            c2: { ...mockChild, id: 'c2', parents: ['person', 's2'] },
        };
        const { nodes } = calculateTreeLayout(multiSpouseFamily, 'person', defaultSettings);

        // Should have person + 2 spouse nodes + 2 children
        expect(nodes.length).toBeGreaterThanOrEqual(5);
    });
});

describe('Tree Layout - Layout Modes', () => {
    it('should handle vertical layout', () => {
        const settings = { ...defaultSettings, layoutMode: 'vertical' as const };
        const { nodes } = calculateTreeLayout(mockFamily, 'root', settings);

        expect(nodes.length).toBeGreaterThan(0);
        // Verify nodes have valid coordinates
        nodes.forEach(node => {
            expect(node.x).toBeDefined();
            expect(node.y).toBeDefined();
        });
    });

    it('should handle horizontal layout', () => {
        const settings = { ...defaultSettings, layoutMode: 'horizontal' as const };
        const { nodes } = calculateTreeLayout(mockFamily, 'root', settings);

        expect(nodes.length).toBeGreaterThan(0);
        nodes.forEach(node => {
            expect(node.x).toBeDefined();
            expect(node.y).toBeDefined();
        });
    });

    it('should handle radial layout', () => {
        const settings = { ...defaultSettings, layoutMode: 'radial' as const };
        const { nodes } = calculateTreeLayout(mockFamily, 'root', settings);

        expect(nodes.length).toBeGreaterThan(0);
    });

    it('should handle compact mode', () => {
        const settings = { ...defaultSettings, isCompact: true };
        const { nodes } = calculateTreeLayout(mockFamily, 'root', settings);

        expect(nodes.length).toBeGreaterThan(0);
    });
});

describe('Tree Layout - Pedigree Mode Edge Cases', () => {
    it('should handle person with no parents in pedigree mode', () => {
        const settings = { ...defaultSettings, chartType: 'pedigree' as const };
        const singleData = {
            p1: { ...mockPerson, id: 'p1', parents: [] }
        };
        const { nodes, links } = calculateTreeLayout(singleData, 'p1', settings);

        expect(nodes).toHaveLength(1);
        expect(links).toHaveLength(0);
    });

    it('should handle deep ancestry tree', () => {
        const settings = { ...defaultSettings, chartType: 'pedigree' as const };
        const deepTree: Record<string, Person> = {
            child: { ...mockPerson, id: 'child', parents: ['parent'] },
            parent: { ...mockPerson, id: 'parent', parents: ['grandparent'] },
            grandparent: { ...mockPerson, id: 'grandparent', parents: ['greatgrandparent'] },
            greatgrandparent: { ...mockPerson, id: 'greatgrandparent', parents: [] },
        };
        const { nodes } = calculateTreeLayout(deepTree, 'child', settings);

        expect(nodes.length).toBeGreaterThanOrEqual(4);
    });
});

describe('Tree Layout - Collapse Points', () => {
    it('should create collapse points for couples with children', () => {
        const { collapsePoints } = calculateTreeLayout(mockFamily, 'root', defaultSettings);

        expect(collapsePoints.length).toBeGreaterThan(0);
        expect(collapsePoints[0]).toHaveProperty('uniqueKey');
        expect(collapsePoints[0]).toHaveProperty('isCollapsed');
        expect(collapsePoints[0]).toHaveProperty('x');
        expect(collapsePoints[0]).toHaveProperty('y');
    });

    it('should mark collapse points as collapsed when in collapsedIds', () => {
        const collapsedIds = new Set(['root:spouse1']);
        const { collapsePoints } = calculateTreeLayout(mockFamily, 'root', defaultSettings, collapsedIds);

        const collapsed = collapsePoints.find(cp => cp.uniqueKey === 'root:spouse1');
        expect(collapsed?.isCollapsed).toBe(true);
    });
});
