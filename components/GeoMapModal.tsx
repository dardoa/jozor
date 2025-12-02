import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Person, Language } from '../types';
import { getTranslation } from '../utils/translations';
import { X, Globe, MapPin, Loader2 } from 'lucide-react';

interface GeoMapModalProps {
  isOpen: boolean;
  onClose: () => void;
  people: Record<string, Person>;
  language: Language;
}

export const GeoMapModal: React.FC<GeoMapModalProps> = ({ isOpen, onClose, people, language }) => {
  const t = getTranslation(language);
  const svgRef = useRef<SVGSVGElement>(null);
  const [geoData, setGeoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Locations Aggregation
  const locations = React.useMemo(() => {
      const locs: { name: string, count: number, lat?: number, lon?: number }[] = [];
      Object.values(people).forEach((p: Person) => {
          if (p.birthPlace) {
              const placeName = p.birthPlace.split(',').pop()?.trim() || p.birthPlace;
              const existing = locs.find(l => l.name === placeName);
              if (existing) existing.count++;
              else locs.push({ name: placeName, count: 1 });
          }
      });
      // Note: In a real app, we would Geocode these names to lat/lon using an API.
      // For this pure frontend demo without a Geocoding API key, we will simulate positions 
      // based on hash or random distribution for demo purposes if lat/lon missing.
      // OR we just map known major countries.
      return locs;
  }, [people]);

  useEffect(() => {
      if (isOpen && !geoData) {
          // Fetch low-res world geojson
          fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson')
              .then(res => res.json())
              .then(data => {
                  setGeoData(data);
                  setLoading(false);
              })
              .catch(err => {
                  console.error("Failed to load map data", err);
                  setLoading(false);
              });
      }
  }, [isOpen]);

  useEffect(() => {
      if (!geoData || !svgRef.current) return;

      const width = 800;
      const height = 450;
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove(); // Clear previous

      // Projection
      const projection = d3.geoMercator()
          .scale(100)
          .center([0, 20])
          .translate([width / 2, height / 2]);

      // Draw Map
      svg.append("g")
          .selectAll("path")
          .data(geoData.features)
          .enter()
          .append("path")
          .attr("fill", "#e5e7eb")
          .attr("d", d3.geoPath().projection(projection) as any)
          .style("stroke", "#fff")
          .style("opacity", 0.8);

      // Draw Points (Mock Geocoding logic for demo)
      // Real app needs Google Maps Geocoding API
      const mockCoordinates: Record<string, [number, number]> = {
          "USA": [-95, 37], "United States": [-95, 37], "Canada": [-106, 56],
          "UK": [-3, 55], "France": [2, 46], "Germany": [10, 51],
          "Egypt": [30, 26], "Saudi Arabia": [45, 23], "UAE": [53, 23],
          "China": [104, 35], "Japan": [138, 36], "India": [78, 20]
      };

      locations.forEach(loc => {
          // Simple fallback geocoding based on known list or random scatter near equator if unknown
          let coords = mockCoordinates[loc.name] || [Math.random() * 360 - 180, Math.random() * 90 - 45];
          
          const [x, y] = projection(coords) || [0, 0];

          svg.append("circle")
              .attr("cx", x)
              .attr("cy", y)
              .attr("r", 4 + Math.min(loc.count, 10))
              .style("fill", "rgba(239, 68, 68, 0.6)")
              .attr("stroke", "#fff")
              .attr("stroke-width", 1)
              .append("title")
              .text(`${loc.name}: ${loc.count} births`);
      });

      // Zoom
      const zoom = d3.zoom()
          .scaleExtent([1, 8])
          .on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => { // Explicitly type event
              svg.selectAll('g').attr("transform", event.transform);
              svg.selectAll('circle').attr("transform", event.transform);
          });
      svg.call(zoom as any);

  }, [geoData, locations]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800 dark:text-white">
              <Globe className="w-5 h-5 text-blue-500"/> {t.geography}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 min-h-[400px] flex items-center justify-center overflow-hidden relative">
            {loading && <Loader2 className="w-8 h-8 animate-spin text-blue-500 absolute" />}
            <svg ref={svgRef} width="100%" height="450" className="w-full h-full cursor-move"></svg>
            <div className="absolute bottom-4 left-4 bg-white/80 dark:bg-gray-800/80 p-3 rounded-lg text-xs backdrop-blur border border-gray-200 dark:border-gray-700 max-w-xs max-h-40 overflow-y-auto">
                <h4 className="font-bold mb-2 flex items-center gap-1"><MapPin className="w-3 h-3"/> Top Locations</h4>
                {locations.slice(0, 5).map(l => (
                    <div key={l.name} className="flex justify-between gap-4 mb-1">
                        <span>{l.name}</span>
                        <span className="font-bold text-blue-600">{l.count}</span>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};