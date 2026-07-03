import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Ticket,
  Search,
  Plane,
  Download,
  Eye,
  MapPin,
  Calendar,
  Users,
  Settings2,
  Check,
  Edit2,
  Save,
  X,
  ExternalLink,
  Copy,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { EmptyState } from "@/components/shell/PageHeader";
import { HeaderPortal } from "@/components/shell/HeaderPortal";
import { ModuleAdminPanel } from "@/components/shell/ModuleAdminPanel";
import { StatusBadge, fmtDate, GhostButton } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/agency/$slug/vouchers")({
  head: () => ({ meta: [{ title: "Vouchers & Conferência · TravelOS" }] }),
  component: VouchersPage,
});

type Voucher = {
  id: string;
  trip_id: string;
  destination: string | null;
  source_type: string;
  template: string;
  general_locator: string | null;
  pdf_url: string | null;
  generated_at: string | null;
  created_at: string;
  passengers: unknown[];
};

type FlightTicket = {
  id: string;
  card_id: string;
  passenger_name: string;
  ticket_code: string | null;
  date_time: string | null;
  venue: string | null;
  seat: string | null;
  status: string;
  notes: string | null;
  boarding_cards: {
    id: string;
    trip_id: string;
    trips: {
      id: string;
      title: string;
    };
  } | null;
};

function VouchersPage() {
  const { agency, isAgencyAdmin } = useAgency();
  const { slug } = useParams({ from: "/agency/$slug/vouchers" });
  const qc = useQueryClient();

  // Tabs management
  const queryTab =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") : null;
  const [activeTab, setActiveTab] = useState<"vouchers" | "flight_audit">(
    queryTab === "flight_audit" ? "flight_audit" : "vouchers",
  );

  const [page, setPage] = useState(1);
  const [qSearch, setQSearch] = useState("");
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const pageSize = 12;

  // Flight audit states
  const [flightSearch, setFlightSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "confirmed">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    ticket_code: "",
    status: "pending",
    notes: "",
    seat: "",
  });

  // Vouchers Query
  const vouchersQ = useQuery({
    enabled: !!agency && activeTab === "vouchers",
    queryKey: ["vouchers", agency?.id, page],
    queryFn: async () => {
      const { data, count, error } = await supabase
        .from("vouchers")
        .select(
          "id, trip_id, destination, source_type, template, general_locator, pdf_url, generated_at, created_at, passengers",
          { count: "exact" },
        )
        .eq("agency_id", agency!.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      if (error) throw error;
      return { data: data as unknown as Voucher[], count: count ?? 0 };
    },
  });

  // Flights Query (Next 60 days)
  const flightsQ = useQuery({
    enabled: !!agency && activeTab === "flight_audit",
    queryKey: ["flight-audit-tickets", agency?.id],
    queryFn: async () => {
      const now = new Date();
      const limitDate = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
      const { data, error } = await supabase
        .from("boarding_tickets")
        .select(
          `
          id,
          card_id,
          passenger_name,
          ticket_code,
          date_time,
          venue,
          seat,
          status,
          notes,
          boarding_cards (
            id,
            trip_id,
            trips (
              id,
              title
            )
          )
        `,
        )
        .eq("agency_id", agency!.id)
        .eq("kind", "flight")
        .gte("date_time", now.toISOString())
        .lte("date_time", limitDate.toISOString())
        .order("date_time", { ascending: true });

      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  // Update Flight Ticket Mutation
  const updateTicketMut = useMutation({
    mutationFn: async (payload: {
      id: string;
      ticket_code?: string | null;
      status?: string;
      notes?: string | null;
      seat?: string | null;
    }) => {
      const { error } = await supabase
        .from("boarding_tickets")
        .update(payload)
        .eq("id", payload.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Bilhete atualizado com sucesso!");
      qc.invalidateQueries({ queryKey: ["flight-audit-tickets", agency?.id] });
      qc.invalidateQueries({ queryKey: ["dashboard-stats", agency?.id] });
      setEditingId(null);
    },
    onError: (err: any) => {
      toast.error(`Erro ao atualizar: ${err.message}`);
    },
  });

  const filteredVouchers = (vouchersQ.data?.data || []).filter(
    (v) =>
      !qSearch ||
      v.destination?.toLowerCase().includes(qSearch.toLowerCase()) ||
      v.general_locator?.toLowerCase().includes(qSearch.toLowerCase()),
  );

  const filteredFlights = (flightsQ.data || []).filter((f) => {
    const matchesSearch =
      !flightSearch ||
      f.passenger_name.toLowerCase().includes(flightSearch.toLowerCase()) ||
      (f.ticket_code && f.ticket_code.toLowerCase().includes(flightSearch.toLowerCase())) ||
      (f.venue && f.venue.toLowerCase().includes(flightSearch.toLowerCase()));

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "confirmed" && f.status === "confirmed") ||
      (statusFilter === "pending" && f.status !== "confirmed");

    return matchesSearch && matchesStatus;
  });

  function handleStartEdit(f: FlightTicket) {
    setEditingId(f.id);
    setEditForm({
      ticket_code: f.ticket_code ?? "",
      status: f.status ?? "pending",
      notes: f.notes ?? "",
      seat: f.seat ?? "",
    });
  }

  function handleCopyLocator(code: string | null) {
    if (!code) return;
    navigator.clipboard.writeText(code);
    toast.success("Localizador copiado!");
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <HeaderPortal>
        <div className="flex items-center gap-2">
          {isAgencyAdmin && activeTab === "vouchers" && (
            <button
              onClick={() => setAdminPanelOpen(true)}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-foreground hover:bg-surface-alt transition-colors cursor-pointer"
              title="Administrar Vouchers"
            >
              <Settings2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </HeaderPortal>

      {/* Tabs list */}
      <div className="flex border-b border-border bg-surface shrink-0 px-4 md:px-6">
        <button
          onClick={() => {
            setActiveTab("vouchers");
            if (typeof window !== "undefined") {
              const url = new URL(window.location.href);
              url.searchParams.set("tab", "vouchers");
              window.history.replaceState({}, "", url.toString());
            }
          }}
          className={cn(
            "px-4 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer",
            activeTab === "vouchers"
              ? "border-brand text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          🎫 Vouchers Emitidos
        </button>
        <button
          onClick={() => {
            setActiveTab("flight_audit");
            if (typeof window !== "undefined") {
              const url = new URL(window.location.href);
              url.searchParams.set("tab", "flight_audit");
              window.history.replaceState({}, "", url.toString());
            }
          }}
          className={cn(
            "px-4 py-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5",
            activeTab === "flight_audit"
              ? "border-brand text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          ✈️ Conferência de Voos
          <span className="bg-brand/10 text-brand text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold">
            Fila 60 dias
          </span>
        </button>
      </div>

      {activeTab === "vouchers" ? (
        // ==========================================
        // Vouchers Tab View
        // ==========================================
        <>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center border-b border-border bg-surface/50 px-4 md:px-6 py-3 shrink-0">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={qSearch}
                onChange={(e) => setQSearch(e.target.value)}
                placeholder="Buscar por destino ou localizador..."
                className="h-8 w-full rounded-md border border-border bg-surface pl-8 pr-3 text-xs outline-none focus:border-brand text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0 pl-1 sm:pl-2">
              {vouchersQ.data?.count ?? 0} vouchers
            </span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-4">
            {vouchersQ.isError && (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center rounded-xl border border-red-200 bg-red-50/60">
                <div className="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center mb-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                </div>
                <h3 className="text-sm font-bold text-red-800">Falha ao Carregar Vouchers</h3>
                <p className="text-xs text-red-600 mt-1">
                  {vouchersQ.error instanceof Error ? vouchersQ.error.message : "Erro desconhecido."}
                </p>
              </div>
            )}

            {vouchersQ.isLoading && (
              <div className="text-sm text-muted-foreground p-4">Carregando vouchers…</div>
            )}

            {vouchersQ.data && vouchersQ.data.data.length === 0 && (
              <EmptyState
                title="Nenhum voucher emitido"
                description="Gere vouchers manualmente ou importe PDFs da operadora a partir da tela de cada roteiro de viagem."
              />
            )}

            {vouchersQ.data && vouchersQ.data.data.length > 0 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredVouchers.map((v) => (
                    <div
                      key={v.id}
                      className="group relative flex flex-col rounded-2xl border border-border bg-surface overflow-hidden transition-all hover:border-brand/40"
                    >
                      {/* Ticket "Cutouts" on the sides */}
                      <div className="absolute top-20 -left-2 w-4 h-4 bg-background border-r border-border rounded-full z-10" />
                      <div className="absolute top-20 -right-2 w-4 h-4 bg-background border-l border-border rounded-full z-10" />

                      {/* Header (Top section of ticket) */}
                      <div className="p-5 border-b border-dashed border-border/60 bg-brand/5 relative">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
                            {v.template === "flight" ? (
                              <Plane className="h-5 w-5" />
                            ) : (
                              <Ticket className="h-5 w-5" />
                            )}
                          </div>
                          <StatusBadge tone={v.source_type === "operator_pdf" ? "info" : "neutral"}>
                            {v.source_type === "operator_pdf" ? "PDF Importado" : "Gerado via OS"}
                          </StatusBadge>
                        </div>

                        <div className="space-y-1">
                          <h3 className="text-lg font-bold text-foreground line-clamp-1">
                            {v.destination ?? "Destino Indefinido"}
                          </h3>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium uppercase tracking-widest">
                            <MapPin className="h-3.5 w-3.5" /> Viagem
                          </div>
                        </div>
                      </div>

                      {/* Body (Bottom section of ticket) */}
                      <div className="p-5 flex-1 flex flex-col">
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div>
                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                              Localizador Geral
                            </div>
                            <div className="font-mono text-sm font-semibold text-foreground">
                              {v.general_locator ?? "—"}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                              Emissão
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              {fmtDate(v.generated_at ?? v.created_at)}
                            </div>
                          </div>
                          <div className="col-span-2">
                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                              Passageiros
                            </div>
                            <div className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                              <Users className="h-3.5 w-3.5 text-muted-foreground" />
                              {(v.passengers ?? []).length} pax inclusos neste voucher
                            </div>
                          </div>
                        </div>

                        <div className="mt-auto pt-4 border-t border-border/40 flex items-center justify-between gap-2">
                          <Link
                            to="/agency/$slug/trips/$id/vouchers"
                            params={{ slug, id: v.trip_id }}
                            className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-surface-alt hover:bg-surface-alt/80 px-4 py-2.5 text-xs font-bold transition-colors"
                          >
                            <Eye className="h-4 w-4" /> Visualizar Roteiro
                          </Link>
                          {v.pdf_url && (
                            <a
                              href={v.pdf_url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex-shrink-0 flex items-center justify-center h-9 w-9 rounded-xl bg-brand/10 text-brand hover:bg-brand/20 transition-colors"
                              title="Baixar PDF Original"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex items-center justify-between border-t border-border/40 pt-6">
                  <div className="text-xs text-muted-foreground font-medium">
                    Mostrando página <span className="font-bold text-foreground">{page}</span> de{" "}
                    {Math.ceil(vouchersQ.data.count / pageSize) || 1}
                  </div>
                  <div className="flex items-center gap-2">
                    <GhostButton
                      disabled={page === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="h-9 px-4 text-xs font-semibold rounded-full border border-border"
                    >
                      Anterior
                    </GhostButton>
                    <GhostButton
                      disabled={page * pageSize >= vouchersQ.data.count}
                      onClick={() => setPage((p) => p + 1)}
                      className="h-9 px-4 text-xs font-semibold rounded-full border border-border"
                    >
                      Próxima
                    </GhostButton>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      ) : (
        // ==========================================
        // Flight Audit Tab View
        // ==========================================
        <>
          {/* Audit top KPIs */}
          <div className="border-b border-border bg-surface px-4 md:px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
            <div className="rounded-xl border border-border bg-surface-alt/20 p-3 text-center">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">
                Total de Voos
              </span>
              <strong className="text-lg font-black text-foreground">
                {flightsQ.data?.length ?? 0}
              </strong>
            </div>
            <div className="rounded-xl border border-success/20 bg-success/5 p-3 text-center">
              <span className="text-[10px] font-bold text-success uppercase tracking-wide block mb-1">
                Conferidos
              </span>
              <strong className="text-lg font-black text-success">
                {(flightsQ.data || []).filter((f) => f.status === "confirmed").length}
              </strong>
            </div>
            <div className="rounded-xl border border-warning/20 bg-warning/5 p-3 text-center">
              <span className="text-[10px] font-bold text-warning uppercase tracking-wide block mb-1">
                Pendentes
              </span>
              <strong className="text-lg font-black text-warning">
                {(flightsQ.data || []).filter((f) => f.status !== "confirmed").length}
              </strong>
            </div>
            <div className="rounded-xl border border-brand/20 bg-brand/5 p-3 text-center">
              <span className="text-[10px] font-bold text-brand uppercase tracking-wide block mb-1">
                Taxa de Sucesso
              </span>
              <strong className="text-lg font-black text-brand">
                {flightsQ.data && flightsQ.data.length > 0
                  ? `${Math.round(((flightsQ.data || []).filter((f) => f.status === "confirmed").length / flightsQ.data.length) * 100)}%`
                  : "0%"}
              </strong>
            </div>
          </div>

          {/* Filters and search */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between border-b border-border bg-surface/50 px-4 md:px-6 py-3 shrink-0">
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center w-full md:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={flightSearch}
                  onChange={(e) => setFlightSearch(e.target.value)}
                  placeholder="Buscar passageiro, rota ou localizador..."
                  className="h-8 w-full rounded-md border border-border bg-surface pl-8 pr-3 text-xs outline-none focus:border-brand text-foreground placeholder:text-muted-foreground"
                />
              </div>

              {/* Status segment control */}
              <div className="flex gap-1 bg-surface-alt p-0.5 rounded-lg border border-border shrink-0">
                {[
                  { id: "all", label: "Todos" },
                  { id: "pending", label: "Pendentes" },
                  { id: "confirmed", label: "Conferidos" },
                ].map((btn) => (
                  <button
                    key={btn.id}
                    onClick={() => setStatusFilter(btn.id as any)}
                    className={cn(
                      "px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all",
                      statusFilter === btn.id
                        ? "bg-surface text-foreground border border-border shadow-sm"
                        : "text-muted-foreground hover:text-foreground border border-transparent",
                    )}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap hidden md:inline">
              Fila operacional de voos programados para os próximos 60 dias.
            </span>
          </div>

          {/* Fila list table */}
          <div className="flex-1 overflow-auto p-4 md:p-6 min-h-0">
            {flightsQ.isError && (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center rounded-xl border border-red-200 bg-red-50/60 mb-4 max-w-2xl mx-auto">
                <div className="h-9 w-9 rounded-full bg-red-100 flex items-center justify-center mb-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                </div>
                <h3 className="text-sm font-bold text-red-800">Falha ao Carregar Fila de Voos</h3>
                <p className="text-xs text-red-600 mt-1">
                  {flightsQ.error instanceof Error ? flightsQ.error.message : "Erro desconhecido."}
                </p>
              </div>
            )}

            {flightsQ.isLoading && (
              <div className="text-sm text-muted-foreground p-4 animate-pulse">
                Carregando fila operacional de voos…
              </div>
            )}

            {flightsQ.data && flightsQ.data.length === 0 && (
              <div className="text-center py-20 bg-surface border border-dashed border-border rounded-2xl max-w-2xl mx-auto p-8">
                <Plane className="h-10 w-10 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="font-bold text-sm text-foreground mb-1">
                  Nenhum voo nos próximos 60 dias
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Os voos são criados automaticamente a partir dos cartões de embarque vinculados
                  aos roteiros de viagem.
                </p>
              </div>
            )}

            {flightsQ.data && flightsQ.data.length > 0 && filteredFlights.length === 0 && (
              <div className="text-center py-16 text-xs text-muted-foreground">
                Nenhum voo corresponde aos filtros aplicados.
              </div>
            )}

            {flightsQ.data && filteredFlights.length > 0 && (
              <div className="border border-border rounded-xl bg-surface overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-surface-alt/40 border-b border-border text-[10px] uppercase font-bold text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Passageiro & Viagem</th>
                      <th className="px-4 py-3">Rota / Voo</th>
                      <th className="px-4 py-3">Data / Hora</th>
                      <th className="px-4 py-3">Localizador (PNR)</th>
                      <th className="px-4 py-3">Assento</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Notas</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredFlights.map((f: FlightTicket) => {
                      const isEditing = editingId === f.id;
                      const tripId = f.boarding_cards?.trip_id;
                      const tripTitle = f.boarding_cards?.trips?.title;

                      return (
                        <tr
                          key={f.id}
                          className={cn(
                            "hover:bg-surface-alt/25 transition-colors",
                            f.status === "confirmed" ? "bg-success/5" : "bg-transparent",
                          )}
                        >
                          {/* Passenger & Trip */}
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-foreground text-sm">
                              {f.passenger_name}
                            </div>
                            {tripTitle && (
                              <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                                <span>
                                  Viagem: <strong>{tripTitle}</strong>
                                </span>
                                {tripId && (
                                  <Link
                                    to="/agency/$slug/trips/$id"
                                    params={{ slug, id: tripId }}
                                    className="text-brand hover:underline inline-flex items-center gap-0.5"
                                    title="Acessar Viagem"
                                  >
                                    <ExternalLink className="h-2.5 w-2.5" />
                                  </Link>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Route/Flight details */}
                          <td className="px-4 py-3.5 font-medium">
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">✈️</span>
                              <span>{f.venue || "Não informado"}</span>
                            </div>
                          </td>

                          {/* Date and time */}
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-foreground">
                              {f.date_time
                                ? new Date(f.date_time).toLocaleDateString("pt-BR")
                                : "—"}
                            </div>
                            {f.date_time && (
                              <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                {new Date(f.date_time).toLocaleTimeString("pt-BR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </div>
                            )}
                          </td>

                          {/* PNR / Locator */}
                          <td className="px-4 py-3.5">
                            {isEditing ? (
                              <input
                                value={editForm.ticket_code}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, ticket_code: e.target.value })
                                }
                                className="h-8 w-24 rounded border border-border bg-surface px-2 text-xs font-mono font-bold focus:border-brand"
                                placeholder="Loc..."
                              />
                            ) : f.ticket_code ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono font-bold bg-surface-alt border border-border rounded px-1.5 py-0.5 text-foreground">
                                  {f.ticket_code}
                                </span>
                                <button
                                  onClick={() => handleCopyLocator(f.ticket_code)}
                                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                                  title="Copiar"
                                >
                                  <Copy className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-warning font-semibold flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" /> Sem localizador
                              </span>
                            )}
                          </td>

                          {/* Seat */}
                          <td className="px-4 py-3.5 font-mono text-foreground font-semibold">
                            {isEditing ? (
                              <input
                                value={editForm.seat}
                                onChange={(e) => setEditForm({ ...editForm, seat: e.target.value })}
                                className="h-8 w-16 rounded border border-border bg-surface px-2 text-xs focus:border-brand"
                                placeholder="ex: 12A"
                              />
                            ) : (
                              f.seat || "—"
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5">
                            {isEditing ? (
                              <select
                                value={editForm.status}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, status: e.target.value })
                                }
                                className="h-8 rounded border border-border bg-surface px-2 text-xs focus:border-brand cursor-pointer"
                              >
                                <option value="pending">Pendente</option>
                                <option value="confirmed">Conferido</option>
                                <option value="action_needed">Alteração / Atenção</option>
                              </select>
                            ) : (
                              <StatusBadge
                                tone={
                                  f.status === "confirmed"
                                    ? "success"
                                    : f.status === "action_needed"
                                      ? "danger"
                                      : "warning"
                                }
                              >
                                {f.status === "confirmed"
                                  ? "Conferido"
                                  : f.status === "action_needed"
                                    ? "Atenção"
                                    : "Pendente"}
                              </StatusBadge>
                            )}
                          </td>

                          {/* Notes */}
                          <td className="px-4 py-3.5 max-w-[150px] truncate">
                            {isEditing ? (
                              <input
                                value={editForm.notes}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, notes: e.target.value })
                                }
                                className="h-8 w-full rounded border border-border bg-surface px-2 text-xs focus:border-brand"
                                placeholder="Notas..."
                              />
                            ) : (
                              <span className="text-muted-foreground" title={f.notes ?? ""}>
                                {f.notes || "—"}
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {isEditing ? (
                                <>
                                  <button
                                    onClick={() =>
                                      updateTicketMut.mutate({
                                        id: f.id,
                                        ticket_code: editForm.ticket_code || null,
                                        seat: editForm.seat || null,
                                        status: editForm.status,
                                        notes: editForm.notes || null,
                                      })
                                    }
                                    disabled={updateTicketMut.isPending}
                                    className="p-1.5 rounded bg-success text-white hover:opacity-90 transition-opacity cursor-pointer"
                                    title="Salvar"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    className="p-1.5 rounded bg-surface-alt border border-border hover:bg-surface-alt/75 cursor-pointer text-foreground"
                                    title="Cancelar"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  {/* Quick toggle check */}
                                  <button
                                    onClick={() =>
                                      updateTicketMut.mutate({
                                        id: f.id,
                                        status: f.status === "confirmed" ? "pending" : "confirmed",
                                      })
                                    }
                                    className={cn(
                                      "p-1.5 rounded border transition-colors cursor-pointer",
                                      f.status === "confirmed"
                                        ? "text-success border-success/35 bg-success/10 hover:bg-success/20"
                                        : "text-muted-foreground border-border hover:border-success hover:text-success",
                                    )}
                                    title={
                                      f.status === "confirmed"
                                        ? "Marcar como pendente"
                                        : "Conferir e confirmar voo"
                                    }
                                  >
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleStartEdit(f)}
                                    className="p-1.5 rounded border border-border text-muted-foreground hover:text-foreground cursor-pointer"
                                    title="Editar Bilhete"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {adminPanelOpen && agency && (
        <ModuleAdminPanel
          isOpen={adminPanelOpen}
          onClose={() => setAdminPanelOpen(false)}
          moduleKey="vouchers"
          moduleName="Vouchers"
          agencyId={agency.id}
        />
      )}
    </div>
  );
}
