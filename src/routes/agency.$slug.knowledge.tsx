import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, BookOpen, Edit2, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import {
  Field,
  Input,
  Textarea,
  PrimaryButton,
  GhostButton,
  Sheet,
  StatusBadge,
} from "@/components/ui/form";
import { RichTextEditor } from "@/components/ui/RichTextEditor";

export const Route = createFileRoute("/agency/$slug/knowledge")({
  head: () => ({ meta: [{ title: "Base de conhecimento · TravelOS" }] }),
  component: KnowledgePage,
});

type Article = {
  id: string;
  title: string;
  slug?: string;
  views?: number;
  category: string | null;
  is_internal: boolean;
  content: string | null;
  tags: string[];
};

function KnowledgePage() {
  const { agency } = useAgency();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<Article | null>(null);
  const [editing, setEditing] = useState<Article | null>(null);
  const [search, setSearch] = useState("");

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["knowledge", agency?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("knowledge_articles")
        .select("id, title, slug, views, category, is_internal, content, tags")
        .eq("agency_id", agency!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Article[];
    },
  });

  const filtered = (q.data ?? []).filter(
    (a) =>
      !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      (a.tags ?? []).some((t) => t.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <>
      <PageHeader
        title="Base de conhecimento"
        description="Procedimentos, fornecedores, regras internas e guias de destino."
        actions={
          <button
            onClick={() => setOpen(true)}
            className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Novo artigo
          </button>
        }
      />

      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por título ou tag"
          className="h-9 w-full max-w-sm rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-border-strong"
        />
      </div>

      {q.isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}
      {filtered.length === 0 && !q.isLoading && (
        <EmptyState
          title="Sem artigos"
          description="Documente procedimentos e guias para o time."
        />
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((a) => (
          <button
            key={a.id}
            onClick={() => setViewing(a)}
            className="rounded-lg border border-border bg-surface p-4 text-left hover:border-border-strong"
          >
            <div className="flex items-start justify-between gap-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <StatusBadge tone={a.is_internal ? "warning" : "info"}>
                {a.is_internal ? "interno" : "público"}
              </StatusBadge>
            </div>
            <div className="mt-2 font-semibold flex items-center justify-between gap-2">
              {a.title}
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditing(a);
                  }}
                  className="p-1 hover:bg-surface-alt rounded text-muted-foreground"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground flex items-center justify-between">
              {a.category ?? "Geral"}
              {!a.is_internal && (
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" /> {a.views ?? 0}
                </span>
              )}
            </div>
            {a.tags?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {a.tags.map((t) => (
                  <span key={t} className="rounded bg-surface-alt px-1.5 py-0.5 text-[10px]">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </button>
        ))}
      </div>

      {viewing && (
        <Sheet onClose={() => setViewing(null)} title={viewing.title}>
          <div className="whitespace-pre-wrap text-sm">
            {viewing.content ?? <span className="text-muted-foreground">Sem conteúdo.</span>}
          </div>
        </Sheet>
      )}

      {(open || editing) && agency && (
        <ArticleSheet
          agencyId={agency.id}
          agencySlug={agency.slug}
          initialData={editing}
          onClose={() => {
            setOpen(false);
            setEditing(null);
          }}
          onSaved={() => {
            setOpen(false);
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["knowledge", agency.id] });
          }}
        />
      )}
    </>
  );
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function ArticleSheet({
  agencyId,
  agencySlug,
  initialData,
  onClose,
  onSaved,
}: {
  agencyId: string;
  agencySlug: string;
  initialData: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [category, setCategory] = useState(initialData?.category ?? "");
  const [tags, setTags] = useState((initialData?.tags ?? []).join(", "));
  const [content, setContent] = useState(initialData?.content ?? "");
  const [isInternal, setIsInternal] = useState(initialData?.is_internal ?? true);
  const [submitting, setSubmitting] = useState(false);
  const [editorMode, setEditorMode] = useState<"simple" | "advanced">("simple");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { data: u } = await supabase.auth.getUser();

    const finalSlug = slug || slugify(title);

    const payload = {
      agency_id: agencyId,
      title,
      slug: finalSlug,
      category: category || null,
      tags: tags
        ? tags
            .split(",")
            .map((t: string) => t.trim())
            .filter(Boolean)
        : [],
      content,
      is_internal: isInternal,
    };

    const { error } = initialData
      ? await (supabase as any).from("knowledge_articles").update(payload).eq("id", initialData.id)
      : await (supabase as any)
          .from("knowledge_articles")
          .insert({ ...payload, created_by: u.user?.id ?? null });

    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success(initialData ? "Artigo atualizado" : "Artigo criado");
    onSaved();
  }

  const previewUrl =
    !isInternal && initialData?.slug
      ? `${window.location.origin}/p/${agencySlug}/kb/${initialData.slug}`
      : null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-overlay" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-2xl flex-col border-l border-border bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-base font-semibold tracking-tight">
            {initialData ? "Editar Artigo" : "Novo Artigo"}
          </h2>
          <div className="flex items-center gap-2">
            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-8 items-center gap-1.5 rounded-md border border-border px-2.5 text-xs font-medium hover:bg-surface-alt"
              >
                Ver publicado
              </a>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-surface-alt"
            >
              x
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <form id="kb-form" onSubmit={submit} className="space-y-4">
            <Field label="Título *">
              <Input required value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="URL (Slug)">
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder={slugify(title)}
                />
              </Field>
              <Field label="Categoria">
                <Input value={category} onChange={(e) => setCategory(e.target.value)} />
              </Field>
            </div>

            <Field label="Tags (separadas por vírgula)">
              <Input value={tags} onChange={(e) => setTags(e.target.value)} />
            </Field>

            <div className="rounded-xl border border-border p-4 bg-surface-alt/50 space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-foreground">Conteúdo</label>
                <div className="flex bg-surface rounded-full p-1 border border-border">
                  <button
                    type="button"
                    onClick={() => setEditorMode("simple")}
                    className={`px-3 py-1 text-xs font-semibold rounded-full ${editorMode === "simple" ? "bg-foreground text-background" : "text-muted-foreground"}`}
                  >
                    Simples
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditorMode("advanced")}
                    className={`px-3 py-1 text-xs font-semibold rounded-full ${editorMode === "advanced" ? "bg-foreground text-background" : "text-muted-foreground"}`}
                  >
                    Avançado
                  </button>
                </div>
              </div>

              {editorMode === "simple" ? (
                <Textarea
                  rows={8}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="font-medium text-sm leading-relaxed"
                />
              ) : (
                <RichTextEditor value={content} onChange={setContent} />
              )}
            </div>

            <div className="pt-4 border-t border-border mt-4">
              <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  className="w-4 h-4 rounded border-input"
                />
                Artigo apenas para uso interno (Agência)
              </label>
              <p className="text-[11px] text-muted-foreground mt-1 ml-6">
                Se desmarcado, o artigo ficará disponível publicamente no portal do cliente (Base de
                Conhecimento).
              </p>
            </div>
          </form>
        </div>

        <div className="border-t border-border px-6 py-4 flex items-center justify-end gap-2">
          <GhostButton type="button" onClick={onClose}>
            Cancelar
          </GhostButton>
          <PrimaryButton type="submit" form="kb-form" disabled={submitting}>
            {submitting ? "Salvando…" : initialData ? "Salvar alterações" : "Criar artigo"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
