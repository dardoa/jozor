import React, { useMemo, useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import Supercluster from 'supercluster';
import { Person, Language } from '../types';
import { useTranslation } from '../context/TranslationContext';
import { useGeoData, GeoLocation } from '../hooks/useGeoData';
import { X, Globe, MapPin, Users, Crosshair, Camera, Loader2 } from 'lucide-react';
import { toPng } from 'html-to-image';
import { useAppStore } from '../store/useAppStore';
import { downloadFile } from '../utils/fileUtils';
import { showError } from '../utils/toast';

// Fix Leaflet Default Icon issue in Webpack/Vite
import 'leaflet/dist/leaflet.css';

// Custom CSS for Glassmorphism Map Controls
const mapStyles = `
  .leaflet-control-zoom { border: none !important; margin: 20px !important; }
  .leaflet-control-zoom-in, .leaflet-control-zoom-out { 
    background: rgba(255, 255, 255, 0.1) !important; 
    backdrop-filter: blur(12px) !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
    color: white !important;
    border-radius: 12px !important;
    margin-bottom: 8px !important;
    display: flex !important;
    align-items: center;
    justify-content: center;
    width: 40px !important;
    height: 40px !important;
  }
  .leaflet-popup-content-wrapper {
    background: rgba(15, 23, 42, 0.8) !important;
    backdrop-filter: blur(16px) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    color: white !important;
    border-radius: 16px !important;
    padding: 0 !important;
  }
  .leaflet-popup-tip { background: rgba(15, 23, 42, 0.8) !important; }
  .cluster-marker {
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
    color: white;
    border-radius: 50%;
    border: 3px solid rgba(255, 255, 255, 0.8);
    font-weight: 900;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    transition: transform 0.2s;
  }
  .cluster-marker:hover { transform: scale(1.1); }
`;

interface GeoMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  people: Record<string, Person>;
  language: Language;
  onSelectPerson?: (id: string) => void;
}

/**
 * Supercluster Adapter Component
 */
const ClusterMarkers = ({ cluster, points, map, onSelectPerson }: { cluster: any; points: any[]; map: L.Map; onSelectPerson?: (id: string) => void }) => {
  const [bounds, setBounds] = useState<[number, number, number, number] | null>(null);
  const [zoom, setZoom] = useState(map.getZoom());

  useMapEvents({
    moveend: () => {
      const b = map.getBounds();
      setBounds([
        b.getWest(),
        b.getSouth(),
        b.getEast(),
        b.getNorth()
      ]);
      setZoom(map.getZoom());
    }
  });

  // Initial bounds
  useEffect(() => {
    const b = map.getBounds();
    const timer = setTimeout(() => {
      setBounds([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()]);
    }, 0);
    return () => clearTimeout(timer);
  }, [map]);

  const clusters = useMemo(() => {
    return bounds ? cluster.getClusters(bounds, Math.floor(zoom)) : [];
  }, [bounds, zoom, cluster]);

  return (
    <>
      {clusters.map((c: any) => {
        const [longitude, latitude] = c.geometry.coordinates;
        const { cluster: isCluster, point_count: pointCount, locationId } = c.properties;

        if (isCluster) {
          const count = pointCount;
          const size = count < 10 ? 30 : count < 50 ? 40 : 50;

          return (
            <Marker
              key={`cluster-${c.id}`}
              position={[latitude, longitude]}
              icon={L.divIcon({
                html: `<div class="cluster-marker" style="width: ${size}px; height: ${size}px;">${count}</div>`,
                className: '',
                iconSize: L.point(size, size)
              })}
              eventHandlers={{
                click: () => {
                  const expansionZoom = Math.min(cluster.getClusterExpansionZoom(c.id), 18);
                  map.setView([latitude, longitude], expansionZoom);
                }
              }}
            />
          );
        }

        // Single Location Point
        const location = points.find(p => p.id === locationId);
        if (!location) return null;

        return (
          <Marker
            key={`loc-${locationId}`}
            position={[latitude, longitude]}
            icon={L.divIcon({
              html: `<div class="p-1 bg-white dark:bg-blue-600 rounded-full border-2 border-white shadow-lg"><div class="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div></div>`,
              className: '',
              iconSize: L.point(24, 24)
            })}
          >
            <Popup className="custom-popup" minWidth={220}>
              <div className="p-4 flex flex-col items-center">
                <div className="text-blue-400 font-bold text-[10px] uppercase tracking-widest mb-2 flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5" /> {location.name}
                </div>
                <div className="w-full space-y-3">
                  {location.people.map((p: any) => (
                    <div key={`${p.id}-${p.type}`} className="flex items-center gap-3 bg-white/5 p-2 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                      <div className="w-10 h-10 rounded-full border border-blue-500/50 overflow-hidden flex-shrink-0 bg-slate-800">
                        {p.photoUrl ? (
                          <img src={p.photoUrl} alt={p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white/40">
                            {p.name.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-bold truncate">{p.name}</div>
                        <div className={`text-[9px] uppercase font-black ${p.type === 'birth' ? 'text-green-400' : p.type === 'death' ? 'text-red-400' : 'text-blue-400'
                          }`}>
                          {p.type}
                        </div>
                      </div>
                      <button
                        onClick={() => onSelectPerson?.(p.id)}
                        className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all"
                        title="Locate in Tree"
                      >
                        <Crosshair className="w-3 h-3" />
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

export const GeoMapModal: React.FC<GeoMapModalProps> = ({ isOpen, onClose, people, language, onSelectPerson }) => {
  const { t } = useTranslation();
  const treeName = useAppStore(state => state.treeName);
  const rawLocations = useGeoData(people);
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [hideUIForExport, setHideUIForExport] = useState(false);

  // Snapshot Engine
  const handleExportSnapshot = async () => {
    if (!containerRef.current) return;
    setIsExporting(true);
    setHideUIForExport(true);

    try {
      // Wait for map to settle/render
      await new Promise(r => setTimeout(r, 500));

      const dataUrl = await toPng(containerRef.current, {
        quality: 0.95,
        pixelRatio: 2, // High resolution (2x)
        backgroundColor: '#0f172a',
        filter: (node) => {
          // Exclude certain nodes from capture if needed
          const classList = (node as HTMLElement).classList;
          if (classList?.contains('leaflet-control-container')) return false;
          if (classList?.contains('export-btn')) return false;
          return true;
        }
      });

      // Apply Branding Overlay via Canvas
      const brandedUrl = await applyBranding(dataUrl, treeName);

      downloadFile(brandedUrl, `jozor_map_${treeName.replace(/\s+/g, '_').toLowerCase()}.png`, 'image/png');
    } catch (err) {
      console.error('Export failed:', err);
      showError('Failed to capture map snapshot');
    } finally {
      setIsExporting(false);
      setHideUIForExport(false);
    }
  };

  const applyBranding = (dataUrl: string, title: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(dataUrl);

        ctx.drawImage(img, 0, 0);

        // Branding Bar
        const barHeight = canvas.height * 0.08;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
        ctx.fillRect(0, canvas.height - barHeight, canvas.width, barHeight);

        // Text
        const padding = 40;
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.floor(barHeight * 0.4)}px Inter, sans-serif`;
        ctx.textAlign = 'left';
        ctx.fillText(title.toUpperCase(), padding, canvas.height - (barHeight / 2) + (barHeight * 0.1));

        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = `${Math.floor(barHeight * 0.25)}px Inter, sans-serif`;
        ctx.textAlign = 'right';
        ctx.fillText('GENERATED BY JOZOR', canvas.width - padding, canvas.height - (barHeight / 2) + (barHeight * 0.1));

        resolve(canvas.toDataURL('image/png'));
      };
      img.src = dataUrl;
    });
  };


  // Initialize Supercluster
  const index = useMemo(() => {
    const cluster = new Supercluster({
      radius: 60,
      maxZoom: 16
    });

    const points = rawLocations.map(loc => ({
      type: 'Feature',
      properties: {
        cluster: false,
        locationId: loc.id,
        category: 'lineage'
      },
      geometry: {
        type: 'Point',
        coordinates: [loc.longitude, loc.latitude]
      }
    }));

    cluster.load(points as any);
    return cluster;
  }, [rawLocations]);

  // Stable Canvas Renderer (Fixes infinite loop warning)
  const canvasRenderer = useMemo(() => L.canvas({ padding: 0.5 }), []);

  if (!isOpen) return null;

  return (
    <div className='fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300'>
      <style>{mapStyles}</style>

      <div ref={containerRef} className='bg-[#0f172a] rounded-[32px] shadow-2xl max-w-6xl w-full h-[80vh] flex flex-col border border-white/10 overflow-hidden relative'>

        {/* Header Overlay */}
        {!hideUIForExport && (
          <div className='absolute top-6 left-6 right-6 z-[1000] pointer-events-none flex justify-between items-start'>
            <div className="bg-white/10 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-2xl pointer-events-auto">
              <h3 className='text-lg font-black italic flex items-center gap-3 text-white tracking-tighter'>
                <Globe className='w-6 h-6 text-blue-500' /> {t.geography?.toUpperCase() || 'GEO ANALYTICS'}
              </h3>
              <div className="flex gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"></div>
                  <span className="text-[10px] font-bold text-white/50 uppercase">{rawLocations.length} Unique Locations</span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className='p-3 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-2xl border border-white/10 text-white pointer-events-auto transition-all'
            >
              <X className='w-6 h-6' />
            </button>
          </div>
        )}

        {/* Map Container */}
        <div className='flex-1 relative'>
          <MapContainer
            center={[20, 0]}
            zoom={3}
            zoomControl={false}
            className='w-full h-full'
            ref={(map) => { mapRef.current = map; }}
            preferCanvas={true}
            renderer={canvasRenderer}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              crossOrigin="anonymous"
            />

            {mapRef.current && (
              <ClusterMarkers cluster={index} points={rawLocations} map={mapRef.current} onSelectPerson={onSelectPerson} />
            )}
          </MapContainer>

          {/* Sidebar Overlay (Top Locations) */}
          {!hideUIForExport && (
            <div className='absolute bottom-8 right-8 z-[1000] w-64 bg-slate-900/60 backdrop-blur-2xl p-6 rounded-[24px] border border-white/10 shadow-2xl'>
              <h4 className='text-blue-400 text-xs font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2'>
                <Users className='w-3 h-3' /> Lineage Hotspots
              </h4>
              <div className="space-y-4">
                {[...rawLocations].sort((a, b) => b.people.length - a.people.length).slice(0, 4).map((l) => (
                  <div key={l.id} className="group cursor-pointer" onClick={() => mapRef.current?.setView([l.latitude, l.longitude], 10)}>
                    <div className='flex justify-between items-end mb-1'>
                      <span className="text-white text-xs font-bold truncate group-hover:text-blue-400 transition-colors">{l.name}</span>
                      <span className="text-[#E1AD01] text-[10px] font-black">{l.people.length}</span>
                    </div>
                    <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-600 to-blue-400"
                        style={{ width: `${Math.min((l.people.length / rawLocations[0]?.people.length) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export Button */}
          {!hideUIForExport && (
            <button
              onClick={handleExportSnapshot}
              disabled={isExporting}
              className='export-btn absolute bottom-8 left-8 z-[1000] flex items-center gap-3 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl transition-all active:scale-95 disabled:opacity-50'
            >
              {isExporting ? <Loader2 className='w-4 h-4 animate-spin' /> : <Camera className='w-4 h-4' />}
              {isExporting ? 'Capturing...' : 'Export Image'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

GeoMapModal.displayName = 'GeoMapModal';
