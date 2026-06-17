import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  ExternalLink,
  Globe,
  Copy,
  LayoutTemplate,
  Sparkles,
  Search,
  ArrowRight,
  Eye,
  MousePointerClick,
  TrendingUp,
  Laptop,
  Smartphone,
  ChevronRight,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { StatusBadge, Input, Select, PrimaryButton, GhostButton } from "@/components/ui/form";
import { CMS_TEMPLATES, getTemplateById } from "@/lib/cms-templates";
import { savePortalPageDraft } from "@/services/portal";
import { SheetPage } from "@/components/ui/sheet";
import { HeaderPortal } from "@/components/shell/HeaderPortal";

export const Route = createFileRoute("/agency/$slug/portal/pages/")({
  head: () => ({ meta: [{ title: "Painel de Páginas do Portal · TravelOS" }] }),
  component: PagesPage,
});

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

function PageMiniPreview({ template }: { template: string | null }) {
  const isBiolink =
    template === "biolink" ||
    template?.includes("hopp") ||
    template === "hopp-clean" ||
    template === "hopp-dark" ||
    template === "hopp-vibrant";

  if (isBiolink) {
    const isDark = template === "hopp-dark";
    const isVibrant = template === "hopp-vibrant";

    return (
      <div
        className={`w-full h-28 rounded-sm flex flex-col items-center justify-center p-3 gap-1.5 overflow-hidden transition-all duration-300 border border-border/40 relative group-hover:scale-[1.02] select-none${
          isDark
            ? "bg-slate-900 border-slate-800"
            : isVibrant
              ? "bg-indigo-600 border-indigo-500"
              : "bg-slate-50 border-slate-200"
        }`}
      >
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black border${
            isDark
              ? "bg-slate-800 border-slate-700 text-slate-200"
              : isVibrant
                ? "bg-white/20 border-white/30 text-white"
                : "bg-indigo-100 border-indigo-200 text-indigo-600"
          }`}
        >
          P
        </div>
        <div
          className={`w-14 h-1.5 rounded-full${
            isDark ? "bg-slate-700" : isVibrant ? "bg-white/30" : "bg-slate-300"
          }`}
        ></div>
        <div
          className={`w-4/5 h-3 rounded-xs border${
            isDark
              ? "bg-slate-800 border-slate-700"
              : isVibrant
                ? "bg-white/10 border-white/20"
                : "bg-white border-slate-200"
          }`}
        ></div>
        <div
          className={`w-4/5 h-3 rounded-xs border${
            isDark
              ? "bg-slate-800 border-slate-700"
              : isVibrant
                ? "bg-white/10 border-white/20"
                : "bg-white border-slate-200"
          }`}
        ></div>
      </div>
    );
  }

  // Render standard site mini view
  return (
    <div className="w-full h-28 rounded-sm bg-gradient-to-b from-slate-50 to-slate-100/50 border border-slate-200 flex flex-col p-2.5 gap-2 overflow-hidden transition-all duration-300 group-hover:scale-[1.02] select-none">
      {/* Mock Header */}
      <div className="flex justify-between items-center w-full border-b border-slate-200/60 pb-1.5 shrink-0">
        <div className="w-6 h-2 bg-indigo-500/20 rounded-full"></div>
        <div className="flex gap-1.5">
          <div className="w-3.5 h-1 bg-slate-300/60 rounded-full"></div>
          <div className="w-3.5 h-1 bg-slate-300/60 rounded-full"></div>
        </div>
      </div>
      {/* Mock Hero Block */}
      <div className="flex-1 rounded-sm bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100/40 p-2 flex flex-col justify-center gap-1.5">
        <div className="w-16 h-2 bg-indigo-500/30 rounded-full"></div>
        <div className="w-24 h-1.5 bg-slate-400/20 rounded-full"></div>
        <div className="flex gap-1 mt-0.5">
          <div className="w-4 h-3 rounded-xs bg-indigo-500/20"></div>
          <div className="w-4 h-3 rounded-xs bg-indigo-500/20"></div>
          <div className="w-4 h-3 rounded-xs bg-indigo-500/20"></div>
        </div>
      </div>
    </div>
  );
}

function PagesPage() {
  const { agency } = useAgency();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"all" | "sites" | "biolinks" | "templates">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Create modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteConfirmPage, setDeleteConfirmPage] = useState<PageRow | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("empty");
  const [newPageTitle, setNewPageTitle] = useState("");
  const [newPageSlug, setNewPageSlug] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Load pages query
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

  // Load analytics counts safely
  const analyticsQ = useQuery({
    enabled: !!agency,
    queryKey: ["portal-analytics-summary", agency?.id],
    queryFn: async () => {
      try {
        const { data, error } = await (supabase as any)
          .from("portal_page_analytics")
          .select("page_id, event_type")
          .eq("agency_id", agency!.id);
        if (error) {
          console.warn("Analytics not loaded or RLS restriction:", error);
          return { stats: {}, totalViews: 0, totalClicks: 0 };
        }

        const stats: Record<string, { views: number; clicks: number }> = {};
        let totalViews = 0;
        let totalClicks = 0;

        if (data) {
          for (const row of data) {
            if (!stats[row.page_id]) {
              stats[row.page_id] = { views: 0, clicks: 0 };
            }
            if (row.event_type === "view") {
              stats[row.page_id].views++;
              totalViews++;
            } else if (row.event_type === "click") {
              stats[row.page_id].clicks++;
              totalClicks++;
            }
          }
        }
        return { stats, totalViews, totalClicks };
      } catch (e) {
        console.warn("Analytics fallback triggered:", e);
        return { stats: {}, totalViews: 0, totalClicks: 0 };
      }
    },
  });

  // Actions
  async function togglePublish(p: PageRow) {
    if (p.is_published) {
      const { error } = await supabase
        .from("portal_pages")
        .update({ is_published: false })
        .eq("id", p.id);
      if (error) return toast.error(error.message);
      toast.success("Página despublicada");
    } else {
      const { error } = await (supabase as any).rpc("publish_portal_page", { p_page_id: p.id });
      if (error) return toast.error(error.message);
      toast.success("Página publicada com sucesso!");
    }
    qc.invalidateQueries({ queryKey: ["portal-pages", agency?.id] });
  }

  function deletePage(p: PageRow) {
    setDeleteConfirmPage(p);
  }

  async function handleDeleteConfirm() {
    if (!deleteConfirmPage) return;
    const pageId = deleteConfirmPage.id;
    setDeleteConfirmPage(null);

    const { error } = await supabase.from("portal_pages").delete().eq("id", pageId);
    if (error) return toast.error(error.message);
    toast.success("Página excluída permanentemente");
    qc.invalidateQueries({ queryKey: ["portal-pages", agency?.id] });
    analyticsQ.refetch();
  }

  async function handleDuplicate(p: PageRow) {
    const { error } = await (supabase as any).rpc("duplicate_portal_page", { p_page_id: p.id });
    if (error) return toast.error(error.message);
    toast.success("Página duplicada com sucesso");
    qc.invalidateQueries({ queryKey: ["portal-pages", agency?.id] });
  }

  // Handle title edit change in creation modal to sync slug
  function handleTitleChange(val: string) {
    setNewPageTitle(val);
    setNewPageSlug(slugify(val));
  }

  // Creation logic
  async function handleCreatePage(e: React.FormEvent) {
    e.preventDefault();
    if (!newPageTitle.trim()) {
      return toast.error("O título é obrigatório");
    }
    setSubmitting(true);

    try {
      const finalSlug = newPageSlug || slugify(newPageTitle);
      
      // Determine template blocks
      let initialBlocks: any[] = [];
      let templateName = "default";
      let metaDescription = "Minha página institucional.";

      if (selectedTemplateId !== "empty") {
        const selectedTpl = getTemplateById(selectedTemplateId);
        if (selectedTpl) {
          initialBlocks = JSON.parse(JSON.stringify(selectedTpl.blocks)); // Deep copy
          templateName = selectedTpl.id;
          metaDescription = selectedTpl.description;
        }
      }

      const newPageId = await savePortalPageDraft(
        agency!.id,
        null, // isNew = true
        true,
        newPageTitle,
        finalSlug,
        templateName,
        initialBlocks,
        { meta_title: newPageTitle, meta_description: metaDescription }
      );

      toast.success("Página criada com sucesso!");
      qc.invalidateQueries({ queryKey: ["portal-pages", agency?.id] });
      setCreateModalOpen(false);
      
      // Redirect to visual builder
      navigate({
        to: "/agency/$slug/portal/pages/$page_id",
        params: { slug: agency!.slug, page_id: newPageId },
      });
    } catch (err: any) {
      toast.error(err.message || "Erro ao criar página");
    } finally {
      setSubmitting(false);
    }
  }

  function openCreateWithTemplate(templateId: string) {
    const tpl = getTemplateById(templateId);
    setSelectedTemplateId(templateId);
    setNewPageTitle(tpl ? `Nova ${tpl.name}` : "Minha Nova Página");
    setNewPageSlug(tpl ? slugify(`Nova ${tpl.name}`) : "nova-pagina");
    setCreateModalOpen(true);
  }

  // Filter pages
  const allPages = q.data || [];
  const filteredPages = allPages.filter((p) => {
    // Search filter
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      if (!p.title.toLowerCase().includes(query) && !p.slug.toLowerCase().includes(query)) {
        return false;
      }
    }

    const isBiolink =
      p.template === "biolink" ||
      p.template?.includes("hopp") ||
      p.template === "hopp-clean" ||
      p.template === "hopp-dark" ||
      p.template === "hopp-vibrant";

    if (activeTab === "sites") return !isBiolink;
    if (activeTab === "biolinks") return isBiolink;
    return true;
  });

  // Statistics
  const totalPages = allPages.length;
  const totalViews = analyticsQ.data?.totalViews || 0;
  const totalClicks = analyticsQ.data?.totalClicks || 0;
  const globalCtr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : "0.0";

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <HeaderPortal>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedTemplateId("empty");
              setNewPageTitle("");
              setNewPageSlug("");
              setCreateModalOpen(true);
            }}
            className="flex h-8 items-center gap-1.5 rounded-md bg-brand px-3 text-xs font-semibold text-brand-foreground hover:bg-brand/90 transition-colors cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Nova Página
          </button>
        </div>
      </HeaderPortal>

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center border-b border-border bg-surface/50 px-4 md:px-6 py-3 shrink-0 justify-between">
        <div className="flex flex-wrap gap-1 bg-surface p-0.5 rounded-sm border border-border text-xs overflow-x-auto no-scrollbar shrink-0">
          {(["all", "sites", "biolinks", "templates"] as const).map((tabId) => {
            const labels = {
              all: "Todas as Páginas",
              sites: "Websites & Landing Pages",
              biolinks: "Links na Bio",
              templates: "Biblioteca de Templates"
            };
            return (
              <button
                key={tabId}
                onClick={() => setActiveTab(tabId)}
                className={`rounded-xs px-2.5 py-1 font-semibold transition-colors shrink-0 cursor-pointer${
                  activeTab === tabId
                    ? "bg-surface-alt text-foreground border border-border/50"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {labels[tabId]}
              </button>
            );
          })}
        </div>

        {activeTab !== "templates" && (
          <div className="relative w-full sm:w-64">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none">
              <Search className="h-3.5 w-3.5" />
            </span>
            <input
              type="text"
              placeholder="Buscar por título ou link..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-full rounded-sm border border-border bg-surface pl-8 pr-3 text-xs outline-none focus:border-brand text-foreground placeholder:text-muted-foreground/60"
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 min-h-0 space-y-6">
        {/* Modern Analytics & Highlight Row */}
        {agency && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md border border-border/60 bg-surface p-5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Páginas Criadas</span>
                <h3 className="text-2xl font-black text-foreground mt-1">{totalPages}</h3>
              </div>
              <div className="p-3 rounded-sm bg-indigo-50 text-indigo-600">
                <LayoutTemplate className="h-5 w-5" />
              </div>
            </div>

            <div className="rounded-md border border-border/60 bg-surface p-5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Visualizações</span>
                <h3 className="text-2xl font-black text-foreground mt-1">{totalViews}</h3>
              </div>
              <div className="p-3 rounded-sm bg-emerald-50 text-emerald-600">
                <Eye className="h-5 w-5" />
              </div>
            </div>

            <div className="rounded-md border border-border/60 bg-surface p-5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Cliques em Links</span>
                <h3 className="text-2xl font-black text-foreground mt-1">{totalClicks}</h3>
              </div>
              <div className="p-3 rounded-sm bg-sky-50 text-sky-600">
                <MousePointerClick className="h-5 w-5" />
              </div>
            </div>

            <div className="rounded-md border border-border/60 bg-surface p-5 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">CTR Geral</span>
                <h3 className="text-2xl font-black text-foreground mt-1">{globalCtr}%</h3>
              </div>
              <div className="p-3 rounded-sm bg-amber-50 text-amber-600">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>
          </div>
        )}

      {/* Content list representation */}
      {q.isLoading && <div className="text-sm text-muted-foreground">Carregando dados...</div>}

      {/* TAB: TEMPLATES */}
      {activeTab === "templates" && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div>
            <h3 className="text-sm font-bold text-foreground">Biblioteca de Designs Prontos</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Comece com uma estrutura visual profissional e altere os blocos em nosso editor arrasta-e-solta.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {CMS_TEMPLATES.map((tpl) => {
              const isBiolink = tpl.category === "biolink";
              return (
                <div
                  key={tpl.id}
                  className="group relative flex flex-col justify-between rounded-md border border-border/60 bg-surface p-5 transition-all duration-300 hover:border-brand/40 hover:-translate-y-0.5"
                >
                  <div className="space-y-4">
                    {/* Visual Preview Block */}
                    <div className="relative overflow-hidden rounded-sm">
                      <PageMiniPreview template={tpl.id} />
                      <div className="absolute top-2 right-2 rounded-full px-2 py-0.5 text-[9px] uppercase font-black font-mono tracking-wider bg-background border text-foreground">
                        {isBiolink ? "Biolink" : "Website"}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-foreground transition-colors group-hover:text-brand">
                        {tpl.name}
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {tpl.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-border/40">
                    <button
                      onClick={() => openCreateWithTemplate(tpl.id)}
                      className="w-full flex items-center justify-center gap-1 py-2 rounded-sm border border-brand/20 bg-brand/5 text-xs font-bold text-brand group-hover:bg-brand group-hover:text-brand-foreground group-hover:border-transparent transition-all"
                    >
                      Usar este design <ArrowRight className="h-3.5 w-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TABS: SITES & BIOLINKS lists */}
      {activeTab !== "templates" && (
        <>
          {filteredPages.length === 0 && !q.isLoading && (
            <div className="rounded-md border border-dashed border-border/80 bg-surface-alt/10 p-12 text-center flex flex-col items-center justify-center max-w-lg mx-auto mt-6 animate-in fade-in duration-300">
              <LayoutTemplate className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <h4 className="font-bold text-sm text-foreground">Nenhuma página encontrada</h4>
              <p className="text-xs text-muted-foreground max-w-xs mt-1">
                {searchQuery.trim() !== ""
                  ? "Tente alterar os termos da busca para encontrar páginas registradas."
                  : "Você ainda não possui páginas criadas nesta categoria. Comece criando uma em branco ou usando um template pronto."}
              </p>
              {searchQuery.trim() === "" && (
                <div className="flex gap-2 mt-5">
                  <button
                    onClick={() => setActiveTab("templates")}
                    className="flex h-9 items-center gap-1.5 rounded-sm border border-border bg-surface hover:bg-surface-hover px-4 text-xs font-semibold text-foreground transition-all"
                  >
                    <LayoutTemplate className="h-3.5 w-3.5" /> Escolher Template
                  </button>
                  <button
                    onClick={() => {
                      setSelectedTemplateId("empty");
                      setNewPageTitle("");
                      setNewPageSlug("");
                      setCreateModalOpen(true);
                    }}
                    className="flex h-9 items-center gap-1.5 rounded-sm bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-all"
                  >
                    <Plus className="h-4 w-4" /> Página em Branco
                  </button>
                </div>
              )}
            </div>
          )}

          {filteredPages.length > 0 && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 animate-in fade-in duration-300">
              {filteredPages.map((p) => {
                const isBiolink =
                  p.template === "biolink" ||
                  p.template?.includes("hopp") ||
                  p.template === "hopp-clean" ||
                  p.template === "hopp-dark" ||
                  p.template === "hopp-vibrant";

                const pageStats = analyticsQ.data?.stats[p.id] || { views: 0, clicks: 0 };

                return (
                  <div
                    key={p.id}
                    className="group relative flex flex-col justify-between rounded-md border border-border/60 bg-surface p-5 transition-all duration-300 hover:border-brand/40"
                  >
                    <div className="space-y-4">
                      {/* Interactive Visual Preview representation */}
                      <div className="relative rounded-sm overflow-hidden">
                        <PageMiniPreview template={p.template} />
                        {/* Hover Overlay */}
                        <div
                          onClick={() =>
                            navigate({
                              to: "/agency/$slug/portal/pages/$page_id",
                              params: { slug: agency!.slug, page_id: p.id },
                            })
                          }
                          className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-all duration-200"
                        >
                          <span className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-slate-900 flex items-center gap-1">
                            Abrir Construtor <ChevronRight className="h-3 w-3" />
                          </span>
                        </div>
                      </div>

                      {/* Header metadata */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between w-full">
                          <span className="text-[10px] uppercase font-black font-mono tracking-wider text-muted-foreground">
                            {isBiolink ? "Link na Bio" : "Website / Landing"}
                          </span>
                          <StatusBadge tone={p.is_published ? "success" : "neutral"}>
                            {p.is_published ? "Publicada" : "Rascunho"}
                          </StatusBadge>
                        </div>
                        <h4
                          onClick={() =>
                            navigate({
                              to: "/agency/$slug/portal/pages/$page_id",
                              params: { slug: agency!.slug, page_id: p.id },
                            })
                          }
                          className="font-bold text-sm text-foreground hover:text-brand cursor-pointer transition-colors max-w-[90%] truncate"
                        >
                          {p.title}
                        </h4>
                        <p className="text-[11px] font-mono text-muted-foreground truncate">
                          /{p.slug}
                        </p>
                      </div>

                      {/* Micro analytics counts */}
                      <div className="flex items-center gap-3 py-2 px-3 rounded-xs bg-surface-alt/30 border border-border/40 text-[11px] font-semibold text-muted-foreground w-max select-none">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" /> {pageStats.views} views
                        </span>
                        <span className="w-px h-3 bg-border"></span>
                        <span className="flex items-center gap-1">
                          <MousePointerClick className="w-3.5 h-3.5" /> {pageStats.clicks} clicks
                        </span>
                      </div>
                    </div>

                    {/* Actions and redirection buttons */}
                    <div className="mt-5 pt-3 border-t border-border/40 flex justify-between items-center">
                      <div className="flex gap-2">
                        {p.is_published && agency && (
                          <a
                            href={`${window.location.origin}/p/${agency.slug}/${p.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-center p-1.5 rounded-sm border border-border hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors"
                            title="Ver página online"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => handleDuplicate(p)}
                          className="flex items-center justify-center p-1.5 rounded-sm border border-border hover:bg-surface-hover text-muted-foreground hover:text-foreground transition-colors"
                          title="Duplicar Página"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => deletePage(p)}
                          className="flex items-center justify-center p-1.5 rounded-sm border border-border hover:bg-destructive/5 text-muted-foreground hover:text-destructive transition-colors"
                          title="Excluir Página"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => togglePublish(p)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-sm transition-colors${
                          p.is_published
                            ? "bg-slate-100 hover:bg-slate-200 text-slate-700"
                            : "bg-brand/10 hover:bg-brand/20 text-brand"
                        }`}
                      >
                        {p.is_published ? "Despublicar" : "Publicar"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Visual page creation Sheet */}
      <SheetPage
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Criar Nova Página"
      >
        <form onSubmit={handleCreatePage} className="space-y-4 py-2">
          <div className="space-y-3">
            <label className="text-xs font-bold text-muted-foreground">Título Interno</label>
            <Input
              required
              value={newPageTitle}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Ex: Minha Nova Promoção"
            />
          </div>

          <div className="space-y-3">
            <label className="text-xs font-bold text-muted-foreground">Endereço da Página (URL Slug)</label>
            <div className="flex h-10 w-full items-center rounded-sm border border-border bg-surface overflow-hidden">
              <span className="bg-surface-alt/70 border-r border-border px-3 text-[11px] font-bold text-muted-foreground/80 h-full flex items-center select-none">
                /{agency?.slug}/
              </span>
              <input
                type="text"
                required
                value={newPageSlug}
                onChange={(e) => setNewPageSlug(slugify(e.target.value))}
                placeholder="Ex: nova-promocao"
                className="flex-1 px-3 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none h-full bg-transparent border-0"
              />
            </div>
          </div>

          {/* Template Selector dropdown in sheet */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-muted-foreground">Template Inicial</label>
            <Select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
            >
              <option value="empty">Em Branco (Vazia)</option>
              <optgroup label="Websites & Landing Pages">
                {CMS_TEMPLATES.filter((t) => t.category === "site").map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Biolinks Sociais">
                {CMS_TEMPLATES.filter((t) => t.category === "biolink").map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </optgroup>
            </Select>
          </div>

          <div className="pt-6 border-t border-border mt-6 flex justify-end gap-2">
            <GhostButton
              type="button"
              onClick={() => setCreateModalOpen(false)}
            >
              Cancelar
            </GhostButton>
            <PrimaryButton
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Criando..." : "Criar e Editar"}
            </PrimaryButton>
          </div>
        </form>
      </SheetPage>

      {/* Visual page deletion confirm Sheet */}
      <SheetPage
        isOpen={!!deleteConfirmPage}
        onClose={() => setDeleteConfirmPage(null)}
        title="Excluir Página"
        width="400px"
      >
        <div className="space-y-4 py-2">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Tem certeza que deseja excluir permanentemente a página <strong>{deleteConfirmPage?.title}</strong>?
          </p>
          <p className="text-xs text-muted-foreground">
            Esta ação não pode ser desfeita. Todo o conteúdo, rascunho, publicação e analytics serão excluídos.
          </p>
          <div className="pt-6 border-t border-border mt-6 flex justify-end gap-2">
            <GhostButton
              type="button"
              onClick={() => setDeleteConfirmPage(null)}
            >
              Cancelar
            </GhostButton>
            <PrimaryButton
              type="button"
              onClick={handleDeleteConfirm}
              className="bg-danger hover:bg-danger/90 text-white"
            >
              Confirmar Exclusão
            </PrimaryButton>
          </div>
        </div>
      </SheetPage>
    </div>
  </div>
);
}
