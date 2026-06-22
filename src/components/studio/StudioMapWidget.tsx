import { useState, useRef, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
// Note: leaflet-image doesn't have official types, so we ignore it
// @ts-ignore
import leafletImage from "leaflet-image";
import { Loader2, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { uploadProposalMedia } from "@/services/proposal-storage";

// Fix leaflet default icon issue
if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });
}

export type Waypoint = {
  id: string;
  lat: number;
  lng: number;
  label: string;
};

type Props = {
  agencyId: string;
  proposalId: string;
  waypoints?: Waypoint[];
  onMapCaptured: (url: string) => void;
  onWaypointsChange?: (waypoints: Waypoint[]) => void;
};

// Component to handle map center changes dynamically
function MapBoundsUpdater({ waypoints }: { waypoints: Waypoint[] }) {
  const map = useMap();
  useEffect(() => {
    if (waypoints.length > 0) {
      const bounds = L.latLngBounds(waypoints.map((w) => [w.lat, w.lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [waypoints, map]);
  return null;
}

export function StudioMapWidget({
  agencyId,
  proposalId,
  waypoints = [],
  onMapCaptured,
  onWaypointsChange,
}: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [localWaypoints, setLocalWaypoints] = useState<Waypoint[]>(waypoints);
  const [searchQuery, setSearchQuery] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [searching, setSearching] = useState(false);
  const mapRef = useRef<L.Map | null>(null);

  if (!mounted || typeof window === "undefined") {
    return (
      <div className="h-[400px] w-full rounded-md border bg-surface-alt/30 flex items-center justify-center text-muted-foreground text-sm">
        <Loader2 className="h-6 w-6 animate-spin text-brand/60 mr-2" />
        Carregando mapa interativo...
      </div>
    );
  }

  async function handleSearch() {
    if (!searchQuery) return;
    setSearching(true);
    try {
      // Nominatim free geocoding
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`,
      );
      const data = await res.json();

      if (data && data.length > 0) {
        const result = data[0];
        const newWp: Waypoint = {
          id: Date.now().toString(),
          lat: parseFloat(result.lat),
          lng: parseFloat(result.lon),
          label: result.display_name.split(",")[0],
        };
        const updated = [...localWaypoints, newWp];
        setLocalWaypoints(updated);
        setSearchQuery("");
        if (onWaypointsChange) onWaypointsChange(updated);
      } else {
        toast.error("Local não encontrado.");
      }
    } catch (e) {
      toast.error("Erro na busca de endereço.");
    } finally {
      setSearching(false);
    }
  }

  function removeWaypoint(id: string) {
    const updated = localWaypoints.filter((w) => w.id !== id);
    setLocalWaypoints(updated);
    if (onWaypointsChange) onWaypointsChange(updated);
  }

  async function captureMap() {
    if (!mapRef.current) return;
    setCapturing(true);
    try {
      // leaflet-image creates a canvas from the map tiles
      leafletImage(mapRef.current, async (err: any, canvas: HTMLCanvasElement) => {
        if (err) throw new Error("Erro na captura");

        canvas.toBlob(
          async (blob) => {
            if (!blob) throw new Error("Falha ao gerar blob da imagem");

            const file = new File([blob], `map_${Date.now()}.png`, { type: "image/png" });
            const url = await uploadProposalMedia(agencyId, proposalId, file, "map");
            onMapCaptured(url);
            toast.success("Mapa capturado e salvo com sucesso!");
            setCapturing(false);
          },
          "image/png",
          0.9,
        );
      });
    } catch (e) {
      toast.error("Falha ao capturar o mapa.");
      setCapturing(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Input
          placeholder="Buscar cidade, hotel ou ponto turístico..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />
        <Button onClick={handleSearch} disabled={searching} variant="secondary">
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Adicionar Ponto"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {localWaypoints.map((wp, i) => (
          <div
            key={wp.id}
            className="flex items-center gap-2 bg-secondary text-secondary-foreground text-xs px-3 py-1.5 rounded-full"
          >
            <span className="font-bold">{i + 1}.</span>
            <span className="truncate max-w-[150px]">{wp.label}</span>
            <button
              onClick={() => removeWaypoint(wp.id)}
              className="text-muted-foreground hover:text-red-500 ml-1"
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      <div className="relative h-[400px] w-full rounded-md border overflow-hidden">
        <MapContainer
          center={[0, 0]}
          zoom={2}
          style={{ height: "100%", width: "100%", zIndex: 0 }}
          ref={mapRef as any}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            crossOrigin="anonymous" // Essential for leaflet-image
          />

          <MapBoundsUpdater waypoints={localWaypoints} />

          {localWaypoints.map((wp, idx) => (
            <Marker key={wp.id} position={[wp.lat, wp.lng]}>
              <Popup>{wp.label}</Popup>
            </Marker>
          ))}

          {localWaypoints.length > 1 && (
            <Polyline
              positions={localWaypoints.map((w) => [w.lat, w.lng])}
              color="hsl(var(--primary))"
              weight={3}
              dashArray="5, 10"
            />
          )}
        </MapContainer>

        {capturing && (
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="bg-white p-4 rounded-full border border-border flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm font-medium">Capturando mapa em alta resolução...</span>
            </div>
          </div>
        )}
      </div>

      <Button
        onClick={captureMap}
        disabled={capturing || localWaypoints.length === 0}
        className="w-full"
      >
        <Camera className="mr-2 h-4 w-4" />
        {capturing ? "Processando..." : "Capturar Imagem HD do Mapa"}
      </Button>
    </div>
  );
}
