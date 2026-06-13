import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  History,
  LayoutTemplate,
  Type,
  Image as ImageIcon,
  PhoneCall,
  ListPlus,
  Megaphone,
  HelpCircle,
  Sparkles,
  ArrowLeft,
  Quote,
  Bus,
  BarChart2,
  Play,
  Map,
  Rss,
} from "lucide-react";
import { toast } from "sonner";
import { useAgency } from "@/lib/agency-context";
import {
  Field,
  Input,
  Select,
  Textarea,
  PrimaryButton,
  GhostButton,
  StatusBadge,
} from "@/components/ui/form";
import { BlockRenderer } from "@/components/portal/BlockRenderer";
import { AILandingPageSheet } from "@/components/ui/AILandingPageSheet";
import {
  fetchPortalPage,
  fetchPortalPageVersions,
  savePortalPageDraft,
  publishPortalPage,
} from "@/services/portal";
import { useBlockEditor } from "@/hooks/use-block-editor";
import { BLOCK_LABELS } from "@/lib/cms-types";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { BlockFormEditor } from "@/components/portal/BlockFormEditors";

export const Route = createFileRoute("/agency/$slug/portal/pages/$page_id")({
  head: () => ({ meta: [{ title: "Editor de Página · TravelOS" }] }),
  component: PageEditorRoute,
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function PageEditorRoute() {
  const { agency } = useAgency();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { slug, page_id } = useParams({ from: "/agency/$slug/portal/pages/$page_id" });

  const isNew = page_id === "new";

  const { data: initialData, isLoading } = useQuery({
    enabled: !!agency && !isNew,
    queryKey: ["portal-page", page_id],
    queryFn: () => fetchPortalPage(page_id),
  });

  const [title, setTitle] = useState("");
  const [pageSlug, setPageSlug] = useState("");
  const [template, setTemplate] = useState("default");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDesc, setMetaDesc] = useState("");

  const { blocks, setBlocks, setInitialBlocks, addBlock, updateBlock, removeBlock, moveBlock } =
    useBlockEditor();

  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<"content" | "seo" | "history">("content");
  const [aiModalOpen, setAiModalOpen] = useState(false);

  // Sync data when loaded
  useEffect(() => {
    if (initialData && !isNew) {
      setTitle(initialData.title || "");
      setPageSlug(initialData.slug || "");
      setTemplate(initialData.template || "default");
      setInitialBlocks(initialData.blocks || []);
      setMetaTitle(initialData.seo?.meta_title || "");
      setMetaDesc(initialData.seo?.meta_description || "");
    }
  }, [initialData, isNew, setInitialBlocks]);

  const versionsQuery = useQuery({
    enabled: !!initialData?.id && !isNew,
    queryKey: ["portal-page-versions", initialData?.id],
    queryFn: () => fetchPortalPageVersions(initialData!.id),
  });

  if (isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Carregando editor...</div>;
  }
  if (!agency) return null;

  async function saveDraftInternal() {
    setSubmitting(true);
    const finalSlug = pageSlug || slugify(title);

    return await savePortalPageDraft(
      agency!.id,
      initialData?.id || null,
      isNew,
      title,
      finalSlug,
      template,
      blocks,
      { meta_title: metaTitle, meta_description: metaDesc },
    );
  }

  async function saveDraftOnly(e: React.FormEvent) {
    e.preventDefault();
    try {
      const newPageId = await saveDraftInternal();
      toast.success("Rascunho salvo");
      qc.invalidateQueries({ queryKey: ["portal-pages", agency?.id] });

      if (isNew && newPageId) {
        navigate({
          to: "/agency/$slug/portal/pages/$page_id",
          params: { slug, page_id: newPageId },
        });
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar");
    } finally {
      setSubmitting(false);
    }
  }

  async function publishPage(e: React.FormEvent) {
    e.preventDefault();
    try {
      const newPageId = await saveDraftInternal();
      if (!newPageId) return;

      await publishPortalPage(newPageId);

      toast.success("Página publicada e versão salva!");
      qc.invalidateQueries({ queryKey: ["portal-pages", agency?.id] });
      navigate({ to: "/agency/$slug/portal/pages", params: { slug } });
    } catch (err: any) {
      toast.error(err.message || "Erro ao publicar");
    } finally {
      setSubmitting(false);
    }
  }

  async function revertVersion(v: any) {
    if (
      !confirm(
        "Tem certeza que deseja reverter a página para esta versão? Todo o conteúdo atual será substituído.",
      )
    )
      return;
    setTitle(v.title);
    setInitialBlocks(v.blocks || []);
    setMetaTitle(v.seo?.meta_title || "");
    setMetaDesc(v.seo?.meta_description || "");
    setTab("content");
    toast.success("Versão carregada no editor. Salve para confirmar.");
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-surface px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate({ to: "/agency/$slug/portal/pages", params: { slug } })}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface-alt text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-sm font-semibold text-foreground">
              {isNew ? "Criar Nova Página" : `Editando: ${title}`}
            </h1>
          </div>
          {!isNew && initialData?.is_published && (
            <StatusBadge tone="success">Publicada</StatusBadge>
          )}
          {!isNew && !initialData?.is_published && (
            <StatusBadge tone="neutral">Rascunho</StatusBadge>
          )}
        </div>

        <div className="flex items-center gap-3">
          <GhostButton type="button" onClick={saveDraftOnly} disabled={submitting}>
            Salvar Rascunho
          </GhostButton>
          <PrimaryButton type="button" onClick={publishPage} disabled={submitting}>
            {submitting ? "Salvando..." : "Publicar Página"}
          </PrimaryButton>
        </div>
      </div>

      {/* Main Studio Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar: Controls & Settings */}
        <div className="w-[400px] flex-shrink-0 border-r border-border bg-surface flex flex-col overflow-hidden">
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
            {!isNew && (
              <button
                type="button"
                onClick={() => setTab("history")}
                className={`py-3 px-2 text-xs font-medium border-b-2 ${tab === "history" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                Histórico
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              {tab === "history" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold">Versões Salvas</h3>
                    <p className="text-xs text-muted-foreground">Últimas alterações</p>
                  </div>
                  {versionsQuery.isLoading && (
                    <div className="text-xs text-muted-foreground">Carregando histórico...</div>
                  )}
                  {versionsQuery.data?.length === 0 && (
                    <div className="text-xs text-muted-foreground">Nenhuma versão salva ainda.</div>
                  )}
                  {versionsQuery.data?.map((v) => (
                    <div
                      key={v.id}
                      className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-surface-alt/30"
                    >
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
                          <History className="w-3.5 h-3.5" /> Reverter
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
                <div className="space-y-6">
                  <div className="grid gap-4">
                    <Field label="Título interno *">
                      <Input required value={title} onChange={(e) => setTitle(e.target.value)} />
                    </Field>
                    <Field label="URL (Slug)">
                      <Input
                        value={pageSlug}
                        onChange={(e) => setPageSlug(e.target.value)}
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

                  <div className="space-y-4 pt-6 border-t border-border">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <h3 className="text-sm font-semibold">Construtor de Blocos</h3>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="flex h-8 items-center gap-1.5 rounded-md bg-brand text-brand-foreground px-3 text-xs font-semibold hover:bg-brand/90 transition-colors shadow-none"
                          >
                            <Plus className="h-3.5 w-3.5" /> Bloco
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                          <DropdownMenuLabel>Layout Básico</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => addBlock("hero")}>
                            <LayoutTemplate className="w-4 h-4 mr-2 text-muted-foreground" /> Hero (Capa principal)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => addBlock("text")}>
                            <Type className="w-4 h-4 mr-2 text-muted-foreground" /> Texto com imagem
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => addBlock("gallery")}>
                            <ImageIcon className="w-4 h-4 mr-2 text-muted-foreground" /> Galeria de fotos
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Social Proof</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => addBlock("testimonials")}>
                            <Quote className="w-4 h-4 mr-2 text-muted-foreground" /> Depoimentos
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => addBlock("stats")}>
                            <BarChart2 className="w-4 h-4 mr-2 text-muted-foreground" /> Números em destaque
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Módulos Específicos</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => addBlock("tours_grid")}>
                            <Bus className="w-4 h-4 mr-2 text-muted-foreground" /> Grade de Roteiros
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => addBlock("blog_feed")}>
                            <Rss className="w-4 h-4 mr-2 text-muted-foreground" /> Feed do Blog
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => addBlock("features")}>
                            <ListPlus className="w-4 h-4 mr-2 text-muted-foreground" /> Diferenciais (Features)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => addBlock("faq")}>
                            <HelpCircle className="w-4 h-4 mr-2 text-muted-foreground" /> Perguntas Frequentes (FAQ)
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => addBlock("video")}>
                            <Play className="w-4 h-4 mr-2 text-muted-foreground" /> Vídeo embed
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => addBlock("map")}>
                            <Map className="w-4 h-4 mr-2 text-muted-foreground" /> Mapa / Localização
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

                    <button
                      type="button"
                      onClick={() => setAiModalOpen(true)}
                      className="w-full flex items-center justify-center gap-2 rounded-lg border border-brand/20 bg-brand/5 py-2 text-xs font-semibold text-brand hover:bg-brand/10 transition-colors"
                    >
                      <Sparkles className="h-3.5 w-3.5" /> Auto-gerar página com IA
                    </button>

                    {blocks.length === 0 && (
                      <div className="rounded-lg border border-dashed border-border p-8 text-center bg-surface-alt/30">
                        <p className="text-sm text-muted-foreground font-medium">
                          Nenhum bloco adicionado
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Comece escolhendo um bloco acima.
                        </p>
                      </div>
                    )}

                    <div className="space-y-4">
                      {blocks.map((block, index) => (
                        <div
                          key={block.id}
                          className="rounded-lg border border-border bg-surface overflow-hidden"
                        >
                          <div className="flex items-center justify-between bg-surface-alt/50 px-3 py-2 border-b border-border">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {BLOCK_LABELS[block.type] ?? block.type}
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
                            <BlockFormEditor
                              block={block}
                              updateBlock={updateBlock}
                              agencyId={agency.id}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Right Live Canvas */}
        <div className="flex-1 bg-background relative overflow-hidden flex flex-col items-center pt-8 px-8 pb-8">
          <div className="w-full max-w-5xl h-full bg-surface border border-border rounded-xl shadow-none overflow-y-auto ring-1 ring-border relative">
            {/* Minimalist browser bar */}
            <div className="sticky top-0 z-20 flex h-10 w-full items-center border-b border-border bg-surface px-4 shadow-none">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-border"></div>
                <div className="h-2.5 w-2.5 rounded-full bg-border"></div>
                <div className="h-2.5 w-2.5 rounded-full bg-border"></div>
              </div>
              <div className="mx-auto px-4 py-0.5 text-[10px] font-medium text-muted-foreground bg-surface-alt rounded-md border border-border">
                {agency.slug}.travelos.com/{pageSlug || "preview"}
              </div>
            </div>

            <div className="w-full min-h-full">
              <BlockRenderer blocks={blocks} agencySlug="preview" />

              {blocks.length === 0 && (
                <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground">
                  <LayoutTemplate className="w-12 h-12 mb-4 opacity-20" />
                  <p className="text-sm font-medium">Sua página está vazia</p>
                  <p className="text-xs mt-1">
                    Adicione blocos pelo painel esquerdo para começar a montar o layout.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AILandingPageSheet
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
  );
}
