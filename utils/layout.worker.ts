import * as d3 from 'd3';
import { Person, TreeSettings, TreeNode, TreeLink, FanArc } from '../types';
import { calculateTreeLayout } from './treeLayout';
import { buildAncestry, FanChartDatum } from './layout/traversal';

self.onmessage = (e: MessageEvent) => {
    const { requestId, people, focusId, settings, collapsedIds } = e.data;
    console.log(`[LayoutWorker] Request ${requestId} for chart type: ${settings.chartType}`);

    const firstId = people ? Object.keys(people)[0] : undefined;
    const effectiveFocusId = (focusId && people && people[focusId]) ? focusId : (firstId || focusId);

    // Inject settings into buildAncestry context if needed (already handled by passing settings)
    let isTruncated = false;
    const onTruncated = () => { isTruncated = true; };

    try {
        const isForce = settings.chartType === 'force';
        const isFanChart = settings.chartType === 'fan';

        if (isForce) {
            const forceNodes: TreeNode[] = [];
            const forceLinks: TreeLink[] = [];
            const processedLinkPairs = new Set<string>();

            // Create nodes with better initial spacing
            const nodeIds = Object.keys(people);
            const gridSize = Math.ceil(Math.sqrt(nodeIds.length));
            const spacing = 150; // Increased spacing between nodes

            nodeIds.forEach((id, index) => {
                const p = people[id];
                const row = Math.floor(index / gridSize);
                const col = index % gridSize;

                // Create initial grid layout with better spacing
                forceNodes.push({
                    id: p.id,
                    x: (col - gridSize / 2) * spacing,
                    y: (row - gridSize / 2) * spacing,
                    data: p,
                    type: 'descendant'
                });

                p.parents.forEach((pid: string) => {
                    if (people[pid]) forceLinks.push({ source: pid, target: p.id, type: 'parent-child' });
                });
                p.spouses.forEach((sid: string) => {
                    const pairKey = [p.id, sid].sort().join('-');
                    if (people[sid] && !processedLinkPairs.has(pairKey)) {
                        forceLinks.push({ source: p.id, target: sid, type: 'marriage' });
                        processedLinkPairs.add(pairKey);
                    }
                });
            });

            self.postMessage({
                requestId,
                nodes: forceNodes,
                links: forceLinks,
                collapsePoints: [],
                fanArcs: []
            });
            return;
        }

        if (isFanChart) {
            const depthLimit = Number(settings.generationLimit) || 6;
            console.log(`[LayoutWorker] Calculating Fan Chart with Generation Limit: ${depthLimit}`);
            const rootData = buildAncestry(effectiveFocusId, 0, people, depthLimit, settings, onTruncated);
            if (isTruncated) console.log(`[LayoutWorker] Partial Tree rendered due to Generation Limit (${depthLimit})`);

            if (!rootData) {
                self.postMessage({ requestId, nodes: [], links: [], collapsePoints: [], fanArcs: [] });
                return;
            }

            const hierarchy = d3.hierarchy<FanChartDatum>(rootData).count();
            const radius = 900;
            const partition = d3.partition<FanChartDatum>().size([2 * Math.PI, radius]);
            partition(hierarchy);

            const arcs: FanArc[] = [];
            const centerRadius = 80;
            const ringWidth = 100;

            interface D3PartitionArcDatum extends d3.HierarchyNode<FanChartDatum> {
                x0: number;
                x1: number;
                y0: number;
                y1: number;
                value: number;
            }

            hierarchy.descendants().forEach((d: d3.HierarchyNode<FanChartDatum>) => {
                const partitionDatum = d as D3PartitionArcDatum;
                const innerR = partitionDatum.depth === 0 ? 0 : centerRadius + (partitionDatum.depth - 1) * ringWidth;
                const outerR = partitionDatum.depth === 0 ? centerRadius : centerRadius + partitionDatum.depth * ringWidth;

                arcs.push({
                    id: `${partitionDatum.data.id}-${partitionDatum.depth}-${arcs.length}`,
                    person: partitionDatum.data.person,
                    startAngle: partitionDatum.x0,
                    endAngle: partitionDatum.x1,
                    innerRadius: innerR,
                    outerRadius: outerR,
                    depth: partitionDatum.depth,
                    value: partitionDatum.value || 0,
                    hasChildren: !!partitionDatum.children && partitionDatum.children.length > 0
                });
            });

            console.log(`[LayoutWorker] Generated ${arcs.length} fan arcs`);
            if (arcs.length > 0) {
                console.log(`[LayoutWorker] Sample Arc:`, JSON.stringify(arcs[0]));
            }

            self.postMessage({ requestId, nodes: [], links: [], collapsePoints: [], fanArcs: arcs });
            return;
        }

        const collapsedSet = Array.isArray(collapsedIds) ? new Set(collapsedIds) : collapsedIds;
        const result = calculateTreeLayout(people, effectiveFocusId, settings, collapsedSet);

        self.postMessage({
            requestId,
            nodes: result.nodes,
            links: result.links,
            collapsePoints: result.collapsePoints,
            fanArcs: []
        });
    } catch (error) {
        self.postMessage({
            requestId,
            error: error instanceof Error ? error.message : 'Unknown layout calculation error',
        });
    }
};
