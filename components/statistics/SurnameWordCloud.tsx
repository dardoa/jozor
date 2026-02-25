import { useRef, useEffect, memo } from 'react';
import * as d3 from 'd3';

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

        d3.select(svgRef.current).selectAll('*').remove();

        const svg = d3.select(svgRef.current)
            .append('g')
            .attr('transform', `translate(${width / 2}, ${height / 2})`);

        const fontScale = d3.scaleLinear()
            .domain([d3.min(data, d => d.value) || 0, d3.max(data, d => d.value) || 0])
            .range([12, 48]);

        // Simple word cloud layout (random positioning for simplicity in a standalone component)
        svg.selectAll('text')
            .data(data)
            .enter()
            .append('text')
            .style('font-size', d => `${fontScale(d.value)}px`)
            .style('font-family', 'Inter, sans-serif')
            .style('font-weight', 'bold')
            .style('fill', (_d, i) => i % 2 === 0 ? '#E1AD01' : '#002366')
            .attr('text-anchor', 'middle')
            .attr('transform', (_d, i) => {
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
                d3.select(this)
                    .on('mouseover', function () { d3.select(this).style('opacity', 1).style('fill', '#fff'); })
                    .on('mouseout', function (_event, d: any) {
                        const originalIndex = data.findIndex(item => item.text === d.text);
                        d3.select(this).style('opacity', 0.8).style('fill', originalIndex % 2 === 0 ? '#E1AD01' : '#002366');
                    });
            });

    }, [data]);

    return (
        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 shadow-lg col-span-1 lg:col-span-2">
            <h5 className="text-white/80 font-bold mb-4 text-sm uppercase tracking-wider">Top Surnames</h5>
            <div className="flex items-center justify-center overflow-hidden">
                <svg ref={svgRef} className="w-full" height="250"></svg>
            </div>
        </div>
    );
});

SurnameWordCloud.displayName = 'SurnameWordCloud';
