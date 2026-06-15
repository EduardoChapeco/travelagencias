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
  GripVertical,
  Layers,
  Settings,
  Eye,
  Globe,
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
import { BLOCK_LABELS, BLOCK_DEFAULTS, PortalBlockType } from "@/lib/cms-types";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { BlockFormEditor } from "@/components/portal/BlockFormEditors";
import { useConfirm } from "@/hooks/use-confirm";
import { CMS_TEMPLATES, getTemplateById } from "@/lib/cms-templates";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableBlock({ block, selectedBlockId, setSelectedBlockId, removeBlock }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border overflow-hidden transition-all ${
        selectedBlockId === block.id
          ? "border-brand bg-surface shadow-md"
          : "border-border bg-surface-alt/30 hover:border-brand/40"
      } ${isDragging ? "opacity-50 ring-2 ring-brand" : ""}`}
    >
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer select-none"
        onClick={() => setSelectedBlockId(selectedBlockId === block.id ? null : block.id)}
      >
        <div className="flex items-center gap-2">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab p-1 -ml-1 text-muted-foreground hover:text-foreground active:cursor-grabbing outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4" />
          </div>
          <span
            className={`text-xs font-semibold uppercase tracking-wider ${
              selectedBlockId === block.id ? "text-brand" : "text-muted-foreground"
            }`}
          >
            {BLOCK_LABELS[block.type as keyof typeof BLOCK_LABELS] ?? block.type}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeBlock(block.id);
            }}
            className="p-1 ml-2 text-muted-foreground hover:text-destructive outline-none"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

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
  const { confirm, ConfirmDialog } = useConfirm();

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

  const {
    blocks,
    setBlocks,
    setInitialBlocks,
    addBlock,
    updateBlock,
    removeBlock,
    moveBlock,
    selectedBlockId,
    setSelectedBlockId,
  } = useBlockEditor();

  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState<"content" | "seo" | "history">("content");
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex((b) => b.id === active.id);
      const newIndex = blocks.findIndex((b) => b.id === over.id);
      setBlocks(arrayMove(blocks, oldIndex, newIndex));
    }
  }

  const [hasInitialized, setHasInitialized] = useState(false);

  useEffect(() => {
    setHasInitialized(false);
  }, [page_id]);

  // Sync data when loaded
  useEffect(() => {
    if (initialData && !isNew && !hasInitialized) {
      setTitle(initialData.title || "");
      setPageSlug(initialData.slug || "");
      setTemplate(initialData.template || "default");
      setInitialBlocks(initialData.blocks || []);
      setMetaTitle(initialData.seo?.meta_title || "");
      setMetaDesc(initialData.seo?.meta_description || "");
      setHasInitialized(true);
    }
  }, [initialData, isNew, hasInitialized, setInitialBlocks]);

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
    confirm({
      title: "Reverter versão",
      description:
        "Tem certeza que deseja reverter a página para esta versão? Todo o conteúdo atual será substituído.",
      onConfirm: () => {
        setTitle(v.title);
        setInitialBlocks(v.blocks || []);
        setMetaTitle(v.seo?.meta_title || "");
        setMetaDesc(v.seo?.meta_description || "");
        setTab("content");
        toast.success("Versão carregada no editor. Salve para confirmar.");
      },
    });
  }

  async function handleApplyTemplate(templateId: string) {
    const tpl = getTemplateById(templateId);
    if (!tpl) return;

    confirm({
      title: "Aplicar Template",
      description: `Tem certeza que deseja aplicar o template "${tpl.name}"? Todos os blocos atuais serão substituídos pela estrutura desse template.`,
      onConfirm: () => {
        const freshBlocks = tpl.blocks.map((b) => {
          const deepCopiedBlock = JSON.parse(JSON.stringify(b));
          return {
            ...deepCopiedBlock,
            id: `${b.type}-${Math.random().toString(36).substring(2, 9)}`,
          };
        });
        setBlocks(freshBlocks as any);
        setTemplate(tpl.id); // Guardar o ID real do template no banco
        if (!pageSlug) {
          setPageSlug(tpl.id);
        }
        toast.success(`Template "${tpl.name}" aplicado!`);
      },
    });
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

      {/* Main 3-Column Studio Area */}
      <div className="flex flex-1 overflow-hidden h-[calc(100vh-3.5rem)]">
        {/* ── 1. LEFT SIDEBAR: Biblioteca de Seções & Camadas (width 320px) ── */}
        <div className="w-[320px] flex-shrink-0 border-r border-border bg-surface flex flex-col overflow-hidden">
          {/* Seção 1: Biblioteca de Seções */}
          <div className="p-4 border-b border-border bg-surface-alt/20 shrink-0">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Adicionar Seções
            </h3>
            <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1 no-scrollbar">
              {(Object.keys(BLOCK_LABELS) as PortalBlockType[]).map((type) => {
                let IconComponent = LayoutTemplate;
                if (type === "text") IconComponent = Type;
                else if (type === "gallery" || type === "biolink_header") IconComponent = ImageIcon;
                else if (type === "contact") IconComponent = PhoneCall;
                else if (type === "features" || type === "biolink_links") IconComponent = ListPlus;
                else if (type === "cta") IconComponent = Megaphone;
                else if (type === "faq" || type === "support_ticket_form") IconComponent = HelpCircle;
                else if (type === "testimonials") IconComponent = Quote;
                else if (type === "tours_grid") IconComponent = Bus;
                else if (type === "stats") IconComponent = BarChart2;
                else if (type === "video") IconComponent = Play;
                else if (type === "map") IconComponent = Map;
                else if (type === "blog_feed") IconComponent = Rss;

                const isBiolinkType = type.startsWith("biolink_");

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => addBlock(type)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all hover:scale-105 active:scale-95 group hover:border-brand/50 hover:bg-brand/5
                      ${isBiolinkType ? "bg-brand/5 border-brand/20 text-brand" : "bg-surface border-border text-muted-foreground hover:text-foreground"}`}
                  >
                    <IconComponent className={`h-5 w-5 mb-1.5 transition-colors group-hover:text-brand ${isBiolinkType ? "text-brand" : "text-muted-foreground"}`} />
                    <span className="text-[10px] font-bold leading-tight">
                      {BLOCK_LABELS[type].split(" ")[0]}
                    </span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setAiModalOpen(true)}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-brand/20 bg-brand/5 py-2 mt-3 text-xs font-bold text-brand hover:bg-brand/10 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" /> Auto-gerar com IA
            </button>
          </div>

          {/* Seção 2: Camadas da Página (Estrutura) */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="px-4 py-3 border-b border-border bg-surface-alt/10 flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Camadas da Página
              </h3>
              <span className="text-[10px] bg-border px-1.5 py-0.5 rounded font-bold text-muted-foreground">
                {blocks.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
              {blocks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border p-8 text-center bg-surface-alt/10">
                  <p className="text-xs text-muted-foreground font-medium">Página vazia</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">
                    Adicione seções prontas pela biblioteca acima ou escolha um template na direita.
                  </p>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={blocks.map((b) => b.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {blocks.map((block) => (
                        <SortableBlock
                          key={block.id}
                          block={block}
                          selectedBlockId={selectedBlockId}
                          setSelectedBlockId={setSelectedBlockId}
                          removeBlock={removeBlock}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
          </div>
        </div>

        {/* ── 2. CENTER CANVAS: Live page preview simulation (flex-1) ── */}
        <div className="flex-1 bg-surface-alt/30 relative overflow-hidden flex flex-col items-center justify-start pt-4 px-4 pb-4">
          {/* Seletor de Viewport */}
          <div className="flex items-center gap-1.5 mb-4 bg-surface p-1 rounded-full border border-border shadow-sm z-10 shrink-0">
            <button
              onClick={() => setViewport("desktop")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${viewport === "desktop" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-surface-alt"}`}
            >
              Desktop
            </button>
            <button
              onClick={() => setViewport("tablet")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${viewport === "tablet" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-surface-alt"}`}
            >
              Tablet
            </button>
            <button
              onClick={() => setViewport("mobile")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${viewport === "mobile" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-surface-alt"}`}
            >
              Mobile
            </button>
          </div>

          {/* Browser / Device Mockup Frame */}
          <div
            className={`flex-1 bg-surface border border-border rounded-2xl shadow-2xl overflow-y-auto ring-1 ring-border/5 relative transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
              viewport === "desktop"
                ? "w-full max-w-5xl"
                : viewport === "tablet"
                  ? "w-[768px]"
                  : "w-[390px]"
            }`}
          >
            {/* Address Bar */}
            <div className="sticky top-0 z-20 flex h-10 w-full items-center border-b border-border bg-surface px-4 shadow-sm backdrop-blur-md bg-surface/90 shrink-0">
              <div className="flex gap-1.5 shrink-0">
                <div className="h-2.5 w-2.5 rounded-full bg-border"></div>
                <div className="h-2.5 w-2.5 rounded-full bg-border"></div>
                <div className="h-2.5 w-2.5 rounded-full bg-border"></div>
              </div>
              <div className="mx-auto px-4 py-0.5 text-[10px] font-mono text-muted-foreground bg-surface-alt rounded border border-border flex items-center gap-1 max-w-xs md:max-w-md truncate">
                <Globe className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                <span className="text-brand">https://</span>
                <span>{agency.slug}.travelos.com/{pageSlug || slugify(title) || "preview"}</span>
              </div>
            </div>

            {/* Rendering Canvas area */}
            <div className="w-full min-h-full">
              {blocks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[500px] text-center p-8 text-muted-foreground">
                  <LayoutTemplate className="w-14 h-14 mb-4 opacity-25 text-muted-foreground" />
                  <h4 className="text-sm font-bold text-foreground">Sua página está vazia</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mt-1">
                    Adicione seções prontas pela biblioteca na barra esquerda ou aplique um template pronto na barra direita.
                  </p>
                </div>
              ) : (
                <div className="w-full">
                  <BlockRenderer
                    blocks={blocks}
                    agencySlug={agency.slug || "preview"}
                    pageId={isNew ? undefined : initialData?.id}
                    agencyId={agency.id}
                    onSelectBlock={setSelectedBlockId}
                    selectedBlockId={selectedBlockId}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── 3. RIGHT SIDEBAR: Editor de Propriedades & Configurações Globais (width 360px) ── */}
        <div className="w-[360px] flex-shrink-0 border-l border-border bg-surface flex flex-col overflow-hidden">
          {selectedBlockId ? (
            /* A: Edição do Bloco Selecionado */
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-border bg-surface-alt/30 shrink-0">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand">Propriedades</span>
                  <h3 className="font-bold text-sm text-foreground">
                    {BLOCK_LABELS[blocks.find((b) => b.id === selectedBlockId)?.type as keyof typeof BLOCK_LABELS] || "Editar Seção"}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedBlockId(null)}
                  className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg border border-border bg-surface-alt hover:bg-surface-hover transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin">
                {blocks.map((block) =>
                  block.id === selectedBlockId ? (
                    <BlockFormEditor
                      key={block.id}
                      block={block}
                      updateBlock={updateBlock}
                      agencyId={agency.id}
                    />
                  ) : null,
                )}
              </div>
              <div className="p-4 border-t border-border bg-surface-alt/20 shrink-0 flex gap-2">
                <GhostButton
                  type="button"
                  onClick={() => {
                    removeBlock(selectedBlockId);
                    setSelectedBlockId(null);
                  }}
                  className="w-full justify-center text-destructive hover:bg-destructive/5 hover:text-destructive font-bold text-xs"
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Excluir
                </GhostButton>
                <PrimaryButton
                  type="button"
                  onClick={() => setSelectedBlockId(null)}
                  className="w-full justify-center text-xs"
                >
                  Concluído
                </PrimaryButton>
              </div>
            </div>
          ) : (
            /* B: Configurações Globais da Página */
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex border-b border-border px-4 shrink-0 bg-surface">
                <button
                  type="button"
                  onClick={() => setTab("content")}
                  className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 ${tab === "content" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                  <Settings className="w-3.5 h-3.5" /> Página
                </button>
                <button
                  type="button"
                  onClick={() => setTab("seo")}
                  className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 ${tab === "seo" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                  <Eye className="w-3.5 h-3.5" /> SEO
                </button>
                {!isNew && (
                  <button
                    type="button"
                    onClick={() => setTab("history")}
                    className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-1.5 ${tab === "history" ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
                  >
                    <History className="w-3.5 h-3.5" /> Histórico
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
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
                          placeholder={title || "Ex: Viagens Incríveis"}
                        />
                      </Field>
                      <Field label="Descrição SEO" hint="Aparece no Google e compartilhamentos">
                        <Textarea
                          value={metaDesc}
                          onChange={(e) => setMetaDesc(e.target.value)}
                          rows={4}
                          placeholder="Ex: Conheça os melhores destinos..."
                        />
                      </Field>
                    </div>
                  )}

                  {tab === "content" && (
                    <div className="space-y-5">
                      <div className="grid gap-4">
                        <Field label="Título interno *">
                          <Input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Minha Nova Página" />
                        </Field>
                        <Field label="URL (Slug)">
                          <Input
                            value={pageSlug}
                            onChange={(e) => setPageSlug(e.target.value)}
                            placeholder={slugify(title) || "minha-pagina"}
                          />
                        </Field>
                      </div>

                      <Field label="Layout Base / Template">
                        <Select value={template} onChange={(e) => setTemplate(e.target.value)}>
                          <option value="default">Padrão / Landing Page</option>
                          <option value="about">Sobre nós</option>
                          <option value="contact">Contato & Suporte</option>
                          <option value="biolink">Biolink (Link na Bio Padrão)</option>
                          <option value="roteiros-landing">Template Roteiro Premium</option>
                          <option value="sobre-nos">Template Sobre Nós Estético</option>
                          <option value="contato-suporte">Template Contato Integrado</option>
                          <option value="hopp-clean">Hopp Wix: Clean Light</option>
                          <option value="hopp-dark">Hopp Wix: Dark Premium</option>
                          <option value="hopp-vibrant">Hopp Wix: Vibrant Color</option>
                        </Select>
                      </Field>

                      {/* Templates Biblioteca visual */}
                      <div className="space-y-4 pt-4 border-t border-border">
                        <label className="text-xs font-semibold text-muted-foreground uppercase">
                          Biblioteca de Templates Prontos
                        </label>
                        <p className="text-[10px] text-muted-foreground leading-normal">
                          Selecione um design pronto abaixo para preencher o canvas instantaneamente com seções de alta conversão.
                        </p>
                        <div className="space-y-2">
                          {CMS_TEMPLATES.map((tpl) => (
                            <button
                              key={tpl.id}
                              type="button"
                              onClick={() => handleApplyTemplate(tpl.id)}
                              className={`w-full text-left p-3 rounded-xl border hover:border-brand/40 transition-all flex flex-col gap-1.5 group
                                ${template === tpl.id ? "bg-brand/5 border-brand/40 ring-1 ring-brand/35" : "bg-surface-alt/40 border-border hover:bg-surface-hover"}`}
                            >
                              <div className="flex justify-between items-center w-full">
                                <span className={`text-xs font-bold transition-colors group-hover:text-brand ${template === tpl.id ? "text-brand" : "text-foreground"}`}>
                                  {tpl.name}
                                </span>
                                <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-surface border text-muted-foreground font-mono">
                                  {tpl.category}
                                </span>
                              </div>
                              <span className="text-[10px] text-muted-foreground leading-normal">
                                {tpl.description}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog />
      <AILandingPageSheet
        open={aiModalOpen}
        onOpenChange={setAiModalOpen}
        onGenerate={(newBlocks: any[]) => {
          const freshBlocks = newBlocks.map((b) => {
            const deepCopiedBlock = JSON.parse(JSON.stringify(b));
            return {
              ...deepCopiedBlock,
              id: `${b.type}-${Math.random().toString(36).substring(2, 9)}`,
            };
          });
          setBlocks([...blocks, ...freshBlocks]);
          if (!title) {
            setTitle("Página Gerada por IA");
          }
        }}
      />
    </div>
  );
}
