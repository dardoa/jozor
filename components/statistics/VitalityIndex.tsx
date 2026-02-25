import { useRef, useEffect, memo } from 'react';
import * as d3 from 'd3';

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

        d3.select(svgRef.current).selectAll('*').remove();

        const svg = d3.select(svgRef.current)
            .append('g')
            .attr('transform', `translate(${width / 2}, ${height / 2})`);

        const pie = d3.pie<any>()
            .value(d => d.count)
            .sort(null);

        const arc = d3.arc<any>()
            .innerRadius(radius * 0.6)
            .outerRadius(radius);

        const outerArc = d3.arc<any>()
            .innerRadius(radius * 1.1)
            .outerRadius(radius * 1.1);

        // Add slices
        const path = svg.selectAll('path')
            .data(pie(data))
            .enter()
            .append('path')
            .attr('fill', d => d.data.color)
            .attr('d', arc as any)
            .attr('stroke', 'rgba(255,255,255,0.1)')
            .style('stroke-width', '2px')
            .style('opacity', 0.8)
            .transition()
            .duration(1000)
            .attrTween('d', function (d) {
                const interpolate = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
                return function (t) {
                    return arc(interpolate(t) as any) as string;
                };
            });

        // Add labels
        const labelGroups = svg.selectAll('g.label-group')
            .data(pie(data))
            .enter()
            .append('g')
            .attr('class', 'label-group');

        labelGroups.append('text')
            .attr('transform', d => `translate(${outerArc.centroid(d)})`)
            .attr('dy', '.35em')
            .attr('fill', 'white')
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
            .attr('fill', 'white/40')
            .style('font-size', '10px')
            .text('TOTAL');

        svg.append('text')
            .attr('text-anchor', 'middle')
            .attr('dy', '0.8em')
            .attr('fill', '#E1AD01')
            .style('font-size', '24px')
            .style('font-weight', 'black')
            .text(total);

    }, [data]);

    return (
        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-lg">
            <h5 className="text-white/80 font-bold mb-4 text-sm uppercase tracking-wider">Vitality Index (Status)</h5>
            <svg ref={svgRef} className="w-full" height="300"></svg>
        </div>
    );
});

VitalityIndex.displayName = 'VitalityIndex';
