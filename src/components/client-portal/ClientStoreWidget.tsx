import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Store, ShoppingCart, ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function ClientStoreWidget({ agencyId, themeColor }: { agencyId: string; themeColor: string }) {
  const { data: tours, isLoading } = useQuery({
    queryKey: ["client-store-tours", agencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_tours")
        .select("id, title, cover_image_url, base_price, departure_date")
        .eq("agency_id", agencyId)
        .eq("status", "published") // Mostramos apenas excursões ativas/públicas
        .order("departure_date", { ascending: true })
        .limit(3);

      if (error) throw error;
      return data;
    },
    enabled: !!agencyId,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <h3 className="font-bold text-lg">Loja de Viagens</h3>
        <div className="w-full h-40 bg-surface border border-border rounded-[var(--radius-card)] animate-pulse"></div>
      </div>
    );
  }

  if (!tours || tours.length === 0) {
    return null; // Ocultar o widget se não há nada à venda
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-end">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <Store className="h-5 w-5" style={{ color: themeColor }} /> Ofertas Exclusivas
        </h3>
        {/* Placeholder para uma página de "Ver tudo" futura */}
        <span className="text-xs font-semibold cursor-pointer hover:underline" style={{ color: themeColor }}>
          Ver tudo
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tours.map((tour) => (
          <div key={tour.id} className="w-full bg-surface border border-border rounded-[var(--radius-card)] shadow-sm overflow-hidden flex flex-col hover:border-primary/50 transition-colors">
            <div className="flex-1 min-h-[140px] bg-accent relative">
              {tour.cover_image_url ? (
                <img src={tour.cover_image_url} alt={tour.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  Sem imagem
                </div>
              )}
              <span className="absolute top-2 right-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded font-bold backdrop-blur-sm">
                R$ {tour.base_price ? tour.base_price.toFixed(2) : "0,00"}
              </span>
            </div>
            
            <div className="p-3">
              <p className="font-semibold text-sm line-clamp-1">{tour.title}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Saída: {tour.departure_date ? new Date(tour.departure_date).toLocaleDateString() : "A definir"}
              </p>
              
              <button 
                className="w-full mt-3 h-8 rounded-full text-xs font-semibold flex items-center justify-center gap-2 transition-colors text-white hover:opacity-90"
                style={{ backgroundColor: themeColor }}
              >
                <ShoppingCart className="h-3 w-3" /> Comprar Agora
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
