import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/p/$agency_slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.agency_slug} · Portal` },
      { name: "description", content: "Portal público da agência" },
    ],
  }),
  component: Layout,
});

function Layout() {
  const { agency_slug } = Route.useParams();
  
  const q = useQuery({
    queryKey: ["portal-layout", agency_slug],
    queryFn: async () => {
      const { data: agency } = await supabase.rpc("get_public_agency_by_slug", { _slug: agency_slug as string }).maybeSingle();
      if (!agency) return { agency: null, pages: [] };
      
      const { data: pages } = await supabase
        .from("portal_pages")
        .select("slug, title")
        .eq("agency_id", agency.id)
        .eq("is_published", true)
        .order("created_at");
        
      return { agency: agency as any, pages: pages as any[] };
    },
  });

  if (q.isLoading) return <div className="p-10 text-center text-sm text-muted-foreground">Carregando…</div>;
  if (!q.data?.agency) return <div className="p-10 text-center text-sm">Agência não encontrada</div>;
  
  const { agency, pages } = q.data;

  return (
    <div 
      className="min-h-screen bg-background flex flex-col" 
      style={{ "--color-brand": agency.brand_color, "--color-brand-foreground": agency.brand_color_fg } as React.CSSProperties}
    >
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/p/$agency_slug" params={{ agency_slug }} className="flex items-center gap-3">
            {agency.logo_url && <img src={agency.logo_url} alt={agency.name} className="h-8 w-8 rounded-md object-cover" />}
            <span className="font-bold tracking-tight">{agency.name}</span>
          </Link>
          
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link to="/p/$agency_slug" params={{ agency_slug }} className="hover:text-brand transition-colors" activeProps={{ className: "text-brand" }} activeOptions={{ exact: true }}>Home</Link>
            
            {pages.map(p => {
              if (p.slug === 'home') return null; // Home is handled above
              return (
                <Link 
                  key={p.slug} 
                  to="/p/$agency_slug/$page_slug" 
                  params={{ agency_slug, page_slug: p.slug }} 
                  className="hover:text-brand transition-colors"
                  activeProps={{ className: "text-brand" }}
                >
                  {p.title}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-surface py-12 mt-auto">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {agency.name}. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
