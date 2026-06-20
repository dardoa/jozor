import { useEffect, useRef, useState } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import type { MigrationLink } from '../../../../domain/mapJourneyUtils';

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
          markerWidth="10"
          markerHeight="10"
          refX="7"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L8,3 z" fill="#8B6914" fillOpacity="0.76" />
        </marker>
        <marker
          id="migration-arrow-muted"
          markerWidth="10"
          markerHeight="10"
          refX="7"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M0,0 L0,6 L8,3 z" fill="#B8AA96" fillOpacity="0.55" />
        </marker>
      </defs>
      {visibleLinks.map((link, index) => {
        const sourcePoint = map.latLngToContainerPoint([link.source.lat, link.source.lng]);
        const targetPoint = map.latLngToContainerPoint([link.target.lat, link.target.lng]);
        const dx = targetPoint.x - sourcePoint.x;
        const dy = targetPoint.y - sourcePoint.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const curve = Math.max(24, Math.min(distance * 0.22, 92));
        const normalX = distance === 0 ? 0 : -dy / distance;
        const normalY = distance === 0 ? 0 : dx / distance;
        const controlX = (sourcePoint.x + targetPoint.x) / 2 + normalX * curve;
        const controlY = (sourcePoint.y + targetPoint.y) / 2 + normalY * curve;
        const path = `M${sourcePoint.x},${sourcePoint.y} Q${controlX},${controlY} ${targetPoint.x},${targetPoint.y}`;
        const isHighlighted = selectedRouteId === link.id || Boolean(selectedPersonId);
        const strength = link.count / maxCount;
        const strokeWidth = isHighlighted ? 4 : 2.2 + strength * 3.8;
        const strokeColor = isHighlighted ? '#8B6914' : link.color;
        const strokeOpacity = isHighlighted ? 0.9 : 0.42 + strength * 0.38;
        const routeTitle = `${link.source.locationName} -> ${link.target.locationName} (${link.count})`;

        return (
          <path
            key={`${link.source.personId}-${link.target.personId}-${index}`}
            d={path}
            fill="none"
            markerEnd={`url(#${isHighlighted ? 'migration-arrow' : 'migration-arrow-muted'})`}
            onClick={() => {
              onSelectRoute?.(link.id);
            }}
            pointerEvents="visibleStroke"
            stroke={strokeColor}
            strokeLinecap="round"
            strokeWidth={strokeWidth}
            strokeOpacity={strokeOpacity}
            style={{ cursor: 'pointer' }}
          >
            <title>{routeTitle}</title>
          </path>
        );
      })}
    </svg>
  );
};
