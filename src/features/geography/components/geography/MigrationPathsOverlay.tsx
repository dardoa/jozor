import { useEffect, useRef, useState } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import type { MigrationLink } from '../../../../domain/mapJourneyUtils';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

const getRouteCurveOffset = (distance: number, index: number) => {
  const baseCurve = clamp(distance * 0.16, 8, 68);
  const stagger = ((index % 3) - 1) * clamp(distance * 0.015, 0, 5);
  return baseCurve + stagger;
};

export const MigrationPathsOverlay = ({
  links,
  selectedPersonId,
  selectedRouteId,
  onSelectRoute,
}: {
  links: MigrationLink[];
  selectedPersonId: string | null;
  selectedRouteId: string | null;
  onSelectRoute?: (routeId: string) => void;
}) => {
  const map = useMap();
  const [, setRenderTick] = useState(0);
  const frameRef = useRef<number | null>(null);
  const scheduleRender = () => {
    if (frameRef.current !== null) {
      return;
    }

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      setRenderTick(tick => tick + 1);
    });
  };

  useEffect(() => () => {
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
    }
  }, []);

  useMapEvents({
    move: scheduleRender,
    zoom: scheduleRender,
    zoomend: scheduleRender,
  });
  const visibleLinks = selectedRouteId
    ? links.filter(link => link.id === selectedRouteId)
    : selectedPersonId
    ? links.filter(link => link.people.some(person => person.id === selectedPersonId))
    : links;
  const maxCount = Math.max(1, ...visibleLinks.map(link => link.count));

  return (
    <svg
      aria-hidden="true"
      style={{
        pointerEvents: 'none',
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 425,
      }}
    >
      <defs>
        <marker
          id="migration-arrow"
          markerWidth="6"
          markerHeight="6"
          refX="5.1"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0.7 L0,5.3 L5.2,3 z" fill="#8B6914" fillOpacity="0.72" />
        </marker>
        <marker
          id="migration-arrow-muted"
          markerWidth="5.4"
          markerHeight="5.4"
          refX="4.7"
          refY="2.7"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0.7 L0,4.7 L4.8,2.7 z" fill="#B8AA96" fillOpacity="0.46" />
        </marker>
      </defs>
      {visibleLinks.map((link, index) => {
        const sourcePoint = map.latLngToContainerPoint([link.source.lat, link.source.lng]);
        const targetPoint = map.latLngToContainerPoint([link.target.lat, link.target.lng]);
        const dx = targetPoint.x - sourcePoint.x;
        const dy = targetPoint.y - sourcePoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const curve = getRouteCurveOffset(distance, index);
        const normalX = distance === 0 ? 0 : -dy / distance;
        const normalY = distance === 0 ? 0 : dx / distance;
        const controlX = (sourcePoint.x + targetPoint.x) / 2 + normalX * curve;
        const controlY = (sourcePoint.y + targetPoint.y) / 2 + normalY * curve;
        const path = `M${sourcePoint.x},${sourcePoint.y} Q${controlX},${controlY} ${targetPoint.x},${targetPoint.y}`;
        const isHighlighted = selectedRouteId === link.id || Boolean(selectedPersonId);
        const strength = link.count / maxCount;
        const strokeWidth = isHighlighted ? 3.8 : 1.7 + strength * 2.8;
        const strokeColor = isHighlighted ? '#8B6914' : link.color;
        const strokeOpacity = isHighlighted ? 0.86 : 0.34 + strength * 0.34;
        const routeTitle = `${link.source.locationName} -> ${link.target.locationName} (${link.count})`;

        return (
          <g
            key={`${link.source.personId}-${link.target.personId}-${index}`}
            onClick={() => {
              onSelectRoute?.(link.id);
            }}
            style={{ cursor: 'pointer' }}
          >
            <path
              aria-hidden="true"
              d={path}
              fill="none"
              pointerEvents="visibleStroke"
              stroke="transparent"
              strokeLinecap="round"
              strokeWidth={Math.max(strokeWidth + 10, 14)}
            />
            <path
              d={path}
              fill="none"
              markerEnd={`url(#${isHighlighted ? 'migration-arrow' : 'migration-arrow-muted'})`}
              pointerEvents="visibleStroke"
              stroke={strokeColor}
              strokeLinecap="round"
              strokeWidth={strokeWidth}
              strokeOpacity={strokeOpacity}
              style={{
                filter: isHighlighted ? 'drop-shadow(0 2px 5px rgba(139,105,20,0.18))' : 'none',
                transition: 'stroke-opacity 160ms ease, stroke-width 160ms ease',
              }}
            >
              <title>{routeTitle}</title>
            </path>
          </g>
        );
      })}
    </svg>
  );
};
