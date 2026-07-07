import { useEffect, useState, useCallback } from "react";
import { Command } from "cmdk";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Search, User, Briefcase, FileText, Ticket, Compass } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";

// Estilos via CSS modules ou globais em index.css (usaremos tailwind e estilos customizados)

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { agency } = useAgency();
  const navigate = useNavigate();
  const { slug } = useParams({ strict: false });

  // Toggle command menu
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Fetch results from RPC
  useEffect(() => {
    if (!open || !search.trim() || !agency) {
      setResults([]);
      return;
    }

    let isStale = false;
    setLoading(true);

    const fetchResults = async () => {
      const { data, error } = await (supabase.rpc as any)("global_search", {
        p_agency_id: agency.id,
        p_term: search,
      });

      if (!isStale) {
        setLoading(false);
        if (!error && Array.isArray(data)) {
          setResults(data);
        }
      }
    };

    const timer = setTimeout(fetchResults, 300); // debounce 300ms
    return () => {
      isStale = true;
      clearTimeout(timer);
    };
  }, [search, open, agency]);

  const onSelect = useCallback(
    (item: any) => {
      setOpen(false);
      if (!slug) return;

      switch (item.type) {
        case "client":
          navigate({ to: "/agency/$slug/clients/$id", params: { slug, id: item.id } });
          break;
        case "lead":
          // Lead opens CRM maybe with filter or simply CRM
          navigate({ to: "/agency/$slug/crm", params: { slug } });
          break;
        case "trip":
          navigate({ to: "/agency/$slug/trips/$id", params: { slug, id: item.id } });
          break;
        case "ticket":
          navigate({ to: "/agency/$slug/support", params: { slug } });
          break;
      }
    },
    [navigate, slug],
  );

  const getIcon = (type: string) => {
    switch (type) {
      case "client":
        return <User className="h-4 w-4 mr-2 text-blue-500" />;
      case "lead":
        return <Briefcase className="h-4 w-4 mr-2 text-orange-500" />;
      case "trip":
        return <Compass className="h-4 w-4 mr-2 text-green-500" />;
      case "ticket":
        return <Ticket className="h-4 w-4 mr-2 text-red-500" />;
      default:
        return <FileText className="h-4 w-4 mr-2 text-muted-foreground" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "client":
        return "Cliente";
      case "lead":
        return "Oportunidade";
      case "trip":
        return "Viagem";
      case "ticket":
        return "Suporte";
      default:
        return "Registro";
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-background/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-surface border border-border rounded-[var(--radius-card)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Command
          label="Global Search"
          shouldFilter={false}
          className="flex flex-col w-full bg-transparent"
        >
          <div className="flex items-center border-b border-border px-4 py-3">
            <Search className="h-5 w-5 text-muted-foreground mr-3" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Buscar clientes, leads, viagens ou tickets..."
              className="flex-1 bg-transparent outline-none text-foreground text-lg placeholder:text-muted-foreground/60"
              autoFocus
            />
            {loading && (
              <div className="h-4 w-4 border-2 border-brand border-t-transparent rounded-full animate-spin ml-2"></div>
            )}
            <button
              onClick={() => setOpen(false)}
              className="ml-2 text-[10px] font-medium px-1.5 py-0.5 bg-surface-alt rounded text-muted-foreground border border-border hover:bg-border transition-colors"
            >
              ESC
            </button>
          </div>

          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            {!loading && search && results.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Nenhum resultado para "{search}".
              </div>
            )}
            {!search && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Comece a digitar para buscar na plataforma inteira.
              </div>
            )}

            {results.map((item) => (
              <Command.Item
                key={item.id}
                onSelect={() => onSelect(item)}
                className="flex items-center px-3 py-3 text-sm rounded-2xl cursor-pointer aria-selected:bg-surface-alt/80 aria-selected:text-foreground text-foreground/80 transition-colors"
              >
                {getIcon(item.type)}
                <div className="flex flex-col flex-1">
                  <span className="font-medium text-foreground">{item.title}</span>
                  {item.subtitle && (
                    <span className="text-xs text-muted-foreground">{item.subtitle}</span>
                  )}
                </div>
                <div className="text-[10px] font-semibold tracking-wider uppercase text-muted-foreground/50 ml-4">
                  {getTypeLabel(item.type)}
                </div>
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </div>

      {/* Background click listener */}
      <div className="absolute inset-0 z-[-1]" onClick={() => setOpen(false)} />
    </div>
  );
}
