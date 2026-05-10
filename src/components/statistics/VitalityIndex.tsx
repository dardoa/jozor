import { useRef, useEffect, memo } from 'react';
import { interpolate } from 'd3-interpolate';
import { select } from 'd3-selection';
import { arc, pie, type PieArcDatum } from 'd3-shape';
import 'd3-transition';

interface VitalityIndexProps {
    data: { status: string; count: number; color: string }[];
}

/**
 * VitalityIndex: A high-end D3 Donut Chart comparing Living vs. Deceased members.
 */
export const VitalityIndex = memo(({ data }: VitalityIndexProps) => {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current || data.length === 0) return;

        const width = svgRef.current.clientWidth;
        const height = 300;
        const radius = Math.min(width, height) / 2 - 40;

        select(svgRef.current).selectAll('*').remove();

        const svg = select(svgRef.current)
            .append('g')
            .attr('transform', `translate(${width / 2}, ${height / 2})`);

        const pieGenerator = pie<VitalityIndexProps['data'][number]>()
            .value(d => d.count)
            .sort(null);

        const arcGenerator = arc<PieArcDatum<VitalityIndexProps['data'][number]>>()
            .innerRadius(radius * 0.6)
            .outerRadius(radius);

        const outerArc = arc<PieArcDatum<VitalityIndexProps['data'][number]>>()
            .innerRadius(radius * 1.1)
            .outerRadius(radius * 1.1);

        // Add slices
        svg.selectAll('path')
            .data(pieGenerator(data))
            .enter()
            .append('path')
            .attr('fill', d => d.data.color)
            .attr('d', arcGenerator as never)
            .attr('stroke', 'rgba(139,115,85,0.16)')
            .style('stroke-width', '2px')
            .style('opacity', 0.8)
            .transition()
            .duration(1000)
            .attrTween('d', function (d) {
                const interpolateArc = interpolate({ startAngle: 0, endAngle: 0 }, d);
                return function (t) {
                    return arcGenerator(interpolateArc(t) as never) as string;
                };
            });

        // Add labels
        const labelGroups = svg.selectAll('g.label-group')
            .data(pieGenerator(data))
            .enter()
            .append('g')
            .attr('class', 'label-group');

        labelGroups.append('text')
            .attr('transform', d => `translate(${outerArc.centroid(d)})`)
            .attr('dy', '.35em')
            .attr('fill', 'var(--text-main)')
            .style('font-size', '10px')
            .attr('text-anchor', d => {
                const midangle = d.startAngle + (d.endAngle - d.startAngle) / 2;
                return (midangle < Math.PI ? 'start' : 'end');
            })
            .text(d => `${d.data.status}: ${d.data.count}`)
            .style('opacity', 0)
            .transition()
            .duration(1000)
            .delay(1000)
            .style('opacity', 1);

        // Center count
        const total = data.reduce((acc, d) => acc + d.count, 0);
        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '-0.5em')
            .attr('fill', 'var(--text-muted)')
            .style('font-size', '10px')
            .text('TOTAL');

        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.8em')
            .attr('fill', 'var(--color-accent-500)')
            .style('font-size', '24px')
            .style('font-weight', 'black')
            .text(total);

    }, [data]);

    return (
        <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel-subtle)] p-6 shadow-[var(--shadow-sm)]">
            <h5 className="mb-4 text-sm font-bold uppercase tracking-wider text-[var(--text-main)]">Vitality Index (Status)</h5>
            <svg ref={svgRef} className="w-full" height="300"></svg>
        </div>
    );
});

VitalityIndex.displayName = 'VitalityIndex';
