import React, { useMemo } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import Supercluster from 'supercluster';
import 'leaflet/dist/leaflet.css';

import { ClusterMarkers } from './ClusterMarkers';
import { MigrationPathsOverlay } from './MigrationPathsOverlay';
import { MapLabelPane } from './MapLabelPane';
import type { MapViewProps } from './MapView';

// Inner implementation eagerly imports Leaflet, react-leaflet, and Supercluster.

const MapViewImpl: React.FC<MapViewProps> = ({
  mode,
  eventLocations,
  migrationJourney,
  showPlaceLabels,
  isRtl,
  selectedPersonId,
  selectedRouteId,
  onMapReady,
  onSelectPerson,
  onSelectRoute,
  onTogglePersonSelection,
}) => {
  const [mapInstance, setMapInstance] = React.useState<L.Map | null>(null);

  const handleMapRef = React.useCallback(
    (map: L.Map | null) => {
      if (map) {
        setMapInstance(map);
        onMapReady(map);
      }
    },
    [onMapReady]
  );

  const canvasRenderer = useMemo(() => L.canvas({ padding: 0.5 }), []);

  const superclusterIndex = useMemo(() => {
    const cluster = new Supercluster({ radius: 60, maxZoom: 16 });
    const points = eventLocations.map(location => ({
      type: 'Feature',
      properties: {
        cluster: false,
        locationId: location.id,
      },
      geometry: {
        type: 'Point',
        coordinates: [location.longitude, location.latitude],
      },
    }));

    cluster.load(points as Parameters<Supercluster['load']>[0]);
    return cluster;
  }, [eventLocations]);

  return (
    <MapContainer
      center={[20, 0]}
      zoom={3}
      zoomControl={false}
      className="h-full w-full"
      ref={handleMapRef}
      preferCanvas={true}
      renderer={canvasRenderer}
    >
      <MapLabelPane />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
        crossOrigin="anonymous"
      />
      {showPlaceLabels ? (
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
          pane="journey-labels"
          className="journey-label-tiles"
          crossOrigin="anonymous"
        />
      ) : null}

      {mode === 'events' && mapInstance ? (
        <ClusterMarkers
          cluster={superclusterIndex}
          points={eventLocations}
          map={mapInstance}
          onSelectPerson={onSelectPerson}
        />
      ) : null}

      {mode === 'migration' ? (
        <>
          {migrationJourney.nodes.map(node => (
            <Marker
              key={`${node.personId}-${node.locationName}`}
              position={[node.lat, node.lng]}
              icon={L.divIcon({
                html: '<div style="width:18px;height:18px;border-radius:9999px;background:#FAF7F2;border:1px solid #C4A882;box-shadow:0 12px 24px rgba(44,24,16,0.14);display:flex;align-items:center;justify-content:center;"><div style="width:8px;height:8px;border-radius:9999px;background:#8B6914;"></div></div>',
                className: '',
                iconSize: L.point(18, 18),
              })}
              eventHandlers={{
                click: () => {
                  onTogglePersonSelection(node.personId);
                },
              }}
            >
              <Popup>
                <div className={`p-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                  <h3 className="font-bold text-[#2C1810]">{node.name}</h3>
                  <p className="text-sm text-[#6B5A49]">{node.locationName}</p>
                  {node.year ? (
                    <p className="text-xs font-semibold text-[#8B6914]">{node.year}</p>
                  ) : null}
                </div>
              </Popup>
            </Marker>
          ))}
          <MigrationPathsOverlay
            links={migrationJourney.links}
            selectedPersonId={selectedPersonId}
            selectedRouteId={selectedRouteId}
            onSelectRoute={(routeId) => {
              onSelectRoute(routeId);
            }}
          />
        </>
      ) : null}
    </MapContainer>
  );
};

export default MapViewImpl;
