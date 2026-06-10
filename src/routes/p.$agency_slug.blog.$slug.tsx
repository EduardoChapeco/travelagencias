import { createFileRoute } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Clock, Eye, Send, Share2 } from "lucide-react";
import DOMPurify from "isomorphic-dompurify";
import { fmtDate } from "@/components/ui/form";
import { useState } from "react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

export const Route = createFileRoute("/p/$agency_slug/blog/$slug")({
  loader: async ({ params: { agency_slug, slug } }) => {
    const { data: agency } = await supabase.rpc("get_public_agency_by_slug", { _slug: agency_slug }).maybeSingle();
    if (!agency) return { agency: null, post: null };
    
    const { data: post } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("agency_id", agency.id)
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();
      
    if (post) {
      // Background views increment
      supabase.rpc("increment_post_views", { p_post_id: post.id }).then();
    }
    
    return { agency: agency as any, post: post as any };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData?.post) return { meta: [{ title: `${params.slug} · Blog` }] };
    const { post, agency } = loaderData;
    
    const title = `${post.title} | ${agency.name}`;
    const desc = post.excerpt || `Leia ${post.title} no blog da ${agency.name}`;
    const url = `https://travelos.com/p/${agency.slug}/blog/${post.slug}`;
    const image = post.cover_image_url || agency.logo_url;

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": post.title,
      "image": image ? [image] : [],
      "datePublished": post.published_at,
      "dateModified": post.updated_at || post.published_at,
      "author": [{
          "@type": "Organization",
          "name": agency.name,
          "url": `https://travelos.com/p/${agency.slug}`
      }],
      "description": desc
    };

    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:image", content: image },
        { property: "og:type", content: "article" },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(jsonLd),
        }
      ]
    };
  },
  component: PublicBlogPage,
});

function PublicBlogPage() {
  const { agency_slug } = Route.useParams();
  const { agency, post } = Route.useLoaderData();

  if (!post) return <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
    <div className="text-4xl mb-4">📭</div>
    <h2 className="text-xl font-bold tracking-tight mb-2">Artigo não encontrado</h2>
    <p className="text-muted-foreground text-sm">Este conteúdo pode ter sido movido ou removido pela agência.</p>
  </div>;

  // Renderizador inteligente: Se tem HTML, faz sanitize. Se é plain-text, transforma \n em br.
  const isHtml = post.content && /<[a-z][\s\S]*>/i.test(post.content);
  const renderContent = () => {
    if (!post.content) return null;
    if (isHtml) {
      return <div 
        className="prose prose-lg prose-headings:font-bold prose-headings:tracking-tight prose-a:text-brand prose-p:leading-relaxed dark:prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }}
      />;
    }
    return (
      <div className="text-lg leading-relaxed text-foreground/90 whitespace-pre-wrap font-medium">
        {post.content}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header Minimalista */}
      <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href={\`/p/\${agency_slug}\`} className="flex items-center gap-2 text-foreground font-bold hover:opacity-80 transition-opacity">
            <ArrowLeft className="w-4 h-4" /> 
            <div className="w-6 h-6 rounded bg-foreground text-background flex items-center justify-center text-[10px] uppercase tracking-widest">{agency.name.charAt(0)}</div>
            <span className="hidden sm:inline text-sm">{agency.name}</span>
          </a>
          <div className="flex items-center gap-3">
            <button onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast.success("Link copiado para compartilhar!");
            }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border text-xs font-bold hover:bg-surface transition-colors">
              <Share2 className="w-3 h-3" /> Compartilhar
            </button>
            <a href="#fale-conosco" className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-foreground text-background text-xs font-bold hover:opacity-90 transition-opacity">
              Viajar com a Agência
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 lg:py-20">
        <article>
          {/* Post Header */}
          <div className="mb-10 text-center">
            {post.category && (
              <span className="inline-block px-3 py-1 mb-6 text-[10px] font-black uppercase tracking-widest text-brand bg-brand/10 rounded-full">
                {post.category}
              </span>
            )}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] text-foreground mb-6">
              {post.title}
            </h1>
            {post.excerpt && (
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-medium">
                {post.excerpt}
              </p>
            )}
            
            <div className="flex items-center justify-center gap-4 mt-8 text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {post.published_at && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> {fmtDate(post.published_at)}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" /> {post.views} Leituras
              </span>
            </div>
          </div>

          {/* Cover Image */}
          {post.cover_image_url && (
            <div className="mb-12 rounded-3xl overflow-hidden bg-surface border border-border">
              <img src={post.cover_image_url} alt={post.title} className="w-full object-cover max-h-[60vh]" />
            </div>
          )}

          {/* Body Content */}
          <div className="mx-auto max-w-2xl">
            {renderContent()}

            {/* Tags */}
            {post.tags?.length > 0 && (
              <div className="mt-12 pt-6 border-t border-border flex flex-wrap gap-2">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mr-2 self-center">Assuntos:</span>
                {post.tags.map((t: string) => (
                  <span key={t} className="rounded-full bg-surface-alt px-3 py-1.5 text-xs font-semibold text-foreground">
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </article>
      </main>

      {/* Seção de Captura de Leads (Estilo Apple, grande e imersivo) */}
      <section id="fale-conosco" className="border-t border-border bg-surface-alt/50 pb-20 pt-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-foreground text-background rounded-[2.5rem] p-8 md:p-14 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand/20 rounded-full blur-3xl -ml-20 -mb-20"></div>
            
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4">Gostou deste destino?</h2>
                <p className="text-lg text-background/80 font-medium leading-relaxed mb-8">
                  Nossos consultores da <strong>{agency.name}</strong> são especialistas e podem montar um roteiro 100% personalizado para você, cuidando de cada detalhe.
                </p>
                <LeadCaptureForm agencyId={agency.id} origin={\`Blog: \${post.title}\`} />
              </div>
              <div className="hidden md:flex justify-center">
                 <div className="w-full aspect-square max-w-[280px] bg-white/5 rounded-full border border-white/10 flex items-center justify-center p-8">
                    <Send className="w-full h-full text-white/20 -rotate-12" />
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// Componente Isolado de Captura de Leads
function LeadCaptureForm({ agencyId, origin }: { agencyId: string; origin: string }) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [success, setSuccess] = useState(false);

  const submit = useMutation({
    mutationFn: async (e: React.FormEvent) => {
      e.preventDefault();
      const { error } = await supabase.rpc("submit_public_lead", {
        p_agency_id: agencyId,
        p_name: name,
        p_contact: contact,
        p_origin: origin
      });
      if (error) throw error;
    },
    onSuccess: () => setSuccess(true),
    onError: (e) => toast.error("Falha ao enviar: " + e.message)
  });

  if (success) {
    return (
      <div className="bg-success/20 border border-success/30 rounded-2xl p-6 text-success font-bold text-center">
        Recebemos seu contato! Um de nossos consultores vai te chamar em breve.
      </div>
    );
  }

  return (
    <form onSubmit={submit.mutate} className="space-y-3">
      <input 
        required 
        value={name} 
        onChange={e => setName(e.target.value)}
        placeholder="Seu nome" 
        className="w-full h-14 px-5 rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 outline-none focus:border-white/50 transition-colors"
      />
      <input 
        required 
        value={contact} 
        onChange={e => setContact(e.target.value)}
        placeholder="Seu WhatsApp ou E-mail" 
        className="w-full h-14 px-5 rounded-2xl bg-white/10 border border-white/20 text-white placeholder:text-white/40 outline-none focus:border-white/50 transition-colors"
      />
      <button 
        type="submit" 
        disabled={submit.isPending}
        className="w-full h-14 rounded-2xl bg-white text-black font-black uppercase tracking-wider hover:bg-white/90 transition-colors disabled:opacity-50 mt-2"
      >
        {submit.isPending ? "Enviando..." : "Quero Falar com um Consultor"}
      </button>
    </form>
  );
}
