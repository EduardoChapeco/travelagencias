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
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { EmptyState } from "@/components/shell/PageHeader";
import { PageHeader, ModuleActionButton } from "@/components/shell/PageHeader";
import { ModuleAdminPanel } from "@/components/shell/ModuleAdminPanel";
import { PrimaryButton, GhostButton , Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { NewSupplierWizard } from "@/components/suppliers/NewSupplierWizard";

export const Route = createFileRoute("/agency/$slug/suppliers/")({
  head: ({ context }: any) => ({ meta: [{ title: `Fornecedores & Parceiros · ${context?.brand?.platform_name || 'Turis'}` }] }),
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
  airline: { label: "Cia Aérea", icon: Plane, color: "text-blue-600" },
  hotel: { label: "Hotel", icon: Hotel, color: "text-amber-600" },
  operator: { label: "Operadora", icon: Building2, color: "text-violet-600" },
  car_rental: { label: "Locadora", icon: Car, color: "text-orange-600" },
  insurance: { label: "Seguro", icon: Shield, color: "text-green-600" },
  transfer: { label: "Transfer", icon: Bus, color: "text-teal-600" },
  cruise: { label: "Cruzeiro", icon: Ship, color: "text-cyan-600" },
  visa: { label: "Vistos", icon: TicketCheck, color: "text-pink-600" },
  other: { label: "Outros", icon: Building2, color: "text-muted-foreground" },
};

const KIND_FILTERS = [
  { value: "all", label: "Todos" },
  { value: "airline", label: "Cias Aéreas" },
  { value: "hotel", label: "Hotéis" },
  { value: "operator", label: "Operadoras" },
  { value: "transfer", label: "Transfers" },
  { value: "insurance", label: "Seguros" },
  { value: "car_rental", label: "Locadoras" },
  { value: "cruise", label: "Cruzeiros" },
  { value: "visa", label: "Vistos" },
  { value: "other", label: "Outros" },
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
            i < Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-border",
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
        "group flex flex-col rounded-[var(--radius-card)] border-none glass-card border-none p-5 transition-all duration-200 hover:border-brand/40 shadow-xs",
        !s.is_active && "opacity-60",
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-card)] border-none glass-card border-none">
            {s.logo_url ? (
              <img src={s.logo_url} alt={s.name} className="h-8 w-8 object-contain rounded-[var(--radius-card)]" />
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
            <span
              key={t}
              className="rounded-full border-none glass-card border-none px-1.5 py-0.5 text-[10px] text-muted-foreground uppercase tracking-wide"
            >
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
        "group flex items-center gap-4 border-b border-border glass-card border-none/30 px-5 py-3 transition-colors",
        "hover:glass-card border-none/60 last:border-0",
        !s.is_active && "opacity-60",
      )}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-card)] border-none glass-card border-none">
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
          "id, name, legal_name, kind, document, email, phone, whatsapp, commission_rate, is_active, city, country, state, rating, logo_url, sla_hours, tags",
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
      : true,
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
    <div className="flex h-full flex-col overflow-hidden">
              <PageHeader
          title="Fornecedores"
          search={{
            value: search,
            onChange: setSearch,
            placeholder: "Buscar fornecedor, cidade...",
          }}
          filters={[
            { label: "Todos", value: "all" },
            { label: "Operadora", value: "operator" },
            { label: "Hotel", value: "hotel" },
            { label: "Aéreo", value: "flight" },
            { label: "Transfer", value: "transfer" },
            { label: "Seguro", value: "insurance" },
            { label: "Visto", value: "visa" },
            { label: "Outros", value: "other" },
          ]}
          activeFilter={kindFilter}
          onFilterChange={(v) => setKindFilter(v as any)}
          actions={
            <div className="flex items-center gap-1.5">
              <Button
                onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                className="h-7 px-2 flex items-center justify-center rounded-full border border-white/15 text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer text-[11px] font-semibold"
                title={viewMode === "grid" ? "Ver em Lista" : "Ver em Grid"}
              >
                {viewMode === "grid" ? <List className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
              </Button>
              {isAgencyAdmin && (
                <Button
                  onClick={() => setAdminPanelOpen(true)}
                  className="h-7 w-7 flex items-center justify-center rounded-full border border-white/15 text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  title="Administrar"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          }
          primaryAction={
            <ModuleActionButton
        label="Novo Fornecedor"
        icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => setOpen(true)}
            />
          }
        />

      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar de filtros ── */}
        <aside className="hidden lg:flex w-52 shrink-0 flex-col border-r border-border bg-transparent overflow-y-auto">
          <div className="px-4 pt-5 pb-3">
            <div className="text-[10px] uppercase tracking-widest font-semibold text-white/50 mb-3">
              Categoria
            </div>
            <div className="space-y-0.5">
              {[
                { id: "all", label: "Todas" },
                { id: "operator", label: "Operadora GDS" },
                { id: "hotel", label: "Hotel / Hospedagem" },
                { id: "flight", label: "Aéreo / Cia Aérea" },
                { id: "transfer", label: "Receptivo / Transfer" },
                { id: "insurance", label: "Seguro Viagem" },
                { id: "visa", label: "Assessoria Consular" },
                { id: "other", label: "Outros" },
              ].map((c) => (
                <Button
                  key={c.id}
                  onClick={() => setKindFilter(c.id as any)}
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-xs font-semibold rounded-full transition-colors cursor-pointer",
                    kindFilter === c.id
                      ? "bg-white/10 text-white font-bold"
                      : "text-white/60 hover:text-white hover:bg-white/[0.02]",
                  )}
                >
                  {c.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Stats Summary */}
          <div className="mt-auto border-t border-white/10 px-4 py-4 space-y-3">
            <div className="text-[10px] uppercase tracking-widest font-semibold text-white/50 mb-2">
              Visão Geral
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-[var(--radius-card)] border border-white/10 bg-white/5 p-2 text-center">
                <div className="text-lg font-bold text-white">{stats.total}</div>
                <div className="text-[10px] text-white/50">Total</div>
              </div>
              <div className="rounded-[var(--radius-card)] border border-white/10 bg-white/5 p-2 text-center">
                <div className="text-lg font-bold text-green-400">{stats.active}</div>
                <div className="text-[10px] text-white/50">Ativos</div>
              </div>
              <div className="col-span-2 rounded-[var(--radius-card)] border border-white/10 bg-white/5 p-2 text-center">
                <div className="text-lg font-bold text-pink-400 font-mono">
                  {stats.avgCommission}%
                </div>
                <div className="text-[10px] text-white/50">Markup médio</div>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Conteúdo principal ── */}
        <div className="flex flex-1 flex-col overflow-hidden bg-transparent">
          {/* Main list/grid */}
          <div className="flex-1 overflow-y-auto px-4  md:pr-6 py-4 min-h-0 pb-24">
            {q.isError && (
              <div className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-[var(--radius-card)] border border-red-200 bg-red-50/60 mb-6">
                <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center mb-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <h3 className="text-sm font-bold text-red-800">Falha ao Carregar Fornecedores</h3>
                <p className="text-xs text-red-600 mt-1 max-w-sm">
                  {q.error instanceof Error ? q.error.message : "Erro desconhecido ao carregar fornecedores."}
                </p>
              </div>
            )}

            {q.isLoading && (
              <div className="text-sm text-muted-foreground p-4">Carregando parceiros…</div>
            )}

            {!q.isLoading && !q.isError && filtered.length === 0 && (
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
              <div className="rounded-[var(--radius-card)] border-none overflow-hidden">
                {/* List header */}
                <div className="flex items-center gap-4 glass-card border-none px-5 py-2 border-b border-border">
                  <div className="w-8 shrink-0" />
                  <div className="flex-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Parceiro
                  </div>
                  <div className="hidden md:block w-28 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Avaliação
                  </div>
                  <div className="hidden sm:block w-24 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Telefone
                  </div>
                  <div className="w-16 text-right text-[10px] font-semibold uppercase tracking-widest text-muted-foreground shrink-0">
                    Markup
                  </div>
                  <div className="w-14 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground shrink-0">
                    Status
                  </div>
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
