import { useRef, useEffect, memo } from 'react';
import { max, min } from 'd3-array';
import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';
import 'd3-transition';

interface SurnameWordCloudProps {
    data: { text: string; value: number }[];
}

/**
 * SurnameWordCloud: An interactive visual representation of top family names.
 */
export const SurnameWordCloud = memo(({ data }: SurnameWordCloudProps) => {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current || data.length === 0) return;

        const width = svgRef.current.clientWidth;
        const height = 250;

        select(svgRef.current).selectAll('*').remove();

        const svg = select(svgRef.current)
            .append('g')
            .attr('transform', `translate(${width / 2}, ${height / 2})`);

        const fontScale = scaleLinear()
            .domain([min(data, d => d.value) || 0, max(data, d => d.value) || 0])
            .range([12, 48]);

        // Simple word cloud layout (random positioning for simplicity in a standalone component)
        svg.selectAll('text')
            .data(data)
            .enter()
            .append('text')
            .style('font-size', d => `${fontScale(d.value)}px`)
            .style('font-family', 'Inter, sans-serif')
            .style('font-weight', 'bold')
            .style('fill', (_d, i) => i % 2 === 0 ? 'var(--color-accent-500)' : 'var(--color-info-500)')
            .attr('text-anchor', 'middle')
            .attr('transform', (_d, _i) => {
                const x = (Math.random() - 0.5) * (width * 0.8);
                const y = (Math.random() - 0.5) * (height * 0.8);
                const rotate = (Math.random() - 0.5) * 30;
                return `translate(${x},${y})rotate(${rotate})`;
            })
            .text(d => d.text)
            .style('opacity', 0)
            .transition()
            .duration(800)
            .delay((_d, i) => i * 30)
            .style('opacity', 0.8)
            .attr('cursor', 'pointer')
            .on('end', function () {
                select(this)
                    .on('mouseover', function () { select(this).style('opacity', 1).style('fill', 'var(--text-main)'); })
                    .on('mouseout', function (_event, d: { text: string; value: number }) {
                        const originalIndex = data.findIndex(item => item.text === d.text);
                        select(this).style('opacity', 0.8).style('fill', originalIndex % 2 === 0 ? 'var(--color-accent-500)' : 'var(--color-info-500)');
                    });
            });

    }, [data]);

    return (
        <div className="col-span-1 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel-subtle)] p-6 shadow-[var(--shadow-sm)] lg:col-span-2">
            <h5 className="mb-4 text-sm font-bold uppercase tracking-wider text-[var(--text-main)]">Top Surnames</h5>
            <div className="flex items-center justify-center overflow-hidden">
                <svg ref={svgRef} className="w-full" height="250"></svg>
            </div>
        </div>
    );
});

SurnameWordCloud.displayName = 'SurnameWordCloud';
