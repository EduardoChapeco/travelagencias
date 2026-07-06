import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Calendar, ArrowRight } from "lucide-react";
import { FilterBar } from "@/components/ui/filter-bar";
import { useState } from "react";
import { money } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/p/$agency_slug/loja/")({
  head: () => ({
    meta: [
      { title: "Nossa Loja" },
      { name: "description", content: "Vitrine de pacotes e grupos da agência" },
    ],
  }),
  component: PublicStoreIndex,
});

function PublicStoreIndex() {
  const { agency_slug } = Route.useParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeType, setActiveType] = useState("all");

  const { data: agencyData } = useQuery({
    queryKey: ["agency-id-from-slug", agency_slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("agencies")
        .select("id")
        .eq("slug", agency_slug)
        .single();
      return data;
    },
  });

  const agencyId = agencyData?.id;

  const { data: items, isLoading } = useQuery({
    queryKey: ["public-store-items", agencyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("public_store_items")
        .select("*")
        .eq("agency_id", agencyId!)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as any[];
    },
    enabled: !!agencyId,
  });

  const filteredItems = (items || []).filter((item) => {
    if (activeType !== "all" && item.item_type !== activeType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!item.title?.toLowerCase().includes(q) && !item.description?.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const groupsCount = items?.filter(i => i.item_type === 'group_tour').length || 0;
  const proposalsCount = items?.filter(i => i.item_type === 'proposal').length || 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 md:py-16">
      <div className="mb-12">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl mb-4">
          Nossas Viagens
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Explore nossos grupos de viagem e pacotes exclusivos preparados para você.
        </p>
      </div>

      <FilterBar
        options={[
          { label: "Todos", value: "all", count: items?.length || 0 },
          { label: "Grupos de Viagem", value: "group_tour", count: groupsCount },
          { label: "Pacotes Personalizados", value: "proposal", count: proposalsCount },
        ]}
        activeValue={activeType}
        onValueChange={setActiveType}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Buscar por destino ou pacote..."
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex flex-col space-y-3">
              <Skeleton className="h-48 w-full rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="bg-surface-alt rounded-full p-4 mb-4">
            <MapPin className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold text-foreground">Nenhuma viagem encontrada</h3>
          <p className="text-muted-foreground mt-2">
            Não encontramos nenhum pacote correspondente aos filtros selecionados.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredItems.map((item) => (
            <Link
              key={item.item_id}
              to="/p/$agency_slug/loja/$item_id"
              params={{ agency_slug, item_id: item.item_id }}
              search={{ type: item.item_type }}
              className="group flex flex-col bg-surface border border-border/60 rounded-2xl overflow-hidden hover:border-brand/50 transition-all duration-300 relative focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2"
            >
              {item.image_url ? (
                <div className="aspect-[4/3] w-full overflow-hidden bg-surface-muted relative">
                  <div className="absolute top-3 right-3 z-10 bg-background/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-bold text-foreground uppercase tracking-widest shadow-sm">
                    {item.item_type === "group_tour" ? "Grupo" : "Pacote"}
                  </div>
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              ) : (
                <div className="aspect-[4/3] w-full bg-surface-alt flex items-center justify-center text-muted-foreground/30 relative">
                  <div className="absolute top-3 right-3 z-10 bg-background/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-bold text-foreground uppercase tracking-widest shadow-sm">
                    {item.item_type === "group_tour" ? "Grupo" : "Pacote"}
                  </div>
                  <MapPin className="h-12 w-12" />
                </div>
              )}
              
              <div className="p-5 flex flex-col flex-1">
                <h3 className="text-lg font-bold text-foreground leading-tight mb-2 line-clamp-2">
                  {item.title}
                </h3>
                
                {item.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-4 flex-1">
                    {item.description}
                  </p>
                )}
                
                <div className="mt-auto pt-4 border-t border-border/40 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">A partir de</span>
                    <span className="text-lg font-black text-brand">
                      {item.price ? money(item.price) : "Sob consulta"}
                    </span>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-brand/5 flex items-center justify-center group-hover:bg-brand group-hover:text-brand-foreground transition-colors">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
