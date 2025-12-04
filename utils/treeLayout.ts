import * as d3 from 'd3';
import { Person, TreeNode, TreeLink, TreeSettings } from '../types';
import { getDisplayDate } from './familyLogic';

// Exported Node Dimensions
export const NODE_WIDTH_DEFAULT = 160;
export const NODE_WIDTH_COMPACT = 130;
export const NODE_HEIGHT_DEFAULT = 210;
export const NODE_HEIGHT_COMPACT = 170;
export const FORCE_NODE_RADIUS = 30; // New constant for force chart node radius

// Layout Constants
const LEVEL_SEP_DEFAULT = 280; 
const LEVEL_SEP_COMPACT = 240;
const SIBLING_GAP_DEFAULT = 60;
const SIBLING_GAP_COMPACT = 30;
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
    const isRadial = settings.layoutMode === 'radial'; // New flag
    const nodeW = settings.isCompact ? NODE_WIDTH_COMPACT : NODE_WIDTH_DEFAULT;
    const nodeH = settings.isCompact ? NODE_HEIGHT_COMPACT : NODE_HEIGHT_DEFAULT;
    const levelGap = settings.isCompact ? LEVEL_SEP_COMPACT : LEVEL_SEP_DEFAULT;
    const siblingGap = settings.isCompact ? SIBLING_GAP_COMPACT : SIBLING_GAP_DEFAULT;

    const rootId = findRootAncestor(people, focusId);
    
    // Track visited nodes to prevent cycles
    const visitedInHierarchy = new Set<string>();
    
    // Define a custom type for the data within the hierarchy node to include groupIndex
    interface CustomHierarchyDatum {
        id: string;
        person: Person;
        children?: CustomHierarchyDatum[];
        groupIndex?: number; // Custom property
    }

    const buildHierarchy = (id: string): CustomHierarchyDatum | null => {
        if (visitedInHierarchy.has(id)) return null; 
        visitedInHierarchy.add(id);

        const person = people[id];
        if (!person) return null;

        const node: CustomHierarchyDatum = { id: person.id, person };
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
                .filter(Boolean) as CustomHierarchyDatum[]; // Cast to ensure type safety
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
                .filter(Boolean) as CustomHierarchyDatum[]; // Cast to ensure type safety
        };

        // Distribute children branches around spouses
        const leftChildren: CustomHierarchyDatum[] = [];
        const rightChildren: CustomHierarchyDatum[] = [];
        
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
    const root = d3.hierarchy<CustomHierarchyDatum>(rootData);
    
    // Base unit size for a single person (without spouses)
    const nodeSpace = nodeW + siblingGap;
    
    const treeLayout = d3.tree<CustomHierarchyDatum>()
        .separation((a: d3.HierarchyPointNode<CustomHierarchyDatum>, b: d3.HierarchyPointNode<CustomHierarchyDatum>) => { // Explicitly type a, b
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
                const groupA = a.data.groupIndex || 0;
                const groupB = b.data.groupIndex || 0;
                
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

    if (isRadial) {
        // Determine max depth for radial layout radius
        let maxDepth = 0;
        root.each((d) => {
            if (d.depth > maxDepth) maxDepth = d.depth;
        });
        const radialRadius = (maxDepth + 1) * levelGap; // Scale radius based on depth
        treeLayout.size([360, radialRadius]); // Angle in degrees, radius
    } else {
        treeLayout.nodeSize(isVertical ? [nodeSpace, levelGap] : [levelGap, nodeSpace]);
    }

    treeLayout(root);

    // --- Time Offset Logic ---
    let oldestBirthYear = Infinity;
    const timeScaleFactor = settings.timeScaleFactor || 5; // Use from settings, fallback to 5
    
    if (settings.enableTimeOffset) {
        Object.values(people).forEach(p => {
            const year = getBirthYear(p);
            if (year !== 9999 && year < oldestBirthYear) {
                oldestBirthYear = year;
            }
        });
    }

    // Transform results to app structure
    const nodes: TreeNode[] = [];
    const links: TreeLink[] = [];
    const collapsePoints: CollapsePoint[] = [];

    const getCoords = (d: d3.HierarchyPointNode<CustomHierarchyDatum>, offsetX = 0, offsetY = 0) => {
        let finalX = d.x;
        let finalY = d.y;

        // Apply time offset if enabled and vertical/horizontal layout
        if (settings.enableTimeOffset && !isRadial) {
            const personBirthYear = getBirthYear(d.data.person);
            if (personBirthYear !== 9999 && oldestBirthYear !== Infinity) {
                const timeOffset = (personBirthYear - oldestBirthYear) * timeScaleFactor;
                if (isVertical) finalY += timeOffset;
                else finalX += timeOffset;
            }
        }

        // Apply mainShift and spouseOffsetX
        if (isVertical) {
            finalX += offsetX;
            finalY += offsetY;
        } else if (!isRadial) { // Horizontal
            finalX += offsetY; // Breadth is now Y, depth is X
            finalY += offsetX;
        }
        // For radial, offsetX/offsetY are handled differently below

        // --- Radial Transformation ---
        if (isRadial) {
            const angle = (d.x + offsetX) * (Math.PI / 180); // d.x is angle from treeLayout.size([360, ...])
            const radius = d.y + offsetY; // d.y is radius from treeLayout.size([..., radialRadius])

            // Apply time offset to radius for radial layout
            if (settings.enableTimeOffset) {
                const personBirthYear = getBirthYear(d.data.person);
                if (personBirthYear !== 9999 && oldestBirthYear !== Infinity) {
                    const timeOffset = (personBirthYear - oldestBirthYear) * timeScaleFactor;
                    finalY = radius + timeOffset; // Add to radius
                }
            } else {
                finalY = radius;
            }

            return {
                x: finalY * Math.cos(angle), // radius * cos(angle)
                y: finalY * Math.sin(angle)  // radius * sin(angle)
            };
        }
        // --- End Radial Transformation ---

        return { x: finalX, y: finalY };
    };

    // Cast to HierarchyPointNode[] because treeLayout mutates nodes to add x and y
    (root.descendants() as d3.HierarchyPointNode<CustomHierarchyDatum>[]).forEach((d) => {
        const person = d.data.person as Person;
        const spouseIds = person.spouses || [];
        const hasMultipleSpouses = spouseIds.length > 1;

        // Shift logic to center the "Marriage Unit" rather than just the person
        let mainShift = 0;
        if (spouseIds.length === 1) {
            mainShift = -(nodeW / 2 + SPOUSE_GAP / 2);
        }

        let coords = getCoords(d, isVertical ? mainShift : 0, isVertical ? 0 : mainShift);

        let type: TreeNode['type'] = 'descendant';
        if (person.id === focusId) type = 'focus';

        nodes.push({ id: person.id, x: coords.x, y: coords.y, data: person, type });

        // Add Spouses
        spouseIds.forEach((spouseId, index) => {
            const spouse = people[spouseId];
            if (!spouse) return;

            const visualSpouseId = `spouse-${person.id}-${spouseId}`;
            let spouseOffset = 0; // Unified offset for spouse
            if (!hasMultipleSpouses) {
                spouseOffset = nodeW + SPOUSE_GAP;
            } else {
                if (index === 0) spouseOffset = (nodeW / 2) + SPOUSE_GAP + (nodeW / 2);
                else if (index === 1) spouseOffset = -((nodeW / 2) + SPOUSE_GAP + (nodeW / 2));
                else spouseOffset = ((nodeW / 2) + SPOUSE_GAP + (nodeW / 2)) + (nodeW + 10) * (index - 1); 
            }

            let spouseCoords;
            if (isVertical) {
                spouseCoords = getCoords(d, mainShift + spouseOffset, 0);
            } else if (!isRadial) { // Horizontal
                spouseCoords = getCoords(d, 0, mainShift + spouseOffset);
            } else { // Radial
                // For radial, spouse offset affects angle
                const angle = (d.x + mainShift + spouseOffset) * (Math.PI / 180);
                const radius = d.y;
                let finalRadius = radius;
                if (settings.enableTimeOffset) {
                    const spouseBirthYear = getBirthYear(spouse);
                    if (spouseBirthYear !== 9999 && oldestBirthYear !== Infinity) {
                        finalRadius = radius + (spouseBirthYear - oldestBirthYear) * timeScaleFactor;
                    }
                }
                spouseCoords = {
                    x: finalRadius * Math.cos(angle),
                    y: finalRadius * Math.sin(angle)
                };
            }

            nodes.push({ id: visualSpouseId, x: spouseCoords.x, y: spouseCoords.y, data: spouse, type: 'spouse' });

            links.push({ source: person.id, target: visualSpouseId, type: 'marriage' });

            // Calculate Collapse/Branching Joints
            const midX = (coords.x + spouseCoords.x) / 2;
            const midY = (coords.y + spouseCoords.y) / 2;
            const dropDistance = settings.isCompact ? 90 : 120;

            const coupleHasChildren = person.children.some(childId => {
                const child = people[childId];
                return child && child.parents.includes(spouseId);
            });

            if (coupleHasChildren) {
                const uniqueKey = `${person.id}:${spouseId}`;
                let cpX = midX;
                let cpY = midY;

                if (isVertical) {
                    cpY = midY + dropDistance;
                } else if (!isRadial) { // Horizontal
                    cpX = midX + dropDistance;
                } else { // Radial
                    // For radial, drop point should be further out along the bisector of the angle
                    const angle = Math.atan2(midY, midX);
                    const currentRadius = Math.sqrt(midX*midX + midY*midY);
                    cpX = (currentRadius + dropDistance) * Math.cos(angle);
                    cpY = (currentRadius + dropDistance) * Math.sin(angle);
                }

                collapsePoints.push({
                    id: person.id,
                    spouseId: spouseId, 
                    uniqueKey: uniqueKey,
                    x: cpX,
                    y: cpY,
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
            
            let cpX = coords.x;
            let cpY = coords.y;

            if (isVertical) {
                cpY = coords.y + dropDistance;
            } else if (!isRadial) { // Horizontal
                cpX = coords.x + dropDistance;
            } else { // Radial
                const angle = Math.atan2(coords.y, coords.x);
                const currentRadius = Math.sqrt(coords.x*coords.x + coords.y*coords.y);
                cpX = (currentRadius + dropDistance) * Math.cos(angle);
                cpY = (currentRadius + dropDistance) * Math.sin(angle);
            }

             collapsePoints.push({
                id: person.id,
                spouseId: 'single', 
                uniqueKey: uniqueKey,
                x: cpX,
                y: cpY,
                originX: coords.x,
                originY: coords.y,
                isCollapsed: collapsedIds.has(uniqueKey)
            });
        }

        // Add Parent-Child Links
        if (d.children) {
            d.children.forEach((child: d3.HierarchyPointNode<CustomHierarchyDatum>) => { // Explicitly type child
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