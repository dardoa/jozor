import React from 'react';
import { useMap } from 'react-leaflet';
import type { MigrationLink } from '../../domain/mapJourneyUtils';

export const MigrationPathsOverlay = ({
  links,
  selectedPersonId,
}: {
  links: MigrationLink[];
  selectedPersonId: string | null;
}) => {
  const map = useMap();
  const visibleLinks = selectedPersonId
    ? links.filter(link => link.source.personId === selectedPersonId || link.target.personId === selectedPersonId)
    : links;

  return (
    <svg
      className="leaflet-zoom-animated"
      style={{ pointerEvents: 'none', position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    >
      {visibleLinks.map((link, index) => {
        const sourcePoint = map.latLngToLayerPoint([link.source.lat, link.source.lng]);
        const targetPoint = map.latLngToLayerPoint([link.target.lat, link.target.lng]);
        const dx = targetPoint.x - sourcePoint.x;
        const dy = targetPoint.y - sourcePoint.y;
        const radius = Math.sqrt(dx * dx + dy * dy) * 1.5;
        const path = `M${sourcePoint.x},${sourcePoint.y} A${radius},${radius} 0 0,1 ${targetPoint.x},${targetPoint.y}`;

        return (
          <path
            key={`${link.source.personId}-${link.target.personId}-${index}`}
            d={path}
            fill="none"
            stroke={selectedPersonId ? '#8B6914' : '#B8AA96'}
            strokeWidth="2"
            strokeOpacity={selectedPersonId ? 0.78 : 0.6}
          />
        );
      })}
    </svg>
  );
};
