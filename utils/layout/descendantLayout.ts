import * as d3 from 'd3';
import { Person, TreeSettings, TreeNode, TreeLink } from '../../types';
import {
    CollapsePoint,
    NODE_WIDTH_DEFAULT,
    NODE_WIDTH_COMPACT,
    NODE_HEIGHT_DEFAULT,
    NODE_HEIGHT_COMPACT,
    LEVEL_SEP_DEFAULT,
    LEVEL_SEP_COMPACT,
    SIBLING_GAP_DEFAULT,
    SIBLING_GAP_COMPACT,
    SPOUSE_GAP,
} from './constants';
import { findRootAncestor, getBirthYear } from './helpers';
import { CustomHierarchyDatum, getPointCoords } from './coords';

export const calculateDescendantLayout = (
    people: Record<string, Person>,
    focusId: string,
    settings: TreeSettings,
    collapsedIds: Set<string>
): { nodes: TreeNode[]; links: TreeLink[]; collapsePoints: CollapsePoint[] } => {
    const isVertical = settings.layoutMode === 'vertical';

    const nodeW = settings.nodeWidth || (settings.isCompact ? NODE_WIDTH_COMPACT : NODE_WIDTH_DEFAULT);
    const nodeH = settings.isCompact ? NODE_HEIGHT_COMPACT : NODE_HEIGHT_DEFAULT;

    const rootId = findRootAncestor(people, focusId);

    const visitedInHierarchy = new Set<string>();

    const buildHierarchy = (id: string, depth = 0): CustomHierarchyDatum | null => {
        if (visitedInHierarchy.has(id)) {
            // CONSANGUINITY: Do not render children that have already appeared elsewhere.
            // This prevents "white placeholders" and keeps the tree focused on the primary lineage.
            return null;
        }
        visitedInHierarchy.add(id);

        const person = people[id];
        // DATA AUDIT: Skip missing or truly invalid persons (undefined/null)
        // Note: We allow persons with any name content (including single-language names)
        if (!person || !person.id) return null;

        // Show Deceased Filter: Prune if deceased and setting is off
        if (settings.showDeceased === false && person.isDeceased) return null;

        const node: CustomHierarchyDatum = { id: person.id, person };

        // CONSANGUINITY RULE: Prune sub-tree if father/primary node is a Reference
        // We still show the spouses (to show the marriage) but no children or further lineage.
        if (node.isReference) return node;

        const spouses = person.spouses || [];

        const getKidsForSpouse = (spouseId: string, groupIndex: number) => {
            const personSpouse = people[spouseId];
            if (!personSpouse) return []; // Skip if spouse data is missing

            // CONSANGUINITY REFERENCE BLOCK: 
            // If the spouse has already appeared as a primary node elsewhere,
            // strictly disable drawing any children under this specific union in this branch.
            if (visitedInHierarchy.has(spouseId)) return [];

            const collapseKey = `${id}:${spouseId}`;
            if (collapsedIds.has(collapseKey)) return [];
            const childrenIds = person.children
                .filter((childId) => {
                    const child = people[childId];
                    return child && child.parents.includes(spouseId);
                })
                .sort((a, b) => getBirthYear(people[a]) - getBirthYear(people[b]));

            return childrenIds.map((childId) => {
                const childNode = buildHierarchy(childId, depth + 1);
                if (!childNode) return null;
                childNode.groupIndex = groupIndex;
                return childNode;
            }).filter(Boolean) as CustomHierarchyDatum[];
        };

        const getSingleKids = () => {
            const childrenIds = person.children
                .filter((childId) => {
                    const child = people[childId];
                    return child && !child.parents.some((p) => spouses.includes(p));
                })
                .sort((a, b) => getBirthYear(people[a]) - getBirthYear(people[b]));

            return childrenIds.map((childId) => {
                const childNode = buildHierarchy(childId, depth + 1);
                if (!childNode) return null;
                childNode.groupIndex = 0;
                return childNode;
            }).filter(Boolean) as CustomHierarchyDatum[];
        };

        const allChildren: CustomHierarchyDatum[] = [];
        spouses.forEach((spId, idx) => {
            const kids = getKidsForSpouse(spId, idx + 1);
            kids.forEach(k => {
                k.motherId = spId;
            });
            allChildren.push(...kids);
        });
        const singleKids = getSingleKids();
        singleKids.forEach(k => {
            k.motherId = 'single';
        });
        allChildren.push(...singleKids);

        if (allChildren.length > 0) {
            node.children = allChildren;
        }
        return node;
    };

    const rootData = buildHierarchy(rootId);
    if (!rootData) return { nodes: [], links: [], collapsePoints: [] };

    const root = d3.hierarchy<CustomHierarchyDatum>(rootData);

    // THE COMPACT GOLDEN RATIO: High density for laptop screens
    const baseWidth = 220;
    const levelSep = 320; // STRICT ARCHITECTURAL ALIGNMENT
    const treeLayout = d3.tree<CustomHierarchyDatum>().nodeSize([baseWidth, levelSep]);

    const getPodWidth = (d: d3.HierarchyNode<CustomHierarchyDatum>) => {
        const sCount = d.data.person.spouses?.length || 0;
        if (sCount === 0) return nodeW;
        if (sCount === 1) return 2 * nodeW + SPOUSE_GAP;
        if (sCount === 2) return 3 * nodeW + 2 * SPOUSE_GAP;
        return (sCount + 1) * nodeW + sCount * SPOUSE_GAP;
    };

    treeLayout.separation((a, b) => {
        const aWidth = getPodWidth(a);
        const bWidth = getPodWidth(b);
        const gap = settings.nodeSpacingX || (settings.isCompact ? SIBLING_GAP_COMPACT : SIBLING_GAP_DEFAULT);

        // Edge-to-edge gap between Family Pods: gap between right edge of one pod and left edge of next.
        // Center-to-center = (aWidth/2) + gap + (bWidth/2).
        return (aWidth / 2 + gap + bWidth / 2) / baseWidth;
    });

    treeLayout(root);

    let minX = Infinity;
    let maxX = -Infinity;

    // After treeLayout, nodes are actually HierarchyPointNode
    const rootPointNode = root as d3.HierarchyPointNode<CustomHierarchyDatum>;
    rootPointNode.descendants().forEach((d) => {
        if (d.x < minX) minX = d.x;
        if (d.x > maxX) maxX = d.x;
    });
    const totalBreadth = Math.max(1, maxX - minX);

    let oldestBirthYear = Infinity;
    root.descendants().forEach((d) => {
        const year = getBirthYear(d.data.person);
        if (year !== 9999 && year < oldestBirthYear) oldestBirthYear = year;
    });

    const nodes: TreeNode[] = [];
    const links: TreeLink[] = [];
    const collapsePoints: CollapsePoint[] = [];

    // Set of person ids that appear as primary (root) nodes in this hierarchy (for consanguinity)
    const primaryIds = new Set(root.descendants().map((d: d3.HierarchyNode<CustomHierarchyDatum>) => d.data.person.id));

    // Map to store toggle-button coordinates for child link source (clean branching from button)
    const unionMidpointStore = new Map<string, { x: number, y: number }>();

    root.descendants().forEach((d: any) => {
        const person = d.data.person as Person;
        const spouseIds = person.spouses || [];
        const spouseCount = spouseIds.length;

        let podCorrectionX = 0;
        if (spouseCount === 1) {
            podCorrectionX = - (nodeW + SPOUSE_GAP) / 2;
        } else if (spouseCount > 2) {
            podCorrectionX = - (spouseCount * (nodeW + SPOUSE_GAP)) / 2;
        }

        const coords = getPointCoords(d, settings, oldestBirthYear, podCorrectionX, 0, totalBreadth, minX);

        nodes.push({
            id: person.id,
            x: coords.x,
            y: coords.y,
            data: person,
            type: person.id === focusId ? 'focus' : 'descendant',
            isReference: d.data.isReference
        });

        if (d.data.isReference) return;

        spouseIds.forEach((spouseId, index) => {
            const spouse = people[spouseId];
            if (!spouse) return;

            const isReferenceSpouse = primaryIds.has(spouseId);

            const visualSpouseId = `spouse-${person.id}-${spouseId}`;

            // STRICT BUTTERFLY SYMMETRY: Father is at [0], Spouses flank.
            let spouseOffsetX = 0;
            if (spouseCount === 1) {
                spouseOffsetX = (nodeW + SPOUSE_GAP);
            } else if (spouseCount === 2) {
                // Spouse 1 on Left (-), Spouse 2 on Right (+)
                spouseOffsetX = index === 0 ? -(nodeW + SPOUSE_GAP) : (nodeW + SPOUSE_GAP);
            } else {
                // Multi-Wing row for 3+
                spouseOffsetX = (index + 1) * (nodeW + SPOUSE_GAP);
            }

            // Apply the same podCorrectionX to spouses to keep them relative to the primary node's new position
            const spouseCoords = getPointCoords(d, settings, oldestBirthYear, spouseOffsetX + podCorrectionX, 0, totalBreadth, minX);

            nodes.push({
                id: visualSpouseId,
                x: spouseCoords.x,
                y: spouseCoords.y,
                data: spouse,
                type: 'spouse',
                isReference: isReferenceSpouse,
            });

            links.push({ source: person.id, target: visualSpouseId, type: 'marriage' });

            const midX = (coords.x + spouseCoords.x) / 2;
            const midY = (coords.y + spouseCoords.y) / 2;
            const dropDistance = (nodeH / 2) + 15;

            const uniqueKey = `${person.id}:${spouseId}`;
            const cp = {
                id: person.id,
                spouseId: spouseId,
                uniqueKey: uniqueKey,
                x: isVertical ? midX : midX + dropDistance,
                y: isVertical ? midY + dropDistance : midY,
                originX: midX,
                originY: midY,
                isCollapsed: collapsedIds.has(uniqueKey)
            };
            collapsePoints.push(cp);
            unionMidpointStore.set(uniqueKey, { x: isVertical ? midX : midX + dropDistance, y: isVertical ? midY + dropDistance : midY });
        });

        const singleKids = person.children?.filter(cid => !spouseIds.some(sid => people[cid]?.parents.includes(sid)));
        if (singleKids && singleKids.length > 0) {
            const dropDistance = (nodeH / 2) + 15;
            const uniqueKey = `${person.id}:single`;
            const cp = {
                id: person.id,
                spouseId: 'single',
                uniqueKey: uniqueKey,
                x: isVertical ? coords.x : coords.x + dropDistance,
                y: isVertical ? coords.y + dropDistance : coords.y,
                originX: coords.x,
                originY: coords.y,
                isCollapsed: collapsedIds.has(uniqueKey)
            };
            collapsePoints.push(cp);
            unionMidpointStore.set(uniqueKey, { x: isVertical ? coords.x : coords.x + dropDistance, y: isVertical ? coords.y + dropDistance : coords.y });
        }
    });

    root.descendants().forEach((d: any) => {
        const node = d.data as CustomHierarchyDatum;
        const person = node.person;

        if (!node.motherId) return;

        const unionKey = node.motherId === 'single' ? `${d.parent.data.person.id}:single` : `${d.parent.data.person.id}:${node.motherId}`;
        const sourcePoint = unionMidpointStore.get(unionKey);

        if (sourcePoint) {
            // Include customOrigin so the visual link starts exactly from the collapse point
            links.push({
                source: unionKey,
                target: person.id,
                type: 'parent-child',
                customOrigin: { x: sourcePoint.x, y: sourcePoint.y }
            });
        }
    });

    return { nodes, links, collapsePoints };
};
