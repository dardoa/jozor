import React, { useEffect, useMemo, useState } from 'react';
import { Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import Supercluster from 'supercluster';
import { Crosshair, MapPin } from 'lucide-react';
import type { GeographicEventLocation } from '../../domain/mapJourneyUtils';
import { SmartAvatar } from '../ui/SmartAvatar';

type ClusterFeature = GeoJSON.Feature<
  GeoJSON.Point,
  {
    cluster?: boolean;
    point_count?: number;
    locationId?: string;
  }
> & { id: number };

const getEventTypeTone = (type: string) => {
  switch (type) {
    case 'birth':
      return 'text-green-400';
    case 'death':
      return 'text-red-400';
    case 'marriage':
      return 'text-amber-300';
    case 'residence':
      return 'text-sky-300';
    case 'burial':
      return 'text-purple-300';
    default:
      return 'text-blue-300';
  }
};

export const ClusterMarkers = ({
  cluster,
  points,
  map,
  onSelectPerson,
}: {
  cluster: Supercluster;
  points: GeographicEventLocation[];
  map: L.Map;
  onSelectPerson?: (id: string) => void;
}) => {
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(null);
  const [zoom, setZoom] = useState(map.getZoom());

  useMapEvents({
    moveend: () => {
      const nextBounds = map.getBounds();
      setBounds([nextBounds.getWest(), nextBounds.getSouth(), nextBounds.getEast(), nextBounds.getNorth()]);
      setZoom(map.getZoom());
    },
  });

  useEffect(() => {
    const nextBounds = map.getBounds();
    const timer = setTimeout(() => {
      setBounds([nextBounds.getWest(), nextBounds.getSouth(), nextBounds.getEast(), nextBounds.getNorth()]);
    }, 0);

    return () => clearTimeout(timer);
  }, [map]);

  const clusters = useMemo(
    () => (bounds ? cluster.getClusters(bounds, Math.floor(zoom)) : []),
    [bounds, cluster, zoom]
  );

  return (
    <>
      {clusters.map(clusterEntry => {
        const entry = clusterEntry as ClusterFeature;
        const [longitude, latitude] = entry.geometry.coordinates;
        const isCluster = entry.properties.cluster;
        const pointCount = entry.properties.point_count ?? 0;
        const locationId = entry.properties.locationId;

        if (isCluster) {
          const size = pointCount < 10 ? 30 : pointCount < 50 ? 40 : 50;

          return (
            <Marker
              key={`cluster-${entry.id}`}
              position={[latitude, longitude]}
              icon={L.divIcon({
                html: `<div class="cluster-marker" style="width:${size}px;height:${size}px;">${pointCount}</div>`,
                className: '',
                iconSize: L.point(size, size),
              })}
              eventHandlers={{
                click: () => {
                  const expansionZoom = Math.min(cluster.getClusterExpansionZoom(entry.id), 18);
                  map.setView([latitude, longitude], expansionZoom);
                },
              }}
            />
          );
        }

        const location = points.find(point => point.id === locationId);
        if (!location) {
          return null;
        }

        return (
          <Marker
            key={`loc-${location.id}`}
            position={[latitude, longitude]}
            icon={L.divIcon({
              html: `<div class="rounded-full border border-[#C4A882] bg-[#FAF7F2] p-1 shadow-[0_14px_28px_rgba(44,24,16,0.14)]"><div class="h-3 w-3 rounded-full bg-[#8B6914]"></div></div>`,
              className: '',
              iconSize: L.point(24, 24),
            })}
          >
            <Popup className="custom-popup" minWidth={220}>
              <div className="p-4 flex flex-col items-center">
                <div className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-[var(--color-info-500)]">
                  <MapPin className="w-2.5 h-2.5" /> {location.name}
                </div>
                <div className="w-full space-y-3">
                  {location.people.map(person => (
                    <div
                      key={`${person.id}-${person.type}`}
                      className="flex items-center gap-3 rounded-xl border border-[#E1D4C2] bg-[#F8F3EB] p-2 transition-colors hover:bg-[#F2EBDD]"
                    >
                      <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-full border border-[#C4A882] bg-[#EEE7DB]">
                        <SmartAvatar
                          person={{
                            id: person.id,
                            firstName: person.name.split(' ')[0] || person.name,
                            lastName: person.name.split(' ').slice(1).join(' '),
                            gender: person.gender,
                            birthDate: person.birthDate,
                            photoUrl: person.photoUrl,
                          }}
                          size={40}
                          className="rounded-full"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-sm font-bold text-[#2C1810]">{person.name}</div>
                        <div className={`text-[9px] uppercase font-black ${getEventTypeTone(person.type)}`}>
                          {person.type}
                        </div>
                      </div>
                      <button
                        onClick={() => onSelectPerson?.(person.id)}
                        className="rounded-lg bg-[#8B6914] px-2 py-2 text-[#FAF7F2] transition-all hover:bg-[#735712]"
                        title="Locate in Tree"
                      >
                        <Crosshair className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
};
