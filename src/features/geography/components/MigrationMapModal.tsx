import React, { useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAppStore } from '../../../store/useAppStore';
import { Person } from '../../../types';
import { OverlayPrimitive } from '../../../context/OverlayContext';
import { X } from 'lucide-react';

import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
});

interface MigrationMapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MapNode {
  personId: string;
  name: string;
  locationName: string;
  lat: number;
  lng: number;
  year?: number;
}

interface MapLink {
  source: MapNode;
  target: MapNode;
  color: string;
}

export const MigrationMapModal: React.FC<MigrationMapModalProps> = ({ isOpen, onClose }) => {
  const people = useAppStore((state) => state.people);
  const locations = useAppStore((state) => state.locations);
  const language = useAppStore((state) => state.language);
  const isRtl = language === 'ar';

  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  const { nodes, links } = useMemo(() => {
    const calculatedNodes: MapNode[] = [];
    const calculatedLinks: MapLink[] = [];

    if (!people || !locations) return { nodes: [], links: [] };

    Object.values(people).forEach((person) => {
      const places = new Set<string>();

      if (person.birthPlace?.trim()) places.add(person.birthPlace.trim());
      if (person.residence?.trim()) places.add(person.residence.trim());
      if (person.deathPlace?.trim()) places.add(person.deathPlace.trim());
      if (person.burialPlace?.trim()) places.add(person.burialPlace.trim());

      person.events?.forEach((event) => {
        if (event.place?.trim()) places.add(event.place.trim());
      });

      if (person.partnerDetails) {
        Object.values(person.partnerDetails).forEach((partner) => {
          if (partner.startPlace?.trim()) places.add(partner.startPlace.trim());
          if (partner.endPlace?.trim()) places.add(partner.endPlace.trim());
        });
      }

      Array.from(places).forEach((place) => {
        if (locations[place]?.status === 'resolved') {
          const loc = locations[place];
          const year = person.birthDate ? parseInt(person.birthDate.substring(0, 4)) : undefined;

          calculatedNodes.push({
            personId: person.id,
            name: `${person.firstName} ${person.lastName}`.trim(),
            locationName: loc.resolvedName || place,
            lat: loc.lat!,
            lng: loc.lng!,
            year,
          });
        }
      });
    });

    Object.values(people).forEach((person) => {
      person.parents.forEach((parentId) => {
        const childNode = calculatedNodes.find((n) => n.personId === person.id);
        const parentNode = calculatedNodes.find((n) => n.personId === parentId);

        if (parentNode && childNode && (parentNode.lat !== childNode.lat || parentNode.lng !== childNode.lng)) {
          calculatedLinks.push({
            source: parentNode,
            target: childNode,
            color: '#3b82f6',
          });
        }
      });
    });

    return { nodes: calculatedNodes, links: calculatedLinks };
  }, [people, locations]);

  const SvgOverlay = () => {
    const map = useMap();

    const visibleLinks = selectedPersonId
      ? links.filter((link) => link.source.personId === selectedPersonId || link.target.personId === selectedPersonId)
      : links;

    return (
      <svg
        className='leaflet-zoom-animated'
        style={{ pointerEvents: 'none', position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
      >
        {visibleLinks.map((link, idx) => {
          const sourcePoint = map.latLngToLayerPoint([link.source.lat, link.source.lng]);
          const targetPoint = map.latLngToLayerPoint([link.target.lat, link.target.lng]);
          const dx = targetPoint.x - sourcePoint.x;
          const dy = targetPoint.y - sourcePoint.y;
          const dr = Math.sqrt(dx * dx + dy * dy) * 1.5;
          const path = `M${sourcePoint.x},${sourcePoint.y} A${dr},${dr} 0 0,1 ${targetPoint.x},${targetPoint.y}`;

          return (
            <path
              key={idx}
              d={path}
              fill='none'
              stroke={link.color}
              strokeWidth='2'
              strokeOpacity='0.6'
              className='animate-pulse'
            />
          );
        })}
      </svg>
    );
  };

  if (!isOpen) return null;

  return (
    <OverlayPrimitive isOpen={isOpen} onClose={onClose} id='migration-map-modal'>
      <div className='ds-overlay-card relative flex h-[85vh] w-full max-w-6xl flex-col overflow-hidden rounded-[var(--radius-2xl)] shadow-[var(--shadow-lg)]'>
        <div className='ds-modal-header relative z-10 flex items-center justify-between px-4 py-4'>
          <div>
            <h2 className='text-xl font-bold text-[var(--text-main)]'>
              {isRtl ? 'خريطة الهجرات' : 'Migration Map'}
            </h2>
            <p className='mt-1 text-sm text-[var(--text-dim)]'>
              {isRtl
                ? 'تتبع تنقلات العائلة عبر الأجيال والمدن'
                : 'Track family movements across generations and cities'}
            </p>
          </div>
          <button
            onClick={onClose}
            className='inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-subtle)] text-[var(--text-dim)] transition-colors hover:text-[var(--danger-500)]'
            aria-label='Close migration map'
          >
            <X className='h-5 w-5' />
          </button>
        </div>

        <div className='relative w-full flex-1 bg-[var(--surface-app)]'>
          <MapContainer
            center={[24.7136, 46.6753]}
            zoom={4}
            style={{ height: '100%', width: '100%', zIndex: 0 }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url='https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
            />

            {nodes.map((node) => (
              <Marker
                key={node.personId}
                position={[node.lat, node.lng]}
                eventHandlers={{
                  click: () => {
                    setSelectedPersonId(node.personId === selectedPersonId ? null : node.personId);
                  },
                }}
              >
                <Popup>
                  <div className={`p-1 ${isRtl ? 'text-right' : 'text-left'}`}>
                    <h3 className='font-bold text-[var(--text-main)]'>{node.name}</h3>
                    <p className='text-sm text-[var(--text-secondary)]'>{node.locationName}</p>
                    {node.year && <p className='text-xs font-semibold text-[var(--color-info-500)]'>{node.year}</p>}
                  </div>
                </Popup>
              </Marker>
            ))}

            <SvgOverlay />
          </MapContainer>
        </div>

        <div className='absolute bottom-6 right-6 z-[1000] max-w-sm rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)]/92 p-4 shadow-[var(--shadow-lg)] backdrop-blur-md'>
          <h4 className='mb-2 text-sm font-semibold text-[var(--text-main)]'>
            {isRtl ? 'تعليمات الخريطة' : 'Map Legend'}
          </h4>
          <ul className='space-y-2 text-xs text-[var(--text-secondary)]'>
            <li className='flex items-center gap-2'>
              <div className='h-0.5 w-4 rounded-full bg-[var(--color-info-500)]'></div>
              {isRtl ? 'خطوط الهجرة (آباء إلى أبناء)' : 'Migration paths (Parents to Children)'}
            </li>
            <li className='flex items-center gap-2 text-[var(--text-muted)]'>
              {isRtl ? 'اضغط على الدبوس لإظهار هجرات شخص محدد فقط' : "Click a pin to isolate a single person's migrations"}
            </li>
          </ul>

          {selectedPersonId && (
            <button
              onClick={() => setSelectedPersonId(null)}
              className='mt-3 w-full rounded-lg bg-[var(--surface-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--color-info-500)] transition-colors hover:bg-[var(--surface-hover)]'
            >
              {isRtl ? 'إظهار جميع الخطوط' : 'Show All Lines'}
            </button>
          )}
        </div>
      </div>
    </OverlayPrimitive>
  );
};
