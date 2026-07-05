import { useState, useEffect, useCallback } from "react";
import { Search, Loader2, Check } from "lucide-react";
import { searchUnsplash, type UnsplashPhoto } from "@/services/proposals";
import { saveUnsplashImageToStorage } from "@/services/proposal-storage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

type Props = {
  agencyId: string;
  proposalId: string;
  slot: string;
  itemId?: string; // used if it's a specific hotel or tour
  onImageSelected: (url: string) => void;
  defaultQuery?: string;
};

export function StudioUnsplashPicker({
  agencyId,
  proposalId,
  slot,
  itemId,
  onImageSelected,
  defaultQuery = "travel destination",
}: Props) {
  const [query, setQuery] = useState(defaultQuery);
  const [photos, setPhotos] = useState<UnsplashPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!query) return;
    setLoading(true);
    try {
      const results = await searchUnsplash(query);
      setPhotos(results);
    } catch (e) {
      toast.error("Erro ao buscar imagens.");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    handleSearch();
  }, [handleSearch]);

  async function handleSelect(photo: UnsplashPhoto) {
    setSavingId(photo.id);
    try {
      const savedUrl = await saveUnsplashImageToStorage(
        agencyId,
        proposalId,
        slot,
        photo.url_full,
        itemId,
      );
      onImageSelected(savedUrl);
      toast.success("Imagem aplicada com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar imagem do Unsplash.");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4 h-[400px]">
      <div className="flex gap-2">
        <Input
          placeholder="Buscar no Unsplash..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="bg-surface/50"
        />
        <Button onClick={handleSearch} disabled={loading} size="icon" variant="secondary">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </Button>
      </div>

      <ScrollArea className="flex-1 -mx-2 px-2">
        {loading && photos.length === 0 ? (
          <div className="flex justify-center py-8 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Nenhuma imagem encontrada.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-4">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="group relative aspect-video cursor-pointer overflow-hidden rounded-md bg-muted"
                onClick={() => !savingId && handleSelect(photo)}
              >
                <img
                  src={photo.url_thumb}
                  alt={photo.alt}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />

                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                  <div className="flex justify-end">
                    <span className="text-[9px] text-white/80 font-medium">
                      📸 {photo.photographer}
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-white flex items-center justify-center h-6 w-full bg-primary/90 rounded-sm scale-95 opacity-0 group-hover:opacity-100 group-hover:scale-100 transition-all">
                    Usar Imagem
                  </span>
                </div>

                {savingId === photo.id && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center backdrop-blur-[2px]">
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
