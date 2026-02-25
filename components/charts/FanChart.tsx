import { useMemo, memo } from 'react';
import * as d3 from 'd3';
import { TreeSettings, FanArc, Person } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { TOKENS } from '../../utils/tokens';
import './ChartStyles.css';

interface FanChartProps {
  fanArcs: FanArc[];
  people: Record<string, Person>;
  onSelect: (id: string) => void;
  onNodeContextMenu: (e: React.MouseEvent, id: string) => void;
  zoomScale: number;
  isDimmed?: boolean;
}

interface FanArcNodeProps {
  d: FanArc;
  person: Person;
  arcGen: d3.Arc<any, any>;
  onSelect: (id: string) => void;
  onNodeContextMenu: (e: React.MouseEvent, id: string) => void;
  zoomScale: number;
  isDimmed?: boolean;
}

const FanArcNode = ({ d, person, arcGen, onSelect, onNodeContextMenu, zoomScale, isDimmed }: FanArcNodeProps) => {
  const path = arcGen(d);
  if (!path) return null;

  const isRoot = d.depth === 0;
  const isPlaceholder = d.id.startsWith('placeholder');
  const angle = ((d.startAngle + d.endAngle) * 90) / Math.PI - 90;
  const rotate = angle;

  let fillColor;
  if (isRoot) {
    fillColor = 'var(--card-bg)';
  } else if (isPlaceholder) {
    fillColor = 'var(--card-bg-subtle)';
  } else {
    if (person.gender === 'male') {
      fillColor = d.depth % 2 === 0 ? 'var(--gender-male-bg-alt)' : 'var(--gender-male-bg)';
    } else {
      fillColor = d.depth % 2 === 0 ? 'var(--gender-female-bg-alt)' : 'var(--gender-female-bg)';
    }
  }

  const arcWidth = (d.endAngle - d.startAngle) * d.outerRadius;
  const showText = (isRoot || arcWidth > 15) && !isPlaceholder;

  return (
    <g
      onClick={(e) => {
        e.stopPropagation();
        onSelect(person.id);
      }}
      onContextMenu={(e) => onNodeContextMenu(e, person.id)}
      className={`hover:opacity-90 cursor-pointer transition-all ${isDimmed ? 'opacity-40 grayscale-[20%]' : 'opacity-100'}`}
      style={{
        transitionDuration: `${TOKENS.ANIMATIONS.base}ms`,
        transitionTimingFunction: TOKENS.EASING.outQuint
      }}
    >
      <path
        d={path}
        fill={fillColor}
        stroke='var(--card-border)'
        strokeWidth='1.5'
        className={`dark:stroke-stone-900 ${isRoot ? 'fan-root-shadow' : ''}`}
      />
      {!isRoot && showText && zoomScale > 0.4 && (
        <foreignObject
          x={arcGen.centroid(d)[0] - (d.outerRadius - d.innerRadius) / 2}
          y={arcGen.centroid(d)[1] - (d.outerRadius - d.innerRadius) / 2}
          width={d.outerRadius - d.innerRadius}
          height={d.outerRadius - d.innerRadius}
          transform={`rotate(${rotate}, ${arcGen.centroid(d)[0]}, ${arcGen.centroid(d)[1]})`}
          className='fan-chart-container'
        >
          <div className='flex flex-col items-center justify-center h-full w-full text-center p-1'>
            <span className='text-[10px] font-bold leading-tight line-clamp-1 fan-chart-label'>
              {person.firstName}
            </span>
            {arcWidth > 40 && d.depth < 4 && zoomScale > 0.6 && (
              <span className='text-[7px] leading-none opacity-80 line-clamp-1 fan-chart-label'>
                {person.birthDate ? person.birthDate.split('-')[0] : ''}
              </span>
            )}
          </div>
        </foreignObject>
      )}
      {isRoot && (
        <foreignObject x={-50} y={-50} width={100} height={100} className='fan-chart-node'>
          <div
            className={`w-full h-full rounded-full overflow-hidden border-4 flex items-center justify-center fan-chart-circle ${person.gender === 'male' ? 'male' : ''}`}
          >
            {person.photoUrl ? (
              <img
                src={person.photoUrl}
                alt={person.firstName}
                className='w-full h-full object-cover'
              />
            ) : (
              <div
                style={{ background: person.gender === 'male' ? 'var(--monogram-male-bg)' : 'var(--monogram-female-bg)' }}
                className='w-full h-full flex items-center justify-center'
              >
                <span className='text-3xl font-black text-white mix-blend-overlay opacity-60'>
                  {[person.firstName?.[0], person.lastName?.[0]].filter(Boolean).join('').toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 translate-y-10 text-center'>
            <span
              className={`text-[10px] font-bold bg-[var(--card-bg)] px-2 py-0.5 rounded-full shadow-sm whitespace-nowrap fan-chart-text ${person.gender === 'male' ? 'male' : ''}`}
            >
              {person.firstName}
            </span>
          </div>
        </foreignObject>
      )}
    </g>
  );
};

export const FanChart = memo<FanChartProps>(({ fanArcs, people, onSelect, onNodeContextMenu, zoomScale, isDimmed }) => {
  const arcGen = useMemo(
    () =>
      d3
        .arc<any, any>()
        .startAngle((d) => d.startAngle)
        .endAngle((d) => d.endAngle)
        .padAngle(0.005)
        .innerRadius((d) => d.innerRadius)
        .outerRadius((d) => d.outerRadius)
        .cornerRadius(6),
    []
  );

  return (
    <g>
      {fanArcs.map((d: FanArc) => (
        <FanArcNode
          key={d.id}
          d={d}
          person={people[d.id] || d.person}
          arcGen={arcGen}
          onSelect={onSelect}
          onNodeContextMenu={onNodeContextMenu}
          zoomScale={zoomScale}
          isDimmed={isDimmed}
        />
      ))}
    </g>
  );
});
