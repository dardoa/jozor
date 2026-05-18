import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import Supercluster from 'supercluster';
import { Camera, Globe, Loader2, MapPin, Route, Users, X } from 'lucide-react';
import { toPng } from 'html-to-image';
import 'leaflet/dist/leaflet.css';

import { useTranslation } from '../../../context/TranslationContext';
import { useAppStore } from '../../../store/useAppStore';
import { downloadFile } from '../../../utils/fileUtils';
import { showToast } from '../../../utils/showToast';
import { OverlayPrimitive } from '../../../context/OverlayContext';
import type { GeographicJourneyMode, Language, LocationData, Person } from '../../../types';
import {
  buildEventLocations,
  buildMigrationJourney,
  type GeographicEventLocation,
  type MigrationNode,
} from '../../../domain/mapJourneyUtils';

// Extracted Pieces
import { mapStyles } from './geography/MapStyles';
import { ClusterMarkers } from './geography/ClusterMarkers';
import { MigrationPathsOverlay } from './geography/MigrationPathsOverlay';
import { MapLabelPane } from './geography/MapLabelPane';
import { applyBranding } from './geography/MapBranding';

type GeographicJourneyModalProps = {
  isOpen: boolean;
  onClose: () => void;
  people: Record<string, Person>;
  locations: Record<string, LocationData>;
  language: Language;
  initialMode: GeographicJourneyMode;
  onSelectPerson?: (id: string) => void;
};

const modeButtonClass = (active: boolean) =>
  `inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-all ${
    active
      ? 'bg-[#2C1810] text-[#FAF7F2] shadow-[0_18px_34px_rgba(44,24,16,0.18)]'
      : 'bg-[#F2EEE8] text-[#6B5A49] hover:bg-[#ECE6DC]'
  }`;

export const GeographicJourneyModal: React.FC<GeographicJourneyModalProps> = ({
  isOpen,
  onClose,
  people,
  locations,
  language,
  initialMode,
  onSelectPerson,
}) => {
  const { t } = useTranslation();
  const treeName = useAppStore(state => state.treeName);
  const isRtl = language === 'ar';
  const mapRef = useRef<L.Map | null>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<GeographicJourneyMode>(initialMode);
  const [isExporting, setIsExporting] = useState(false);
  const [hideUIForExport, setHideUIForExport] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialMode);
    setSelectedPersonId(null);
  }, [initialMode, isOpen]);

  const eventLocations = useMemo(() => buildEventLocations(people, locations), [people, locations]);
  const migrationJourney = useMemo(() => buildMigrationJourney(people, locations), [people, locations]);

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

  const canvasRenderer = useMemo(() => L.canvas({ padding: 0.5 }), []);

  const handleExportSnapshot = async () => {
    if (!containerRef.current) {
      return;
    }

    setIsExporting(true);
    setHideUIForExport(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      const dataUrl = await toPng(containerRef.current, {
        quality: 0.95,
        pixelRatio: 2,
        backgroundColor: '#0f172a',
        filter: node => {
          const classList = (node as HTMLElement).classList;
          return !classList?.contains('leaflet-control-container') && !classList?.contains('export-btn');
        },
      });

      const brandedUrl = await applyBranding(dataUrl, treeName);
      const suffix = mode === 'migration' ? 'migration' : 'events';
      downloadFile(brandedUrl, `jozor_${suffix}_${treeName.replace(/\s+/g, '_').toLowerCase()}.png`, 'image/png');
    } catch {
      showToast.error('messages.error.map');
    } finally {
      setIsExporting(false);
      setHideUIForExport(false);
    }
  };

  const summaryItems =
    mode === 'events'
      ? [...eventLocations].sort((left, right) => right.people.length - left.people.length).slice(0, 4)
      : [...migrationJourney.nodes].slice(0, 4);

  if (!isOpen) {
    return null;
  }

  return (
    <OverlayPrimitive
      isOpen={isOpen}
      onClose={onClose}
      id="geographic-journey-modal"
      className="z-[var(--z-index-modal)]"
    >
      <style>{mapStyles}</style>

      <div
        ref={containerRef}
        className="ds-overlay-card relative flex h-[80vh] w-full max-w-6xl flex-col overflow-hidden rounded-[24px] bg-[#FAF7F2] shadow-[0_34px_90px_rgba(44,24,16,0.24)]"
        onClick={event => event.stopPropagation()}
      >
        {!hideUIForExport && (
          <div className={`absolute top-6 left-6 right-6 z-[var(--z-index-tips)] pointer-events-none flex items-start justify-between gap-4 ${isRtl ? 'flex-row-reverse' : ''}`}>
            <div className="pointer-events-auto rounded-[20px] border border-[#C4A882] bg-[rgba(250,247,242,0.94)] p-4 shadow-[0_18px_44px_rgba(44,24,16,0.14)]">
              <h3 className="flex items-center gap-3 text-lg font-medium tracking-tight text-[#2C1810]">
                <Globe className="h-6 w-6 text-[#8B6914]" />
                {t.geography?.toUpperCase()}
              </h3>
              <div className={`mt-4 flex flex-wrap gap-2 ${isRtl ? 'justify-end' : ''}`}>
                <button type="button" onClick={() => setMode('events')} className={modeButtonClass(mode === 'events')}>
                  <MapPin className="h-4 w-4" />
                  {(t as any).viewOnMap}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('migration')}
                  className={modeButtonClass(mode === 'migration')}
                >
                  <Route className="h-4 w-4" />
                  {(t as unknown as Record<string, string>).migrationMap || 'Migration Map'}
                </button>
              </div>
            </div>

            <button
              onClick={onClose}
              className="pointer-events-auto inline-flex h-12 w-12 items-center justify-center rounded-[18px] border border-[#C4A882] bg-[rgba(250,247,242,0.94)] text-[#2C1810] transition-all hover:bg-[#F5EFE4]"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        )}

        <div className="relative flex-1">
          <MapContainer
            center={[20, 0]}
            zoom={3}
            zoomControl={false}
            className="h-full w-full"
            ref={map => {
              mapRef.current = map;
              setMapInstance(map);
            }}
            preferCanvas={true}
            renderer={canvasRenderer}
          >
            <MapLabelPane />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png"
              crossOrigin="anonymous"
            />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png"
              pane="journey-labels"
              className="journey-label-tiles"
              crossOrigin="anonymous"
            />

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
                      html: `<div style="width:18px;height:18px;border-radius:9999px;background:#FAF7F2;border:1px solid #C4A882;box-shadow:0 12px 24px rgba(44,24,16,0.14);display:flex;align-items:center;justify-content:center;"><div style="width:8px;height:8px;border-radius:9999px;background:#8B6914;"></div></div>`,
                      className: '',
                      iconSize: L.point(18, 18),
                    })}
                    eventHandlers={{
                      click: () => {
                        setSelectedPersonId(node.personId === selectedPersonId ? null : node.personId);
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
                <MigrationPathsOverlay links={migrationJourney.links} selectedPersonId={selectedPersonId} />
              </>
            ) : null}
          </MapContainer>

          {!hideUIForExport && (
            <div className={`absolute bottom-8 z-[var(--z-index-tips)] w-64 rounded-[24px] border border-[#C4A882] bg-[rgba(250,247,242,0.94)] p-6 shadow-[0_24px_56px_rgba(44,24,16,0.16)] ${isRtl ? 'left-8' : 'right-8'}`}>
              <h4 className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-[#8B6914]">
                <Users className="h-3 w-3" />
                {mode === 'events'
                  ? t.statistics.uniqueLocations
                  : (t as unknown as Record<string, string>).migrationMap || 'Migration Map'}
              </h4>
              <div className="space-y-4">
                {mode === 'events'
                  ? summaryItems.map(item => {
                      const location = item as GeographicEventLocation;
                      return (
                        <div
                          key={location.id}
                          className="group cursor-pointer"
                          onClick={() => mapRef.current?.setView([location.latitude, location.longitude], 10)}
                        >
                          <div className="mb-1 flex items-end justify-between">
                            <span className="truncate text-xs font-bold text-[#2C1810] transition-colors group-hover:text-[#8B6914]">
                              {location.name}
                            </span>
                            <span className="text-[10px] font-semibold text-[#8B6914]">
                              {location.people.length}
                            </span>
                          </div>
                          <div className="h-1 w-full overflow-hidden rounded-full bg-[#E8E1D8]">
                            <div
                              className="h-full bg-gradient-to-r from-[#C4A882] to-[#8B6914]"
                              style={{
                                width: `${
                                  eventLocations[0]
                                    ? Math.min((location.people.length / eventLocations[0].people.length) * 100, 100)
                                    : 0
                                  }%`,
                                }}
                            />
                          </div>
                        </div>
                      );
                    })
                  : summaryItems.map((item, index) => {
                      const node = item as MigrationNode;
                      return (
                        <div
                          key={`${node.personId}-${node.locationName}-${index}`}
                          className="group cursor-pointer"
                          onClick={() => {
                            mapRef.current?.setView([node.lat, node.lng], 8);
                            setSelectedPersonId(node.personId);
                          }}
                        >
                          <div className="truncate text-xs font-bold text-[#2C1810] transition-colors group-hover:text-[#8B6914]">
                            {node.name}
                          </div>
                          <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[#7A6A59]">
                            {node.locationName}
                          </div>
                        </div>
                      );
                    })}
              </div>

              {mode === 'migration' && selectedPersonId ? (
                <button
                  onClick={() => setSelectedPersonId(null)}
                  className="mt-4 w-full rounded-lg bg-[#F2EEE8] px-3 py-1.5 text-xs font-semibold text-[#8B6914] transition-colors hover:bg-[#ECE6DC]"
                >
                  {isRtl ? 'إظهار جميع المسارات' : 'Show all paths'}
                </button>
              ) : null}
            </div>
          )}

          {!hideUIForExport && (
            <button
              onClick={handleExportSnapshot}
              disabled={isExporting}
              className={`export-btn absolute bottom-8 z-[var(--z-index-tips)] flex items-center gap-3 rounded-2xl bg-[#2C1810] px-6 py-3 text-xs font-semibold uppercase tracking-widest text-[#FAF7F2] shadow-[0_20px_40px_rgba(44,24,16,0.2)] transition-all hover:bg-[#4A2E14] active:scale-95 disabled:opacity-50 ${isRtl ? 'right-8' : 'left-8'}`}
            >
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {isExporting ? t.capturing : t.exportImage}
            </button>
          )}
        </div>
      </div>
    </OverlayPrimitive>
  );
};

GeographicJourneyModal.displayName = 'GeographicJourneyModal';
