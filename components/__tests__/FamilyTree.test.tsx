import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { FamilyTree } from '../FamilyTree';
import { Person, TreeSettings } from '../../types';

// Mock the useTreeLayout hook to avoid Web Worker issues
vi.mock('../../hooks/useTreeLayout', () => ({
    useTreeLayout: () => ({
        nodes: [
            { id: '1', x: 0, y: 0, data: { id: '1', firstName: 'Root', lastName: 'Person', gender: 'male' }, type: 'focus' },
            { id: '2', x: 100, y: 100, data: { id: '2', firstName: 'Child', lastName: 'Person', gender: 'female' }, type: 'descendant' }
        ],
        links: [
            { source: { x: 0, y: 0 }, target: { x: 100, y: 100 } }
        ],
        collapsePoints: [],
        isCalculating: false
    })
}));

// Mock d3 to avoid timer/transition issues in JSDOM
vi.mock('d3', async () => {
    const actual = await vi.importActual('d3');
    return {
        ...actual,
        zoom: () => ({
            scaleExtent: () => ({
                on: () => (() => { }), // Chainable on
            }),
        }),
        select: () => ({
            call: () => ({
                on: () => { },
                transition: () => ({ duration: () => ({ call: () => { } }) }),
            }),
            attr: () => { },
            selectAll: () => ({ data: () => ({ enter: () => ({ append: () => ({ attr: () => { } }) }), attr: () => { }, exit: () => ({ remove: () => { } }) }) }),
            transition: () => ({
                duration: () => ({
                    ease: () => ({
                        call: () => { },
                    })
                }),
                call: () => { }
            })
        }),
        forceSimulation: () => ({
            force: () => ({
                id: () => ({ distance: () => { } }),
            }), // Chainable
            on: () => { },
            stop: () => { },
            alpha: () => ({ restart: () => { } }),
        }),
        // Keep utilities we might need if any, or mock them
        zoomIdentity: { translate: () => ({ scale: () => { } }) },
    };
});


const mockPeople: Record<string, Person> = {
    '1': {
        id: '1', firstName: 'Root', lastName: 'Person', gender: 'male',
        birthDate: '1980', parents: [], children: ['2'], spouses: [],
        title: '', middleName: '', birthName: '', nickName: '', suffix: '',
        birthPlace: '', birthSource: '', deathDate: '', deathPlace: '', deathSource: '',
        isDeceased: false, profession: '', company: '', interests: '', bio: '',
        gallery: [], voiceNotes: [], events: [], email: '', website: '', blog: '', address: '',
        sources: []
    },
    '2': {
        id: '2', firstName: 'Child', lastName: 'Person', gender: 'female',
        birthDate: '2010', parents: ['1'], children: [], spouses: [],
        title: '', middleName: '', birthName: '', nickName: '', suffix: '',
        birthPlace: '', birthSource: '', deathDate: '', deathPlace: '', deathSource: '',
        isDeceased: false, profession: '', company: '', interests: '', bio: '',
        gallery: [], voiceNotes: [], events: [], email: '', website: '', blog: '', address: '',
        sources: []
    },
};

const mockSettings: TreeSettings = {
    layoutMode: 'vertical',
    chartType: 'descendant',
    showMinimap: false,
    enableForcePhysics: false,
    enableTimeOffset: false,
    timeScaleFactor: 5,
    theme: 'modern',
    showPhotos: true,
    showDates: true,
    showMiddleName: false,
    showLastName: true,
    isCompact: false,
    nodeSpacingX: 60,
    nodeSpacingY: 400,
};

describe('FamilyTree Component', () => {
    it('renders without crashing', () => {
        render(
            <FamilyTree
                people={mockPeople}
                focusId="1"
                onSelect={() => { }}
                settings={mockSettings}
                isSidebarOpen={false}
                onPresent={() => { }}
                onOpenSnapshotHistory={undefined}
                svgRef={React.createRef<SVGSVGElement>()}
                activeModal={null}
                setSidebarOpen={() => { }}
                onOpenLinkModal={() => { }}
                onOpenModal={() => { }}
            />
        );
        // Check if SVG is present
        const svg = document.querySelector('svg');
        expect(svg).toBeInTheDocument();
    });

    it('renders node and link layers from the layout hook', () => {
        // The nodes and links are rendered by DescendantPedigreeChart inside FamilyTree.
        // We verify that the structural SVG groups for nodes and links are present,
        // without depending on specific text labels (which may be async/worker-driven).
        const { container } = render(
            <FamilyTree
                people={mockPeople}
                focusId="1"
                onSelect={() => { }}
                settings={mockSettings}
                isSidebarOpen={false}
                onPresent={() => { }}
                onOpenSnapshotHistory={undefined}
                svgRef={React.createRef<SVGSVGElement>()}
                activeModal={null}
                setSidebarOpen={() => { }}
                onOpenLinkModal={() => { }}
                onOpenModal={() => { }}
            />
        );

        const nodesLayer = container.querySelector('.nodes-layer');
        const linksLayer = container.querySelector('.links-layer');

        expect(nodesLayer).not.toBeNull();
        expect(linksLayer).not.toBeNull();
    });
});
