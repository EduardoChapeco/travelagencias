import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

export interface RadarTraveler {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  status: string;
  country: string;
  type: "trip" | "flight";
}

const CITY_COORDINATES: Record<string, [number, number]> = {
  // Brasil
  "são paulo": [-23.5505, -46.6333],
  "sao paulo": [-23.5505, -46.6333],
  "rio de janeiro": [-22.9068, -43.1729],
  "brasilia": [-15.7801, -47.9292],
  "brasília": [-15.7801, -47.9292],
  "salvador": [-12.9714, -38.5014],
  "fortaleza": [-3.7319, -38.5267],
  "belo horizonte": [-19.9208, -43.9378],
  "manaus": [-3.1190, -60.0217],
  "curitiba": [-25.4290, -49.2671],
  "recife": [-8.0539, -34.8813],
  "porto alegre": [-30.0331, -51.2300],
  "gramado": [-29.3789, -50.8739],
  "natal": [-5.7945, -35.2110],
  "florianopolis": [-27.5954, -48.5480],
  "florianópolis": [-27.5954, -48.5480],
  "foz do iguacu": [-25.5469, -54.5882],
  "foz do iguaçu": [-25.5469, -54.5882],
  "balneario camboriu": [-26.9934, -48.6346],
  "balneário camboriú": [-26.9934, -48.6346],
  "noronha": [-3.8407, -32.4116],
  // Américas
  "orlando": [28.5383, -81.3792],
  "miami": [25.7617, -80.1918],
  "nova york": [40.7128, -74.0060],
  "new york": [40.7128, -74.0060],
  "cancun": [21.1619, -86.8515],
  "cancún": [21.1619, -86.8515],
  "punta cana": [18.5601, -68.3725],
  "buenos aires": [-34.6037, -58.3816],
  "santiago": [-33.4489, -70.6693],
  // Europa
  "paris": [48.8566, 2.3522],
  "roma": [41.9028, 12.4964],
  "lisboa": [38.7223, -9.1393],
  "porto": [41.1579, -8.6291],
  "madrid": [40.4168, -3.7038],
  "barcelona": [41.3851, 2.1734],
  "londres": [51.5074, -0.1278],
  "london": [51.5074, -0.1278],
  "berlim": [52.5200, 13.4050],
  "berlin": [52.5200, 13.4050],
  // Ásia/África/Outros
  "tokyo": [35.6762, 139.6503],
  "toquio": [35.6762, 139.6503],
  "tóquio": [35.6762, 139.6503],
  "dubai": [25.2048, 55.2708],
  "maldivas": [4.1755, 73.5093],
};

const COUNTRY_COORDINATES: Record<string, [number, number]> = {
  brazil: [-14.2350, -51.9253],
  brasil: [-14.2350, -51.9253],
  portugal: [39.3999, -8.2245],
  usa: [37.0902, -95.7129],
  "estados unidos": [37.0902, -95.7129],
  france: [46.2276, 2.2137],
  frança: [46.2276, 2.2137],
  italy: [41.8719, 12.5674],
  itália: [41.8719, 12.5674],
  spain: [40.4637, -3.7492],
  espanha: [40.4637, -3.7492],
  argentina: [-38.4161, -63.6167],
  chile: [-35.6751, -71.5430],
  uk: [55.3781, -3.4360],
  "reino unido": [55.3781, -3.4360],
  japan: [36.2048, 138.2529],
  japão: [36.2048, 138.2529],
  germany: [51.1657, 10.4515],
  alemanha: [51.1657, 10.4515],
  dubai: [25.2048, 55.2708],
  caribe: [25.0343, -77.3963],
  maldives: [4.1755, 73.5093],
};

function geocode(destination: string, country: string, id: string): [number, number] {
  const destClean = destination.toLowerCase().trim();
  const countryClean = country.toLowerCase().trim();

  // 1. Procurar correspondência exata ou parcial de cidade no dicionário
  for (const [cityName, coords] of Object.entries(CITY_COORDINATES)) {
    if (destClean.includes(cityName)) {
      return coords;
    }
  }

  // 2. Procurar correspondência de país se não achar cidade
  for (const [countryName, coords] of Object.entries(COUNTRY_COORDINATES)) {
    if (countryClean.includes(countryName) || destClean.includes(countryName)) {
      // Adicionar pequeno desvio pseudo-aleatório baseado no ID para espalhar múltiplos pins no mesmo país
      let hash = 0;
      for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
      }
      const latOffset = ((hash % 10) - 5) * 0.15;
      const lngOffset = (((hash >> 2) % 10) - 5) * 0.15;
      return [coords[0] + latOffset, coords[1] + lngOffset];
    }
  }

  // 3. Fallback mundial (Centro do Atlântico / Espalhado por hash)
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const lat = -20 + (Math.abs(hash) % 40);
  const lng = -40 + (Math.abs(hash >> 2) % 60);
  return [lat, lng];
}

function MapUpdater({ travelers }: { travelers: RadarTraveler[] }) {
  const map = useMap();

  useEffect(() => {
    if (travelers.length === 0) return;

    // Ajustar os limites do mapa para enquadrar todos os pins
    const points = travelers.map((t) => geocode(t.destination, t.country, t.id));
    const bounds = L.latLngBounds(points);
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 8 });
  }, [travelers, map]);

  return null;
}

const pulseIcon = (type: "trip" | "flight") =>
  L.divIcon({
    className: "custom-pulse-marker",
    html: `
      <div class="relative flex h-5 w-5 items-center justify-center">
        <span class="absolute inline-flex h-full w-full animate-ping rounded-full ${
          type === "flight" ? "bg-blue-500/60" : "bg-violet-500/60"
        } opacity-75"></span>
        <span class="relative inline-flex h-2.5 w-2.5 rounded-full ${
          type === "flight" ? "bg-blue-400 border border-white" : "bg-violet-400 border border-white"
        } shadow-lg shadow-black/50"></span>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });

export function RadarMapWidget({ travelers }: { travelers: RadarTraveler[] }) {
  return (
    <div className="w-full h-full min-h-[350px] relative rounded-[var(--radius-card)] overflow-hidden border border-slate-800">
      <MapContainer
        center={[0, 0]}
        zoom={2}
        className="w-full h-full bg-[#0a0c20]"
        scrollWheelZoom={true}
        zoomControl={false}
      >
        {/* Dark style tile layer optimized for dark modes / TV panels */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          crossOrigin="anonymous"
        />

        {travelers.map((t) => {
          const position = geocode(t.destination, t.country, t.id);
          return (
            <Marker key={t.id} position={position} icon={pulseIcon(t.type)}>
              <Popup className="custom-leaflet-popup">
                <div className="p-1 text-slate-200">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        t.type === "flight" ? "bg-blue-400" : "bg-violet-400"
                      }`}
                    />
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      {t.type === "flight" ? "Embarque Aéreo" : "Viagem Terrestre"}
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-white leading-tight mb-1">{t.name}</h4>
                  <div className="text-[10px] text-slate-300">
                    <span className="text-slate-500">Destino:</span> {t.destination} ({t.country})
                  </div>
                  {t.startDate && (
                    <div className="text-[9px] text-slate-400 mt-1 font-mono">
                      Início: {new Date(t.startDate).toLocaleDateString("pt-BR")}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}

        <MapUpdater travelers={travelers} />
      </MapContainer>
    </div>
  );
}
