import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Building2,
  Percent,
  PhoneCall,
  Mail,
  Search,
  MapPin,
  Star,
  ChevronDown,
  Settings2,
  Plane,
  Hotel,
  Car,
  Shield,
  Bus,
  TicketCheck,
  Ship,
  Filter,
  LayoutGrid,
  List,
  TrendingUp,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { EmptyState } from "@/components/shell/PageHeader";
import { HeaderPortal } from "@/components/shell/HeaderPortal";
import { ModuleAdminPanel } from "@/components/shell/ModuleAdminPanel";
import {
  PrimaryButton,
  GhostButton,
  StatusBadge,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { NewSupplierWizard } from "@/components/suppliers/NewSupplierWizard";

export const Route = createFileRoute("/agency/$slug/suppliers/")({
  head: () => ({ meta: [{ title: "Fornecedores & Parceiros · TravelOS" }] }),
  component: SuppliersPage,
});

type Supplier = {
  id: string;
  name: string;
  legal_name: string | null;
  kind: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  commission_rate: number;
  is_active: boolean;
  city: string | null;
  country: string | null;
  state: string | null;
  rating: number | null;
  logo_url: string | null;
  sla_hours: number | null;
  tags: string[] | null;
};

const KIND_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  airline:      { label: "Cia Aérea",      icon: Plane,        color: "text-blue-600" },
  hotel:        { label: "Hotel",           icon: Hotel,        color: "text-amber-600" },
  operator:     { label: "Operadora",       icon: Building2,    color: "text-violet-600" },
  car_rental:   { label: "Locadora",        icon: Car,          color: "text-orange-600" },
  insurance:    { label: "Seguro",          icon: Shield,       color: "text-green-600" },
  transfer:     { label: "Transfer",        icon: Bus,          color: "text-teal-600" },
  cruise:       { label: "Cruzeiro",        icon: Ship,         color: "text-cyan-600" },
  visa:         { label: "Vistos",          icon: TicketCheck,  color: "text-pink-600" },
  other:        { label: "Outros",          icon: Building2,    color: "text-muted-foreground" },
};

const KIND_FILTERS = [
  { value: "all",       label: "Todos" },
  { value: "airline",   label: "Cias Aéreas" },
  { value: "hotel",     label: "Hotéis" },
  { value: "operator",  label: "Operadoras" },
  { value: "transfer",  label: "Transfers" },
  { value: "insurance", label: "Seguros" },
  { value: "car_rental",label: "Locadoras" },
  { value: "cruise",    label: "Cruzeiros" },
  { value: "visa",      label: "Vistos" },
  { value: "other",     label: "Outros" },
];

function StarRating({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3 w-3",
            i < Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-border"
          )}
        />
      ))}
      <span className="ml-1 text-xs font-mono text-muted-foreground">{rating.toFixed(1)}</span>
    </span>
  );
}

function KindIcon({ kind }: { kind: string }) {
  const cfg = KIND_CONFIG[kind] ?? KIND_CONFIG.other;
  const Icon = cfg.icon;
  return <Icon className={cn("h-4 w-4", cfg.color)} />;
}

function SupplierCardGrid({ s, slug }: { s: Supplier; slug: string }) {
  const cfg = KIND_CONFIG[s.kind] ?? KIND_CONFIG.other;
  const Icon = cfg.icon;
  return (
    <Link
      to="/agency/$slug/suppliers/$id"
      params={{ slug, id: s.id }}
      className={cn(
        "group flex flex-col rounded-xl border border-border bg-white p-5 transition-all duration-200",
        "hover:border-[--brand-primary,theme(colors.pink.400)] hover:bg-gray-50/40",
        !s.is_active && "opacity-60"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface">
            {s.logo_url ? (
              <img src={s.logo_url} alt={s.name} className="h-8 w-8 object-contain rounded-lg" />
            ) : (
              <Icon className={cn("h-5 w-5", cfg.color)} />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-foreground leading-tight truncate group-hover:text-[--brand-primary,theme(colors.pink.500)] transition-colors">
              {s.name}
            </h3>
            <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mt-0.5">
              {cfg.label}
            </div>
          </div>
        </div>
        <StatusBadge tone={s.is_active ? "success" : "neutral"}>
          {s.is_active ? "Ativo" : "Inativo"}
        </StatusBadge>
      </div>

      {/* Location */}
      {(s.city || s.country) && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{[s.city, s.country].filter(Boolean).join(", ")}</span>
        </div>
      )}

      {/* Rating */}
      <div className="mb-3">
        <StarRating rating={s.rating} />
      </div>

      {/* Contact quick row */}
      <div className="flex gap-3 text-[11px] text-muted-foreground mb-4">
        {s.email && (
          <span className="flex items-center gap-1 truncate" title={s.email}>
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate max-w-[100px]">{s.email}</span>
          </span>
        )}
        {s.phone && (
          <span className="flex items-center gap-1" title={s.phone}>
            <PhoneCall className="h-3 w-3 shrink-0" />
            {s.phone}
          </span>
        )}
      </div>

      {/* Tags */}
      {s.tags && s.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {s.tags.slice(0, 3).map((t) => (
            <span key={t} className="rounded-sm border border-border bg-surface px-1.5 py-0.5 text-[10px] text-muted-foreground uppercase tracking-wide">
              {t}
            </span>
          ))}
        </div>
      )}

      {/* Footer — commission */}
      <div className="mt-auto pt-4 border-t border-border flex justify-between items-center">
        <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
          <Percent className="h-3 w-3" /> Markup Base
        </div>
        <div className="font-mono text-base font-bold text-[--brand-primary,theme(colors.pink.500)]">
          {Number(s.commission_rate).toFixed(2)}%
        </div>
      </div>
    </Link>
  );
}

function SupplierRow({ s, slug }: { s: Supplier; slug: string }) {
  const cfg = KIND_CONFIG[s.kind] ?? KIND_CONFIG.other;
  const Icon = cfg.icon;
  return (
    <Link
      to="/agency/$slug/suppliers/$id"
      params={{ slug, id: s.id }}
      className={cn(
        "group flex items-center gap-4 border-b border-border bg-white px-5 py-3 transition-colors",
        "hover:bg-surface last:border-0",
        !s.is_active && "opacity-60"
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-surface">
        {s.logo_url ? (
          <img src={s.logo_url} alt={s.name} className="h-6 w-6 object-contain rounded" />
        ) : (
          <Icon className={cn("h-4 w-4", cfg.color)} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-foreground truncate group-hover:text-[--brand-primary,theme(colors.pink.500)] transition-colors">
          {s.name}
        </div>
        <div className="text-xs text-muted-foreground truncate">
          {[s.city, s.country].filter(Boolean).join(", ") || cfg.label}
        </div>
      </div>
      <div className="hidden md:block w-28">
        <StarRating rating={s.rating} />
      </div>
      <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground w-24">
        <PhoneCall className="h-3 w-3 shrink-0" />
        <span className="truncate">{s.phone || "—"}</span>
      </div>
      <div className="font-mono text-sm font-bold text-[--brand-primary,theme(colors.pink.500)] w-16 text-right shrink-0">
        {Number(s.commission_rate).toFixed(2)}%
      </div>
      <StatusBadge tone={s.is_active ? "success" : "neutral"} className="shrink-0">
        {s.is_active ? "Ativo" : "Inativo"}
      </StatusBadge>
    </Link>
  );
}

function SuppliersPage() {
  const { agency, isAgencyAdmin } = useAgency();
  const { slug } = Route.useParams();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("all");
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const q = useQuery({
    enabled: !!agency,
    queryKey: ["suppliers", agency?.id, kindFilter],
    queryFn: async () => {
      let query = supabase
        .from("suppliers")
        .select(
          "id, name, legal_name, kind, document, email, phone, whatsapp, commission_rate, is_active, city, country, state, rating, logo_url, sla_hours, tags"
        )
        .eq("agency_id", agency!.id);

      if (kindFilter !== "all") {
        query = query.eq("kind", kindFilter as any);
      }
      const { data, error } = await query.order("name");
      if (error) throw error;
      return data as unknown as Supplier[];
    },
  });

  const filtered = (q.data ?? []).filter((s) =>
    search.trim()
      ? s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.city ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (s.country ?? "").toLowerCase().includes(search.toLowerCase())
      : true
  );

  // Stats summary
  const stats = {
    total: q.data?.length ?? 0,
    active: q.data?.filter((s) => s.is_active).length ?? 0,
    rated: q.data?.filter((s) => s.rating != null).length ?? 0,
    avgCommission:
      q.data && q.data.length > 0
        ? (q.data.reduce((acc, s) => acc + Number(s.commission_rate), 0) / q.data.length).toFixed(1)
        : "0",
  };

  return (
    <div className="flex h-[calc(100vh-var(--header-h))] flex-col overflow-hidden bg-background">
      <HeaderPortal>
        <div className="flex items-center gap-2">
          <PrimaryButton
            onClick={() => setOpen(true)}
            className="flex h-8 items-center justify-center gap-1.5 px-2 sm:px-3 text-xs font-semibold cursor-pointer"
            title="Novo Fornecedor"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Novo Fornecedor</span>
          </PrimaryButton>
          {isAgencyAdmin && (
            <button
              onClick={() => setAdminPanelOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-foreground hover:bg-surface-alt transition-colors cursor-pointer"
              title="Administrar"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </HeaderPortal>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar de filtros ── */}
        <aside className="hidden lg:flex w-52 shrink-0 flex-col border-r border-border bg-surface overflow-y-auto">
          <div className="px-4 pt-5 pb-3">
            <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-3">
              Categoria
            </div>
            <div className="space-y-0.5">
              {KIND_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setKindFilter(f.value)}
                  className={cn(
                    "w-full flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors text-left",
                    kindFilter === f.value
                      ? "bg-[--brand-primary,theme(colors.pink.500)]/10 text-[--brand-primary,theme(colors.pink.600)] font-semibold"
                      : "text-foreground hover:bg-surface-alt"
                  )}
                >
                  {f.value !== "all" && <KindIcon kind={f.value} />}
                  {f.label}
                  {f.value !== "all" && (
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      {q.data?.filter((s) => s.kind === f.value).length ?? 0}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Stats Summary */}
          <div className="mt-auto border-t border-border px-4 py-4 space-y-3">
            <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-2">
              Visão Geral
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border bg-white p-2 text-center">
                <div className="text-lg font-bold text-foreground">{stats.total}</div>
                <div className="text-[10px] text-muted-foreground">Total</div>
              </div>
              <div className="rounded-lg border border-border bg-white p-2 text-center">
                <div className="text-lg font-bold text-green-600">{stats.active}</div>
                <div className="text-[10px] text-muted-foreground">Ativos</div>
              </div>
              <div className="col-span-2 rounded-lg border border-border bg-white p-2 text-center">
                <div className="text-lg font-bold text-[--brand-primary,theme(colors.pink.500)] font-mono">
                  {stats.avgCommission}%
                </div>
                <div className="text-[10px] text-muted-foreground">Markup médio</div>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Conteúdo principal ── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center border-b border-border bg-surface/50 px-4 md:px-5 py-2.5 shrink-0">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar fornecedor, cidade, país..."
                className="h-8 w-full rounded-md border border-border bg-white pl-8 pr-3 text-xs outline-none focus:border-[--brand-primary,theme(colors.pink.400)] text-foreground placeholder:text-muted-foreground"
              />
            </div>

            {/* Mobile filter dropdown */}
            <div className="relative lg:hidden w-full sm:w-44">
              <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <select
                value={kindFilter}
                onChange={(e) => setKindFilter(e.target.value)}
                className="h-8 w-full appearance-none rounded-md border border-border bg-white pl-8 pr-8 text-xs outline-none focus:border-[--brand-primary,theme(colors.pink.400)] text-foreground"
              >
                {KIND_FILTERS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>

            {/* View toggle */}
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md border transition-colors",
                  viewMode === "grid"
                    ? "border-[--brand-primary,theme(colors.pink.400)] bg-[--brand-primary,theme(colors.pink.500)]/10 text-[--brand-primary,theme(colors.pink.600)]"
                    : "border-border bg-white text-muted-foreground hover:bg-surface-alt"
                )}
                title="Grid"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md border transition-colors",
                  viewMode === "list"
                    ? "border-[--brand-primary,theme(colors.pink.400)] bg-[--brand-primary,theme(colors.pink.500)]/10 text-[--brand-primary,theme(colors.pink.600)]"
                    : "border-border bg-white text-muted-foreground hover:bg-surface-alt"
                )}
                title="Lista"
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="text-xs text-muted-foreground shrink-0">
              {filtered.length} {filtered.length === 1 ? "parceiro" : "parceiros"}
            </div>
          </div>

          {/* Main list/grid */}
          <div className="flex-1 overflow-y-auto p-4 md:p-5">
            {q.isLoading && (
              <div className="text-sm text-muted-foreground p-4">Carregando parceiros…</div>
            )}

            {!q.isLoading && filtered.length === 0 && (
              <EmptyState
                title="Nenhum fornecedor encontrado"
                description="Ajuste os filtros ou cadastre um novo parceiro para começar."
              />
            )}

            {filtered.length > 0 && viewMode === "grid" && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 pb-10">
                {filtered.map((s) => (
                  <SupplierCardGrid key={s.id} s={s} slug={slug} />
                ))}
              </div>
            )}

            {filtered.length > 0 && viewMode === "list" && (
              <div className="rounded-xl border border-border overflow-hidden pb-10">
                {/* List header */}
                <div className="flex items-center gap-4 bg-surface px-5 py-2 border-b border-border">
                  <div className="w-8 shrink-0" />
                  <div className="flex-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Parceiro</div>
                  <div className="hidden md:block w-28 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Avaliação</div>
                  <div className="hidden sm:block w-24 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Telefone</div>
                  <div className="w-16 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground shrink-0">Markup</div>
                  <div className="w-14 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground shrink-0">Status</div>
                </div>
                {filtered.map((s) => (
                  <SupplierRow key={s.id} s={s} slug={slug} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {open && agency && (
        <NewSupplierWizard
          agencyId={agency.id}
          onClose={() => setOpen(false)}
          onCreated={() => {
            setOpen(false);
            qc.invalidateQueries({ queryKey: ["suppliers", agency.id] });
          }}
        />
      )}

      {adminPanelOpen && agency && (
        <ModuleAdminPanel
          isOpen={adminPanelOpen}
          onClose={() => setAdminPanelOpen(false)}
          moduleKey="suppliers"
          moduleName="Fornecedores"
          agencyId={agency.id}
        />
      )}
    </div>
  );
}
