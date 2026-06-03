import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import { Field, Input, Textarea, PrimaryButton, GhostButton, Sheet, StatusBadge } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/knowledge")({
  head: () => ({ meta: [{ title: "Base de conhecimento · TravelOS" }] }),
  component: KnowledgePage,
});

type Article = { id: string; title: string; category: string | null; is_internal: boolean; content: string | null; tags: string[] };

function KnowledgePage() {
  const { agency } = useAgency();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<Article | null>(null);
  const [search, setSearch] = useState("");

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["knowledge", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("knowledge_articles").select("id, title, category, is_internal, content, tags").eq("agency_id", agency!.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data as Article[];
    },
  });

  const filtered = (q.data ?? []).filter((a) => !search || a.title.toLowerCase().includes(search.toLowerCase()) || (a.tags ?? []).some((t) => t.toLowerCase().includes(search.toLowerCase())));

  return (
    <>
      <PageHeader
        title="Base de conhecimento"
        description="Procedimentos, fornecedores, regras internas e guias de destino."
        actions={
          <button onClick={() => setOpen(true)} className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground">
            <Plus className="h-3.5 w-3.5" /> Novo artigo
          </button>
        }
      />

      <div className="mb-4">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por título ou tag" className="h-9 w-full max-w-sm rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-border-strong" />
      </div>

      {q.isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}
      {filtered.length === 0 && !q.isLoading && <EmptyState title="Sem artigos" description="Documente procedimentos e guias para o time." />}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((a) => (
          <button key={a.id} onClick={() => setViewing(a)} className="rounded-lg border border-border bg-surface p-4 text-left hover:border-border-strong">
            <div className="flex items-start justify-between gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <StatusBadge tone={a.is_internal ? "warning" : "info"}>{a.is_internal ? "interno" : "público"}</StatusBadge>
            </div>
            <div className="mt-2 font-semibold">{a.title}</div>
            <div className="text-xs text-muted-foreground">{a.category ?? "Geral"}</div>
            {a.tags?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {a.tags.map((t) => <span key={t} className="rounded bg-surface-alt px-1.5 py-0.5 text-[10px]">{t}</span>)}
              </div>
            )}
          </button>
        ))}
      </div>

      {viewing && (
        <Sheet onClose={() => setViewing(null)} title={viewing.title}>
          <div className="whitespace-pre-wrap text-sm">{viewing.content ?? <span className="text-muted-foreground">Sem conteúdo.</span>}</div>
        </Sheet>
      )}

      {open && agency && <NewArticle agencyId={agency.id} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["knowledge", agency.id] }); }} />}
    </>
  );
}

function NewArticle({ agencyId, onClose, onCreated }: { agencyId: string; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [content, setContent] = useState("");
  const [isInternal, setIsInternal] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("knowledge_articles").insert({
      agency_id: agencyId, title, category: category || null,
      tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
      content, is_internal: isInternal, created_by: u.user?.id ?? null,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Artigo criado");
    onCreated();
  }

  return (
    <Sheet onClose={onClose} title="Novo artigo">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Título *"><Input required value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoria"><Input value={category} onChange={(e) => setCategory(e.target.value)} /></Field>
          <Field label="Tags (vírgula)"><Input value={tags} onChange={(e) => setTags(e.target.value)} /></Field>
        </div>
        <Field label="Conteúdo"><Textarea rows={10} value={content} onChange={(e) => setContent(e.target.value)} /></Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} /> Visível apenas internamente
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onClose}>Cancelar</GhostButton>
          <PrimaryButton type="submit" disabled={submitting}>{submitting ? "Salvando…" : "Criar artigo"}</PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}
