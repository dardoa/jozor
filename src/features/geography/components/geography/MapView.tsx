import React, { Suspense } from 'react';
import type { GeographicJourneyMode } from '../../../../types/common';
import type { GeographicEventLocation, MigrationNode, MigrationLink } from '../../../../domain/mapJourneyUtils';
import type L from 'leaflet';

// Props

export type MapViewProps = {
  mode: GeographicJourneyMode;
  eventLocations: GeographicEventLocation[];
  migrationJourney: {
    nodes: MigrationNode[];
    links: MigrationLink[];
  };
  showPlaceLabels: boolean;
  isRtl: boolean;
  selectedPersonId: string | null;
  selectedRouteId: string | null;
  onMapReady: (map: L.Map) => void;
  onSelectPerson: ((id: string) => void) | undefined;
  onSelectRoute: (routeId: string) => void;
  onTogglePersonSelection: (personId: string) => void;
};

// Lazy inner implementation

const LazyMapViewImpl = React.lazy(() => import('./MapViewImpl'));

// Loading fallback

const MapLoadingFallback: React.FC = () => (
  <div className="flex h-full w-full items-center justify-center bg-[#F5F0E8]">
    <div className="flex flex-col items-center gap-3 text-[#8B6914]">
      <svg
        className="h-7 w-7 animate-spin"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
      >
        <circle cx="12" cy="12" r="10" strokeOpacity={0.25} />
        <path d="M12 2a10 10 0 0 1 10 10" />
      </svg>
      <span className="text-xs font-semibold uppercase tracking-widest opacity-60">
        Loading map...
      </span>
    </div>
  </div>
);

// Public component

export const MapView: React.FC<MapViewProps> = (props) => (
  <Suspense fallback={<MapLoadingFallback />}>
    <LazyMapViewImpl {...props} />
  </Suspense>
);

MapView.displayName = 'MapView';
