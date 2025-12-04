import * as d3 from 'd3';
import { Person, TreeNode, TreeLink, TreeSettings } from '../types';
import { findRootAncestor, getBirthYear } from './layoutHelpers';
import { 
    NODE_WIDTH_DEFAULT, NODE_WIDTH_COMPACT, NODE_HEIGHT_DEFAULT, NODE_HEIGHT_COMPACT,
    LEVEL_SEP_DEFAULT, LEVEL_SEP_COMPACT, SIBLING_GAP_DEFAULT, SIBLING_GAP_COMPACT, SPOUSE_GAP,
    CollapsePoint
} from './layoutConstants'; // Import constants and CollapsePoint from layoutConstants

// Define a custom type for the data within the hierarchy node to include groupIndex
interface CustomHierarchyDatum {
    id: string;
    person: Person;
    children?: CustomHierarchyDatum[];
    groupIndex?: number; // Custom property for spouse grouping
}

/**
 * Calculates the layout for a descendant chart (vertical, horizontal, or radial).
 */
export const calculateDescendantLayout = (
    people: Record<string, Person>,
    focusId: string,
    settings: TreeSettings,
    collapsedIds: Set<string>
): { nodes: TreeNode[], links: TreeLink[], collapsePoints: CollapsePoint[] } => {
    
    const isVertical = settings.layoutMode === 'vertical';
    const isRadial = settings.layoutMode === 'radial';
    const nodeW = settings.isCompact ? NODE_WIDTH_COMPACT : NODE_WIDTH_DEFAULT;
    const nodeH = settings.isCompact ? NODE_HEIGHT_COMPACT : NODE_HEIGHT_DEFAULT;
    const levelGap = settings.isCompact ? LEVEL_SEP_COMPACT : LEVEL_SEP_DEFAULT;
    const siblingGap = settings.isCompact ? SIBLING_GAP_COMPACT : SIBLING_GAP_DEFAULT;

    const rootId = findRootAncestor(people, focusId);
    
    // Track visited nodes to prevent cycles
    const visitedInHierarchy = new Set<string>();
    
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
                .filter(Boolean) as CustomHierarchyDatum[];
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
                .filter(Boolean) as CustomHierarchyDatum[];
        };

        // Distribute children branches around spouses
        const childrenGroups: CustomHierarchyDatum[][] = [];
        
        // Group children by spouse
        spouses.forEach((spId, idx) => {
            childrenGroups.push(getKidsForSpouse(spId, idx + 1)); // Group index starts from 1 for spouses
        });
        childrenGroups.push(getSingleKids()); // Single children group (index 0)

        // Flatten and sort all children
        const allChildren = childrenGroups.flat().sort((a, b) => {
            // Sort by groupIndex first, then by birth year
            if ((a.groupIndex || 0) !== (b.groupIndex || 0)) {
                return (a.groupIndex || 0) - (b.groupIndex || 0);
            }
            return getBirthYear(a.person) - getBirthYear(b.person);
        });

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
        .separation((a: d3.HierarchyPointNode<CustomHierarchyDatum>, b: d3.HierarchyPointNode<CustomHierarchyDatum>) => {
            const pA = a.data.person as Person;
            const pB = b.data.person as Person;
            
            const widthA = 1 + (pA.spouses ? pA.spouses.length : 0);
            const widthB = 1 + (pB.spouses ? pB.spouses.length : 0);
            
            let separation = (widthA + widthB) / 2;
            
            if (a.parent === b.parent) {
                const groupA = a.data.groupIndex || 0;
                const groupB = b.data.groupIndex || 0;
                
                if (groupA !== groupB) {
                    separation += 0.5;
                } else {
                    separation += 0.2; 
                }
            } else {
                separation += 0.7;
            }

            if (isRadial) {
                const currentRadius = a.y;
                return currentRadius > 0 ? (separation * (nodeW + SPOUSE_GAP)) / currentRadius * (180 / Math.PI) : separation;
            }
            
            return separation; 
        });

    if (isRadial) {
        let maxDepth = 0;
        root.each((d) => {
            if (d.depth > maxDepth) maxDepth = d.depth;
        });
        const radialRadius = (maxDepth + 1) * levelGap;
        treeLayout.size([360, radialRadius]);
    } else {
        treeLayout.nodeSize(isVertical ? [nodeSpace, levelGap] : [levelGap, nodeSpace]);
    }

    treeLayout(root);

    // --- Time Offset Logic ---
    let oldestBirthYear = Infinity;
    const timeScaleFactor = settings.timeScaleFactor || 5;
    
    if (settings.enableTimeOffset) {
        Object.values(people).forEach(p => {
            const year = getBirthYear(p);
            if (year !== 9999 && year < oldestBirthYear) {
                oldestBirthYear = year;
            }
        });
    }

    // Helper function to get transformed coordinates for a node or spouse
    const getTransformedCoords = (
        d: d3.HierarchyPointNode<CustomHierarchyDatum>, 
        personData: Person, 
        isSpouse: boolean = false, 
        spouseIndex: number = 0
    ) => {
        let x = d.x;
        let y = d.y;

        // Apply time offset
        if (settings.enableTimeOffset) {
            const personBirthYear = getBirthYear(personData);
            if (personBirthYear !== 9999 && oldestBirthYear !== Infinity) {
                const timeOffset = (personBirthYear - oldestBirthYear) * timeScaleFactor;
                if (isVertical) y += timeOffset;
                else if (!isRadial) x += timeOffset; // Apply to depth for horizontal
                else y += timeOffset; // Apply to radius for radial
            }
        }

        let finalX = x;
        let finalY = y;

        if (isVertical) {
            // d.x is breadth, d.y is depth
            let totalShiftX = 0;
            if (personData.spouses.length === 1) {
                totalShiftX = -(nodeW / 2 + SPOUSE_GAP / 2); // Shift main person left
            }
            if (isSpouse) {
                if (personData.spouses.length === 1) {
                    totalShiftX = (nodeW / 2 + SPOUSE_GAP / 2); // Shift spouse right
                } else {
                    // For multiple spouses, distribute them
                    // This logic needs to be more robust for multiple spouses to avoid overlap
                    // For simplicity, let's just place them relative to the main person
                    totalShiftX = (nodeW + SPOUSE_GAP) * (spouseIndex + 1); // Place spouses to the right
                    if (spouseIndex % 2 === 0) { // Alternate sides for better spread
                        totalShiftX = (nodeW / 2 + SPOUSE_GAP / 2) + (nodeW + SPOUSE_GAP) * (spouseIndex / 2);
                    } else {
                        totalShiftX = -(nodeW / 2 + SPOUSE_GAP / 2) - (nodeW + SPOUSE_GAP) * ((spouseIndex - 1) / 2);
                    }
                }
            }
            finalX += totalShiftX;

        } else if (!isRadial) { // Horizontal
            // d.x is depth, d.y is breadth
            let totalShiftY = 0;
            if (personData.spouses.length === 1) {
                totalShiftY = -(nodeH / 2 + SPOUSE_GAP / 2); // Shift main person up
            }
            if (isSpouse) {
                if (personData.spouses.length === 1) {
                    totalShiftY = (nodeH / 2 + SPOUSE_GAP / 2); // Shift spouse down
                } else {
                    // Similar to vertical, distribute spouses vertically
                    totalShiftY = (nodeH + SPOUSE_GAP) * (spouseIndex + 1);
                    if (spouseIndex % 2 === 0) {
                        totalShiftY = (nodeH / 2 + SPOUSE_GAP / 2) + (nodeH + SPOUSE_GAP) * (spouseIndex / 2);
                    } else {
                        totalShiftY = -(nodeH / 2 + SPOUSE_GAP / 2) - (nodeH + SPOUSE_GAP) * ((spouseIndex - 1) / 2);
                    }
                }
            }
            finalY += totalShiftY;

            // Swap x and y for horizontal display
            [finalX, finalY] = [finalY, finalX];

        } else { // Radial
            // d.x is angle (0-360), d.y is radius
            let angleOffset = 0; // Offset in degrees
            if (isSpouse) {
                // Distribute spouses around the main person's angle
                angleOffset = (spouseIndex % 2 === 0 ? 1 : -1) * (5 + Math.floor(spouseIndex / 2) * 5);
            }
            const angleRad = (x + angleOffset) * (Math.PI / 180); // Convert to radians
            const radius = y;
            finalX = radius * Math.cos(angleRad);
            finalY = radius * Math.sin(angleRad);
        }

        return { x: finalX, y: finalY };
    };

    // Transform results to app structure
    const nodes: TreeNode[] = [];
    const links: TreeLink[] = [];
    const collapsePoints: CollapsePoint[] = [];

    // Cast to HierarchyPointNode[] because treeLayout mutates nodes to add x and y
    (root.descendants() as d3.HierarchyPointNode<CustomHierarchyDatum>[]).forEach((d) => {
        const person = d.data.person as Person;
        const spouseIds = person.spouses || [];

        const coords = getTransformedCoords(d, person, false); // Main person coords

        let type: TreeNode['type'] = 'descendant';
        if (person.id === focusId) type = 'focus';

        nodes.push({ id: person.id, x: coords.x, y: coords.y, data: person, type });

        // Add Spouses
        spouseIds.forEach((spouseId, index) => {
            const spouse = people[spouseId];
            if (!spouse) return;

            const visualSpouseId = `spouse-${person.id}-${spouseId}`;
            const spouseCoords = getTransformedCoords(d, person, true, index); // Spouse coords

            nodes.push({ id: visualSpouseId, x: spouseCoords.x, y: spouseCoords.y, data: spouse, type: 'spouse' });

            links.push({ source: person.id, target: visualSpouseId, type: 'marriage' });

            // Calculate Collapse/Branching Joints
            const midX = (coords.x + spouseCoords.x) / 2;
            const midY = (coords.y + coords.y) / 2; // Use main person's Y for midpoint in vertical/horizontal
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
            d.children.forEach((child: d3.HierarchyPointNode<CustomHierarchyDatum>) => {
                links.push({ source: person.id, target: child.data.id, type: 'parent-child' });
            });
        }
    });

    return { nodes, links, collapsePoints };
};