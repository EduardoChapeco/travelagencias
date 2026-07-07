import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchPublicAgencyForKb, fetchKbArticles } from "@/services/public";
import { ArrowLeft, BookOpen, Search, HelpCircle, ChevronRight } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/p/$agency_slug/kb/")({
  head: () => ({ meta: [{ title: "Central de Ajuda" }] }),
  component: PublicKnowledgeBase,
});

function PublicKnowledgeBase() {
  const { agency_slug } = Route.useParams();
  const [search, setSearch] = useState("");

  const qAgency = useQuery({
    queryKey: ["public-agency", agency_slug],
    queryFn: () => fetchPublicAgencyForKb(agency_slug as string),
  });

  const qArticles = useQuery({
    enabled: !!qAgency.data?.id,
    queryKey: ["public-kb", qAgency.data?.id, search],
    queryFn: () => fetchKbArticles(qAgency.data!.id, search || undefined),
  });

  if (qAgency.isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Carregando...
      </div>
    );
  if (!qAgency.data) return <div className="p-10 text-center">Agência não encontrada</div>;

  const agency = qAgency.data;
  const articles = (qArticles.data as any[]) || [];

  // Agrupar por categoria se não estiver pesquisando
  const byCategory = search
    ? {}
    : (articles as any[]).reduce((acc: Record<string, any[]>, article: any) => {
        const cat = article.category || "Geral";
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(article);
        return acc;
      }, {});

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-border bg-background sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link
            to={`/p/${agency_slug}` as any}
            className="flex items-center gap-2 text-foreground font-semibold hover:text-brand transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar para {agency.name as string}
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-foreground text-background py-20 px-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-brand/10 opacity-20" />
        <div className="relative z-10 max-w-2xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            Como podemos ajudar?
          </h1>
          <p className="text-lg text-background/70 font-medium mb-8">
            Pesquise por passagens, vistos, bagagens, reembolsos e muito mais.
          </p>

          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Digite sua dúvida..."
              className="w-full h-14 pl-12 pr-6 rounded-full bg-background text-foreground text-lg placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-brand/50 transition-all border-none"
            />
          </div>
        </div>
      </section>

      <main className="max-w-4xl mx-auto px-6 py-16">
        {qArticles.isLoading && (
          <div className="text-center text-muted-foreground">Buscando artigos...</div>
        )}

        {search.trim() ? (
          <div>
            <h2 className="text-xl font-bold mb-6">
              Resultados para "{search}" ({articles.length})
            </h2>
            <div className="grid gap-4">
              {(articles as any[]).map((a: any) => (
                <Link
                  key={a.id}
                  to={`/p/${agency_slug}/kb/${a.slug}` as any}
                  className="flex items-center justify-between p-5 rounded-2xl bg-background border border-border hover:border-brand/50 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-surface-alt flex items-center justify-center group-hover:bg-brand/10 group-hover:text-brand transition-colors">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-base group-hover:text-brand transition-colors">
                        {a.title}
                      </h3>
                      {a.category && (
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          {a.category}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-brand transition-colors" />
                </Link>
              ))}
              {articles.length === 0 && (
                <div className="text-center py-10 bg-background rounded-2xl border border-border">
                  <HelpCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-foreground font-semibold">Nenhum artigo encontrado</p>
                  <p className="text-muted-foreground text-sm">
                    Tente usar outros termos para a busca.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid gap-10 md:grid-cols-2">
            {Object.keys(byCategory).map((cat) => (
              <div key={cat} className="space-y-4">
                <h3 className="text-lg font-black tracking-tight border-b border-border pb-2 flex items-center justify-between">
                  {cat}
                  <span className="text-xs font-semibold text-muted-foreground bg-surface-alt px-2 py-0.5 rounded-full">
                    {byCategory[cat].length}
                  </span>
                </h3>
                <div className="flex flex-col gap-2">
                  {byCategory[cat].slice(0, 5).map((a: any) => (
                    <Link
                      key={a.id}
                      to={`/p/${agency_slug}/kb/${a.slug}` as any}
                      className="flex items-center justify-between p-3 rounded-[var(--radius-card)] hover:bg-background border border-transparent hover:border-border transition-all group"
                    >
                      <span className="font-semibold text-sm group-hover:text-brand transition-colors">
                        {a.title}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  ))}
                  {byCategory[cat].length > 5 && (
                    <div className="px-3 py-2 text-xs font-bold text-brand cursor-pointer">
                      Ver todos de {cat} &rarr;
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
