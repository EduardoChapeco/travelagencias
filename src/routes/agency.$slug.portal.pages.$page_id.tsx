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
  Users,
  Clock,
  Coins,
  MessageSquare,
  Ticket,
  CloudSun,
  Calendar,
  CreditCard,
  BookOpen,
  Compass,
  Gift,
  Building,
  Upload,
  Mail,
  FileText,
  QrCode,
  Activity,
  Check,
  Plane,
  Monitor,
  Tablet,
  Smartphone,
  ExternalLink,
  PanelLeft,
} from "lucide-react";
import { toast } from "sonner";
import { useAgency } from "@/lib/agency-context";
import { supabase } from "@/integrations/supabase/client";
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
  revertPortalPageVersion,
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
import { CMS_TEMPLATES, getTemplateById } from "@/lib/cms-templates";
import { SheetPage } from "@/components/ui/sheet";

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
      className={`rounded-lg border overflow-hidden transition-all${
        selectedBlockId === block.id
          ? "border-brand bg-surface"
          : "border-border bg-surface-alt/30 hover:border-brand/40"
      }${isDragging ? "opacity-50 ring-2 ring-brand" : ""}`}
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
            className={`text-xs font-semibold uppercase tracking-wider${
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
  const [applyConfirmTemplate, setApplyConfirmTemplate] = useState<any | null>(null);
  const [revertConfirmVersion, setRevertConfirmVersion] = useState<any | null>(null);

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
  const [leftTab, setLeftTab] = useState<"sections" | "templates" | "layers">("sections");
  
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
  const [pageSettingsOpen, setPageSettingsOpen] = useState(false);
  const [seoSettingsOpen, setSeoSettingsOpen] = useState(false);
  const [historySettingsOpen, setHistorySettingsOpen] = useState(false);
  
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [showNewPageModal, setShowNewPageModal] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState("");
  const [newPageSlug, setNewPageSlug] = useState("");
  const [newPageTemplate, setNewPageTemplate] = useState("default");

  const [showRenameModal, setShowRenameModal] = useState<any | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [renameSlug, setRenameSlug] = useState("");

  const { data: allPages, refetch: refetchPages } = useQuery({
    enabled: !!agency,
    queryKey: ["portal-pages", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("portal_pages")
        .select("id, title, slug, template, status")
        .eq("agency_id", agency!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

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

  async function handleCreatePage() {
    if (!newPageTitle.trim()) {
      toast.error("O título é obrigatório");
      return;
    }
    const slugValue = newPageSlug.trim() || slugify(newPageTitle);
    try {
      const { data, error } = await supabase
        .from("portal_pages")
        .insert({
          agency_id: agency!.id,
          title: newPageTitle,
          slug: slugValue,
          template: newPageTemplate,
          status: "draft",
          blocks: [],
          seo: {},
        })
        .select("id")
        .single();

      if (error) throw error;
      toast.success("Página criada com sucesso!");
      setShowNewPageModal(false);
      setNewPageTitle("");
      setNewPageSlug("");
      
      qc.invalidateQueries({ queryKey: ["portal-pages", agency?.id] });
      navigate({
        to: "/agency/$slug/portal/pages/$page_id",
        params: { slug, page_id: data.id },
      });
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar página");
    }
  }

  async function handleRenamePage() {
    if (!showRenameModal) return;
    try {
      const { error } = await supabase
        .from("portal_pages")
        .update({
          title: renameTitle,
          slug: renameSlug || slugify(renameTitle),
        })
        .eq("id", showRenameModal.id);
      if (error) throw error;
      toast.success("Página renomeada");
      setShowRenameModal(null);
      qc.invalidateQueries({ queryKey: ["portal-pages", agency?.id] });
      if (page_id === showRenameModal.id) {
        setTitle(renameTitle);
        setPageSlug(renameSlug || slugify(renameTitle));
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao renomear");
    }
  }

  async function handleDuplicatePage(p: any) {
    try {
      const { data: pageDetails, error: fetchErr } = await supabase
        .from("portal_pages")
        .select("*")
        .eq("id", p.id)
        .single();
      if (fetchErr) throw fetchErr;

      const randomSuffix = Math.random().toString(36).substring(2, 5);
      const newTitle = `${pageDetails.title} (Cópia)`;
      const newSlug = `${pageDetails.slug}-copia-${randomSuffix}`;

      const { data: newPage, error: insertErr } = await supabase
        .from("portal_pages")
        .insert({
          agency_id: agency!.id,
          title: newTitle,
          slug: newSlug,
          blocks: pageDetails.blocks || [],
          seo: pageDetails.seo || {},
          template: pageDetails.template || "default",
          status: "draft",
        })
        .select("id")
        .single();
      if (insertErr) throw insertErr;

      toast.success("Página duplicada com sucesso!");
      qc.invalidateQueries({ queryKey: ["portal-pages", agency?.id] });
      navigate({
        to: "/agency/$slug/portal/pages/$page_id",
        params: { slug, page_id: newPage.id },
      });
    } catch (err: any) {
      toast.error(err.message || "Erro ao duplicar");
    }
  }

  async function handleSetAsHome(p: any) {
    try {
      const { data: existingHome } = await supabase
        .from("portal_pages")
        .select("id, slug")
        .eq("agency_id", agency!.id)
        .eq("slug", "home")
        .maybeSingle();

      if (existingHome && existingHome.id !== p.id) {
        const tempSlug = `home-bkp-${Date.now()}`;
        const { error: updateOldHomeErr } = await supabase
          .from("portal_pages")
          .update({ slug: tempSlug })
          .eq("id", existingHome.id);
        if (updateOldHomeErr) throw updateOldHomeErr;
      }

      const { error: updateNewHomeErr } = await supabase
        .from("portal_pages")
        .update({ slug: "home" })
        .eq("id", p.id);
      if (updateNewHomeErr) throw updateNewHomeErr;

      toast.success("Página definida como Home!");
      qc.invalidateQueries({ queryKey: ["portal-pages", agency?.id] });
      if (page_id === p.id) {
        setPageSlug("home");
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao definir como Home");
    }
  }

  async function handleDeletePage(p: any) {
    if (p.slug === "home" || p.slug === "index" || p.title.toLowerCase() === "início") {
      toast.error("A página de início não pode ser excluída");
      return;
    }
    if (!confirm(`Tem certeza que deseja excluir a página "${p.title}"?`)) {
      return;
    }
    try {
      const { error } = await supabase
        .from("portal_pages")
        .delete()
        .eq("id", p.id);
      if (error) throw error;
      toast.success("Página excluída");
      qc.invalidateQueries({ queryKey: ["portal-pages", agency?.id] });
      if (page_id === p.id) {
        navigate({ to: "/agency/$slug/portal/pages", params: { slug } });
      }
    } catch (err: any) {
      toast.error(err.message || "Erro ao excluir página");
    }
  }

  useEffect(() => {
    if (!hasInitialized || isNew || isLoading || !agency || !initialData) return;

    const hasChanged = 
      title !== (initialData?.title || "") ||
      pageSlug !== (initialData?.slug || "") ||
      template !== (initialData?.template || "default") ||
      metaTitle !== (initialData?.seo?.meta_title || "") ||
      metaDesc !== (initialData?.seo?.meta_description || "") ||
      JSON.stringify(blocks) !== JSON.stringify(initialData?.blocks || []);

    if (!hasChanged) return;

    setSaveStatus("saving");
    const delayDebounce = setTimeout(async () => {
      try {
        setSubmitting(true);
        const finalSlug = pageSlug || slugify(title);
        await savePortalPageDraft(
          agency.id,
          initialData.id,
          false,
          title,
          finalSlug,
          template,
          blocks,
          { meta_title: metaTitle, meta_description: metaDesc },
        );
        setSaveStatus("saved");
        qc.invalidateQueries({ queryKey: ["portal-page", page_id] });
      } catch (err) {
        console.error("Auto-save error:", err);
        setSaveStatus("error");
      } finally {
        setSubmitting(false);
      }
    }, 1500);

    return () => clearTimeout(delayDebounce);
  }, [blocks, title, pageSlug, template, metaTitle, metaDesc, hasInitialized, isNew, agency]);

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
      
      const targetPageId = isNew ? newPageId : page_id;
      qc.invalidateQueries({ queryKey: ["portal-pages", agency?.id] });
      qc.invalidateQueries({ queryKey: ["portal-page", targetPageId] });
      qc.invalidateQueries({ queryKey: ["portal-page-versions", targetPageId] });

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
      qc.invalidateQueries({ queryKey: ["portal-page", newPageId] });
      qc.invalidateQueries({ queryKey: ["portal-page-versions", newPageId] });
      navigate({ to: "/agency/$slug/portal/pages", params: { slug } });
    } catch (err: any) {
      toast.error(err.message || "Erro ao publicar");
    } finally {
      setSubmitting(false);
    }
  }

  function revertVersion(v: any) {
    setRevertConfirmVersion(v);
  }

  function handleApplyTemplate(templateId: string) {
    const tpl = getTemplateById(templateId);
    if (tpl) {
      setApplyConfirmTemplate(tpl);
    }
  }

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden">
      {/* Top Navigation Bar */}
      <div className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-surface px-6 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate({ to: "/agency/$slug/portal/pages", params: { slug } })}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface-alt text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          
          {/* Page Dropdown Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-surface text-sm font-semibold text-foreground hover:bg-surface-hover transition-colors cursor-pointer select-none">
                <span>Página: {title || "Nova Página"}</span>
                <span className="text-muted-foreground text-[10px]">▼</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              <DropdownMenuLabel>Alternar Página</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allPages?.map((p) => {
                const isActive = p.id === page_id;
                return (
                  <DropdownMenuItem
                    key={p.id}
                    className={`flex items-center justify-between gap-2 cursor-pointer${isActive ? "bg-brand/10 text-brand font-medium" : ""}`}
                    onClick={() => {
                      if (!isActive) {
                        navigate({
                          to: "/agency/$slug/portal/pages/$page_id",
                          params: { slug, page_id: p.id },
                        });
                      }
                    }}
                  >
                    <span className="truncate flex-1">{p.title}</span>
                    {p.slug === "home" && <span className="text-[9px] bg-brand text-brand-foreground font-semibold px-1 rounded shrink-0">Home</span>}
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer font-bold text-brand hover:text-brand focus:text-brand"
                onClick={() => setShowNewPageModal(true)}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Adicionar Página
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Active Page Options Button */}
          {!isNew && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-muted-foreground hover:bg-surface-hover hover:text-foreground transition-colors cursor-pointer">
                  <Settings className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel>Opções da Página</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    const activePage = allPages?.find((p) => p.id === page_id);
                    if (activePage) {
                      setShowRenameModal(activePage);
                      setRenameTitle(activePage.title);
                      setRenameSlug(activePage.slug);
                    }
                  }}
                >
                  Renomear
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const activePage = allPages?.find((p) => p.id === page_id);
                    if (activePage) {
                      handleDuplicatePage(activePage);
                    }
                  }}
                >
                  Duplicar
                </DropdownMenuItem>
                {pageSlug !== "home" && (
                  <DropdownMenuItem
                    onClick={() => {
                      const activePage = allPages?.find((p) => p.id === page_id);
                      if (activePage) {
                        handleSetAsHome(activePage);
                      }
                    }}
                  >
                    Definir como Home
                  </DropdownMenuItem>
                )}
                {pageSlug !== "home" && title.toLowerCase() !== "início" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        const activePage = allPages?.find((p) => p.id === page_id);
                        if (activePage) {
                          handleDeletePage(activePage);
                        }
                      }}
                      className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                    >
                      Excluir Página
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {!isNew && initialData?.is_published && (
            <StatusBadge tone="success">Publicada</StatusBadge>
          )}
          {!isNew && !initialData?.is_published && (
            <StatusBadge tone="neutral">Rascunho</StatusBadge>
          )}
        </div>

        {/* Viewport controls inside header */}
        <div className="flex items-center bg-surface-alt/45 border border-border p-0.5 rounded-lg gap-0.5">
          <button
            onClick={() => setViewport("desktop")}
            title="Modo Desktop"
            className={`p-1.5 rounded-md transition-colors cursor-pointer${viewport === "desktop" ? "bg-surface text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Monitor className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewport("tablet")}
            title="Modo Tablet"
            className={`p-1.5 rounded-md transition-colors cursor-pointer${viewport === "tablet" ? "bg-surface text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Tablet className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setViewport("mobile")}
            title="Modo Celular"
            className={`p-1.5 rounded-md transition-colors cursor-pointer${viewport === "mobile" ? "bg-surface text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Smartphone className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          {saveStatus === "saving" && <span className="text-xs text-muted-foreground animate-pulse mr-2">Salvando...</span>}
          {saveStatus === "saved" && <span className="text-xs text-green-500 font-medium mr-2">✓ Salvo</span>}
          {saveStatus === "error" && <span className="text-xs text-destructive font-medium mr-2">✗ Erro ao salvar</span>}
          
          <div className="flex items-center gap-1 border-r border-border pr-3">
            {/* Left Sidebar Toggle Button */}
            <button
              onClick={() => setIsLeftSidebarOpen(!isLeftSidebarOpen)}
              title={isLeftSidebarOpen ? "Recolher Biblioteca" : "Expandir Biblioteca"}
              className={`p-1.5 rounded-md border border-border transition-colors hover:bg-surface-alt cursor-pointer${isLeftSidebarOpen ? "bg-surface-alt/70 text-foreground" : "bg-surface text-muted-foreground"}`}
            >
              <PanelLeft className="h-4 w-4" />
            </button>

            {/* Global Config Toggles */}
            <button
              onClick={() => setPageSettingsOpen(true)}
              title="Configurações da Página"
              className="p-1.5 rounded-md border border-border bg-surface text-muted-foreground hover:bg-surface-alt hover:text-foreground transition-colors cursor-pointer"
            >
              <Settings className="h-4 w-4" />
            </button>
            
            <button
              onClick={() => setSeoSettingsOpen(true)}
              title="Configurações SEO"
              className="p-1.5 rounded-md border border-border bg-surface text-muted-foreground hover:bg-surface-alt hover:text-foreground transition-colors cursor-pointer"
            >
              <Globe className="h-4 w-4" />
            </button>
            
            {!isNew && (
              <button
                onClick={() => setHistorySettingsOpen(true)}
                title="Histórico de Versões"
                className="p-1.5 rounded-md border border-border bg-surface text-muted-foreground hover:bg-surface-alt hover:text-foreground transition-colors cursor-pointer"
              >
                <History className="h-4 w-4" />
              </button>
            )}
            
            {!isNew && (
              <a
                href={`https://${agency.slug}.travelos.com/${pageSlug || slugify(title)}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Visualizar Página Ao Vivo"
                className="p-1.5 rounded-md border border-border bg-surface text-muted-foreground hover:bg-surface-alt hover:text-foreground transition-colors cursor-pointer flex items-center justify-center"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </div>

          <GhostButton type="button" onClick={saveDraftOnly} disabled={submitting}>
            Salvar Rascunho
          </GhostButton>
          <PrimaryButton type="button" onClick={publishPage} disabled={submitting}>
            {submitting ? "Salvando..." : "Publicar Página"}
          </PrimaryButton>
        </div>
      </div>

      {/* Main 3-Column Studio Area */}
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* ── 1. LEFT SIDEBAR: Biblioteca de Seções & Camadas (width 320px) ── */}
        {isLeftSidebarOpen && (
          <div className="w-[320px] flex-shrink-0 border-r border-border bg-surface flex flex-col overflow-hidden">
          {/* Seletor de Abas Esquerdo */}
          <div className="flex border-b border-border bg-surface-alt/10 shrink-0 select-none p-1 gap-1">
            <button
              type="button"
              onClick={() => setLeftTab("sections")}
              className={`flex-1 py-1.5 rounded-lg text-center text-[11px] font-bold transition-all${
                leftTab === "sections"
                  ? "bg-background text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-alt/50"
              }`}
            >
              Seções
            </button>
            <button
              type="button"
              onClick={() => setLeftTab("templates")}
              className={`flex-1 py-1.5 rounded-lg text-center text-[11px] font-bold transition-all${
                leftTab === "templates"
                  ? "bg-background text-brand border border-brand/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-alt/50"
              }`}
            >
              Templates
            </button>
            <button
              type="button"
              onClick={() => setLeftTab("layers")}
              className={`flex-1 py-1.5 rounded-lg text-center text-[11px] font-bold transition-all${
                leftTab === "layers"
                  ? "bg-background text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-alt/50"
              }`}
            >
              Camadas ({blocks.length})
            </button>
          </div>

          {/* ABA 1: SEÇÕES */}
          {leftTab === "sections" && (
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 space-y-4 scrollbar-thin">
              <div>
                <h4 className="text-xs font-bold text-foreground">Biblioteca de Seções</h4>
                <p className="text-[10px] text-muted-foreground leading-normal mt-0.5">
                  Adicione novos blocos visuais arrastáveis ao layout de sua página.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(BLOCK_LABELS) as PortalBlockType[]).map((type) => {
                  let IconComponent = LayoutTemplate;
                  if (type === "text") IconComponent = Type;
                  else if (type === "gallery" || type === "biolink_header") IconComponent = ImageIcon;
                  else if (type === "contact") IconComponent = PhoneCall;
                  else if (type === "features" || type === "biolink_links") IconComponent = ListPlus;
                  else if (type === "cta" || type === "promotional_banner" || type === "news_announcements_ticker") IconComponent = Megaphone;
                  else if (type === "faq" || type === "support_ticket_form" || type === "travel_tips_faq" || type === "faq_category_accordion") IconComponent = HelpCircle;
                  else if (type === "testimonials" || type === "live_reviews" || type === "reviews_submission_form") IconComponent = Quote;
                  else if (type === "tours_grid" || type === "tours_carousel") IconComponent = Bus;
                  else if (type === "stats") IconComponent = BarChart2;
                  else if (type === "video") IconComponent = Play;
                  else if (type === "map" || type === "dynamic_map_route") IconComponent = Map;
                  else if (type === "blog_feed") IconComponent = Rss;
                  else if (type === "featured_destination_filter") IconComponent = Globe;
                  else if (type === "team_widget" || type === "agent_profile_card") IconComponent = Users;
                  else if (type === "whatsapp_departments" || type === "whatsapp_floating_bubble") IconComponent = MessageSquare;
                  else if (type === "countdown_tour" || type === "live_sales_counter" || type === "client_boarding_timeline") IconComponent = Clock;
                  else if (type === "exchange_rates" || type === "currency_calculator") IconComponent = Coins;
                  else if (type === "agency_vouchers") IconComponent = Ticket;
                  else if (type === "weather_forecast") IconComponent = CloudSun;
                  else if (type === "itinerary_timeline") IconComponent = Calendar;
                  else if (type === "lead_capture_callback") IconComponent = PhoneCall;
                  else if (type === "payment_gateways_display") IconComponent = CreditCard;
                  else if (type === "live_tours_map" || type === "custom_package_lead_builder") IconComponent = Compass;
                  else if (type === "gift_cards_store") IconComponent = Gift;
                  else if (type === "corporate_rfp_form") IconComponent = Building;
                  else if (type === "client_document_upload") IconComponent = Upload;
                  else if (type === "biolink_newsletter_box") IconComponent = Mail;
                  else if (type === "visa_checker") IconComponent = FileText;
                  else if (type === "insurance_simulator") IconComponent = Activity;
                  else if (type === "agency_badges_trust") IconComponent = Check;
                  else if (type === "interactive_flight_tracker") IconComponent = Plane;
                  else if (type === "biolink_qr_code_share") IconComponent = QrCode;

                  const isBiolinkType = type.startsWith("biolink_");

                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => addBlock(type)}
                      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all hover:scale-[1.03] active:scale-95 group hover:border-brand/50 hover:bg-brand/5${isBiolinkType ? "bg-brand/5 border-brand/20 text-brand" : "bg-surface border-border text-muted-foreground hover:text-foreground"}`}
                    >
                      <IconComponent className={`h-5 w-5 mb-1.5 transition-colors group-hover:text-brand${isBiolinkType ? "text-brand" : "text-muted-foreground"}`} />
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
                className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-brand/20 bg-brand/5 py-2 text-xs font-bold text-brand hover:bg-brand/10 transition-colors"
              >
                <Sparkles className="h-3.5 w-3.5" /> Auto-gerar com IA
              </button>
            </div>
          )}

          {/* ABA 2: TEMPLATES */}
          {leftTab === "templates" && (
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-4 space-y-4 scrollbar-thin">
              <div>
                <h4 className="text-xs font-bold text-foreground">Designs Prontos</h4>
                <p className="text-[10px] text-muted-foreground leading-normal mt-0.5">
                  Substitua a estrutura atual por um template profissional em um clique.
                </p>
              </div>

              <div className="space-y-2">
                {CMS_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleApplyTemplate(tpl.id)}
                    className={`w-full text-left p-3 rounded-xl border hover:border-brand/40 transition-all flex flex-col gap-1.5 group${template === tpl.id ? "bg-brand/5 border-brand/40 ring-1 ring-brand/35" : "bg-surface-alt/40 border-border hover:bg-surface-hover"}`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className={`text-xs font-bold transition-colors group-hover:text-brand${template === tpl.id ? "text-brand" : "text-foreground"}`}>
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
          )}

          {/* ABA 3: CAMADAS */}
          {leftTab === "layers" && (
            <div className="flex-1 flex flex-col min-h-0">
              <div className="px-4 py-3 border-b border-border bg-surface-alt/10 flex justify-between items-center shrink-0">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" /> Ordenar Seções
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
                      Adicione seções pela aba "Seções" ou selecione um template em "Templates".
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
          )}
        </div>
        )}

        {/* ── 2. CENTER CANVAS: Live page preview simulation (flex-1) ── */}
        <div className="flex-1 bg-surface-alt/30 relative overflow-hidden flex flex-col items-center justify-start pt-4 px-4 pb-4 min-h-0 h-full">
          {/* Browser / Device Mockup Frame */}
          <div
            className={`flex-1 min-h-0 bg-surface border border-border rounded-2xl overflow-y-auto ring-1 ring-border/5 relative transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)]${
              viewport === "desktop"
                ? "w-full max-w-5xl"
                : viewport === "tablet"
                  ? "w-[768px]"
                  : "w-[390px]"
            }`}
          >
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

        {/* ── 3. RIGHT SIDEBAR: Editor de Propriedades (width 360px) ── */}
        {selectedBlockId && (
          <div className="w-[360px] flex-shrink-0 border-l border-border bg-surface flex flex-col overflow-hidden">
            {/* A: Edição do Bloco Selecionado */}
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
          </div>
        )}
      </div>

      {/* Visual template application confirm Sheet */}
      <SheetPage
        isOpen={!!applyConfirmTemplate}
        onClose={() => setApplyConfirmTemplate(null)}
        title="Aplicar Template"
        width="400px"
      >
        <div className="space-y-4 py-2">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Tem certeza que deseja aplicar o template <strong>{applyConfirmTemplate?.name}</strong>?
          </p>
          <p className="text-xs text-muted-foreground">
            Todos os blocos de seções atuais no canvas serão substituídos pela estrutura desse template.
          </p>
          <div className="pt-6 border-t border-border mt-6 flex justify-end gap-2">
            <GhostButton
              type="button"
              onClick={() => setApplyConfirmTemplate(null)}
            >
              Cancelar
            </GhostButton>
            <PrimaryButton
              type="button"
              onClick={() => {
                if (!applyConfirmTemplate) return;
                const freshBlocks = applyConfirmTemplate.blocks.map((b: any) => {
                  const deepCopiedBlock = JSON.parse(JSON.stringify(b));
                  return {
                    ...deepCopiedBlock,
                    id: `${b.type}-${Math.random().toString(36).substring(2, 9)}`,
                  };
                });
                setBlocks(freshBlocks as any);
                setTemplate(applyConfirmTemplate.id);
                if (!pageSlug) {
                  setPageSlug(applyConfirmTemplate.id);
                }
                setApplyConfirmTemplate(null);
                toast.success(`Template "${applyConfirmTemplate.name}" aplicado!`);
              }}
            >
              Aplicar Template
            </PrimaryButton>
          </div>
        </div>
      </SheetPage>

      {/* Visual version reversion confirm Sheet */}
      <SheetPage
        isOpen={!!revertConfirmVersion}
        onClose={() => setRevertConfirmVersion(null)}
        title="Reverter Versão"
        width="400px"
      >
        <div className="space-y-4 py-2">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Tem certeza que deseja reverter a página para a versão salva em{" "}
            <strong>{revertConfirmVersion && new Date(revertConfirmVersion.created_at).toLocaleString()}</strong>?
          </p>
          <p className="text-xs text-muted-foreground">
            Todo o conteúdo atual no editor será substituído pelo conteúdo desta versão.
          </p>
          <div className="pt-6 border-t border-border mt-6 flex justify-end gap-2">
            <GhostButton
              type="button"
              onClick={() => setRevertConfirmVersion(null)}
            >
              Cancelar
            </GhostButton>
            <PrimaryButton
              type="button"
              disabled={submitting}
              onClick={async () => {
                if (!revertConfirmVersion) return;
                setSubmitting(true);
                try {
                  await revertPortalPageVersion(page_id, revertConfirmVersion.id);
                  toast.success("Página revertida para a versão selecionada!");
                  
                  // Invalidate cache immediately
                  await qc.invalidateQueries({ queryKey: ["portal-page", page_id] });
                  await qc.invalidateQueries({ queryKey: ["portal-page-versions", page_id] });
                  
                  // Reset initialization flag to force reload of fresh values
                  setHasInitialized(false);
                  
                  setTab("content");
                  setRevertConfirmVersion(null);
                } catch (err: any) {
                  toast.error(err.message || "Erro ao reverter versão");
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {submitting ? "Revertendo..." : "Confirmar Reversão"}
            </PrimaryButton>
          </div>
        </div>
      </SheetPage>

      {/* Page Settings Drawer Sheet */}
      <SheetPage
        isOpen={pageSettingsOpen}
        onClose={() => setPageSettingsOpen(false)}
        title="Configurações da Página"
        width="450px"
      >
        <div className="space-y-5 py-2">
          <div className="text-xs text-muted-foreground">
            Ajuste as propriedades básicas de identificação interna e URL desta página.
          </div>
          <div className="space-y-4">
            <Field label="Título interno *">
              <Input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Minha Nova Página"
              />
            </Field>
            <Field label="URL (Slug)">
              <Input
                value={pageSlug}
                onChange={(e) => setPageSlug(e.target.value)}
                placeholder={slugify(title) || "minha-pagina"}
                disabled={pageSlug === "home"}
              />
            </Field>
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
          </div>
          <div className="pt-6 border-t border-border mt-6 flex justify-end">
            <PrimaryButton type="button" onClick={() => setPageSettingsOpen(false)}>
              Concluído
            </PrimaryButton>
          </div>
        </div>
      </SheetPage>

      {/* SEO Settings Drawer Sheet */}
      <SheetPage
        isOpen={seoSettingsOpen}
        onClose={() => setSeoSettingsOpen(false)}
        title="Configurações SEO"
        width="450px"
      >
        <div className="space-y-5 py-2">
          <div className="text-xs text-muted-foreground">
            Otimize como os mecanismos de busca (Google, Bing) e redes sociais exibem esta página.
          </div>
          <div className="space-y-4">
            <Field label="Título SEO" hint="Substitui o título padrão na aba do navegador">
              <Input
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder={title || "Ex: Viagens Incríveis"}
              />
            </Field>
            <Field label="Descrição SEO" hint="Aparece no Google e compartilhamentos de redes sociais">
              <Textarea
                value={metaDesc}
                onChange={(e) => setMetaDesc(e.target.value)}
                rows={5}
                placeholder="Ex: Conheça os melhores destinos..."
              />
            </Field>
          </div>
          <div className="pt-6 border-t border-border mt-6 flex justify-end">
            <PrimaryButton type="button" onClick={() => setSeoSettingsOpen(false)}>
              Concluído
            </PrimaryButton>
          </div>
        </div>
      </SheetPage>

      {/* History Settings Drawer Sheet */}
      <SheetPage
        isOpen={historySettingsOpen}
        onClose={() => setHistorySettingsOpen(false)}
        title="Histórico de Versões"
        width="450px"
      >
        <div className="space-y-4 py-2">
          <div className="text-xs text-muted-foreground">
            Selecione uma das versões anteriores salvas automaticamente ou publicadas para restaurar seu conteúdo.
          </div>
          {versionsQuery.isLoading && (
            <div className="text-xs text-muted-foreground">Carregando histórico...</div>
          )}
          {versionsQuery.data?.length === 0 && (
            <div className="text-xs text-muted-foreground">Nenhuma versão salva ainda.</div>
          )}
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {versionsQuery.data?.map((v) => (
              <div
                key={v.id}
                className="flex flex-col gap-2 p-3 rounded-lg border border-border bg-surface-alt/30"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-sm font-semibold">{v.title}</span>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(v.created_at).toLocaleString("pt-BR")}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      revertVersion(v);
                      setHistorySettingsOpen(false);
                    }}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                  >
                    <History className="w-3.5 h-3.5" /> Reverter
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="pt-6 border-t border-border mt-6 flex justify-end">
            <GhostButton type="button" onClick={() => setHistorySettingsOpen(false)}>
              Fechar
            </GhostButton>
          </div>
        </div>
      </SheetPage>

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

      {showNewPageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-sm font-bold text-foreground">Criar Nova Página</h3>
            <div className="space-y-3">
              <Field label="Título da Página">
                <Input
                  value={newPageTitle}
                  onChange={(e) => {
                    setNewPageTitle(e.target.value);
                    setNewPageSlug(slugify(e.target.value));
                  }}
                  placeholder="Ex: Nossos Serviços"
                />
              </Field>
              <Field label="URL (Slug)">
                <Input
                  value={newPageSlug}
                  onChange={(e) => setNewPageSlug(e.target.value)}
                  placeholder="Ex: nossos-servicos"
                />
              </Field>
              <Field label="Template / Layout Inicial">
                <Select value={newPageTemplate} onChange={(e) => setNewPageTemplate(e.target.value)}>
                  <option value="default">Padrão / Em branco</option>
                  <option value="about">Sobre nós</option>
                  <option value="contact">Contato & Suporte</option>
                  <option value="biolink">Biolink (Link na Bio)</option>
                </Select>
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <GhostButton type="button" onClick={() => setShowNewPageModal(false)}>
                Cancelar
              </GhostButton>
              <PrimaryButton type="button" onClick={handleCreatePage}>
                Criar Página
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}

      {showRenameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-sm font-bold text-foreground">Renomear Página</h3>
            <div className="space-y-3">
              <Field label="Título da Página">
                <Input
                  value={renameTitle}
                  onChange={(e) => setRenameTitle(e.target.value)}
                />
              </Field>
              <Field label="URL (Slug)">
                <Input
                  value={renameSlug}
                  onChange={(e) => setRenameSlug(e.target.value)}
                  disabled={showRenameModal.slug === "home"}
                />
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <GhostButton type="button" onClick={() => setShowRenameModal(null)}>
                Cancelar
              </GhostButton>
              <PrimaryButton type="button" onClick={handleRenamePage}>
                Salvar Alterações
              </PrimaryButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
