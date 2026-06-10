import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  GripVertical,
  Trash2,
  Edit2,
  X,
  ExternalLink,
  Globe,
  Copy,
  History,
  LayoutTemplate,
  Type,
  Image as ImageIcon,
  PhoneCall,
  ListPlus,
  Megaphone,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader, EmptyState } from "@/components/shell/PageHeader";
import {
  Field,
  Input,
  Select,
  Textarea,
  PrimaryButton,
  GhostButton,
  Sheet,
  StatusBadge,
} from "@/components/ui/form";
import { FileUploader } from "@/components/uploads/FileUploader";
import { MultiFileUploader } from "@/components/uploads/MultiFileUploader";
import { BlockRenderer } from "@/components/portal/BlockRenderer";
import { PortalBlock, PortalBlockType, BLOCK_DEFAULTS } from "@/lib/cms-types";
import { PortalBlockSchema } from "@/lib/cms-schemas";
import { AILandingPageModal } from "@/components/ui/AILandingPageModal";
import { PortalPagePayloadSchema } from "@/lib/cms-schemas";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/agency/$slug/portal/pages")({
  head: () => ({ meta: [{ title: "Páginas do portal · TravelOS" }] }),
  component: PagesPage,
});

// PortalBlock is now imported from @/lib/cms-types — do not redefine locally

type PageRow = {
  id: string;
  slug: string;
  title: string;
  is_published: boolean;
  template: string | null;
  blocks: any;
  seo: any;
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function PagesPage() {
  const { agency } = useAgency();
  const qc = useQueryClient();
  const [editingPage, setEditingPage] = useState<PageRow | null | "new">(null);

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["portal-pages", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_pages")
        .select("id, slug, title, is_published, template, blocks, seo")
        .eq("agency_id", agency!.id)
        .order("created_at");
      if (error) throw error;
      return data as PageRow[];
    },
  });

  async function togglePublish(p: PageRow) {
    if (p.is_published) {
      // Despublicação: UPDATE direto (não precisa snapshottear versão)
      const { error } = await supabase
        .from("portal_pages")
        .update({ is_published: false })
        .eq("id", p.id);
      if (error) return toast.error(error.message);
      toast.success("Página despublicada");
    } else {
      // Publicação: usa a RPC que copia rascunho → published_blocks + salva versão
      const { error } = await (supabase as any).rpc("publish_portal_page", { p_page_id: p.id });
      if (error) return toast.error(error.message);
      toast.success("Página publicada com sucesso!");
    }
    qc.invalidateQueries({ queryKey: ["portal-pages", agency?.id] });
  }

  async function deletePage(p: PageRow) {
    if (!confirm(`Tem certeza que deseja excluir a página "${p.title}"?`)) return;
    const { error } = await supabase.from("portal_pages").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Página excluída");
    qc.invalidateQueries({ queryKey: ["portal-pages", agency?.id] });
  }

  async function handleDuplicate(p: PageRow) {
    const { error } = await (supabase as any).rpc("duplicate_portal_page", { p_page_id: p.id });
    if (error) return toast.error(error.message);
    toast.success("Página duplicada com sucesso");
    qc.invalidateQueries({ queryKey: ["portal-pages", agency?.id] });
  }

  return (
    <>
      <PageHeader
        title="Páginas do portal"
        description="Construa páginas estáticas usando o editor de blocos dinâmicos."
        actions={
          <button
            onClick={() => setEditingPage("new")}
            className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Nova página
          </button>
        }
      />

      {q.isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}
      {q.data?.length === 0 && (
        <EmptyState
          title="Sem páginas"
          description="Crie páginas institucionais para o seu portal."
        />
      )}

      {q.data && q.data.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt/40 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Título</th>
                <th className="px-3 py-2">Slug</th>
                <th className="px-3 py-2">Template</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((p) => (
                <tr
                  key={p.id}
                  className="border-t border-border hover:bg-surface-alt/30 transition-colors"
                >
                  <td
                    className="px-3 py-2.5 font-medium cursor-pointer"
                    onClick={() => setEditingPage(p)}
                  >
                    {p.title}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">/{p.slug}</td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground capitalize">
                    {p.template ?? "padrão"}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge tone={p.is_published ? "success" : "neutral"}>
                      {p.is_published ? "publicada" : "rascunho"}
                    </StatusBadge>
                  </td>
                  <td className="px-3 py-2.5 text-right flex justify-end items-center gap-2">
                    {p.is_published && agency && (
                      <a
                        href={`${window.location.origin}/p/${agency.slug}/${p.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground hover:text-brand"
                        title="Ver no portal"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <button
                      onClick={() => togglePublish(p)}
                      className="text-xs text-primary hover:underline"
                    >
                      {p.is_published ? "Despublicar" : "Publicar"}
                    </button>
                    <button
                      onClick={() => handleDuplicate(p)}
                      className="text-muted-foreground hover:text-foreground"
                      title="Duplicar"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => deletePage(p)}
                      className="text-muted-foreground hover:text-destructive"
                      title="Excluir"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingPage !== null && agency && (
        <PageEditorSheet
          agencyId={agency.id}
          initialData={editingPage === "new" ? null : editingPage}
          onClose={() => setEditingPage(null)}
          onSaved={() => {
            setEditingPage(null);
            qc.invalidateQueries({ queryKey: ["portal-pages", agency.id] });
          }}
        />
      )}
    </>
  );
}

function PageEditorSheet({
  agencyId,
  initialData,
  onClose,
  onSaved,
}: {
  agencyId: string;
  initialData: PageRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [template, setTemplate] = useState(initialData?.template ?? "default");
  const [blocks, setBlocks] = useState<PortalBlock[]>(initialData?.blocks ?? []);

  // SEO
  const [metaTitle, setMetaTitle] = useState(initialData?.seo?.meta_title ?? "");
  const [metaDesc, setMetaDesc] = useState(initialData?.seo?.meta_description ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<"content" | "seo" | "history">("content");
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const versionsQuery = useQuery({
    enabled: !!initialData?.id,
    queryKey: ["portal-page-versions", initialData?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("portal_page_versions")
        .select("*")
        .eq("page_id", initialData!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const addBlock = (type: PortalBlockType) => {
    const id = Math.random().toString(36).slice(2, 8);
    // Uses BLOCK_DEFAULTS from cms-types — single source of truth for initial values
    const newBlock: PortalBlock = { id, ...BLOCK_DEFAULTS[type] } as PortalBlock;
    setBlocks([...blocks, newBlock]);
  };

  const updateBlock = (id: string, updates: Partial<PortalBlock>) => {
    setBlocks(blocks.map((b) => (b.id === id ? ({ ...b, ...updates } as PortalBlock) : b)));
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter((b) => b.id !== id));
  };

  const moveBlock = (index: number, direction: -1 | 1) => {
    const newBlocks: PortalBlock[] = [...blocks];
    if (index + direction < 0 || index + direction >= newBlocks.length) return;
    const temp = newBlocks[index];
    newBlocks[index] = newBlocks[index + direction];
    newBlocks[index + direction] = temp;
    setBlocks(newBlocks);
  };

  async function saveDraftOnly(e: React.FormEvent) {
    e.preventDefault();
    try {
      await saveDraftInternal();
      toast.success("Rascunho salvo");
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setSubmitting(false);
    }
  }

  async function saveDraftInternal() {
    if (!title) throw new Error("O título é obrigatório");
    setSubmitting(true);

    const finalSlug = slug || slugify(title);

    const payload = {
      agency_id: agencyId,
      title,
      slug: finalSlug,
      template,
      blocks: blocks as any,
      seo: {
        meta_title: metaTitle,
        meta_description: metaDesc,
      },
    };

    const validation = PortalPagePayloadSchema.safeParse(payload);
    if (!validation.success) {
      const errorMsg = validation.error.errors
        .map((e) => `${e.path.join(" -> ")}: ${e.message}`)
        .join(" | ");
      throw new Error(`Validação falhou: ${errorMsg}`);
    }

    let newPageId = initialData?.id;

    if (initialData) {
      const { error } = await supabase.from("portal_pages").update(payload).eq("id", initialData.id);
      if (error) throw error;
    } else {
      const { data: newPage, error } = await supabase.from("portal_pages").insert(payload).select().single();
      if (error) throw error;
      newPageId = newPage?.id;
    }
    return newPageId;
  }

  async function publishPage(e: React.FormEvent) {
    e.preventDefault();
    try {
      const pageId = await saveDraftInternal();
      if (!pageId) return;

      const { error } = await (supabase as any).rpc("publish_portal_page", { p_page_id: pageId });
      if (error) throw error;

      toast.success("Página publicada e versão salva!");
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Erro ao publicar");
    } finally {
      setSubmitting(false);
    }
  }

  async function revertVersion(v: any) {
    if (!confirm("Tem certeza que deseja reverter a página para esta versão? Todo o conteúdo atual será substituído.")) return;
    setTitle(v.title);
    setBlocks(v.blocks || []);
    setMetaTitle(v.seo?.meta_title || "");
    setMetaDesc(v.seo?.meta_description || "");
    setTab("content");
    toast.success("Versão carregada no editor. Salve para confirmar.");
  }

  return (
    <div className="fixed inset-0 z-50 flex bg-overlay backdrop-blur-sm p-4 md:p-8" onClick={onClose}>
      <div
        className="flex h-full w-full flex-col rounded-2xl overflow-hidden border border-border bg-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4 bg-surface-alt shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold tracking-tight">
              {initialData ? "Editar Página" : "Nova Página"}
            </h2>
            <StatusBadge tone="info">Live Preview</StatusBadge>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-surface-alt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* LEFT: Editor Form */}
          <div className="w-1/2 flex flex-col border-r border-border bg-surface overflow-hidden">

          <div className="flex border-b border-border px-6 shrink-0 bg-surface">
            <button
              type="button"
              onClick={() => setTab("content")}
              className={`py-3 px-2 text-xs font-medium border-b-2 ${tab === "content" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              Conteúdo & Blocos
            </button>
            <button
              type="button"
              onClick={() => setTab("seo")}
              className={`py-3 px-2 text-xs font-medium border-b-2 ${tab === "seo" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              SEO
            </button>
            {initialData && (
              <button
                type="button"
                onClick={() => setTab("history")}
                className={`py-3 px-2 text-xs font-medium border-b-2 ${tab === "history" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                Histórico
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
          <form id="page-form" className="space-y-6">
            {tab === "history" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold">Versões Salvas</h3>
                  <p className="text-xs text-muted-foreground">Últimas alterações</p>
                </div>
                {versionsQuery.isLoading && <div className="text-xs text-muted-foreground">Carregando histórico...</div>}
                {versionsQuery.data?.length === 0 && <div className="text-xs text-muted-foreground">Nenhuma versão salva ainda.</div>}
                {versionsQuery.data?.map((v) => (
                  <div key={v.id} className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-surface-alt/30">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-sm font-medium">{v.title}</span>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {new Date(v.created_at).toLocaleString()}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => revertVersion(v)}
                        className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                      >
                        <History className="w-3 h-3" /> Reverter
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tab === "seo" && (
              <div className="space-y-4">
                <Field label="Título SEO" hint="Substitui o título padrão na aba do navegador">
                  <Input
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    placeholder={title}
                  />
                </Field>
                <Field label="Descrição SEO" hint="Aparece no Google e compartilhamentos">
                  <Textarea
                    value={metaDesc}
                    onChange={(e) => setMetaDesc(e.target.value)}
                    rows={3}
                  />
                </Field>
              </div>
            )}

            {tab === "content" && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Título interno *">
                    <Input required value={title} onChange={(e) => setTitle(e.target.value)} />
                  </Field>
                  <Field label="URL (Slug)">
                    <Input
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder={slugify(title)}
                    />
                  </Field>
                </div>

                <Field label="Template">
                  <Select value={template} onChange={(e) => setTemplate(e.target.value)}>
                    <option value="default">Padrão</option>
                    <option value="about">Sobre nós</option>
                    <option value="contact">Contato</option>
                  </Select>
                </Field>

                <div className="space-y-4 pt-4 border-t border-border">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <h3 className="text-sm font-semibold">Construtor de Blocos</h3>
                      <button
                        type="button"
                        onClick={() => setAiModalOpen(true)}
                        className="flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-xs font-semibold text-brand hover:bg-brand/20 transition-colors"
                      >
                        <Sparkles className="h-3.5 w-3.5" /> Gerar com IA
                      </button>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="flex h-8 items-center gap-1.5 rounded-md bg-brand text-brand-foreground px-3 text-xs font-semibold shadow-sm hover:bg-brand/90 transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" /> Adicionar Bloco
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Layout Básico</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => addBlock("hero")}>
                          <LayoutTemplate className="w-4 h-4 mr-2 text-muted-foreground" /> Hero (Capa principal)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addBlock("text")}>
                          <Type className="w-4 h-4 mr-2 text-muted-foreground" /> Texto com imagem
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Módulos Específicos</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => addBlock("gallery")}>
                          <ImageIcon className="w-4 h-4 mr-2 text-muted-foreground" /> Galeria de fotos
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addBlock("features")}>
                          <ListPlus className="w-4 h-4 mr-2 text-muted-foreground" /> Diferenciais (Features)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addBlock("faq")}>
                          <HelpCircle className="w-4 h-4 mr-2 text-muted-foreground" /> Perguntas Frequentes (FAQ)
                        </DropdownMenuItem>
                        
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Conversão</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => addBlock("cta")}>
                          <Megaphone className="w-4 h-4 mr-2 text-brand" /> Call to Action (Faixa)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => addBlock("contact")}>
                          <PhoneCall className="w-4 h-4 mr-2 text-muted-foreground" /> Contato Integrado
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {blocks.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border p-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        Esta página ainda não tem blocos de conteúdo.
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Adicione um bloco acima para começar.
                      </p>
                    </div>
                  )}

                  <div className="space-y-4">
                    {blocks.map((block, index) => (
                      <div
                        key={block.id}
                        className="rounded-lg border border-border bg-surface-alt/20 overflow-hidden"
                      >
                        <div className="flex items-center justify-between bg-surface-alt/40 px-3 py-2 border-b border-border">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              {block.type === "text" ? "Texto" : block.type}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveBlock(index, -1)}
                              disabled={index === 0}
                              className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => moveBlock(index, 1)}
                              disabled={index === blocks.length - 1}
                              className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              onClick={() => removeBlock(block.id)}
                              className="p-1 ml-2 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="p-4 space-y-4">
                          {block.type === "hero" && (
                            <>
                              <Field label="Título (Headline)">
                                <Input
                                  value={block.title}
                                  onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                                />
                              </Field>
                              <Field label="Subtítulo">
                                <Input
                                  value={block.subtitle}
                                  onChange={(e) =>
                                    updateBlock(block.id, { subtitle: e.target.value })
                                  }
                                />
                              </Field>
                              <div className="grid grid-cols-2 gap-3">
                                <Field label="Botão (Label)">
                                  <Input
                                    value={block.cta_label}
                                    onChange={(e) =>
                                      updateBlock(block.id, { cta_label: e.target.value })
                                    }
                                    placeholder="Ex: Ver pacotes"
                                  />
                                </Field>
                                <Field label="Botão (Link)">
                                  <Input
                                    value={block.cta_link}
                                    onChange={(e) =>
                                      updateBlock(block.id, { cta_link: e.target.value })
                                    }
                                    placeholder="/pacotes"
                                  />
                                </Field>
                              </div>
                              <FileUploader
                                label="Imagem de fundo (Background)"
                                value={block.bg_image_url}
                                onChange={(url) =>
                                  updateBlock(block.id, { bg_image_url: url ?? "" })
                                }
                                bucket="agency-logos"
                                folder={`${agencyId}/pages`}
                                variant="image"
                                publicBucket={false}
                              />
                            </>
                          )}

                          {block.type === "text" && (
                            <>
                              <Field label="Conteúdo (Markdown)">
                                <Textarea
                                  value={block.content}
                                  onChange={(e) =>
                                    updateBlock(block.id, { content: e.target.value })
                                  }
                                  rows={5}
                                />
                              </Field>
                              <div className="grid grid-cols-2 gap-4">
                                <FileUploader
                                  label="Imagem ilustrativa (opcional)"
                                  value={block.image_url}
                                  onChange={(url) =>
                                    updateBlock(block.id, { image_url: url ?? "" })
                                  }
                                  bucket="agency-logos"
                                  folder={`${agencyId}/pages`}
                                  variant="image"
                                  publicBucket={false}
                                />
                                <Field label="Alinhamento do Texto">
                                  <Select
                                    value={block.align}
                                    onChange={(e) =>
                                      updateBlock(block.id, { align: e.target.value as any })
                                    }
                                  >
                                    <option value="left">Esquerda (Imagem à direita)</option>
                                    <option value="right">Direita (Imagem à esquerda)</option>
                                    <option value="center">Centralizado</option>
                                  </Select>
                                </Field>
                              </div>
                            </>
                          )}

                          {block.type === "gallery" && (
                            <MultiFileUploader
                              label="Fotos da galeria"
                              values={block.images}
                              onChange={(urls) => updateBlock(block.id, { images: urls })}
                              bucket="agency-logos"
                              folder={`${agencyId}/pages`}
                              max={12}
                              publicBucket={false}
                            />
                          )}

                          {block.type === "contact" && (
                            <>
                              <Field label="Título da seção">
                                <Input
                                  value={block.title}
                                  onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                                />
                              </Field>
                              <Field label="Texto de introdução">
                                <Textarea
                                  value={block.text}
                                  onChange={(e) => updateBlock(block.id, { text: e.target.value })}
                                  rows={2}
                                />
                              </Field>
                              <p className="text-[10px] text-muted-foreground mt-1">
                                Este bloco puxará automaticamente as redes sociais e o formulário de
                                lead da agência no portal público.
                              </p>
                            </>
                          )}

                          {block.type === "features" && (
                            <div className="space-y-4">
                              <Field label="Título da Seção">
                                <Input
                                  value={block.title}
                                  onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                                  placeholder="Ex: Nossos diferenciais"
                                />
                              </Field>
                              <div className="space-y-2">
                                <label className="text-xs font-semibold text-muted-foreground uppercase">Itens da Grade</label>
                                {(block.items || []).map((item, itemIdx) => (
                                  <div key={itemIdx} className="grid grid-cols-[auto_1fr_1fr_auto] gap-2 items-start border border-border p-2 rounded-lg bg-surface">
                                    <Input
                                      className="w-12 text-center px-1"
                                      placeholder="Icon"
                                      value={item.icon}
                                      onChange={(e) => {
                                        const newItems = [...block.items];
                                        newItems[itemIdx].icon = e.target.value;
                                        updateBlock(block.id, { items: newItems });
                                      }}
                                    />
                                    <Input
                                      placeholder="Título"
                                      value={item.title}
                                      onChange={(e) => {
                                        const newItems = [...block.items];
                                        newItems[itemIdx].title = e.target.value;
                                        updateBlock(block.id, { items: newItems });
                                      }}
                                    />
                                    <Input
                                      placeholder="Descrição breve"
                                      value={item.description}
                                      onChange={(e) => {
                                        const newItems = [...block.items];
                                        newItems[itemIdx].description = e.target.value;
                                        updateBlock(block.id, { items: newItems });
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newItems = block.items.filter((_, idx) => idx !== itemIdx);
                                        updateBlock(block.id, { items: newItems });
                                      }}
                                      className="p-2 text-muted-foreground hover:text-destructive"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newItems = [...(block.items || []), { icon: "✨", title: "Novo item", description: "Descrição" }];
                                    updateBlock(block.id, { items: newItems });
                                  }}
                                  className="text-xs text-brand font-medium hover:underline mt-2 inline-block"
                                >
                                  + Adicionar Item
                                </button>
                              </div>
                            </div>
                          )}

                          {block.type === "cta" && (
                            <div className="space-y-4">
                              <Field label="Título de Impacto (Headline)">
                                <Input
                                  value={block.title}
                                  onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                                />
                              </Field>
                              <Field label="Subtítulo">
                                <Input
                                  value={block.subtitle}
                                  onChange={(e) => updateBlock(block.id, { subtitle: e.target.value })}
                                />
                              </Field>
                              <div className="grid grid-cols-2 gap-3">
                                <Field label="Botão (Label)">
                                  <Input
                                    value={block.button_label}
                                    onChange={(e) => updateBlock(block.id, { button_label: e.target.value })}
                                  />
                                </Field>
                                <Field label="Botão (Link)">
                                  <Input
                                    value={block.button_link}
                                    onChange={(e) => updateBlock(block.id, { button_link: e.target.value })}
                                  />
                                </Field>
                              </div>
                            </div>
                          )}

                          {block.type === "faq" && (
                            <div className="space-y-4">
                              <Field label="Título Principal">
                                <Input
                                  value={block.title}
                                  onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                                />
                              </Field>
                              <div className="space-y-3">
                                <label className="text-xs font-semibold text-muted-foreground uppercase">Perguntas e Respostas</label>
                                {(block.items || []).map((item, itemIdx) => (
                                  <div key={itemIdx} className="flex gap-2 items-start border border-border p-3 rounded-lg bg-surface">
                                    <div className="flex-1 space-y-2">
                                      <Input
                                        placeholder="Pergunta"
                                        className="font-medium"
                                        value={item.question}
                                        onChange={(e) => {
                                          const newItems = [...block.items];
                                          newItems[itemIdx].question = e.target.value;
                                          updateBlock(block.id, { items: newItems });
                                        }}
                                      />
                                      <Textarea
                                        placeholder="Resposta"
                                        rows={2}
                                        value={item.answer}
                                        onChange={(e) => {
                                          const newItems = [...block.items];
                                          newItems[itemIdx].answer = e.target.value;
                                          updateBlock(block.id, { items: newItems });
                                        }}
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const newItems = block.items.filter((_, idx) => idx !== itemIdx);
                                        updateBlock(block.id, { items: newItems });
                                      }}
                                      className="p-2 text-muted-foreground hover:text-destructive"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newItems = [...(block.items || []), { question: "Nova Pergunta?", answer: "Sua resposta aqui" }];
                                    updateBlock(block.id, { items: newItems });
                                  }}
                                  className="text-xs text-brand font-medium hover:underline mt-2 inline-block"
                                >
                                  + Adicionar Pergunta
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
              <div className="pt-6 border-t border-border mt-8 flex justify-end gap-3">
                <GhostButton type="button" onClick={onClose} disabled={submitting}>
                  Cancelar
                </GhostButton>
                <GhostButton type="button" onClick={saveDraftOnly} disabled={submitting}>
                  Salvar Rascunho
                </GhostButton>
                <PrimaryButton type="button" onClick={publishPage} disabled={submitting}>
                  {submitting ? "Salvando..." : "Publicar Página"}
                </PrimaryButton>
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT: Live Preview */}
        <div className="w-1/2 bg-background flex flex-col relative overflow-hidden">
          <div className="absolute inset-0 overflow-y-auto pointer-events-none p-4">
            <div className="border border-border/50 rounded-2xl bg-surface min-h-[800px] p-4 md:p-8 overflow-hidden scale-[0.85] origin-top">
              {/* Fake header do portal */}
              <div className="h-16 flex items-center justify-center opacity-50 mb-8 border-b border-border">
                 Menu do Portal 
              </div>
              
              <BlockRenderer blocks={blocks} agencySlug="preview" />

              {blocks.length === 0 && (
                <div className="flex items-center justify-center h-[400px] text-muted-foreground border-2 border-dashed border-border rounded-xl">
                  Seu portal está vazio. Adicione blocos no editor.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <AILandingPageModal 
        open={aiModalOpen} 
        onOpenChange={setAiModalOpen} 
        onGenerate={(newBlocks: any[]) => {
          setBlocks([...blocks, ...newBlocks]);
          if (!title) {
            setTitle("Landing Page Gerada por IA");
          }
        }} 
      />
    </div>
  </div>
  );
}
