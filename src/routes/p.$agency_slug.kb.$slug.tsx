import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchKbArticle, voteKbArticle } from "@/services/public";
import { ArrowLeft, BookOpen, Info, ThumbsUp, ThumbsDown } from "lucide-react";
import DOMPurify from "isomorphic-dompurify";
import { fmtDate } from "@/components/ui/form";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

export const Route = createFileRoute("/p/$agency_slug/kb/$slug")({
  head: ({ params }) => ({ meta: [{ title: `Ajuda: ${params.slug}` }] }),
  component: PublicKnowledgeArticle,
});

function PublicKnowledgeArticle() {
  const { agency_slug, slug } = Route.useParams();

  const q = useQuery({
    queryKey: ["kb-article", agency_slug, slug],
    queryFn: () => fetchKbArticle(agency_slug as string, slug as string),
  });

  if (q.isLoading) return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Carregando guia...</div>;
  if (!q.data?.article) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-surface">
      <Info className="w-12 h-12 text-muted-foreground mb-4" />
      <h2 className="text-xl font-bold tracking-tight mb-2">Artigo não encontrado</h2>
      <p className="text-muted-foreground text-sm max-w-md">
        Este guia pode ser de uso interno exclusivo ou foi removido pela agência.
      </p>
      <Link to={`/p/${agency_slug}` as any} className="mt-6 px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-semibold">
        Voltar para o Portal
      </Link>
    </div>
  );

  const { article, agency } = q.data;

  const isHtml = article.content && /<[a-z][\s\S]*>/i.test(article.content);
  const renderContent = () => {
    if (!article.content) return <p className="text-muted-foreground italic">Sem conteúdo.</p>;
    if (isHtml) {
      return <div 
        className="prose prose-base sm:prose-lg prose-headings:font-bold prose-a:text-brand dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(article.content) }}
      />;
    }
    return (
      <div className="text-base sm:text-lg leading-relaxed text-foreground/90 whitespace-pre-wrap font-medium">
        {article.content}
      </div>
    );
  };

  const [voted, setVoted] = useState<"up" | "down" | null>(null);

  const voteMutation = useMutation({
    mutationFn: async (isUpvote: boolean) => {
      await voteKbArticle(article.id, isUpvote);
    },
    onSuccess: (_, isUpvote) => {
      setVoted(isUpvote ? "up" : "down");
      toast.success("Obrigado pelo seu feedback!");
    },
    onError: () => toast.error("Erro ao enviar o voto")
  });

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-border bg-background sticky top-0 z-50">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to={`/p/${agency_slug}` as any} className="flex items-center gap-2 text-foreground font-semibold hover:text-brand transition-colors text-sm">
            <ArrowLeft className="w-4 h-4" /> 
            Central de Ajuda • {agency.name as string}
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 lg:py-16">
        <article className="bg-background border border-border rounded-3xl p-8 sm:p-12 ">
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

          <div className="mx-auto mt-8">
            {renderContent()}
          </div>

          {/* Votação */}
          <div className="mt-16 flex flex-col items-center justify-center p-8 bg-surface-alt/50 rounded-3xl border border-border">
            <h3 className="text-base font-bold mb-5 text-foreground">Este artigo foi útil?</h3>
            <div className="flex gap-4">
              <button 
                onClick={() => voteMutation.mutate(true)}
                disabled={voted !== null || voteMutation.isPending}
                className={`flex items-center gap-2 px-8 py-3 rounded-full border text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${voted === 'up' ? 'bg-success/20 text-success border-success/30' : 'border-border bg-surface hover:bg-surface-alt hover:border-brand/50'}`}
              >
                <ThumbsUp className="w-4 h-4" /> Sim, ajudou
              </button>
              <button 
                onClick={() => voteMutation.mutate(false)}
                disabled={voted !== null || voteMutation.isPending}
                className={`flex items-center gap-2 px-8 py-3 rounded-full border text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${voted === 'down' ? 'bg-destructive/20 text-destructive border-destructive/30' : 'border-border bg-surface hover:bg-surface-alt hover:border-brand/50'}`}
              >
                <ThumbsDown className="w-4 h-4" /> Não ajudou
              </button>
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
