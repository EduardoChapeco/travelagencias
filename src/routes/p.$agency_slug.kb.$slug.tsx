import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchKbArticle, voteKbArticle } from "@/services/public";
import { ArrowLeft, BookOpen, Info, ThumbsUp, ThumbsDown } from "lucide-react";
import { sanitizeHtml } from "@/lib/sanitize";
import { fmtDate } from "@/lib/formatters";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/p/$agency_slug/kb/$slug")({
  head: ({ params }) => ({ meta: [{ title: `Ajuda: ${params.slug}` }] }),
  component: PublicKnowledgeArticle,
});

function PublicKnowledgeArticle() {
  const { agency_slug, slug } = Route.useParams();

  const [voted, setVoted] = useState<"up" | "down" | null>(null);

  const voteMutation = useMutation({
    mutationFn: async (vars: { articleId: string; isUpvote: boolean }) => {
      await voteKbArticle(vars.articleId, vars.isUpvote);
    },
    onSuccess: (_, vars) => {
      setVoted(vars.isUpvote ? "up" : "down");
      toast.success("Obrigado pelo seu feedback!");
    },
    onError: () => toast.error("Erro ao enviar o voto"),
  });

  const q = useQuery({
    queryKey: ["kb-article", agency_slug, slug],
    queryFn: () => fetchKbArticle(agency_slug as string, slug as string),
  });

  if (q.isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">
        Carregando guia...
      </div>
    );
  if (!q.data?.article)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center glass-card border-none">
        <Info className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-bold tracking-tight mb-2">Artigo não encontrado</h2>
        <p className="text-muted-foreground text-sm max-w-md">
          Este guia pode ser de uso interno exclusivo ou foi removido pela agência.
        </p>
        <Link
          to={`/p/${agency_slug}` as any}
          className="mt-6 px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-semibold"
        >
          Voltar para o Portal
        </Link>
      </div>
    );

  const { article, agency } = q.data;

  const isHtml = article.content && /<[a-z][\s\S]*>/i.test(article.content);
  const renderContent = () => {
    if (!article.content) return <p className="text-muted-foreground italic">Sem conteúdo.</p>;
    if (isHtml) {
      return (
        <div
          className="prose prose-base sm:prose-lg prose-headings:font-bold prose-a:text-brand dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content) }}
        />
      );
    }
    return (
      <div className="text-base sm:text-lg leading-relaxed text-foreground/90 whitespace-pre-wrap font-medium">
        {article.content}
      </div>
    );
  };

  return (
    <div className="min-h-screen glass-card border-none">
      <header className="border-b border-border bg-background sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link
            to={`/p/${agency_slug}` as any}
            className="flex items-center gap-2 text-foreground font-semibold hover:text-brand transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Central de Ajuda • {agency.name as string}
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 lg:py-16">
        <article className="bg-background border-none rounded-3xl p-8 sm:p-12 ">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  {article.category || "Guia Geral"}
                </span>
                <div className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                  Atualizado em {fmtDate(article.updated_at)}
                </div>
              </div>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground leading-[1.1]">
              {article.title}
            </h1>
          </div>

          <div className="mx-auto mt-8">{renderContent()}</div>

          {/* Votação */}
          <div className="mt-16 flex flex-col items-center justify-center p-8 glass bg-white/5 border-white/10/50 rounded-3xl border-none">
            <h3 className="text-base font-bold mb-5 text-foreground">Este artigo foi útil?</h3>
            <div className="flex gap-4">
              <Button
                onClick={() => voteMutation.mutate({ articleId: article.id, isUpvote: true })}
                disabled={voted !== null || voteMutation.isPending}
                className={`flex items-center gap-2 px-8 py-3 rounded-full border text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${voted === "up" ? "bg-success/20 text-success border-success/30" : "border-border glass-card border-none hover:glass bg-white/5 border-white/10 hover:border-brand/50"}`}
              >
                <ThumbsUp className="w-4 h-4" /> Sim, ajudou
              </Button>
              <Button
                onClick={() => voteMutation.mutate({ articleId: article.id, isUpvote: false })}
                disabled={voted !== null || voteMutation.isPending}
                className={`flex items-center gap-2 px-8 py-3 rounded-full border text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${voted === "down" ? "bg-destructive/20 text-destructive border-destructive/30" : "border-border glass-card border-none hover:glass bg-white/5 border-white/10 hover:border-brand/50"}`}
              >
                <ThumbsDown className="w-4 h-4" /> Não ajudou
              </Button>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-border flex justify-between items-center text-xs font-bold text-muted-foreground uppercase tracking-widest">
            <span className="flex items-center gap-2">
              <Info className="w-4 h-4" /> Material Oficial
            </span>
            <span>{agency.name as string}</span>
          </div>
        </article>
      </main>
    </div>
  );
}
