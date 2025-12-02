import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { Person, TreeLink, TreeSettings, TreeNode } from '../types';
import { getYears } from '../utils/familyLogic';
import { calculateTreeLayout } from '../utils/treeLayout';
import { User, Ribbon, ZoomIn, ZoomOut, Maximize, ChevronDown, ChevronUp, ChevronRight, ChevronLeft } from 'lucide-react';

interface FamilyTreeProps {
  people: Record<string, Person>;
  focusId: string;
  onSelect: (id: string) => void;
  settings: TreeSettings;
}

// Common Styles (now using CSS variables defined in index.html)
const COMMON_STYLES = `
    .uiverse-card { transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1); backdrop-filter: blur(8px); }
    .card-content { display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; height: 100%; width: 100%; padding: 12px 8px; gap: 6px; position: relative; overflow: hidden; }
    .avatar-ring { position: relative; width: 68px; height: 68px; border-radius: 50%; flex-shrink: 0; padding: 3px; border-style: solid; border-width: 2px; box-shadow: 0 2px 5px rgba(0,0,0,0.05); background: white; }
    .dark .avatar-ring { background: #292524; }
    .avatar-img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
    .minimap { position: absolute; bottom: 20px; left: 20px; width: 150px; height: 100px; background: rgba(255,255,255,0.8); border: 1px solid #e5e5e5; border-radius: 12px; pointer-events: none; overflow: hidden; z-index: 20; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
    .dark .minimap { background: rgba(28,25,23,0.8); border-color: #44403c; }
`;

export const FamilyTree: React.FC<FamilyTreeProps> = React.memo(({ people, focusId, onSelect, settings }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null); 
  const wrapperRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<any, any> | null>(null);
  
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  // === FORCE GRAPH LOGIC ===
  const isForce = settings.chartType === 'force';
  const isFanChart = settings.chartType === 'fan';

  const { nodes, links, collapsePoints, fanArcs } = useMemo(() => {
     if (isForce) {
         // Create a network graph
         const nodes: TreeNode[] = [];
         const links: TreeLink[] = [];
         const processed = new Set<string>();

         Object.values(people).forEach((p: Person) => {
             nodes.push({ id: p.id, x: 0, y: 0, data: p, type: 'descendant' });
             
             // Parent links
             p.parents.forEach(pid => {
                 if(people[pid]) links.push({ source: pid, target: p.id, type: 'parent-child' });
             });
             // Spouse links (only add once)
             p.spouses.forEach(sid => {
                 if (people[sid] && !processed.has(`${sid}-${p.id}`)) {
                     links.push({ source: p.id, target: sid, type: 'marriage' });
                     processed.add(`${p.id}-${sid}`);
                 }
             });
         });
         return { nodes, links, collapsePoints: [], fanArcs: [] };
     }

     if (isFanChart) {
         const depthLimit = 6;
         const buildAncestry = (id: string, depth: number): d3.HierarchyNode<any> | null => { // Explicitly type return
             if (depth > depthLimit) return null;
             const p = people[id]; // Corrected: use 'p' as the person object
             if (!p) return null;
             
             const node: any = { id: p.id, person: p, depth }; // Corrected: use 'p'
             
             const fatherId = p.parents.find(pid => people[pid]?.gender === 'male');
             const motherId = p.parents.find(pid => people[pid]?.gender === 'female');
             
             const children = [];
             if (fatherId) {
                 const fNode = buildAncestry(fatherId, depth + 1);
                 if (fNode) children.push(fNode);
             } else if (depth < depthLimit) {
                 // Placeholders logic if needed
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
         if (!rootData) return { nodes: [], links: [], collapsePoints: [], fanArcs: [] };

         const hierarchy = d3.hierarchy(rootData).count();
         
         const radius = 900; 
         const partition = d3.partition().size([2 * Math.PI, radius]); 
         partition(hierarchy);
         
         const arcs: any[] = [];
         
         const centerRadius = 80;
         const ringWidth = 100;

         hierarchy.descendants().forEach((d: d3.HierarchyPointNode<any>) => { // Explicitly type d
             const innerR = d.depth === 0 ? 0 : centerRadius + (d.depth - 1) * ringWidth;
             const outerR = d.depth === 0 ? centerRadius : centerRadius + d.depth * ringWidth;

             arcs.push({
                 id: d.data.name,
                 person: d.data.person,
                 startAngle: d.x0,
                 endAngle: d.x1,
                 innerRadius: innerR,
                 outerRadius: outerR,
                 depth: d.depth,
                 value: d.value,
                 hasChildren: d.children && d.children.length > 0
             });
         });

         return { nodes: [], links: [], collapsePoints: [], fanArcs: arcs };
     } 
     
     // Default Descendant/Pedigree Layout
     return { ...calculateTreeLayout(people, focusId, settings, collapsedIds), fanArcs: [] };
  }, [people, focusId, settings, collapsedIds, isFanChart, isForce]);

  // === FORCE SIMULATION ===
  useEffect(() => {
      if (!isForce || !svgRef.current) return;
      
      const simulation = d3.forceSimulation(nodes as any)
          .force("link", d3.forceLink(links).id((d: any) => d.id).distance(150))
          .force("charge", d3.forceManyBody().strength(-500))
          .force("center", d3.forceCenter(0, 0))
          .force("collide", d3.forceCollide(80));

      simulation.on("tick", () => {
          const uNodes = d3.select(gRef.current).selectAll('.force-node').data(nodes);
          uNodes.attr('transform', (d: any) => `translate(${d.x},${d.y})`);

          const uLinks = d3.select(gRef.current).selectAll('.force-link').data(links);
          uLinks.attr('d', (d: any) => `M ${d.source.x} ${d.source.y} L ${d.target.x} ${d.target.y}`);
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


  // Zoom Behavior
  const zoomBehavior = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => { // Explicitly type event
         if (gRef.current) d3.select(gRef.current).attr('transform', event.transform);
      });

    d3.select(svgRef.current).call(zoom).on("dblclick.zoom", null);
    zoomBehavior.current = zoom;
  }, []);

  // Center Focus
  useEffect(() => {
    if (wrapperRef.current && svgRef.current && zoomBehavior.current) {
        const { width, height } = wrapperRef.current.getBoundingClientRect();
        
        let tX = 0, tY = 0, scale = 1;

        if (isFanChart || isForce) {
            tX = width / 2;
            tY = height / 2;
            scale = isForce ? 0.6 : isFanChart ? 0.8 : 1;
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
  }, [focusId, nodes, isFanChart, isForce]);

  const toggleCollapse = useCallback((uniqueKey: string) => {
    setCollapsedIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(uniqueKey)) newSet.delete(uniqueKey);
        else newSet.add(uniqueKey);
        return newSet;
    });
  }, []);

  // Controls
  const handleZoom = (factor: number) => {
      if (svgRef.current && zoomBehavior.current) {
          d3.select(svgRef.current).transition().duration(300).call(zoomBehavior.current.scaleBy, factor);
      }
  };

  const handleReset = () => {
      if(zoomBehavior.current && wrapperRef.current && svgRef.current) {
         const { width, height } = wrapperRef.current.getBoundingClientRect();
         const transform = (isFanChart || isForce)
            ? d3.zoomIdentity.translate(width/2, height/2).scale(isForce ? 0.6 : 0.8)
            : d3.zoomIdentity.translate(width/2 - (nodes[0]?.x||0), height/2 - (nodes[0]?.y||0)).scale(0.85);
         
         d3.select(svgRef.current).transition().duration(500).call(zoomBehavior.current.transform, transform);
      }
  };

  // --- RENDERING HELPERS ---
  
  const NODE_WIDTH = settings.isCompact ? 130 : 160;
  const NODE_HEIGHT = settings.isCompact ? 170 : 210;
  const CORNER_RADIUS = 20; // Smooth curve
  const isVertical = settings.layoutMode === 'vertical';

  const drawRoundedPath = useCallback((startX: number, startY: number, jointX: number, jointY: number, targetX: number, targetY: number) => {
      const splitOffset = 30; 
      const r = CORNER_RADIUS;
      
      if (isVertical) {
          const splitY = jointY + splitOffset;
          const targetTopY = targetY - NODE_HEIGHT/2;
          
          if (Math.abs(targetX - jointX) < 1) {
              return `M ${startX} ${startY} V ${targetTopY}`;
          }
          const dirX = targetX > jointX ? 1 : -1;
          return `M ${jointX} ${startY} V ${splitY - r} Q ${jointX} ${splitY} ${jointX + (r * dirX)} ${splitY} H ${targetX - (r * dirX)} Q ${targetX} ${splitY} ${targetX} ${splitY + r} V ${targetTopY}`;
      } else {
          const splitX = jointX + splitOffset;
          const targetLeftX = targetX - NODE_WIDTH/2; 
          
          if (Math.abs(targetY - jointY) < 1) {
              return `M ${startX} ${startY} H ${targetLeftX}`;
          }
          const dirY = targetY > jointY ? 1 : -1;
          return `M ${startX} ${jointY} H ${splitX - r} Q ${splitX} ${jointY} ${splitX} ${jointY + (r * dirY)} V ${targetY - (r * dirY)} Q ${splitX} ${targetY} ${splitX + r} ${targetY} H ${targetLeftX}`;
      }
  }, [isVertical, NODE_HEIGHT, NODE_WIDTH]);

  const getLinkPath = useCallback((link: TreeLink) => {
      if (isForce) return ''; 
      
      const source = nodes.find(n => n.id === link.source);
      const target = nodes.find(n => n.id === link.target);
      if (!source || !target) return '';
      
      if (link.type === 'marriage') return `M ${source.x} ${source.y} L ${target.x} ${target.y}`;
      
      if (settings.chartType === 'pedigree') {
          const sX = source.x + NODE_WIDTH/2;
          const sY = source.y;
          const tX = target.x - NODE_WIDTH/2;
          const tY = target.y;
          const midX = (sX + tX) / 2;
          // Smooth Bezier for Pedigree
          return `M ${sX} ${sY} C ${midX} ${sY}, ${midX} ${tY}, ${tX} ${tY}`;
      }

      if (settings.chartType === 'descendant' && link.type === 'parent-child') {
          const childData = target.data as Person;
          let correctJoint = null;
          if (childData.parents.length > 1) {
             const otherParentId = childData.parents.find(id => people[id]?.id !== (source.data as Person).id); 
             if (otherParentId) {
                correctJoint = collapsePoints.find(cp => cp.id === (source.data as Person).id && cp.spouseId === otherParentId);
             }
          }
          if (!correctJoint) correctJoint = collapsePoints.find(cp => cp.id === (source.data as Person).id && cp.spouseId === 'single');
          if (correctJoint) return drawRoundedPath(correctJoint.x, source.y, correctJoint.x, correctJoint.y, target.x, target.y);
      }
      return `M ${source.x} ${source.y} L ${target.x} ${target.y}`;
  }, [nodes, settings.chartType, collapsePoints, drawRoundedPath, NODE_WIDTH, isForce, people]);


  const arcGen = d3.arc<any, d3.DefaultArcObject>() // Explicitly type arc generator
      .startAngle((d: d3.DefaultArcObject) => d.startAngle) // Explicitly type d
      .endAngle((d: d3.DefaultArcObject) => d.endAngle) // Explicitly type d
      .padAngle(0.005)
      .innerRadius((d: d3.DefaultArcObject) => d.innerRadius)  // Explicitly type d
      .outerRadius((d: d3.DefaultArcObject) => d.outerRadius) // Explicitly type d
      .cornerRadius(6); 

  return (
    <div ref={wrapperRef} className="flex-1 h-full theme-bg overflow-hidden relative cursor-move select-none transition-colors duration-500">
      
      <style>{COMMON_STYLES}</style>

      {/* Minimap */}
      {!isFanChart && !isForce && settings.showMinimap && nodes.length > 0 && (
          <div className="minimap flex items-center justify-center">
              <svg viewBox={`${Math.min(...nodes.map(n=>n.x))-100} ${Math.min(...nodes.map(n=>n.y))-100} ${Math.max(...nodes.map(n=>n.x))-Math.min(...nodes.map(n=>n.x))+200} ${Math.max(...nodes.map(n=>n.y))-Math.min(...nodes.map(n=>n.y))+200}`} className="w-full h-full opacity-50">
                  {nodes.map(n => (
                      <circle key={n.id} cx={n.x} cy={n.y} r={20} fill={n.id === focusId ? 'var(--focus-ring-color)' : 'var(--link-line-stroke)'} />
                  ))}
                  {links.map((l, i) => {
                      const s = nodes.find(n => n.id === l.source);
                      const t = nodes.find(n => n.id === l.target);
                      if(!s || !t) return null;
                      return <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke="var(--link-line-stroke)" strokeWidth="10" />
                  })}
              </svg>
          </div>
      )}

      <div className="absolute bottom-6 right-6 flex flex-col gap-2 z-10 print:hidden">
          <button onClick={() => handleZoom(1.2)} className="p-2.5 bg-white dark:bg-stone-800 rounded-full shadow-lg text-stone-600 dark:text-stone-300 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-stone-700 transition-all" aria-label="Zoom In"><ZoomIn className="w-5 h-5" /></button>
          <button onClick={() => handleZoom(0.8)} className="p-2.5 bg-white dark:bg-stone-800 rounded-full shadow-lg text-stone-600 dark:text-stone-300 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-stone-700 transition-all" aria-label="Zoom Out"><ZoomOut className="w-5 h-5" /></button>
          <button onClick={handleReset} className="p-2.5 bg-white dark:bg-stone-800 rounded-full shadow-lg text-stone-600 dark:text-stone-300 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-stone-700 transition-all" aria-label="Reset Zoom"><Maximize className="w-5 h-5" /></button>
      </div>

      <svg ref={svgRef} className="w-full h-full block">
        <defs>
            <filter id="shadow"><feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000000" floodOpacity="0.06"/></filter>
        </defs>
        
        <g ref={gRef} className="viewport">
          
          {isFanChart ? (
              <g>
                  {fanArcs.map((d: any) => {
                      const path = arcGen(d);
                      if (!path) return null;
                      const isRoot = d.depth === 0;
                      
                      const angle = (d.startAngle + d.endAngle) * 90 / Math.PI - 90;
                      const isFlipped = angle > 90 || angle < -90;
                      const rotate = isFlipped ? angle - 180 : angle;
                      const textAnchor = "middle"; 
                      
                      let fillColor;
                      if (isRoot) {
                          fillColor = "var(--card-bg)";
                      } else {
                          if (d.person.gender === 'male') {
                              fillColor = d.depth % 2 === 0 ? 'var(--gender-male-border)' : 'var(--brand-100)'; // Teal variants
                          } else {
                              fillColor = d.depth % 2 === 0 ? 'var(--gender-female-border)' : 'var(--pink-100)'; 
                          }
                      }

                      const arcWidth = (d.endAngle - d.startAngle) * d.outerRadius;
                      const showText = isRoot || arcWidth > 15;

                      return (
                          <g 
                            key={d.id} 
                            onClick={(e) => { e.stopPropagation(); onSelect(d.person.id); }}
                            className="hover:opacity-90 cursor-pointer transition-opacity"
                          >
                              <path 
                                d={path} 
                                fill={fillColor}
                                stroke="white"
                                strokeWidth="1.5"
                                className="dark:stroke-stone-900"
                                style={{
                                    filter: isRoot ? 'url(#shadow)' : 'none'
                                }}
                              />
                              {!isRoot && showText && (
                                <g transform={`translate(${arcGen.centroid(d)}) rotate(${rotate})`}>
                                    <text 
                                        textAnchor={textAnchor} 
                                        dy="0.35em" 
                                        className="text-[10px] font-bold fill-stone-800 dark:fill-stone-900 pointer-events-none select-none font-sans" 
                                        style={{ fontSize: Math.max(8, 14 - d.depth * 1.5), fill: 'var(--card-text)' }}
                                    >
                                        {d.person.firstName}
                                    </text>
                                    
                                    {arcWidth > 40 && d.depth < 4 && (
                                        <text 
                                            textAnchor={textAnchor} 
                                            dy="1.6em" 
                                            className="text-[7px] fill-stone-600 dark:fill-stone-700 pointer-events-none select-none opacity-80"
                                            style={{ fill: 'var(--card-text)' }}
                                        >
                                            {d.person.birthDate ? d.person.birthDate.split('-')[0] : ''}
                                        </text>
                                    )}
                                </g>
                              )}
                              {isRoot && (
                                  <foreignObject x={-50} y={-50} width={100} height={100} style={{pointerEvents: 'none'}}>
                                      <div className={`w-full h-full rounded-full overflow-hidden border-4 flex items-center justify-center bg-stone-50`} style={{ borderColor: d.person.gender === 'male' ? 'var(--gender-male-border)' : 'var(--gender-female-border)' }}>
                                          {d.person.photoUrl ? (
                                              <img src={d.person.photoUrl} className="w-full h-full object-cover" />
                                          ) : (
                                              <User className={`w-12 h-12`} style={{ color: d.person.gender === 'male' ? 'var(--gender-male-border)' : 'var(--gender-female-border)' }}/>
                                          )}
                                      </div>
                                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 translate-y-10 text-center">
                                          <span className={`text-[10px] font-bold bg-white/90 dark:bg-stone-900/90 px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap`} style={{ color: d.person.gender === 'male' ? 'var(--gender-male-text)' : 'var(--gender-female-text)' }}>
                                              {d.person.firstName}
                                          </span>
                                      </div>
                                  </foreignObject>
                              )}
                          </g>
                      )
                  })}
              </g>
          ) : isForce ? (
              // === FORCE GRAPH RENDERING ===
              <g>
                  {links.map((link, i) => (
                      <path key={i} className="force-link link-line" stroke="var(--link-line-stroke)" strokeWidth="2" fill="none" />
                  ))}
                  {nodes.map((node) => (
                      <g key={node.id} className="force-node cursor-pointer" onClick={(e) => { e.stopPropagation(); onSelect(node.data.id); }}>
                          <circle r={30} fill={node.data.gender === 'male' ? 'var(--brand-100)' : 'var(--pink-100)'} stroke="var(--card-border)" strokeWidth="2" />
                          {node.data.photoUrl ? (
                              <image href={node.data.photoUrl} x="-30" y="-30" height="60" width="60" clipPath="circle(30px at 30px 30px)" />
                          ) : (
                              <text dy="5" textAnchor="middle" fill="var(--card-text)" fontSize="20">{node.data.firstName[0]}</text>
                          )}
                          <text dy="45" textAnchor="middle" className="text-xs font-bold fill-stone-700 dark:fill-stone-300 pointer-events-none" style={{ fill: 'var(--card-text)' }}>{node.data.firstName}</text>
                      </g>
                  ))}
              </g>
          ) : (
              // === STANDARD TREE RENDERING ===
              <>
                {links.map((link) => {
                    const path = getLinkPath(link);
                    if(!path) return null;
                    const isMarriage = link.type === 'marriage';
                    const sId = typeof link.source === 'object' ? (link.source as any).id : link.source;
                    const tId = typeof link.target === 'object' ? (link.target as any).id : link.target;
                    return (
                    <path 
                        key={`${sId}-${tId}`} 
                        d={path} 
                        fill="none" 
                        className={`link-line ${isMarriage ? "stroke-stone-300 dark:stroke-stone-600" : "stroke-stone-400 dark:stroke-stone-500"}`}
                        strokeWidth={isMarriage ? 1.5 : 2} 
                        strokeDasharray={isMarriage ? "4,4" : "0"}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                    );
                })}

                {collapsePoints.map((cp) => {
                    if (settings.chartType !== 'descendant') return null;
                    return (
                        <React.Fragment key={cp.uniqueKey}>
                            <path d={`M ${cp.originX} ${cp.originY} L ${cp.x} ${cp.y}`} fill="none" className="link-line" strokeWidth={2} strokeLinecap="round" />
                            <g transform={`translate(${cp.x}, ${cp.y})`} onClick={(e) => { e.stopPropagation(); toggleCollapse(cp.uniqueKey); }} className="cursor-pointer group">
                                <circle r="12" className="fill-white dark:fill-stone-900 stroke-stone-200 dark:stroke-stone-700 stroke-2 shadow-sm transition-all group-hover:scale-110 group-hover:stroke-teal-400 group-hover:shadow-md" />
                                {cp.isCollapsed ? (
                                    isVertical ? <ChevronDown x={-6} y={-6} className="w-3 h-3 text-stone-500 dark:text-stone-400 group-hover:text-teal-500" strokeWidth={3} /> : <ChevronRight x={-6} y={-6} className="w-3 h-3 text-stone-500 group-hover:text-teal-500" strokeWidth={3} />
                                ) : (
                                    isVertical ? <ChevronUp x={-6} y={-6} className="w-3 h-3 text-stone-400 dark:text-stone-500 group-hover:text-teal-500" strokeWidth={3} /> : <ChevronLeft x={-6} y={-6} className="w-3 h-3 text-stone-500 group-hover:text-teal-500" strokeWidth={3} />
                                )}
                            </g>
                        </React.Fragment>
                    );
                })}

                {nodes.map((node) => {
                    const isFocus = node.data.id === focusId;
                    const years = getYears(node.data);
                    
                    // Logic for Name + Title
                    const titlePrefix = node.data.title ? `${node.data.title} ` : '';
                    const displayName = `${titlePrefix}${node.data.firstName} ${settings.showLastName ? node.data.lastName : ''}`;
                    const hasCollapsedBranch = Array.from(collapsedIds).some((key: string) => key.startsWith(`${node.data.id}:`));
                    
                    // Style classes based on gender
                    const genderBorderClass = node.data.gender === 'male' ? 'gender-border-male' : 'gender-border-female';
                    const genderTextClass = node.data.gender === 'male' ? 'gender-text-male' : 'gender-text-female';

                    return (
                    <g 
                        key={node.id} 
                        transform={`translate(${node.x}, ${node.y})`}
                        onClick={(e) => { e.stopPropagation(); onSelect(node.data.id); }}
                        className="cursor-pointer"
                    >
                        <foreignObject x={-NODE_WIDTH/2} y={-NODE_HEIGHT/2} width={NODE_WIDTH} height={NODE_HEIGHT} style={{ overflow: 'visible' }}>
                            <div className={`uiverse-card ${node.data.gender} ${isFocus ? 'focus-ring' : ''} h-full w-full flex flex-col items-center`}>
                                <div className="card-overlay" />
                                <div className="card-content">
                                    {settings.showPhotos && (
                                        <div className={`avatar-ring ${genderBorderClass} mb-2`}>
                                            {node.data.photoUrl ? (
                                                <img src={node.data.photoUrl} className={`avatar-img ${node.data.isDeceased ? 'grayscale' : ''}`} />
                                            ) : (
                                                <div className="avatar-img flex items-center justify-center bg-stone-50 dark:bg-stone-800">
                                                    <User className={`w-8 h-8`} style={{ color: node.data.gender === 'male' ? 'var(--gender-male-border)' : 'var(--gender-female-border)' }} />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    <div className="flex-1 w-full min-h-0 flex flex-col justify-start items-center">
                                        {/* Display Name with Title */}
                                        <div className={`font-bold text-sm leading-tight break-words line-clamp-2 ${genderTextClass}`}>
                                            {displayName}
                                        </div>
                                        
                                        {/* Display Nickname below name */}
                                        {node.data.nickName && (
                                            <div className="text-[10px] text-stone-500 dark:text-stone-400 italic mt-0.5 opacity-90 truncate w-full" style={{ color: 'var(--card-text)' }}>
                                                "{node.data.nickName}"
                                            </div>
                                        )}

                                        {settings.showDates && (
                                            <div className="text-[10px] text-stone-500 dark:text-stone-400 font-medium mt-1 tracking-wide" style={{ color: 'var(--card-text)' }}>
                                                {years}
                                            </div>
                                        )}
                                        {settings.showMiddleName && node.data.middleName && (
                                            <div className="text-[9px] text-stone-400 mt-0.5 opacity-80 truncate w-full" style={{ color: 'var(--card-text)' }}>
                                                {node.data.middleName}
                                            </div>
                                        )}
                                    </div>
                                    {node.data.isDeceased && (
                                        <div className="absolute top-3 right-3 opacity-80">
                                            <Ribbon className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400 fill-current" />
                                        </div>
                                    )}
                                </div>
                                {hasCollapsedBranch && (
                                    <div className="absolute -bottom-2 inset-x-8 h-2 bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-b-xl -z-10 shadow-sm opacity-90"></div>
                                )}
                            </div>
                        </foreignObject>
                    </g>
                    );
                })}
              </>
          )}
        </g>
      </svg>
    </div>
  );
});