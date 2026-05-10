import { useMemo, memo, useCallback, useEffect, useRef } from 'react';
import { arc, type Arc } from 'd3-shape';
import { FanArc, Person } from '../../types';
import { TOKENS } from '../../utils/tokens';
import { getPrivacyPlaceholderDescriptor } from '../../utils/avatarUtils';
import { SmartAvatar } from '../ui/SmartAvatar';
import './ChartStyles.css';

interface FanChartProps {
  fanArcs: FanArc[];
  people: Record<string, Person>;
  privacyMode: boolean;
  onSelect: (id: string) => void;
  onNodeContextMenu: (e: React.MouseEvent, id: string) => void;
  zoomScale: number;
  isDimmed?: boolean;
  highlightedPath?: Set<string>;
}

interface FanArcNodeProps {
  d: FanArc;
  person: Person;
  privacyMode: boolean;
  arcGen: Arc<unknown, FanArc>;
  onSelect: (id: string) => void;
  onNodeContextMenu: (e: React.MouseEvent, id: string) => void;
  zoomScale: number;
  isDimmed?: boolean;
  isPathHighlighted?: boolean;
}

const FanArcNode = ({
  d,
  person,
  privacyMode,
  arcGen,
  onSelect,
  onNodeContextMenu,
  zoomScale,
  isDimmed,
  isPathHighlighted,
}: FanArcNodeProps) => {
  const longPressTimerRef = useRef<number | null>(null);
  const skipNextClickRef = useRef(false);
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

  const effectiveStroke = isPathHighlighted ? '#f59e0b' : 'var(--card-border)';
  const effectiveStrokeWidth = isPathHighlighted ? 2.5 : 1.5;
  const privacyPlaceholderColor = 'var(--card-border, #C4A882)';
  const privacyPlaceholder = getPrivacyPlaceholderDescriptor(person);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearLongPressTimer, [clearLongPressTimer]);

  const handlePointerDown = useCallback((e: React.PointerEvent<SVGGElement>) => {
    if (e.pointerType !== 'touch') return;

    clearLongPressTimer();
    const { clientX, clientY } = e;

    longPressTimerRef.current = window.setTimeout(() => {
      skipNextClickRef.current = true;
      onNodeContextMenu({
        clientX,
        clientY,
        preventDefault: () => undefined,
        stopPropagation: () => undefined,
      } as React.MouseEvent, person.id);
    }, 500);
  }, [clearLongPressTimer, onNodeContextMenu, person.id]);

  return (
    <g
      onClick={(e) => {
        e.stopPropagation();
        if (skipNextClickRef.current) {
          skipNextClickRef.current = false;
          return;
        }
        onSelect(person.id);
      }}
      onContextMenu={(e) => onNodeContextMenu(e, person.id)}
      onPointerDown={handlePointerDown}
      onPointerUp={clearLongPressTimer}
      onPointerCancel={clearLongPressTimer}
      onPointerLeave={clearLongPressTimer}
      onPointerMove={clearLongPressTimer}
      className={`hover:opacity-90 cursor-pointer transition-all ${isDimmed && !isPathHighlighted ? 'opacity-40 grayscale-[20%]' : 'opacity-100'}`}
      data-fan-arc
      data-fan-arc-highlighted={isPathHighlighted ? 'true' : 'false'}
      data-fan-arc-dimmed={isDimmed && !isPathHighlighted ? 'true' : 'false'}
      style={{
        transitionDuration: `${TOKENS.ANIMATIONS.base}ms`,
        transitionTimingFunction: TOKENS.EASING.outQuint
      }}
    >
      <path
        d={path}
        fill={fillColor}
        stroke={effectiveStroke}
        strokeWidth={effectiveStrokeWidth}
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
            {privacyMode ? (
              <div
                style={{ background: '#FAF7F2' }}
                className='w-full h-full flex items-center justify-center'
              >
                <privacyPlaceholder.Icon
                  aria-label={privacyPlaceholder.ariaLabel}
                  className='h-8 w-8'
                  style={{ color: privacyPlaceholderColor }}
                />
              </div>
            ) : (
              <SmartAvatar person={person} size={100} className='rounded-full' />
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

export const FanChart = memo<FanChartProps>(({
  fanArcs,
  people,
  privacyMode,
  onSelect,
  onNodeContextMenu,
  zoomScale,
  isDimmed,
  highlightedPath,
}) => {
  const arcGen = useMemo(
    () =>
      arc<unknown, FanArc>()
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
      {fanArcs.map((d: FanArc) => {
        const isPathHighlighted = highlightedPath?.has(d.person.id);
        const isArcDimmed =
          (!!highlightedPath && highlightedPath.size > 0 && !isPathHighlighted) || !!isDimmed;

        return (
          <FanArcNode
            key={d.id}
            d={d}
            person={people[d.id] || d.person}
            privacyMode={privacyMode}
            arcGen={arcGen}
            onSelect={onSelect}
            onNodeContextMenu={onNodeContextMenu}
            zoomScale={zoomScale}
            isDimmed={isArcDimmed}
            isPathHighlighted={isPathHighlighted}
          />
        );
      })}
    </g>
  );
});
