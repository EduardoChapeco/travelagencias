import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Eye, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { Field, Input, Select, Textarea, PrimaryButton, GhostButton, Sheet, StatusBadge, fmtDate } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/portal/blog")({
  head: () => ({ meta: [{ title: "Blog · TravelOS" }] }),
  component: BlogPage,
});

type Post = { id: string; slug: string; title: string; excerpt: string | null; status: string; published_at: string | null; views: number; category: string | null };

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function BlogPage() {
  const { agency } = useAgency();
  const qc = useQueryClient();
  const [newOpen, setNewOpen] = useState(false);
  const [editing, setEditing] = useState<Post | null>(null);

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["blog", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, slug, title, excerpt, status, published_at, views, category")
        .eq("agency_id", agency!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Post[];
    },
  });

  return (
    <>
      <PageHeader
        title="Blog"
        description="Artigos para SEO e portal público."
        actions={
          <button onClick={() => setNewOpen(true)} className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground">
            <Plus className="h-3.5 w-3.5" /> Novo artigo
          </button>
        }
      />

      {q.isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}
      {q.data?.length === 0 && <EmptyState title="Sem artigos" description="Publique conteúdos para atrair tráfego orgânico." />}

      {q.data && q.data.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt/40 text-left text-[11px] uppercase text-muted-foreground">
              <tr><th className="px-3 py-2">Título</th><th className="px-3 py-2">Categoria</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Publicado</th><th className="px-3 py-2 text-right">Views</th></tr>
            </thead>
            <tbody>
              {q.data.map((p) => (
                <tr key={p.id} className="border-t border-border hover:bg-surface-alt/30">
                  <td className="px-3 py-2.5">
                    <button onClick={() => setEditing(p)} className="font-medium hover:underline text-left">{p.title}</button>
                    {p.excerpt && <div className="text-xs text-muted-foreground line-clamp-1">{p.excerpt}</div>}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{p.category ?? "—"}</td>
                  <td className="px-3 py-2.5"><StatusBadge tone={p.status === "published" ? "success" : p.status === "scheduled" ? "info" : "neutral"}>{p.status}</StatusBadge></td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">{fmtDate(p.published_at)}</td>
                  <td className="px-3 py-2.5 text-right text-xs font-mono">{p.views}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(newOpen || editing) && agency && (
        <BlogSheet
          agencyId={agency.id}
          post={editing}
          onClose={() => { setNewOpen(false); setEditing(null); }}
          onSaved={() => { setNewOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ["blog", agency.id] }); }}
        />
      )}
    </>
  );
}

function BlogSheet({ agencyId, post, onClose, onSaved }: { agencyId: string; post: Post | null; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState(post?.category ?? "");
  const [status, setStatus] = useState(post?.status ?? "draft");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      title, excerpt: excerpt || null, content: content || null, category: category || null,
      status, slug: slugify(title) + "-" + Math.random().toString(36).slice(2, 6),
      published_at: status === "published" ? new Date().toISOString() : null,
    };
    const { error } = post
      ? await supabase.from("blog_posts").update({ ...payload, slug: post.slug }).eq("id", post.id)
      : await supabase.from("blog_posts").insert({ ...payload, agency_id: agencyId });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success(post ? "Artigo atualizado" : "Artigo criado");
    onSaved();
  }

  return (
    <Sheet onClose={onClose} title={post ? "Editar artigo" : "Novo artigo"}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="Título *"><Input required value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <Field label="Resumo"><Textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} /></Field>
        <Field label="Conteúdo (markdown ou HTML)"><Textarea rows={10} value={content} onChange={(e) => setContent(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoria"><Input value={category} onChange={(e) => setCategory(e.target.value)} /></Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="draft">Rascunho</option>
              <option value="scheduled">Agendado</option>
              <option value="published">Publicado</option>
              <option value="archived">Arquivado</option>
            </Select>
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onClose}>Cancelar</GhostButton>
          <PrimaryButton type="submit" disabled={submitting}>{submitting ? "Salvando…" : "Salvar"}</PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}
