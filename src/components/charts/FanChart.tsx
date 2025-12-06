import React, { useMemo, memo } from 'react';
import * as d3 from 'd3';
import { FanArc } from '../../types'; // Removed unused Person, TreeSettings
import { User } from 'lucide-react';

interface FanChartProps {
  fanArcs: FanArc[];
  focusId: string;
  onSelect: (id: string) => void;
  settings: any; // Changed to any as settings is not directly used in the component logic
}

export const FanChart: React.FC<FanChartProps> = memo(({ fanArcs, onSelect }) => { // Removed focusId, settings
  const arcGen = useMemo(() => d3.arc<any, d3.DefaultArcObject>()
    .startAngle((d: d3.DefaultArcObject) => d.startAngle)
    .endAngle((d: d3.DefaultArcObject) => d.endAngle)
    .padAngle(0.005)
    .innerRadius((d: d3.DefaultArcObject) => d.innerRadius)
    .outerRadius((d: d3.DefaultArcObject) => d.outerRadius)
    .cornerRadius(6), []);

  return (
    <g>
      {fanArcs.map((d: FanArc) => {
        const path = arcGen(d);
        if (!path) return null;
        const isRoot = d.depth === 0;
        
        const angle = (d.startAngle + d.endAngle) * 90 / Math.PI - 90;
        const isFlipped = angle > 90 || angle < -90;
        const rotate = isFlipped ? angle - 180 : angle;
        
        let fillColor;
        if (isRoot) {
            fillColor = "var(--card-bg)";
        } else {
            if (d.person.gender === 'male') {
                // Use theme variables for male colors
                fillColor = d.depth % 2 === 0 ? 'var(--gender-male-bg-alt)' : 'var(--gender-male-bg)';
            } else {
                // Use theme variables for female colors
                fillColor = d.depth % 2 === 0 ? 'var(--gender-female-bg-alt)' : 'var(--gender-female-bg)'; 
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
              stroke="var(--card-border)" // Use theme variable for stroke
              strokeWidth="1.5"
              className="dark:stroke-stone-900"
              style={{
                  filter: isRoot ? 'url(#shadow)' : 'none'
              }}
            />
            {!isRoot && showText && (
              <foreignObject 
                  x={arcGen.centroid(d)[0] - (d.outerRadius - d.innerRadius) / 2} 
                  y={arcGen.centroid(d)[1] - (d.outerRadius - d.innerRadius) / 2} 
                  width={d.outerRadius - d.innerRadius} 
                  height={d.outerRadius - d.innerRadius}
                  transform={`rotate(${rotate}, ${arcGen.centroid(d)[0]}, ${arcGen.centroid(d)[1]})`}
                  style={{ overflow: 'visible', pointerEvents: 'none' }}
              >
                  <div className="flex flex-col items-center justify-center h-full w-full text-center p-1">
                      <span className="text-[10px] font-bold leading-tight line-clamp-1" style={{ color: 'var(--card-text)' }}>
                          {d.person.firstName}
                      </span>
                      {arcWidth > 40 && d.depth < 4 && (
                          <span className="text-[7px] leading-none opacity-80 line-clamp-1" style={{ color: 'var(--card-text)' }}>
                              {d.person.birthDate ? d.person.birthDate.split('-')[0] : ''}
                          </span>
                      )}
                  </div>
              </foreignObject>
            )}
            {isRoot && (
                <foreignObject x={-50} y={-50} width={100} height={100} style={{pointerEvents: 'none'}}>
                    <div className={`w-full h-full rounded-full overflow-hidden border-4 flex items-center justify-center`} style={{ borderColor: d.person.gender === 'male' ? 'var(--gender-male-border)' : 'var(--gender-female-border)', backgroundColor: 'var(--card-bg)' }}>
                        {d.person.photoUrl ? (
                            <img src={d.person.photoUrl} className="w-full h-full object-cover" />
                        ) : (
                            <User className={`w-12 h-12`} style={{ color: d.person.gender === 'male' ? 'var(--gender-male-border)' : 'var(--gender-female-border)' }}/>
                        )}
                    </div>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 translate-y-10 text-center">
                        <span className={`text-[10px] font-bold bg-[var(--card-bg)] px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap`} style={{ color: d.person.gender === 'male' ? 'var(--gender-male-text)' : 'var(--gender-female-text)' }}>
                            {d.person.firstName}
                        </span>
                    </div>
                </foreignObject>
            )}
          </g>
        );
      })}
    </g>
  );
});