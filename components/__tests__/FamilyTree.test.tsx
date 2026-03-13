import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { FamilyTree } from '../FamilyTree';
import { Person, TreeSettings } from '../../types';

vi.mock('../../context/TranslationContext', () => ({
    useTranslation: () => ({
        t: {},
        language: 'en',
        setLanguage: vi.fn(),
    }),
    TranslationProvider: ({ children }: any) => children,
}));

// FamilyTree uses a Web Worker for layout. Provide a Worker mock that
// immediately returns a minimal layout so the chart layers render.
class WorkerMock {
    onmessage: ((ev: MessageEvent) => any) | null = null;
    constructor() { }
    postMessage(msg: any) {
        const requestId = msg?.requestId ?? 1;
        const people = msg?.people ?? {};
        const focusId = msg?.focusId;
        const focus = focusId && people[focusId] ? focusId : Object.keys(people)[0];
        const focusPerson = focus ? people[focus] : undefined;
        const childId = focusPerson?.children?.[0];

        const nodes = focusPerson
            ? [
                { id: focus, x: 0, y: 0, data: focusPerson, type: 'focus' },
                ...(childId && people[childId]
                    ? [{ id: childId, x: 100, y: 100, data: people[childId], type: 'descendant' }]
                    : [])
            ]
            : [];

        const links = (focusPerson && childId && people[childId])
            ? [{ source: focus, target: childId, type: 'parent-child' }]
            : [];

        setTimeout(() => {
            this.onmessage?.({
                data: { requestId, nodes, links, collapsePoints: [], fanArcs: [] }
            } as any);
        }, 0);
    }
    terminate() { }
}

global.Worker = WorkerMock as any;

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
        burialPlace: '', residence: '',
        isDeceased: false, profession: '', company: '', interests: '', bio: '',
        gallery: [], voiceNotes: [], events: [], email: '', website: '', blog: '', address: '',
        sources: []
    },
    '2': {
        id: '2', firstName: 'Child', lastName: 'Person', gender: 'female',
        birthDate: '2010', parents: ['1'], children: [], spouses: [],
        title: '', middleName: '', birthName: '', nickName: '', suffix: '',
        birthPlace: '', birthSource: '', deathDate: '', deathPlace: '', deathSource: '',
        burialPlace: '', residence: '',
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
    showFirstName: true,
    showDates: true,
    showBirthDate: true,
    showMarriageDate: false,
    showDeathDate: true,
    showBirthPlace: false,
    showMarriagePlace: false,
    showBurialPlace: false,
    showResidence: false,
    showMiddleName: false,
    showLastName: true,
    showNickname: false,
    isCompact: false,
    showDeceased: true,
    highlightBranch: false,
    nodeSpacingX: 60,
    nodeSpacingY: 400,
    nodeWidth: 240,
    textSize: 12,
    themeColor: '#10b981',
    boxColorLogic: 'gender',
    generationLimit: 6,
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

    it('renders node and link layers from the layout hook', async () => {
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

        await waitFor(() => {
            const nodesLayer = container.querySelector('.nodes-layer');
            const linksLayer = container.querySelector('.links-layer');
            expect(nodesLayer).not.toBeNull();
            expect(linksLayer).not.toBeNull();
        });
    });
});
