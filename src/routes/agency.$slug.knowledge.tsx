import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Plus, BookOpen, Edit2, Eye, Search, Workflow, ClipboardList, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
;
import { PageHeader, EmptyState, ModuleActionButton } from "@/components/shell/PageHeader";
import { Field } from "@/components/ui/field";
import { FormInput as Input } from "@/components/ui/input";
import { FormTextarea as Textarea } from "@/components/ui/textarea";
import { SimpleSheet as Sheet, SheetPage } from "@/components/ui/sheet";
import { PrimaryButton, GhostButton , Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { RichTextEditor } from "@/components/ui/RichTextEditor";

export const Route = createFileRoute("/agency/$slug/knowledge")({
  head: ({ context }: any) => ({ meta: [{ title: `Base de conhecimento · ${context?.brand?.platform_name || 'Turis'}` }] }),
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
  const [tab, setTab] = useState<"articles" | "playbooks">("articles");

  // Playbook states
  const [playbookOpen, setPlaybookOpen] = useState(false);
  const [viewingPlaybook, setViewingPlaybook] = useState<any | null>(null);
  const [editingPlaybook, setEditingPlaybook] = useState<any | null>(null);

  const q = useQuery({
    enabled: !!agency && tab === "articles",
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

  const playbooksQ = useQuery({
    enabled: !!agency && tab === "playbooks",
    queryKey: ["playbooks", agency?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("knowledge_playbooks")
        .select("*, steps:knowledge_playbook_steps(*)");
      if (error) throw error;

      // Sort steps for each playbook
      return (data || []).map((pb: any) => ({
        ...pb,
        steps: [...(pb.steps || [])].sort((a: any, b: any) => a.step_number - b.step_number),
      }));
    },
  });

  const filtered = (q.data ?? []).filter(
    (a) =>
      !search ||
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      (a.tags ?? []).some((t) => t.toLowerCase().includes(search.toLowerCase())),
  );

  const filteredPlaybooks = (playbooksQ.data ?? []).filter(
    (p: any) =>
      !search ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.category?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
              <PageHeader
          title="Base de Conhecimento"
          search={{
            value: search,
            onChange: setSearch,
            placeholder: "Buscar..."
          }}
          filters={[
            { label: "Guias", value: "articles" },
            { label: "Playbooks", value: "playbooks" },
          ]}
          activeFilter={tab}
          onFilterChange={(v) => setTab(v as any)}
          primaryAction={
            <ModuleActionButton
        label={tab === "articles" ? "Novo Artigo" : "Novo Playbook"}
        icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => tab === "articles" ? setOpen(true) : setPlaybookOpen(true)}
            />
          }
        />

      {/* ARTICLES TAB */}
      {tab === "articles" && (
        <div className="flex-1 min-h-0 page-content page-section dock-offset">
          {q.isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}
          {filtered.length === 0 && !q.isLoading && (
            <EmptyState
              title="Sem artigos"
              description="Documente procedimentos e guias para o time."
            />
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-12">
            {filtered.map((a: any) => (
              <Button
                key={a.id}
                onClick={() => setViewing(a)}
                className="group rounded-[var(--radius-card)] border-none glass-card border-none p-5 text-left transition-all hover:border-brand/40 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="ds-meta font-semibold text-brand tracking-widest uppercase">
                      {a.is_internal ? "Interno" : "Público"}
                    </span>
                    {a.ai_generated_at && (
                      <span className="flex items-center gap-1 text-[9px] font-bold text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded-full">
                        <Plus className="w-2.5 h-2.5" /> IA
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-foreground text-sm leading-snug group-hover:text-brand transition-colors mb-2">
                    {a.title}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-3 mb-4 leading-relaxed">
                    {a.summary || "Sem sumário disponível."}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border/40 ds-meta font-bold text-muted-foreground uppercase tracking-wider mt-auto">
                  {a.category ?? "Geral"}
                  {!a.is_internal && (
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {a.views ?? 0}
                    </span>
                  )}
                </div>
                {a.tags?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {a.tags.map((t: string) => (
                      <span key={t} className="rounded glass bg-white/5 border-white/10 px-1.5 py-0.5 ds-meta">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* PLAYBOOKS TAB */}
      {tab === "playbooks" && (
        <div className="flex-1 min-h-0 page-content page-section dock-offset">
          {playbooksQ.isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}
          {filteredPlaybooks.length === 0 && !playbooksQ.isLoading && (
            <EmptyState
              title="Sem playbooks"
              description="Crie manuais de processos diários com fluxos automatizados de IA."
            />
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredPlaybooks.map((pb: any) => (
              <Button
                key={pb.id}
                onClick={() => setViewingPlaybook(pb)}
                className="group rounded-[var(--radius-card)] border-none glass-card border-none p-5 text-left transition-all hover:border-brand/40 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <Workflow className="h-4 w-4 text-brand" />
                    <span className="ds-meta bg-brand/10 text-brand px-1.5 py-0.5 rounded font-semibold uppercase">
                      {pb.category || "Geral"}
                    </span>
                  </div>
                  <div className="mt-2 font-bold text-sm text-foreground flex items-center justify-between gap-2">
                    {pb.title}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingPlaybook(pb);
                        }}
                        className="p-1 hover:glass bg-white/5 border-white/10 rounded text-muted-foreground cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                    {pb.description}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between ds-meta text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <ClipboardList className="w-3.5 h-3.5 text-muted-foreground" />
                    {pb.steps?.length || 0} etapas definidas
                  </span>
                </div>
              </Button>
            ))}
          </div>
        </div>
      )}

      {viewing && (
        <SheetPage isOpen={true} onClose={() => setViewing(null)} title={viewing.title} width="clamp(480px, 45vw, 720px)">
          <div className="whitespace-pre-wrap text-sm px-6 py-5">
            {viewing.content ?? <span className="text-muted-foreground">Sem conteúdo.</span>}
          </div>
        </SheetPage>
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

      {viewingPlaybook && (
        <SheetPage isOpen={true} onClose={() => setViewingPlaybook(null)} title={viewingPlaybook.title} width="clamp(480px, 45vw, 720px)">
          <div className="space-y-4 py-2 px-6">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {viewingPlaybook.description}
            </p>
            <div className="mt-6 space-y-4">
              <h4 className="ds-label-caps tracking-wider text-muted-foreground">
                Fluxo de Etapas
              </h4>
              {viewingPlaybook.steps?.length > 0 ? (
                <div className="space-y-3 pl-2 border-l-2 border-brand/20">
                  {viewingPlaybook.steps.map((st: any, idx: number) => (
                    <div key={st.id || idx} className="relative pl-6 pb-2">
                      <div className="absolute -left-[17px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-brand-foreground ds-meta font-bold">
                        {st.step_number}
                      </div>
                      <div className="font-semibold text-sm text-foreground">{st.title}</div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                        {st.description}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground italic">
                  Nenhuma etapa definida neste playbook.
                </div>
              )}
            </div>
          </div>
        </SheetPage>
      )}

      {(playbookOpen || editingPlaybook) && agency && (
        <PlaybookSheet
          agencyId={agency.id}
          initialData={editingPlaybook}
          onClose={() => {
            setPlaybookOpen(false);
            setEditingPlaybook(null);
          }}
          onSaved={() => {
            setPlaybookOpen(false);
            setEditingPlaybook(null);
            qc.invalidateQueries({ queryKey: ["playbooks", agency.id] });
          }}
        />
      )}
    </div>
  );
}

function PlaybookSheet({
  agencyId,
  initialData,
  onClose,
  onSaved,
}: {
  agencyId: string;
  initialData: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [category, setCategory] = useState(initialData?.category ?? "");
  const [steps, setSteps] = useState<any[]>(
    initialData?.steps ? [...initialData.steps] : [{ step_number: 1, title: "", description: "" }],
  );
  const [submitting, setSubmitting] = useState(false);

  const addStep = () => {
    setSteps([...steps, { step_number: steps.length + 1, title: "", description: "" }]);
  };

  const removeStep = (idx: number) => {
    const next = steps.filter((_, i) => i !== idx).map((st, i) => ({ ...st, step_number: i + 1 }));
    setSteps(next);
  };

  const updateStep = (idx: number, field: string, val: string) => {
    const next = steps.map((st, i) => (i === idx ? { ...st, [field]: val } : st));
    setSteps(next);
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return toast.error("O título é obrigatório");

    setSubmitting(true);
    try {
      // Tentar salvar no banco
      const payload = {
        agency_id: agencyId,
        title: title.trim(),
        description: description.trim() || null,
        category: category.trim() || "Geral",
      };

      let pbId = initialData?.id;

      const { data: pb, error: pbErr } = initialData
        ? await (supabase
            .from("knowledge_playbooks" as any)
            .update(payload)
            .eq("id", initialData.id)
            .select("id")
            .single() as any)
        : await (supabase
            .from("knowledge_playbooks" as any)
            .insert(payload)
            .select("id")
            .single() as any);

      if (pbErr) throw pbErr;
      if (pb) pbId = pb.id;

      // Se salvou com sucesso, atualizar etapas
      if (pbId) {
        // Apagar etapas antigas
        await supabase
          .from("knowledge_playbook_steps" as any)
          .delete()
          .eq("playbook_id", pbId);

        // Inserir etapas novas
        const stepsPayload = steps
          .filter((st) => st.title.trim())
          .map((st) => ({
            playbook_id: pbId,
            step_number: st.step_number,
            title: st.title.trim(),
            description: st.description.trim() || null,
          }));

        if (stepsPayload.length > 0) {
          const { error: stepsErr } = await supabase
            .from("knowledge_playbook_steps" as any)
            .insert(stepsPayload);
          if (stepsErr) throw stepsErr;
        }
      }

      toast.info(initialData ? "Playbook atualizado com sucesso" : "Playbook criado com sucesso");
      onSaved();
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao salvar playbook");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SheetPage
      isOpen={true}
      onClose={onClose}
      title={initialData ? "Editar Playbook" : "Novo Playbook"}
      width="clamp(480px, 45vw, 720px)"
      contentClassName="flex-1 overflow-y-auto px-6 py-5 no-scrollbar"
    >
      <div className="flex h-full flex-col">
        <form id="playbook-form" onSubmit={submit} className="space-y-4">
            <Field label="Título do Playbook *">
              <Input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Cancelamento ViagensPromo ou Roteiro Premium"
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Categoria">
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ex: Cancelamentos, Operações"
                />
              </Field>
              <div className="flex items-end pb-1">
                <span className="ds-meta text-muted-foreground glass bg-white/5 border-white/10 border-none rounded px-2 py-1 leading-normal">
                  Dica: Playbooks ajudam a IA a responder o cliente com base nos playbooks do dia a
                  dia da agência.
                </span>
              </div>
            </div>

            <Field label="Descrição Geral">
              <Textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Uma breve introdução sobre o que é tratado nesse fluxo..."
              />
            </Field>

            <div className="pt-4 border-t border-border mt-4">
              <div className="flex items-center justify-between mb-4">
                <label className="text-sm font-bold text-foreground">Etapas do Processo</label>
                <GhostButton
                  type="button"
                  onClick={addStep}
                  className="h-8 text-xs font-bold cursor-pointer"
                >
                  + Adicionar Etapa
                </GhostButton>
              </div>

              <div className="space-y-4">
                {steps.map((st, idx) => (
                  <div
                    key={idx}
                    className="glass bg-white/5 border-white/10/40 border-none rounded-[var(--radius-card)] p-4 relative space-y-3"
                  >
                    <Button
                      type="button"
                      onClick={() => removeStep(idx)}
                      disabled={steps.length === 1}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-30 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>

                    <div className="flex items-center gap-3">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-brand-foreground text-xs font-bold">
                        {st.step_number}
                      </div>
                      <Input
                        type="text"
                        required
                        value={st.title}
                        onChange={(e) => updateStep(idx, "title", e.target.value)}
                        placeholder={`Título da Etapa ${st.step_number} (ex: Solicitar Multa)`}
                        className="flex-1 rounded-full border-none glass-card border-none px-2.5 focus:border-border-strong"
                      />
                    </div>

                    <Textarea
                      rows={2}
                      value={st.description}
                      onChange={(e) => updateStep(idx, "description", e.target.value)}
                      placeholder="Instruções e playbooks específicos para esta etapa..."
                      className="w-full rounded-full border-none glass-card border-none px-2.5 py-1.5 focus:border-border-strong resize-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          </form>
        </div>

        <div className="border-t border-border px-6 py-4 flex items-center justify-end gap-2">
          <GhostButton type="button" onClick={onClose}>
            Cancelar
          </GhostButton>
          <PrimaryButton type="submit" form="playbook-form" disabled={submitting}>
            {submitting ? "Salvando…" : initialData ? "Salvar alterações" : "Criar Playbook"}
          </PrimaryButton>
        </div>
    </SheetPage>
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
    <SheetPage
      isOpen={true}
      onClose={onClose}
      title={initialData ? "Editar Artigo" : "Novo Artigo"}
      width="clamp(480px, 45vw, 720px)"
      contentClassName="flex-1 overflow-y-auto px-6 py-5 no-scrollbar"
    >
      <div className="flex h-full flex-col">
        {previewUrl && (
          <div className="mb-4 flex justify-end">
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="flex h-8 w-max items-center gap-1.5 rounded-full border-none px-3 text-xs font-medium hover:glass bg-white/5 border-white/10 transition-colors"
            >
              Ver publicado
            </a>
          </div>
        )}
        <form id="article-form" onSubmit={submit} className="space-y-4">
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

            <div className="rounded-[var(--radius-card)] border-none p-4 glass bg-white/5 border-white/10/50 space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-foreground">Conteúdo</label>
                <div className="flex glass-card border-none rounded-full p-1 border-none">
                  <Button
                    type="button"
                    onClick={() => setEditorMode("simple")}
                    className={`px-3 py-1 text-xs font-semibold rounded-full ${editorMode === "simple" ? "bg-foreground text-background" : "text-muted-foreground"}`}
                  >
                    Simples
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setEditorMode("advanced")}
                    className={`px-3 py-1 text-xs font-semibold rounded-full ${editorMode === "advanced" ? "bg-foreground text-background" : "text-muted-foreground"}`}
                  >
                    Avançado
                  </Button>
                </div>
              </div>

              {editorMode === "simple" ? (
                <Textarea
                  rows={8}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="font-medium leading-relaxed"
                />
              ) : (
                <RichTextEditor value={content} onChange={setContent} />
              )}
            </div>

            <div className="pt-4 border-t border-border mt-4">
              <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer">
                <Input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => setIsInternal(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                Artigo apenas para uso interno (Agência)
              </label>
              <p className="ds-meta text-muted-foreground mt-1 ml-6">
                Se desmarcado, o artigo ficará disponível publicamente no portal do cliente (Base de
                Conhecimento).
              </p>
            </div>
          </form>
        <div className="border-t border-border px-6 py-4 flex items-center justify-end gap-2 mt-auto">
          <GhostButton type="button" onClick={onClose}>
            Cancelar
          </GhostButton>
          <PrimaryButton type="submit" form="article-form" disabled={submitting}>
            {submitting ? "Salvando…" : initialData ? "Salvar alterações" : "Criar artigo"}
          </PrimaryButton>
        </div>
      </div>
    </SheetPage>
  );
}
