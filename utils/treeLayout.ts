import * as d3 from 'd3';
import { Person, TreeNode, TreeLink, TreeSettings } from '../types';
import { getDisplayDate } from './familyLogic';

// Updated Dimensions for Portrait Cards
const DEFAULT_NODE_WIDTH = 150;
const COMPACT_NODE_WIDTH = 120;
// Increased level separation because nodes are taller now (200px)
const LEVEL_SEP_DEFAULT = 280; 
const LEVEL_SEP_COMPACT = 240;
const SPOUSE_GAP = 20; 

export interface CollapsePoint {
    id: string; 
    spouseId: string; 
    uniqueKey: string;
    x: number;
    y: number;
    originX: number; 
    originY: number; 
    isCollapsed: boolean;
}

// Optimization: BFS to find root quickly
const findRootAncestor = (people: Record<string, Person>, startId: string): string => {
    let currentId = startId;
    const visited = new Set<string>();
    let depth = 0;
    while (depth < 50) {
        if (visited.has(currentId)) break;
        visited.add(currentId);
        const person = people[currentId];
        if (!person || person.parents.length === 0) break;
        currentId = person.parents[0];
        depth++;
    }
    return currentId;
};

const getBirthYear = (p: Person): number => {
    if (!p.birthDate) return 9999;
    const y = parseInt(getDisplayDate(p.birthDate));
    return isNaN(y) ? 9999 : y;
};

// =========================================================
// 1. DESCENDANT CHART LOGIC
// =========================================================
const calculateDescendantLayout = (
    people: Record<string, Person>,
    focusId: string,
    settings: TreeSettings,
    collapsedIds: Set<string>
): { nodes: TreeNode[], links: TreeLink[], collapsePoints: CollapsePoint[] } => {
    
    const isVertical = settings.layoutMode === 'vertical';
    const nodeW = settings.isCompact ? COMPACT_NODE_WIDTH : DEFAULT_NODE_WIDTH;
    const levelGap = settings.isCompact ? LEVEL_SEP_COMPACT : LEVEL_SEP_DEFAULT;
    const siblingGap = settings.isCompact ? 30 : 60; // Slightly increased base gap

    const rootId = findRootAncestor(people, focusId);
    
    // Track visited nodes to prevent cycles
    const visitedInHierarchy = new Set<string>();
    
    const buildHierarchy = (id: string): d3.HierarchyNode<any> | null => { // Explicitly type return
        if (visitedInHierarchy.has(id)) return null; 
        visitedInHierarchy.add(id);

        const person = people[id];
        if (!person) return null;

        const node: any = { id: person.id, person };
        const spouses = person.spouses || [];
        
        // Helper: Get children for specific spouse
        const getKidsForSpouse = (spouseId: string, groupIndex: number) => {
            const collapseKey = `${id}:${spouseId}`;
            if (collapsedIds.has(collapseKey)) return []; 

            return person.children
                .filter(childId => {
                    const child = people[childId];
                    return child && child.parents.includes(spouseId);
                })
                .sort((a, b) => getBirthYear(people[a]) - getBirthYear(people[b]))
                .map(childId => {
                    const childNode = buildHierarchy(childId);
                    if (childNode) childNode.groupIndex = groupIndex;
                    return childNode;
                })
                .filter(Boolean);
        };

        // Helper: Get single parent children
        const getSingleKids = () => {
             const collapseKey = `${id}:single`;
             if (collapsedIds.has(collapseKey)) return [];

             return person.children
                .filter(childId => {
                    const child = people[childId];
                    return child && !child.parents.some(p => spouses.includes(p));
                })
                .sort((a, b) => getBirthYear(people[a]) - getBirthYear(people[b]))
                .map(childId => {
                     const childNode = buildHierarchy(childId);
                     if (childNode) childNode.groupIndex = 0;
                     return childNode;
                })
                .filter(Boolean);
        };

        // Distribute children branches around spouses
        const leftChildren: any[] = [];
        const rightChildren: any[] = [];
        
        spouses.forEach((spId, idx) => {
            if (idx === 0) { 
                rightChildren.push(...getKidsForSpouse(spId, 1));
            } else if (idx === 1) {
                leftChildren.push(...getKidsForSpouse(spId, -1));
            } else {
                 if (idx % 2 === 0) rightChildren.push(...getKidsForSpouse(spId, 2));
                 else leftChildren.push(...getKidsForSpouse(spId, -2));
            }
        });

        const allChildren = [
            ...leftChildren,
            ...getSingleKids(),
            ...rightChildren
        ];

        if (allChildren.length > 0) {
            node.children = allChildren;
        }

        return node;
    };

    const rootData = buildHierarchy(rootId);
    if (!rootData) return { nodes: [], links: [], collapsePoints: [] };

    // D3 Layout Calculation
    const root = d3.hierarchy(rootData);
    
    // Base unit size for a single person (without spouses)
    const nodeSpace = nodeW + siblingGap;
    
    const treeLayout = d3.tree<any>()
        .nodeSize(isVertical ? [nodeSpace, levelGap] : [levelGap, nodeSpace])
        .separation((a: d3.HierarchyPointNode<any>, b: d3.HierarchyPointNode<any>) => { // Explicitly type a, b
            const pA = a.data.person as Person;
            const pB = b.data.person as Person;
            
            // Calculate "Visual Width Units"
            // 1 Unit = 1 Person. Each spouse adds approx 1 unit of width.
            // We use this to push neighbors further apart.
            const widthA = 1 + (pA.spouses ? pA.spouses.length : 0);
            const widthB = 1 + (pB.spouses ? pB.spouses.length : 0);
            
            // The distance needed between centers is half the width of A + half the width of B
            let separation = (widthA + widthB) / 2;
            
            if (a.parent === b.parent) {
                const groupA = (a as any).groupIndex || 0;
                const groupB = (b as any).groupIndex || 0;
                
                // Extra separation between different marriage groups (half-siblings)
                if (groupA !== groupB) {
                    separation += 0.5;
                } else {
                    // Siblings from same parents
                    separation += 0.2; 
                }
            } else {
                // Cousins or distant relatives need more buffer
                separation += 0.7;
            }
            
            return separation; 
        });

    treeLayout(root);

    // Transform results to app structure
    const nodes: TreeNode[] = [];
    const links: TreeLink[] = [];
    const collapsePoints: CollapsePoint[] = [];

    const getCoords = (d: d3.HierarchyPointNode<any>, offsetX = 0, offsetY = 0) => {
        if (isVertical) return { x: d.x + offsetX, y: d.y + offsetY };
        return { x: d.y + offsetY, y: d.x + offsetX };
    };

    root.descendants().forEach((d: d3.HierarchyPointNode<any>) => { // Explicitly type d
        const person = d.data.person as Person;
        const spouseIds = person.spouses || [];
        const hasMultipleSpouses = spouseIds.length > 1;

        // Shift logic to center the "Marriage Unit" rather than just the person
        let mainShift = 0;
        if (spouseIds.length === 1) {
            mainShift = -(nodeW / 2 + SPOUSE_GAP / 2);
        }

        const coords = getCoords(d, isVertical ? mainShift : 0, isVertical ? 0 : mainShift);

        let type: TreeNode['type'] = 'descendant';
        if (person.id === focusId) type = 'focus';

        nodes.push({ id: person.id, x: coords.x, y: coords.y, data: person, type });

        // Add Spouses
        spouseIds.forEach((spouseId, index) => {
            const spouse = people[spouseId];
            if (!spouse) return;

            const visualSpouseId = `spouse-${person.id}-${spouseId}`;
            let spouseOffsetX = 0;

            if (!hasMultipleSpouses) {
                spouseOffsetX = nodeW + SPOUSE_GAP;
            } else {
                // Complex spacing for multiple spouses
                if (index === 0) spouseOffsetX = (nodeW / 2) + SPOUSE_GAP + (nodeW / 2);
                else if (index === 1) spouseOffsetX = -((nodeW / 2) + SPOUSE_GAP + (nodeW / 2));
                else spouseOffsetX = ((nodeW / 2) + SPOUSE_GAP + (nodeW / 2)) + (nodeW + 10) * (index - 1); 
            }

            const spouseCoords = getCoords(d, 
                isVertical ? mainShift + spouseOffsetX : 0, 
                isVertical ? 0 : mainShift + spouseOffsetX
            );

            nodes.push({ id: visualSpouseId, x: spouseCoords.x, y: spouseCoords.y, data: spouse, type: 'spouse' });

            links.push({ source: person.id, target: visualSpouseId, type: 'marriage' });

            // Calculate Collapse/Branching Joints
            const midX = (coords.x + spouseCoords.x) / 2;
            const midY = (coords.y + spouseCoords.y) / 2;
            const dropDistance = settings.isCompact ? 90 : 120; // Reduced slightly as cards are taller

            const coupleHasChildren = person.children.some(childId => {
                const child = people[childId];
                return child && child.parents.includes(spouseId);
            });

            if (coupleHasChildren) {
                const uniqueKey = `${person.id}:${spouseId}`;
                collapsePoints.push({
                    id: person.id,
                    spouseId: spouseId, 
                    uniqueKey: uniqueKey,
                    x: isVertical ? midX : midX + dropDistance,
                    y: isVertical ? midY + dropDistance : midY,
                    originX: midX,
                    originY: midY,
                    isCollapsed: collapsedIds.has(uniqueKey)
                });
            }
        });

        // Single Parent Children Logic
        const singleChildren = person.children.filter(childId => {
            const child = people[childId];
            return child && (!child.parents.some(p => spouseIds.includes(p)));
        });

        if (singleChildren.length > 0) {
            const dropDistance = settings.isCompact ? 90 : 120;
            const uniqueKey = `${person.id}:single`;
             collapsePoints.push({
                id: person.id,
                spouseId: 'single', 
                uniqueKey: uniqueKey,
                x: isVertical ? coords.x : coords.x + dropDistance,
                y: isVertical ? coords.y + dropDistance : coords.y,
                originX: coords.x,
                originY: coords.y,
                isCollapsed: collapsedIds.has(uniqueKey)
            });
        }

        // Add Parent-Child Links
        if (d.children) {
            d.children.forEach((child: d3.HierarchyPointNode<any>) => { // Explicitly type child
                links.push({ source: person.id, target: child.data.id, type: 'parent-child' });
            });
        }
    });

    return { nodes, links, collapsePoints };
};

// =========================================================
// 2. PEDIGREE CHART LOGIC (Ancestors Only)
// =========================================================
const calculatePedigreeLayout = (people: Record<string, Person>, focusId: string, settings: TreeSettings) => {
     const nodes: TreeNode[] = [];
     const links: TreeLink[] = [];
     const maxGenerations = 5;
     
     // Config
     const baseLevelWidth = settings.isCompact ? 180 : 220; 
     const rootY = 0;

     // Recursive placement
     const buildAncestor = (id: string, generation: number, y: number, branchHeight: number) => {
         if (generation >= maxGenerations) return;
         
         const person = people[id];
         if (!person) return;

         if (nodes.some(n => n.id === id && n.type === (generation === 0 ? 'focus' : 'ancestor'))) return; 

         nodes.push({
             id: id,
             x: generation * baseLevelWidth,
             y: y,
             data: person,
             type: generation === 0 ? 'focus' : 'ancestor'
         });

         const nextBranchHeight = branchHeight / 2;
         
         // Father
         let fatherId = person.parents.find(pid => people[pid]?.gender === 'male');
         if (!fatherId && person.parents.length > 0) fatherId = person.parents[0];

         if (fatherId) {
             const fatherY = y - nextBranchHeight;
             buildAncestor(fatherId, generation + 1, fatherY, nextBranchHeight);
             links.push({ source: id, target: fatherId, type: 'parent-child' });
         }

         // Mother
         let motherId = person.parents.find(pid => people[pid]?.gender === 'female');
         if (!motherId && person.parents.length > 1) {
             motherId = person.parents.find(pid => pid !== fatherId);
         }

         if (motherId) {
             const motherY = y + nextBranchHeight;
             buildAncestor(motherId, generation + 1, motherY, nextBranchHeight);
             links.push({ source: id, target: motherId, type: 'parent-child' });
         }
     };

     // Initial call: Branch height decreases by half each generation
     buildAncestor(focusId, 0, rootY, 300);

     return { nodes, links, collapsePoints: [] };
};

// Main Export
export const calculateTreeLayout = (
    people: Record<string, Person>,
    focusId: string,
    settings: TreeSettings,
    collapsedIds: Set<string> = new Set()
): { nodes: TreeNode[], links: TreeLink[], collapsePoints: CollapsePoint[] } => {
    
    if (settings.chartType === 'descendant') {
        return calculateDescendantLayout(people, focusId, settings, collapsedIds);
    } else if (settings.chartType === 'pedigree') {
        return calculatePedigreeLayout(people, focusId, settings);
    }
    
    // Fallback
    return calculateDescendantLayout(people, focusId, settings, collapsedIds);
};