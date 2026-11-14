import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapPin, Plane, Hotel, Car } from "lucide-react";

// Fix standard Leaflet icon issues in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

interface LocationItem {
  id: string;
  name: string;
  type: "flight" | "hotel" | "tour" | "transfer";
  lat?: number;
  lng?: number;
  description?: string;
}

interface MapItineraryProps {
  locations: LocationItem[];
  brandColor?: string;
}

// Custom hook to fit bounds automatically
function FitBounds({ locations }: { locations: LocationItem[] }) {
  const map = useMap();
  useEffect(() => {
    if (locations.length === 0) return;
    
    const validLocs = locations.filter(l => l.lat !== undefined && l.lng !== undefined);
    if (validLocs.length === 0) return;

    const bounds = L.latLngBounds(validLocs.map(l => [l.lat!, l.lng!]));
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
  }, [locations, map]);

  return null;
}

export function MapItinerary({ locations, brandColor = "#000000" }: MapItineraryProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <div className="w-full h-[400px] bg-muted animate-pulse rounded-xl flex items-center justify-center">Carregando Mapa...</div>;
  }

  const validLocations = locations.filter(l => l.lat !== undefined && l.lng !== undefined);
  
  if (validLocations.length === 0) {
    return (
      <div className="w-full h-[400px] bg-muted/30 rounded-xl flex flex-col items-center justify-center border border-dashed border-border p-6 text-center">
        <MapPin className="w-10 h-10 text-os-muted mb-3" />
        <h4 className="text-os font-semibold">Itinerário no Mapa Indisponível</h4>
        <p className="text-sm text-os-muted max-w-sm mt-1">
          Não foi possível encontrar as coordenadas geográficas dos locais do seu roteiro.
        </p>
      </div>
    );
  }

  // Define custom icons
  const createCustomIcon = (type: string, color: string) => {
    const html = `
      <div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1); border: 2px solid white;">
        ${type === "flight" ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.2-1.1.6L3 8l7 4-3 3-3-1-2 2 4.5 1.5L11 22l2-2-1-3 3-3 4 7l1.2-.7c.4-.2.7-.6.6-1.1Z"/></svg>' : ''}
        ${type === "hotel" ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 22v-6.57"/><path d="M12 11h.01"/><path d="M12 7h.01"/><path d="M14 15.43V22"/><path d="M15 16a5 5 0 0 0-6 0"/><path d="M16 11h.01"/><path d="M16 7h.01"/><path d="M8 11h.01"/><path d="M8 7h.01"/><rect x="4" y="2" width="16" height="20" rx="2"/></svg>' : ''}
        ${type === "tour" ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16.2 7.8l-2 6.3-6.4 2.1 2-6.3z"/></svg>' : ''}
        ${type === "transfer" ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="8" x="3" y="10" rx="2"/><path d="M7 10V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4"/><circle cx="8.5" cy="18" r="1.5"/><circle cx="15.5" cy="18" r="1.5"/></svg>' : ''}
      </div>
    `;

    return L.divIcon({
      html,
      className: "custom-leaflet-icon",
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16],
    });
  };

  // Build lines
  const coordinates = validLocations.map(l => [l.lat!, l.lng!] as [number, number]);

  return (
    <div className="w-full h-[500px] rounded-xl overflow-hidden shadow-sm border border-border relative z-0">
      <MapContainer 
        center={[-14.235, -51.925]} 
        zoom={4} 
        style={{ width: "100%", height: "100%", zIndex: 1 }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        
        {validLocations.map((loc, idx) => (
          <Marker 
            key={`${loc.id}-${idx}`} 
            position={[loc.lat!, loc.lng!]}
            icon={createCustomIcon(loc.type, brandColor)}
          >
            <Popup className="rounded-xl overflow-hidden font-sans border-none">
              <div className="p-1">
                <h4 className="font-bold text-sm text-os">{loc.name}</h4>
                {loc.description && <p className="text-xs text-os-muted mt-1">{loc.description}</p>}
              </div>
            </Popup>
          </Marker>
        ))}

        {coordinates.length > 1 && (
          <Polyline 
            positions={coordinates} 
            color={brandColor} 
            weight={3} 
            opacity={0.6} 
            dashArray="10, 10" 
            lineCap="round" 
            lineJoin="round" 
          />
        )}
        
        <FitBounds locations={validLocations} />
      </MapContainer>
    </div>
  );
}
