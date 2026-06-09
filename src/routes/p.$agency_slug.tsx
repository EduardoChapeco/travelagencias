import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/p/$agency_slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.agency_slug} · Portal` },
      { name: "description", content: "Portal público da agência" },
    ],
  }),
  component: Page,
});

function Page() {
  const { agency_slug } = Route.useParams();
  const q = useQuery({
    queryKey: ["portal", agency_slug],
    queryFn: async () => {
      const { data: agency } = await supabase.from("agencies").select("id, name, logo_url, brand_color, brand_color_fg").eq("slug", agency_slug).maybeSingle();
      if (!agency) return { agency: null, company: null, tours: [], posts: [], pages: [] };
      const [company, tours, posts, pages] = await Promise.all([
        supabase.from("company_profiles").select("*").eq("agency_id", agency.id).maybeSingle(),
        supabase.from("group_tours").select("id, slug, title, destination, cover_image_url, base_price, departure_date").eq("agency_id", agency.id).eq("is_public", true).in("status", ["open", "confirmed"]).order("departure_date").limit(6),
        supabase.from("blog_posts").select("id, slug, title, excerpt, cover_image_url, published_at").eq("agency_id", agency.id).eq("status", "published").order("published_at", { ascending: false }).limit(6),
        supabase.from("portal_pages").select("id, slug, title").eq("agency_id", agency.id).eq("is_published", true),
      ]);
      return { agency, company: company.data, tours: tours.data ?? [], posts: posts.data ?? [], pages: pages.data ?? [] };
    },
  });

  if (q.isLoading) return <div className="p-10 text-center text-sm text-muted-foreground">Carregando…</div>;
  if (!q.data?.agency) return <div className="p-10 text-center text-sm">Agência não encontrada</div>;
  const { agency, company, tours, posts } = q.data;

  return (
    <div className="min-h-screen bg-background" style={{ "--color-brand": agency.brand_color, "--color-brand-foreground": agency.brand_color_fg } as React.CSSProperties}>
      
      <header className="relative px-6 py-20 text-center bg-surface overflow-hidden">
        {/* Decorativo */}
        <div className="absolute inset-0 bg-brand/5 backdrop-blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center justify-center">
          {agency.logo_url && <img src={agency.logo_url} alt={agency.name} className="mb-6 h-24 w-24 rounded-2xl object-cover   ring-4 ring-surface" />}
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">{agency.name}</h1>
          {company?.short_description && <p className="mx-auto mt-4 max-w-xl text-muted-foreground font-medium">{company.short_description}</p>}
        </div>
      </header>

      <main className="space-y-16 px-6 py-16 text-foreground">
        {tours.length > 0 && (
          <section className="mx-auto max-w-5xl">
            <h2 className="mb-8 text-2xl font-bold tracking-tight">Próximas viagens em grupo</h2>
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
              {tours.map((t) => (
                <Link key={t.id} to="/p/$agency_slug/tour/$id" params={{ agency_slug, id: t.id }} className="group flex flex-col overflow-hidden rounded-2xl border-2 border-border/50 bg-surface  transition-all hover:-translate-y-1 hover:border-brand/40 hover: hover:">
                  <div className="relative aspect-video overflow-hidden">
                     {t.cover_image_url ? (
                       <img src={t.cover_image_url} alt={t.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                     ) : (
                       <div className="h-full w-full bg-surface-alt" />
                     )}
                     <div className="absolute bottom-3 right-3 rounded-md bg-background/90 px-2 py-1 text-xs font-bold  backdrop-blur-sm">
                        {t.departure_date ? new Date(t.departure_date).toLocaleDateString("pt-BR") : "A Confirmar"}
                     </div>
                  </div>
                  <div className="flex flex-col p-5 flex-1 justify-between">
                    <div>
                       <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-1">{t.destination}</div>
                       <h3 className="font-bold text-lg leading-tight mb-2 group-hover:text-brand transition-colors">{t.title}</h3>
                    </div>
                    <div className="mt-4 pt-4 border-t border-border/50">
                       <span className="text-[10px] uppercase text-muted-foreground font-bold">A partir de</span>
                       <div className="font-mono text-xl font-bold text-brand">{Number(t.base_price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
        {posts.length > 0 && (
          <section className="mx-auto max-w-5xl">
            <h2 className="mb-4 text-xl font-semibold tracking-tight">Blog</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {posts.map((p) => (
                <Link key={p.id} to="/p/$agency_slug/blog/$slug" params={{ agency_slug, slug: p.slug }} className="overflow-hidden rounded-lg border border-border bg-surface hover:border-border-strong">
                  {p.cover_image_url && <img src={p.cover_image_url} alt={p.title} className="aspect-video w-full object-cover" />}
                  <div className="p-3">
                    <div className="font-medium">{p.title}</div>
                    {p.excerpt && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.excerpt}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
        {company && (
          <section className="mx-auto max-w-3xl rounded-lg border border-border bg-surface p-6 text-sm">
            <h2 className="mb-3 text-lg font-semibold">Contato</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {company.email && <div>📧 {company.email}</div>}
              {company.phone && <div>📞 {company.phone}</div>}
              {company.whatsapp && <div>💬 WhatsApp: {company.whatsapp}</div>}
              {company.website && <div>🌐 <a href={company.website} className="underline">{company.website}</a></div>}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
