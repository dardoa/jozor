import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import Supercluster from 'supercluster';
import { Camera, Eye, Globe, Loader2, MapPin, Route, Search, Users, X } from 'lucide-react';
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
  focusPersonId?: string;
};

type GeographicJourneyTranslations = {
  migrationMap?: string;
  viewOnMap?: string;
};

const modeButtonClass = (active: boolean) =>
  `inline-flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] transition-all ${
    active
      ? 'bg-[#2C1810] text-[#FAF7F2] shadow-[0_18px_34px_rgba(44,24,16,0.18)]'
      : 'bg-[#F2EEE8] text-[#6B5A49] hover:bg-[#ECE6DC]'
  }`;

const buildPersonName = (person: Person) =>
  [person.firstName, person.middleName, person.lastName].filter(Boolean).join(' ').trim();

export const GeographicJourneyModal: React.FC<GeographicJourneyModalProps> = ({
  isOpen,
  onClose,
  people,
  locations,
  language,
  initialMode,
  onSelectPerson,
  focusPersonId,
}) => {
  const { t, language: uiLanguage } = useTranslation();
  const geographyText = t as typeof t & GeographicJourneyTranslations;
  const treeName = useAppStore(state => state.treeName);
  const documentDirection =
    typeof document !== 'undefined' ? document.documentElement.getAttribute('dir') : null;
  const isRtl = uiLanguage === 'ar' || language === 'ar' || documentDirection === 'rtl';
  const mapRef = useRef<L.Map | null>(null);
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<GeographicJourneyMode>(initialMode);
  const [isExporting, setIsExporting] = useState(false);
  const [hideUIForExport, setHideUIForExport] = useState(false);
  const [showPlaceLabels, setShowPlaceLabels] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');
  const focusPerson = focusPersonId ? people[focusPersonId] : undefined;
  const scopedPeople = useMemo(
    () => focusPerson ? { [focusPerson.id]: focusPerson } : people,
    [focusPerson, people]
  );

  useEffect(() => {
    setMode(initialMode);
    setSelectedPersonId(null);
    setSidebarSearchQuery('');
  }, [initialMode, isOpen]);

  const eventLocations = useMemo(() => buildEventLocations(scopedPeople, locations), [scopedPeople, locations]);
  const migrationJourney = useMemo(() => buildMigrationJourney(scopedPeople, locations), [scopedPeople, locations]);
  const activeCoordinates = useMemo(() => {
    if (mode === 'migration') {
      return migrationJourney.nodes.map(node => [node.lat, node.lng] as [number, number]);
    }

    return eventLocations.map(location => [location.latitude, location.longitude] as [number, number]);
  }, [eventLocations, migrationJourney.nodes, mode]);

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

  useEffect(() => {
    if (!mapInstance || activeCoordinates.length === 0) {
      return;
    }

    if (activeCoordinates.length === 1) {
      mapInstance.setView(activeCoordinates[0], focusPerson ? 7 : 5, { animate: true });
      return;
    }

    const bounds = L.latLngBounds(activeCoordinates);
    mapInstance.fitBounds(bounds, {
      animate: true,
      maxZoom: focusPerson ? 8 : 5,
      padding: [56, 56],
    });
  }, [activeCoordinates, focusPerson, mapInstance]);

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

  const normalizedSidebarSearch = sidebarSearchQuery.trim().toLocaleLowerCase();
  const eventSummaryItems = useMemo(
    () =>
      [...eventLocations]
        .sort((left, right) => right.people.length - left.people.length || left.name.localeCompare(right.name))
        .filter(location => {
          if (!normalizedSidebarSearch) return true;
          return (
            location.name.toLocaleLowerCase().includes(normalizedSidebarSearch) ||
            location.people.some(person => person.name.toLocaleLowerCase().includes(normalizedSidebarSearch))
          );
        }),
    [eventLocations, normalizedSidebarSearch]
  );
  const migrationSummaryItems = useMemo(
    () =>
      [...migrationJourney.nodes]
        .sort((left, right) => {
          const yearCompare = (left.year ?? Number.MAX_SAFE_INTEGER) - (right.year ?? Number.MAX_SAFE_INTEGER);
          return yearCompare || left.name.localeCompare(right.name) || left.locationName.localeCompare(right.locationName);
        })
        .filter(node => {
          if (!normalizedSidebarSearch) return true;
          return (
            node.name.toLocaleLowerCase().includes(normalizedSidebarSearch) ||
            node.locationName.toLocaleLowerCase().includes(normalizedSidebarSearch) ||
            String(node.year ?? '').includes(normalizedSidebarSearch)
          );
        }),
    [migrationJourney.nodes, normalizedSidebarSearch]
  );
  const summaryItems: Array<GeographicEventLocation | MigrationNode> =
    mode === 'events' ? eventSummaryItems : migrationSummaryItems;
  const maxEventLocationCount = Math.max(1, ...eventLocations.map(location => location.people.length));
  const title = focusPerson
    ? `${buildPersonName(focusPerson) || t.unnamedPerson} - ${t.geography}`
    : t.geography?.toUpperCase();
  const subtitle =
    mode === 'events'
      ? `${eventLocations.length} ${t.statistics.uniqueLocations}`
      : `${migrationJourney.nodes.length} ${geographyText.migrationMap || 'Migration points'}`;

  if (!isOpen) {
    return null;
  }

  return (
    <OverlayPrimitive
      isOpen={isOpen}
      onClose={onClose}
      id="geographic-journey-modal"
      backdropClassName="fixed inset-0 z-[var(--z-index-modal)] flex items-center justify-center bg-[rgba(24,20,16,0.34)] p-3 backdrop-blur-[2px] sm:p-6"
      contentClassName="relative z-[calc(var(--z-index-modal)+1)] w-full max-w-[1180px]"
    >
      <style>{mapStyles}</style>

      <div
        ref={containerRef}
        className="ds-overlay-card relative flex h-[calc(100dvh-32px)] max-h-[780px] w-full flex-col overflow-hidden rounded-[24px] bg-[#FAF7F2] shadow-[0_34px_90px_rgba(44,24,16,0.24)]"
        onClick={event => event.stopPropagation()}
      >
        {!hideUIForExport && (
          <header className={`flex flex-none items-center justify-between gap-4 border-b border-[#E3D8C8] bg-[#FCFAF6] px-5 py-4 ${isRtl ? 'flex-row-reverse text-right' : ''}`}>
            <div className={`flex min-w-0 items-center gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <div className="flex h-11 w-11 flex-none items-center justify-center rounded-2xl border border-[#D8C5A8] bg-[#F3ECE2] text-[#8B6914]">
                <Globe className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-lg font-medium tracking-tight text-[#2C1810]">{title}</h3>
                <p className="mt-1 truncate text-xs text-[#7A6A59]">{subtitle}</p>
              </div>
            </div>

            <div className={`flex flex-none items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
              <button
                onClick={handleExportSnapshot}
                disabled={isExporting}
                className="export-btn hidden items-center gap-2 rounded-2xl bg-[#2C1810] px-4 py-2.5 text-xs font-semibold uppercase tracking-widest text-[#FAF7F2] transition-all hover:bg-[#4A2E14] active:scale-95 disabled:opacity-50 sm:inline-flex"
              >
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                {isExporting ? t.capturing : t.exportImage}
              </button>
              <button
                onClick={onClose}
                className="inline-flex h-11 w-11 items-center justify-center rounded-[18px] border border-[#D8C5A8] bg-[#FAF7F2] text-[#2C1810] transition-all hover:bg-[#F5EFE4]"
                aria-label={t.close || 'Close'}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>
        )}

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {!hideUIForExport && (
            <aside
              className={`flex max-h-[34vh] flex-none flex-col border-b border-[#E3D8C8] bg-[#FCFAF6] p-4 md:max-h-none md:w-[280px] md:border-b-0 md:p-5 ${isRtl ? 'md:border-l' : 'md:border-r'}`}
              style={{ order: 1 }}
            >
              <div className="space-y-2">
                <button type="button" onClick={() => setMode('events')} className={modeButtonClass(mode === 'events')}>
                  <MapPin className="h-4 w-4" />
                  {geographyText.viewOnMap || 'View on Map'}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('migration')}
                  className={modeButtonClass(mode === 'migration')}
                >
                  <Route className="h-4 w-4" />
                  {geographyText.migrationMap || 'Migration Map'}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowPlaceLabels(value => !value)}
                className={`mt-4 flex items-center justify-between gap-3 rounded-2xl border border-[#E3D8C8] bg-[#F8F3EB] px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#6B5A49] transition-colors hover:bg-[#F2EEE8] ${isRtl ? 'flex-row-reverse' : ''}`}
              >
                <span className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <Eye className="h-4 w-4 text-[#8B6914]" />
                  {isRtl ? 'أسماء الأماكن' : 'Place labels'}
                </span>
                <span className={`h-5 w-9 rounded-full p-0.5 transition-colors ${showPlaceLabels ? 'bg-[#2C1810]' : 'bg-[#DDD2C2]'}`}>
                  <span className={`block h-4 w-4 rounded-full bg-[#FAF7F2] transition-transform ${showPlaceLabels ? (isRtl ? '-translate-x-4' : 'translate-x-4') : ''}`} />
                </span>
              </button>

              <label className="mt-4 block">
                <span className="sr-only">{isRtl ? 'بحث في عناصر الخريطة' : 'Search map items'}</span>
                <span className={`flex items-center gap-2 rounded-2xl border border-[#E3D8C8] bg-[#FAF7F2] px-3 py-2.5 text-[#7A6A59] ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <Search className="h-4 w-4 flex-none text-[#8B6914]" />
                  <input
                    value={sidebarSearchQuery}
                    onChange={event => setSidebarSearchQuery(event.target.value)}
                    placeholder={isRtl ? 'بحث...' : 'Search...'}
                    className={`min-w-0 flex-1 bg-transparent text-sm text-[#2C1810] outline-none placeholder:text-[#9A8B7A] ${isRtl ? 'text-right' : 'text-left'}`}
                  />
                </span>
              </label>

              <div className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
                <h4 className={`mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[#8B6914] ${isRtl ? 'flex-row-reverse text-right' : ''}`}>
                  <Users className="h-3.5 w-3.5" />
                  {mode === 'events'
                    ? t.statistics.uniqueLocations
                    : geographyText.migrationMap || 'Migration Map'}
                </h4>
                <div className="space-y-3">
                  {mode === 'events'
                    ? eventSummaryItems.map(location => {
                        return (
                          <button
                            type="button"
                            key={location.id}
                            className={`group w-full rounded-2xl border border-transparent bg-[#F8F3EB] px-3 py-3 text-left transition-colors hover:border-[#D8C5A8] hover:bg-[#F2EEE8] ${isRtl ? 'text-right' : ''}`}
                            onClick={() => mapRef.current?.setView([location.latitude, location.longitude], 10)}
                          >
                            <div className={`mb-2 flex items-end justify-between gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
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
                                style={{ width: `${Math.min((location.people.length / maxEventLocationCount) * 100, 100)}%` }}
                              />
                            </div>
                          </button>
                        );
                      })
                    : migrationSummaryItems.map((node, index) => {
                        return (
                          <button
                            type="button"
                            key={`${node.personId}-${node.locationName}-${index}`}
                            className={`group w-full rounded-2xl border border-transparent bg-[#F8F3EB] px-3 py-3 text-left transition-colors hover:border-[#D8C5A8] hover:bg-[#F2EEE8] ${isRtl ? 'text-right' : ''}`}
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
                          </button>
                        );
                      })}
                </div>

                {(mode === 'events' ? eventSummaryItems.length : migrationSummaryItems.length) === 0 ? (
                  <div className={`rounded-2xl border border-dashed border-[#D8C5A8] bg-[#FAF7F2] px-4 py-5 text-sm text-[#7A6A59] ${isRtl ? 'text-right' : 'text-left'}`}>
                    {isRtl ? 'لا توجد نتائج مطابقة.' : 'No matching map items.'}
                  </div>
                ) : null}

                {mode === 'migration' && selectedPersonId ? (
                  <button
                    onClick={() => setSelectedPersonId(null)}
                    className="mt-4 w-full rounded-2xl bg-[#F2EEE8] px-3 py-2 text-xs font-semibold text-[#8B6914] transition-colors hover:bg-[#ECE6DC]"
                  >
                    {isRtl ? 'إظهار جميع المسارات' : 'Show all paths'}
                  </button>
                ) : null}
              </div>
            </aside>
          )}

          <div className="relative min-h-0 flex-1" style={{ order: 2 }}>
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
            <div className={`hidden absolute bottom-8 z-[var(--z-index-tips)] w-64 rounded-[24px] border border-[#C4A882] bg-[rgba(250,247,242,0.94)] p-6 shadow-[0_24px_56px_rgba(44,24,16,0.16)] ${isRtl ? 'left-8' : 'right-8'}`}>
              <h4 className="mb-4 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-[#8B6914]">
                <Users className="h-3 w-3" />
                {mode === 'events'
                  ? t.statistics.uniqueLocations
                  : geographyText.migrationMap || 'Migration Map'}
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
              className={`export-btn absolute bottom-4 z-[var(--z-index-tips)] flex items-center gap-3 rounded-2xl bg-[#2C1810] px-5 py-3 text-xs font-semibold uppercase tracking-widest text-[#FAF7F2] shadow-[0_20px_40px_rgba(44,24,16,0.2)] transition-all hover:bg-[#4A2E14] active:scale-95 disabled:opacity-50 sm:hidden ${isRtl ? 'right-4' : 'left-4'}`}
            >
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              {isExporting ? t.capturing : t.exportImage}
            </button>
          )}
        </div>
        </div>
      </div>
    </OverlayPrimitive>
  );
};

GeographicJourneyModal.displayName = 'GeographicJourneyModal';
