import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { Person, TreeLink, TreeSettings, TreeNode, FanArc } from '../types';
import { calculateTreeLayout } from '../utils/treeLayout';

// Import new sub-components
import { DescendantPedigreeChart } from './charts/DescendantPedendantChart';
import { FanChart } from './charts/FanChart';
import { ForceChart } from './charts/ForceChart';
import { ZoomControls } from './ui/ZoomControls';
import { Minimap } from './ui/Minimap';

interface FamilyTreeProps {
  people: Record<string, Person>;
  focusId: string;
  onSelect: (id: string) => void;
  settings: TreeSettings;
}

export const FamilyTree: React.FC<FamilyTreeProps> = React.memo(({ people, focusId, onSelect, settings }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null); 
  const wrapperRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<TreeNode, TreeLink> | null>(null); // Updated type
  
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const isForce = settings.chartType === 'force';
  const isFanChart = settings.chartType === 'fan';
  const isRadialLayout = settings.layoutMode === 'radial' && settings.chartType === 'descendant'; // New flag

  // --- Data Calculation for all chart types ---
  const { nodes, links, collapsePoints, fanArcs } = useMemo(() => {
    if (isForce) {
        const forceNodes: TreeNode[] = [];
        const forceLinks: TreeLink[] = [];
        const processedLinkPairs = new Set<string>();

        Object.values(people).forEach((p: Person) => {
            forceNodes.push({ id: p.id, x: 0, y: 0, data: p, type: 'descendant' });
            
            p.parents.forEach(pid => {
                if(people[pid]) forceLinks.push({ source: pid, target: p.id, type: 'parent-child' });
            });
            p.spouses.forEach(sid => {
                // Ensure spouse links are added only once per pair
                const pairKey = [p.id, sid].sort().join('-');
                if (people[sid] && !processedLinkPairs.has(pairKey)) {
                    forceLinks.push({ source: p.id, target: sid, type: 'marriage' });
                    processedLinkPairs.add(pairKey);
                }
            });
        });
        return { nodes: forceNodes, links: forceLinks, collapsePoints: [], fanArcs: [] as FanArc[] };
    }

    if (isFanChart) {
        const depthLimit = 6;
        interface FanChartDatum {
            id: string;
            person: Person;
            depth: number;
            children?: FanChartDatum[];
        }

        const buildAncestry = (id: string, depth: number): FanChartDatum | null => {
            if (depth > depthLimit) return null;
            const p = people[id];
            if (!p) return null;
            
            const node: FanChartDatum = { id: p.id, person: p, depth };
            
            const fatherId = p.parents.find(pid => people[pid]?.gender === 'male');
            const motherId = p.parents.find(pid => people[pid]?.gender === 'female');
            
            const children: FanChartDatum[] = [];
            if (fatherId) {
                const fNode = buildAncestry(fatherId, depth + 1);
                if (fNode) children.push(fNode);
            }
            if (motherId) {
                const mNode = buildAncestry(motherId, depth + 1);
                if (mNode) children.push(mNode);
            } 
            
            if (children.length > 0) {
                node.children = children;
            }
            return node;
        };

        const rootData = buildAncestry(focusId, 0);
        if (!rootData) return { nodes: [], links: [], collapsePoints: [], fanArcs: [] as FanArc[] };

        const hierarchy = d3.hierarchy<FanChartDatum>(rootData).count();
        
        const radius = 900; 
        const partition = d3.partition<FanChartDatum>().size([2 * Math.PI, radius]); 
        partition(hierarchy);
        
        const arcs: FanArc[] = [];
        
        const centerRadius = 80;
        const ringWidth = 100;

        // Define a local interface for the properties added by d3.partition
        interface D3PartitionArcDatum extends d3.HierarchyNode<FanChartDatum> {
            x0: number;
            x1: number;
            y0: number;
            y1: number;
            value: number; // d.value is guaranteed to be number after .count()
        }

        hierarchy.descendants().forEach((d: d3.HierarchyNode<FanChartDatum>) => { // Corrected type assertion here
            const partitionDatum = d as D3PartitionArcDatum; // Explicitly cast to the extended type
            const innerR = partitionDatum.depth === 0 ? 0 : centerRadius + (partitionDatum.depth - 1) * ringWidth;
            const outerR = partitionDatum.depth === 0 ? centerRadius : centerRadius + partitionDatum.depth * ringWidth;

            arcs.push({
                id: partitionDatum.data.id,
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

        return { nodes: [], links: [], collapsePoints: [], fanArcs: arcs };
    } 
    
    return { ...calculateTreeLayout(people, focusId, settings, collapsedIds), fanArcs: [] as FanArc[] };
  }, [people, focusId, settings, collapsedIds, isFanChart, isForce]);

  // --- Force Simulation Logic ---
  useEffect(() => {
      if (!isForce || !svgRef.current) return;
      
      const simulation = d3.forceSimulation<TreeNode, TreeLink>(nodes) // Removed 'as any'
          .force("link", d3.forceLink<TreeNode, TreeLink>(links).id((d: TreeNode) => d.id).distance(150)) // Explicitly type d
          .force("charge", d3.forceManyBody<TreeNode>().strength(-500))
          .force("center", d3.forceCenter<TreeNode>(0, 0))
          .force("collide", d3.forceCollide<TreeNode>(80));

      simulation.on("tick", () => {
          const uNodes = d3.select(gRef.current).selectAll('.force-node').data(nodes);
          uNodes.attr('transform', (d: TreeNode) => `translate(${d.x},${d.y})`); // Explicitly type d

          const uLinks = d3.select(gRef.current).selectAll('.force-link').data(links);
          uLinks.attr('d', (d: TreeLink) => `M ${(d.source as TreeNode).x} ${(d.source as TreeNode).y} L ${(d.target as TreeNode).x} ${(d.target as TreeNode).y}`); // Explicitly type d.source and d.target
      });

      simulationRef.current = simulation;

      if (!settings.enableForcePhysics) {
          setTimeout(() => simulation.stop(), 500); 
      }

      return () => { simulation.stop(); };
  }, [isForce, nodes, links]);

  useEffect(() => {
      if (!simulationRef.current || !isForce) return;
      
      if (settings.enableForcePhysics) {
          simulationRef.current.alpha(1).restart();
      } else {
          simulationRef.current.stop();
      }
  }, [settings.enableForcePhysics, isForce]);

  // --- Zoom Behavior ---
  const zoomBehavior = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
         if (gRef.current) d3.select(gRef.current).attr('transform', event.transform.toString());
      });

    d3.select(svgRef.current).call(zoom).on("dblclick.zoom", null);
    zoomBehavior.current = zoom;
  }, []);

  // --- Center Focus Logic ---
  useEffect(() => {
    if (wrapperRef.current && svgRef.current && zoomBehavior.current) {
        const { width, height } = wrapperRef.current.getBoundingClientRect();
        
        let tX = 0, tY = 0, scale = 1;

        if (isFanChart || isForce || isRadialLayout) { // Added isRadialLayout
            tX = width / 2;
            tY = height / 2;
            scale = isForce ? 0.6 : isFanChart ? 0.8 : isRadialLayout ? 0.8 : 1; // Adjusted scale for radial
        } else if (nodes.length > 0) {
             const focusNode = nodes.find(n => n.id === focusId) || nodes[0];
             if (focusNode) {
                 scale = 0.85;
                 tX = width / 2 - focusNode.x * scale;
                 tY = height / 2 - focusNode.y * scale;
             }
        }

        const svg = d3.select(svgRef.current);
        svg.transition()
            .duration(750)
            .ease(d3.easeCubicOut)
            .call(zoomBehavior.current.transform, d3.zoomIdentity.translate(tX, tY).scale(scale));
    }
  }, [focusId, nodes, isFanChart, isForce, isRadialLayout]); // Added isRadialLayout to dependencies

  const handleZoomIn = useCallback(() => {
      if (svgRef.current && zoomBehavior.current) {
          d3.select(svgRef.current).transition().duration(300).call(zoomBehavior.current.scaleBy, 1.2);
      }
  }, []);

  const handleZoomOut = useCallback(() => {
      if (svgRef.current && zoomBehavior.current) {
          d3.select(svgRef.current).transition().duration(300).call(zoomBehavior.current.scaleBy, 0.8);
      }
  }, []);

  const handleResetZoom = useCallback(() => {
      if(zoomBehavior.current && wrapperRef.current && svgRef.current) {
         const { width, height } = wrapperRef.current.getBoundingClientRect();
         const transform = (isFanChart || isForce || isRadialLayout) // Added isRadialLayout
            ? d3.zoomIdentity.translate(width/2, height/2).scale(isForce ? 0.6 : isFanChart ? 0.8 : isRadialLayout ? 0.8 : 1) // Adjusted scale for radial
            : d3.zoomIdentity.translate(width/2 - (nodes[0]?.x||0), height/2 - (nodes[0]?.y||0)).scale(0.85);
         
         d3.select(svgRef.current).transition().duration(500).call(zoomBehavior.current.transform, transform);
      }
  }, [isFanChart, isForce, isRadialLayout, nodes]); // Added isRadialLayout to dependencies

  const toggleCollapse = useCallback((uniqueKey: string) => {
    setCollapsedIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(uniqueKey)) newSet.delete(uniqueKey);
        else newSet.add(uniqueKey);
        return newSet;
    });
  }, []);

  return (
    <div ref={wrapperRef} className="flex-1 h-full theme-bg overflow-hidden relative cursor-move select-none transition-colors duration-500">
      
      {/* Minimap */}
      {!isFanChart && !isForce && settings.showMinimap && (
          <Minimap nodes={nodes} links={links} focusId={focusId} isRadial={isRadialLayout} /> {/* Pass isRadial prop */}
      )}

      {/* Zoom Controls */}
      <ZoomControls onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onReset={handleResetZoom} />

      <svg ref={svgRef} className="w-full h-full block">
        <defs>
            <filter id="shadow"><feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000000" floodOpacity="0.06"/></filter>
        </defs>
        
        <g ref={gRef} className="viewport">
          {settings.chartType === 'fan' && (
            <FanChart fanArcs={fanArcs} focusId={focusId} onSelect={onSelect} settings={settings} />
          )}
          {settings.chartType === 'force' && (
            <ForceChart nodes={nodes} links={links} focusId={focusId} onSelect={onSelect} settings={settings} />
          )}
          {(settings.chartType === 'descendant' || settings.chartType === 'pedigree') && (
            <DescendantPedigreeChart 
              nodes={nodes} 
              links={links} 
              collapsePoints={collapsePoints} 
              focusId={focusId} 
              onSelect={onSelect} 
              settings={settings} 
              toggleCollapse={toggleCollapse}
              people={people}
            />
          )}
        </g>
      </svg>
    </div>
  );
});