import { Person, TreeSettings, TreeNode, TreeLink } from '../../types';
import { CollapsePoint } from './constants';

export const calculatePedigreeLayout = (
    people: Record<string, Person>,
    focusId: string,
    settings: TreeSettings
): { nodes: TreeNode[]; links: TreeLink[]; collapsePoints: CollapsePoint[] } => {
    const nodes: TreeNode[] = [];
    const links: TreeLink[] = [];

    // Dynamic data depth maxing at 50 generations to replace hardcoded 5, allowing full ancestry while preventing infinite loops in corrupted data.
    const maxGenerations = 50;

    const isVertical = settings.layoutMode === 'vertical';
    // Cast to Number to prevent string concatenation issues
    const propLevelSpacing = Number(settings.nodeSpacingY);
    const propNodeSpacing = Number(settings.nodeSpacingX);

    const levelSpacing = (!isNaN(propLevelSpacing) && propLevelSpacing > 0) ? propLevelSpacing : (settings.isCompact ? 180 : 220); // Distance between generations

    // Ensure nodeSpacing (branch spread) is at least 2x the node width plus user's X-spacing
    const minSpread = (settings.nodeWidth || 160) * 2 + (Number(settings.nodeSpacingX) || 0);
    const nodeSpacing = Math.max(minSpread, propNodeSpacing > 0 ? propNodeSpacing : 600);

    const rootX = 0;
    const rootY = 0;

    const visitedIds = new Set<string>();

    const buildAncestor = (id: string, generation: number, offset: number, branchSpread: number) => {
        if (generation >= maxGenerations) return;

        const person = people[id];
        if (!person) return;

        // Show Deceased Filter: Prune if deceased and setting is off
        if (settings.showDeceased === false && person.isDeceased) return;

        // O(1) cycle detection using a Set (replaces O(n²) Array.some())
        if (visitedIds.has(id)) return;
        visitedIds.add(id);

        // Pedigree grows UPWARDS: generation 0 is at 0, gen 1 (parents) at -levelSpacing, etc.
        const levelPos = -generation * levelSpacing;
        const finalLevelPos = (!isVertical && settings.isRtl) ? -levelPos : levelPos;

        nodes.push({
            id: id,
            x: isVertical ? offset : finalLevelPos,
            y: isVertical ? finalLevelPos : offset,
            data: person,
            type: generation === 0 ? 'focus' : 'ancestor',
        });

        // Father
        let fatherId = person.parents.find((pid) => people[pid]?.gender === 'male');
        if (!fatherId && person.parents.length > 0) fatherId = person.parents[0];

        // Mother
        let motherId = person.parents.find((pid) => people[pid]?.gender === 'female');
        if (!motherId && person.parents.length > 1) {
            motherId = person.parents.find((pid) => pid !== fatherId);
        }

        const childBuffer = (settings.nodeWidth || 160) * 1.2;
        const nextBranchSpread = Math.max(childBuffer, branchSpread / 2);

        if (fatherId) {
            const fatherOffset = offset - nextBranchSpread / 2;
            buildAncestor(fatherId, generation + 1, fatherOffset, nextBranchSpread);
            links.push({ source: id, target: fatherId, type: 'parent-child' });
        }

        if (motherId) {
            const motherOffset = offset + nextBranchSpread / 2;
            buildAncestor(motherId, generation + 1, motherOffset, nextBranchSpread);
            links.push({ source: id, target: motherId, type: 'parent-child' });
        }
    };

    buildAncestor(focusId, 0, isVertical ? rootX : rootY, nodeSpacing);

    return { nodes, links, collapsePoints: [] };
};
