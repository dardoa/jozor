import { useRef, useEffect, memo } from 'react';
import * as d3 from 'd3';

interface DemographicChartProps {
    data: { decade: string; count: number }[];
}

/**
 * DemographicChart: A premium D3 Bar Chart showing members by birth decade.
 */
export const DemographicChart = memo(({ data }: DemographicChartProps) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!svgRef.current || !containerRef.current || data.length === 0) return;

        const render = () => {
            if (!svgRef.current || !containerRef.current) return;

            const margin = { top: 20, right: 20, bottom: 40, left: 40 };
            const width = containerRef.current.clientWidth - margin.left - margin.right;
            const height = 300 - margin.top - margin.bottom;

            if (width <= 0) return;

            // Clear previous SVG content
            d3.select(svgRef.current).selectAll('*').remove();

            const svg = d3.select(svgRef.current)
                .attr('width', width + margin.left + margin.right)
                .attr('height', height + margin.top + margin.bottom)
                .append('g')
                .attr('transform', `translate(${margin.left},${margin.top})`);

            // Scales
            const x = d3.scaleBand()
                .range([0, width])
                .domain(data.map(d => d.decade))
                .padding(0.3);

            const y = d3.scaleLinear()
                .range([height, 0])
                .domain([0, d3.max(data, d => d.count) || 0]);

            // Axes
            svg.append('g')
                .attr('transform', `translate(0,${height})`)
                .call(d3.axisBottom(x))
                .selectAll('text')
                .attr('fill', 'rgba(255,255,255,0.7)')
                .style('font-size', '10px');

            svg.append('g')
                .call(d3.axisLeft(y).ticks(5))
                .selectAll('text')
                .attr('fill', 'rgba(255,255,255,0.7)')
                .style('font-size', '10px');

            // Grid lines
            svg.append('g')
                .attr('class', 'grid')
                .attr('opacity', 0.1)
                .call(d3.axisLeft(y).tickSize(-width).tickFormat(() => ''));

            // Gradient
            const defs = d3.select(svgRef.current).append('defs');
            const gradient = defs.append('linearGradient')
                .attr('id', 'bar-gradient')
                .attr('x1', '0%')
                .attr('y1', '0%')
                .attr('x2', '0%')
                .attr('y2', '100%');

            gradient.append('stop').attr('offset', '0%').attr('stop-color', '#3b82f6'); // Brighter Blue
            gradient.append('stop').attr('offset', '100%').attr('stop-color', '#E1AD01'); // Matte Gold

            // Bars
            svg.selectAll('.bar')
                .data(data)
                .enter()
                .append('rect')
                .attr('class', 'bar')
                .attr('x', d => x(d.decade) || 0)
                .attr('width', x.bandwidth())
                .attr('y', height)
                .attr('height', 0)
                .attr('fill', 'url(#bar-gradient)')
                .attr('rx', 4)
                .transition()
                .duration(800)
                .delay((_d, i) => i * 50)
                .attr('y', d => y(d.count))
                .attr('height', d => height - y(d.count));

            // Labels (Visible by default in premium view)
            svg.selectAll('.label')
                .data(data)
                .enter()
                .append('text')
                .attr('class', 'label')
                .attr('x', d => (x(d.decade) || 0) + x.bandwidth() / 2)
                .attr('y', d => y(d.count) - 8)
                .attr('text-anchor', 'middle')
                .attr('fill', '#E1AD01')
                .style('font-size', '10px')
                .style('font-weight', 'bold')
                .text(d => d.count)
                .style('opacity', 0)
                .transition()
                .duration(800)
                .delay((_d, i) => i * 50 + 400)
                .style('opacity', 1);
        };

        const resizeObserver = new ResizeObserver(() => {
            render();
        });

        resizeObserver.observe(containerRef.current);
        render();

        return () => resizeObserver.disconnect();
    }, [data]);

    return (
        <div ref={containerRef} className="w-full min-h-[300px]">
            <svg ref={svgRef} className="w-full h-full"></svg>
        </div>
    );
});

DemographicChart.displayName = 'DemographicChart';
