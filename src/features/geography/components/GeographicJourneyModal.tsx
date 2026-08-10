import React, { useEffect, useMemo, useRef, useState } from 'react';
import type L from 'leaflet';
import { Camera, Eye, Globe, Loader2, MapPin, Route, Search, Users, X } from 'lucide-react';
import { toPng } from 'html-to-image';

import { useTranslation } from '../../../context/TranslationContext';
import { useAppStore } from '../../../store/useAppStore';
import { downloadFile } from '@/utils/fileUtils';
import { showToast } from '../../../utils/showToast';
import { OverlayPrimitive } from '../../../context/OverlayContext';
import type { Language, GeographicJourneyMode } from '../../../types/common';
import type { Person } from '../../../types/person';
import type { LocationData } from '../../../types/tree';
import {
  buildEventLocations,
  buildMigrationJourney,
  type GeographicEventLocation,
} from '../../../domain/mapJourneyUtils';
import { mapStyles } from './geography/MapStyles';
import { applyBranding } from './geography/MapBranding';
import { MapView } from './geography/MapView';

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

const arabicMapCopy = {
  clearSearch: '\u0645\u0633\u062D \u0627\u0644\u0628\u062D\u062B',
  from: '\u0645\u0646',
  to: '\u0625\u0644\u0649',
  noMatchingItems: '\u0644\u0627 \u062A\u0648\u062C\u062F \u0646\u062A\u0627\u0626\u062C \u0645\u0637\u0627\u0628\u0642\u0629.',
  peopleCount: '\u0623\u0634\u062E\u0627\u0635',
  placeLabels: '\u0623\u0633\u0645\u0627\u0621 \u0627\u0644\u0623\u0645\u0627\u0643\u0646',
  results: '\u0646\u062A\u0627\u0626\u062C',
  routesCount: '\u0645\u0633\u0627\u0631\u0627\u062A',
  pointsCount: '\u0646\u0642\u0627\u0637',
  search: '\u0628\u062D\u062B...',
  searchItems: '\u0628\u062D\u062B \u0641\u064A \u0639\u0646\u0627\u0635\u0631 \u0627\u0644\u062E\u0631\u064A\u0637\u0629',
  showAllPaths: '\u0625\u0638\u0647\u0627\u0631 \u062C\u0645\u064A\u0639 \u0627\u0644\u0645\u0633\u0627\u0631\u0627\u062A',
  migrationRoutes: '\u0645\u0633\u0627\u0631\u0627\u062A \u0627\u0644\u0647\u062C\u0631\u0629',
  year: '\u0633\u0646\u0629',
};

const modeButtonClass = (active: boolean) =>
  `inline-flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] transition-all ${
    active
      ? 'bg-[#2C1810] text-[#FAF7F2] shadow-[0_18px_34px_rgba(44,24,16,0.18)]'
      : 'bg-[#F2EEE8] text-[#6B5A49] hover:bg-[#ECE6DC]'
  }`;

const buildPersonName = (person: Person) =>
  [person.firstName, person.middleName, person.lastName].filter(Boolean).join(' ').trim();

const getEventPreview = (location: GeographicEventLocation) =>
  location.people
    .slice(0, 2)
    .map(person => person.name)
    .filter(Boolean)
    .join('\u060C ');

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
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');
  const focusPerson = focusPersonId ? people[focusPersonId] : undefined;
  const scopedPeople = useMemo(
    () => focusPerson ? { [focusPerson.id]: focusPerson } : people,
    [focusPerson, people]
  );

  useEffect(() => {
    setMode(initialMode);
    setSelectedPersonId(null);
    setSelectedRouteId(null);
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

  useEffect(() => {
    if (!mapInstance || activeCoordinates.length === 0) {
      return;
    }

    if (activeCoordinates.length === 1) {
      mapInstance.setView(activeCoordinates[0], focusPerson ? 7 : 5, { animate: true });
      return;
    }

    const bounds = activeCoordinates;
    mapInstance.fitBounds(bounds as L.LatLngBoundsExpression, {
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
  const migrationRouteItems = useMemo(
    () =>
      [...migrationJourney.links]
        .sort((left, right) => right.count - left.count || left.source.locationName.localeCompare(right.source.locationName))
        .filter(link => {
          if (!normalizedSidebarSearch) return true;
          return (
            link.source.locationName.toLocaleLowerCase().includes(normalizedSidebarSearch) ||
            link.target.locationName.toLocaleLowerCase().includes(normalizedSidebarSearch) ||
            link.people.some(person => person.name.toLocaleLowerCase().includes(normalizedSidebarSearch)) ||
            String(link.count).includes(normalizedSidebarSearch)
          );
        }),
    [migrationJourney.links, normalizedSidebarSearch]
  );
  const selectedMigrationRoute = useMemo(
    () =>
      selectedRouteId
        ? migrationJourney.links.find(link => link.id === selectedRouteId) ?? null
        : null,
    [migrationJourney.links, selectedRouteId]
  );
  const visibleSummaryCount = mode === 'events' ? eventSummaryItems.length : migrationRouteItems.length;
  const maxEventLocationCount = Math.max(1, ...eventLocations.map(location => location.people.length));
  const title = focusPerson
    ? `${buildPersonName(focusPerson) || t.unnamedPerson} - ${t.geography}`
    : t.geography?.toUpperCase();
  const subtitle =
    mode === 'events'
      ? `${eventLocations.length} ${t.statistics.uniqueLocations}`
      : `${migrationJourney.links.length} ${geographyText.migrationMap || 'Migration routes'}`;
  const sidebarTitle = mode === 'events'
    ? t.statistics.uniqueLocations
    : isRtl ? arabicMapCopy.migrationRoutes : 'Migration Routes';

  if (!isOpen) {
    return null;
  }

  return (
    <OverlayPrimitive
      isOpen={isOpen}
      onClose={onClose}
      id="geographic-journey-modal"
      backdropClassName="fixed inset-0 z-[var(--z-index-modal)] flex items-center justify-center bg-[rgba(24,20,16,0.34)] p-3 backdrop-blur-[2px] sm:p-6"
      contentClassName="relative z-[calc(var(--z-index-modal)+1)] w-full max-w-[1240px]"
    >
      <style>{mapStyles}</style>

      <div
        ref={containerRef}
        className="ds-overlay-card relative flex h-[calc(100dvh-32px)] max-h-[820px] w-full flex-col overflow-hidden rounded-[24px] bg-[#FAF7F2] shadow-[0_34px_90px_rgba(44,24,16,0.24)]"
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
              className={`flex max-h-[44vh] flex-none flex-col border-b border-[#E3D8C8] bg-[#FCFAF6] p-4 md:max-h-none md:w-[330px] md:border-b-0 md:p-5 ${isRtl ? 'md:border-l' : 'md:border-r'}`}
              style={{ order: 1 }}
            >
              <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
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
                aria-pressed={showPlaceLabels}
              >
                <span className={`flex items-center gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <Eye className="h-4 w-4 text-[#8B6914]" />
                  {isRtl ? arabicMapCopy.placeLabels : 'Place labels'}
                </span>
                <span className={`h-5 w-9 rounded-full p-0.5 transition-colors ${showPlaceLabels ? 'bg-[#2C1810]' : 'bg-[#DDD2C2]'}`}>
                  <span className={`block h-4 w-4 rounded-full bg-[#FAF7F2] transition-transform ${showPlaceLabels ? (isRtl ? '-translate-x-4' : 'translate-x-4') : ''}`} />
                </span>
              </button>

              <label className="mt-4 block">
                <span className="sr-only">{isRtl ? arabicMapCopy.searchItems : 'Search map items'}</span>
                <span className={`flex items-center gap-2 rounded-2xl border border-[#E3D8C8] bg-[#FAF7F2] px-3 py-2.5 text-[#7A6A59] ${isRtl ? 'flex-row-reverse' : ''}`}>
                  <Search className="h-4 w-4 flex-none text-[#8B6914]" />
                  <input
                    value={sidebarSearchQuery}
                    onChange={event => setSidebarSearchQuery(event.target.value)}
                    placeholder={isRtl ? arabicMapCopy.search : 'Search...'}
                    className={`min-w-0 flex-1 bg-transparent text-sm text-[#2C1810] outline-none placeholder:text-[#9A8B7A] ${isRtl ? 'text-right' : 'text-left'}`}
                  />
                  {sidebarSearchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSidebarSearchQuery('')}
                      className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-[#7A6A59] transition-colors hover:bg-[#ECE6DC] hover:text-[#2C1810]"
                      aria-label={isRtl ? arabicMapCopy.clearSearch : 'Clear search'}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </span>
              </label>

              <div className="mt-5 flex min-h-0 flex-1 flex-col">
                <div className={`mb-3 flex items-center justify-between gap-3 ${isRtl ? 'flex-row-reverse text-right' : ''}`}>
                  <h4 className={`flex min-w-0 items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-[#8B6914] ${isRtl ? 'flex-row-reverse' : ''}`}>
                    <Users className="h-3.5 w-3.5 flex-none" />
                    <span className="truncate">{sidebarTitle}</span>
                  </h4>
                  <span className="flex-none rounded-full bg-[#F2EEE8] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7A6A59]">
                    {visibleSummaryCount} {isRtl ? arabicMapCopy.results : 'results'}
                  </span>
                </div>

                {mode === 'migration' && selectedMigrationRoute ? (
                  <div className={`mb-3 rounded-2xl border border-[#D8C5A8] bg-[#F8F3EB] px-3 py-3 text-[#2C1810] ${isRtl ? 'text-right' : 'text-left'}`}>
                    <div className={`flex items-center justify-between gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8B6914]">
                        {isRtl ? arabicMapCopy.migrationRoutes : 'Selected route'}
                      </span>
                      <span className="rounded-full bg-[#EFE7DA] px-2 py-0.5 text-[10px] font-semibold text-[#8B6914]">
                        {selectedMigrationRoute.count} {isRtl ? arabicMapCopy.peopleCount : 'people'}
                      </span>
                    </div>
                    <div className="mt-3 space-y-2 text-xs">
                      <div className={`flex gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <span className="flex-none text-[#8B6914]">{isRtl ? arabicMapCopy.from : 'From'}</span>
                        <span className="min-w-0 truncate font-semibold">{selectedMigrationRoute.source.locationName}</span>
                      </div>
                      <div className={`flex gap-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
                        <span className="flex-none text-[#8B6914]">{isRtl ? arabicMapCopy.to : 'To'}</span>
                        <span className="min-w-0 truncate font-semibold">{selectedMigrationRoute.target.locationName}</span>
                      </div>
                      <div className="truncate text-[11px] text-[#7A6A59]">
                        {selectedMigrationRoute.people.slice(0, 4).map(person => person.name).join('\u060C ')}
                      </div>
                    </div>
                  </div>
                ) : null}

                {mode === 'migration' && !selectedMigrationRoute ? (
                  <div className={`mb-3 grid grid-cols-2 gap-2 ${isRtl ? 'text-right' : 'text-left'}`}>
                    <div className="rounded-2xl bg-[#F8F3EB] px-3 py-2">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8B6914]">
                        {isRtl ? arabicMapCopy.routesCount : 'Routes'}
                      </div>
                      <div className="mt-1 text-lg font-bold text-[#2C1810]">{migrationJourney.links.length}</div>
                    </div>
                    <div className="rounded-2xl bg-[#F8F3EB] px-3 py-2">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8B6914]">
                        {isRtl ? arabicMapCopy.pointsCount : 'Points'}
                      </div>
                      <div className="mt-1 text-lg font-bold text-[#2C1810]">{migrationJourney.nodes.length}</div>
                    </div>
                  </div>
                ) : null}

                <div className={`min-h-0 flex-1 space-y-2 overflow-y-auto pr-1 ${isRtl ? 'pl-1 pr-0' : ''}`}>
                  {mode === 'events'
                    ? eventSummaryItems.map(location => {
                        const previewPeople = getEventPreview(location);
                        return (
                          <button
                            type="button"
                            key={location.id}
                            className={`group w-full rounded-2xl border border-transparent bg-[#F8F3EB] px-3 py-3 text-left transition-colors hover:border-[#D8C5A8] hover:bg-[#F2EEE8] ${isRtl ? 'text-right' : ''}`}
                            onClick={() => mapRef.current?.setView([location.latitude, location.longitude], 10)}
                          >
                            <div className={`flex items-start justify-between gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                              <div className="min-w-0">
                                <span className="block truncate text-xs font-bold text-[#2C1810] transition-colors group-hover:text-[#8B6914]">
                                  {location.name}
                                </span>
                                {previewPeople ? (
                                  <span className="mt-1 block truncate text-[11px] text-[#7A6A59]">
                                    {previewPeople}
                                  </span>
                                ) : null}
                              </div>
                              <span className="flex-none rounded-full bg-[#EFE7DA] px-2 py-0.5 text-[10px] font-semibold text-[#8B6914]">
                                {location.people.length} {isRtl ? arabicMapCopy.peopleCount : 'people'}
                              </span>
                            </div>
                            <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-[#E8E1D8]">
                              <div
                                className="h-full bg-gradient-to-r from-[#C4A882] to-[#8B6914]"
                                style={{ width: `${Math.min((location.people.length / maxEventLocationCount) * 100, 100)}%` }}
                              />
                            </div>
                          </button>
                        );
                      })
                    : migrationRouteItems.map((link, index) => (
                        <button
                          type="button"
                          key={`${link.id}-${index}`}
                          className={`group w-full rounded-2xl border px-3 py-3 text-left transition-colors hover:border-[#D8C5A8] hover:bg-[#F2EEE8] ${selectedRouteId === link.id ? 'border-[#C4A882] bg-[#F2EEE8]' : 'border-transparent bg-[#F8F3EB]'} ${isRtl ? 'text-right' : ''}`}
                          onClick={() => {
                            const bounds = [
                              [link.source.lat, link.source.lng],
                              [link.target.lat, link.target.lng],
                            ];
                            mapRef.current?.fitBounds(bounds as L.LatLngBoundsExpression, { animate: true, maxZoom: 7, padding: [80, 80] });
                            setSelectedRouteId(link.id);
                            setSelectedPersonId(null);
                          }}
                        >
                          <div className={`flex items-start justify-between gap-3 ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <div className="min-w-0">
                              <div className="truncate text-xs font-bold text-[#2C1810] transition-colors group-hover:text-[#8B6914]">
                                {link.source.locationName}
                              </div>
                              <div className="mt-1 truncate text-[11px] text-[#7A6A59]">
                                {link.target.locationName}
                              </div>
                              <div className="mt-1 truncate text-[10px] text-[#9A8B7A]">
                                {link.people.slice(0, 2).map(person => person.name).join('، ')}
                              </div>
                            </div>
                            <span className="flex-none rounded-full bg-[#EFE7DA] px-2 py-0.5 text-[10px] font-semibold text-[#8B6914]">
                              {link.count} {isRtl ? arabicMapCopy.peopleCount : 'people'}
                            </span>
                          </div>
                          <div className={`mt-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8B6914] ${isRtl ? 'flex-row-reverse' : ''}`}>
                            <span className="h-px flex-1 bg-[#D8C5A8]" />
                            <Route className="h-3 w-3" />
                            <span className="h-px flex-1 bg-[#D8C5A8]" />
                          </div>
                        </button>
                      ))}
                </div>

                {visibleSummaryCount === 0 ? (
                  <div className={`rounded-2xl border border-dashed border-[#D8C5A8] bg-[#FAF7F2] px-4 py-5 text-sm text-[#7A6A59] ${isRtl ? 'text-right' : 'text-left'}`}>
                    {isRtl ? arabicMapCopy.noMatchingItems : 'No matching map items.'}
                  </div>
                ) : null}

                {mode === 'migration' && selectedRouteId ? (
                  <button
                    onClick={() => {
                      setSelectedRouteId(null);
                      setSelectedPersonId(null);
                    }}
                    className="mt-4 w-full rounded-2xl bg-[#F2EEE8] px-3 py-2 text-xs font-semibold text-[#8B6914] transition-colors hover:bg-[#ECE6DC]"
                  >
                    {isRtl ? arabicMapCopy.showAllPaths : 'Show all paths'}
                  </button>
                ) : null}
              </div>
            </aside>
          )}

          <div className="relative min-h-0 flex-1" style={{ order: 2 }}>
            <MapView
              mode={mode}
              eventLocations={eventLocations}
              migrationJourney={migrationJourney}
              showPlaceLabels={showPlaceLabels}
              isRtl={isRtl}
              selectedPersonId={selectedPersonId}
              selectedRouteId={selectedRouteId}
              onMapReady={(map) => {
                mapRef.current = map;
                setMapInstance(map);
              }}
              onSelectPerson={onSelectPerson}
              onSelectRoute={(routeId) => {
                setSelectedRouteId(routeId);
                setSelectedPersonId(null);
              }}
              onTogglePersonSelection={(personId) => {
                setSelectedPersonId(personId === selectedPersonId ? null : personId);
                setSelectedRouteId(null);
              }}
            />

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
