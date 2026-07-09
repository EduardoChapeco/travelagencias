import { createFileRoute, Link, Outlet, useNavigate, useParams, useLocation } from "@tanstack/react-router";
import { TabsList } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  MapPin,
  CalendarDays,
  ReceiptText,
  Users,
  Ticket,
  FileSignature,
  MoreHorizontal,
  Copy,
  Trash2,
  Pencil,
  Eye,
  Send,
  Plane,
  Clock,
  Hotel,
  CheckCircle2,
  Navigation,
  Wifi,
  RefreshCw,
  Loader2,
  Download,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency, getModuleName } from "@/lib/agency-context";
import { StatusBadge, fmtDate } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/use-confirm";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/agency/$slug/trips/$id")({
  head: ({ context }: any) => ({ meta: [{ title: `Viagem · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: TripLayout,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDaysToTrip(travelStart?: string | null): number | null {
  if (!travelStart) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(travelStart + "T00:00:00");
  const diff = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}



function TripLayout() {
  const { slug, id } = Route.useParams();
  const { pathname } = useLocation();
  const { agency, isAgencyAdmin } = useAgency();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { confirm, ConfirmDialog } = useConfirm();
  const [bookingBusy, setBookingBusy] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importBookingId, setImportBookingId] = useState("");
  const [showEmitModal, setShowEmitModal] = useState(false);
  const [emitStep, setEmitStep] = useState(1);





  const getTabClass = (tabPath: string, exact = false) => {
    const active = exact ? pathname === tabPath : pathname.startsWith(tabPath);
    return cn(
      "inline-flex items-center justify-center h-7 px-3 text-[11px] font-semibold rounded-full transition-all gap-1.5 whitespace-nowrap cursor-pointer",
      active
        ? "bg-white/10 text-white border border-white/5 shadow-xs"
        : "text-white/60 hover:text-white"
    );
  };

  // Query para verificar se esta viagem já está vinculada ao GDS Infotravel
  const linkQ = useQuery({
    enabled: !!agency,
    queryKey: ["trip-gds-link", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("external_entity_links")
        .select("*")
        .eq("agency_id", agency?.id || "")
        .eq("provider", "infotravel")
        .eq("entity_type", "trip")
        .eq("internal_id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Mutação para criar reserva física no GDS
  const bookGdsMut = useMutation({
    mutationFn: async () => {
      if (!agency) throw new Error("Agência não identificada.");
      setBookingBusy(true);
      const { data, error } = await supabase.functions.invoke("infotravel-connector", {
        body: {
          action: "create_booking",
          agencyId: agency.id,
          params: { tripId: id },
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`Reserva emitida com sucesso! Localizador: ${data.locator}`);
      qc.invalidateQueries({ queryKey: ["trip", id] });
      qc.invalidateQueries({ queryKey: ["trip-gds-link", id] });
      qc.invalidateQueries({ queryKey: ["vouchers", id] });
      qc.invalidateQueries({ queryKey: ["passengers", id] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao processar reserva na operadora.");
    },
    onSettled: () => {
      setBookingBusy(false);
    },
  });

  // Mutação para sincronizar status atualizado do GDS
  const syncGdsMut = useMutation({
    mutationFn: async () => {
      if (!agency) throw new Error("Agência não identificada.");
      setSyncBusy(true);
      const { data, error } = await supabase.functions.invoke("infotravel-connector", {
        body: {
          action: "run_periodic_sync",
          agencyId: agency.id,
          params: { tripId: id },
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Viagem atualizada com a operadora!");
      qc.invalidateQueries({ queryKey: ["trip", id] });
      qc.invalidateQueries({ queryKey: ["trip-gds-link", id] });
      qc.invalidateQueries({ queryKey: ["vouchers", id] });
      qc.invalidateQueries({ queryKey: ["passengers", id] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao atualizar dados com a operadora.");
    },
    onSettled: () => {
      setSyncBusy(false);
    },
  });

  // Mutação para importar/vincular uma reserva existente do GDS
  const importGdsMut = useMutation({
    mutationFn: async (bookingId: string) => {
      if (!agency) throw new Error("Agência não identificada.");
      setSyncBusy(true);
      const { data, error } = await supabase.functions.invoke("infotravel-connector", {
        body: {
          action: "import_booking",
          agencyId: agency.id,
          params: { bookingId, tripId: id },
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      toast.success(`Reserva importada e vinculada com sucesso! Localizador: ${data.locator}`);
      setShowImportModal(false);
      setImportBookingId("");
      qc.invalidateQueries({ queryKey: ["trip", id] });
      qc.invalidateQueries({ queryKey: ["trip-gds-link", id] });
      qc.invalidateQueries({ queryKey: ["vouchers", id] });
      qc.invalidateQueries({ queryKey: ["passengers", id] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao importar reserva da operadora parceira.");
    },
    onSettled: () => {
      setSyncBusy(false);
    },
  });

  const tripQ = useQuery({
    enabled: !!agency,
    queryKey: ["trip", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const paxQ = useQuery({
    enabled: !!agency,
    queryKey: ["passengers", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_passengers")
        .select("id, full_name, document")
        .eq("trip_id", id);
      if (error) throw error;
      return data ?? [];
    },
  });

  // ─── Duplicar viagem ───────────────────────────────────────────
  const dupMut = useMutation({
    mutationFn: async () => {
      const { data, error } = await (supabase.rpc as any)("duplicate_trip", { p_trip_id: id });
      if (error) throw new Error(error.message);
      return data as string;
    },
    onSuccess: (newId) => {
      toast.success("Viagem duplicada! Abrindo a cópia...");
      qc.invalidateQueries({ queryKey: ["trips"] });
      navigate({ to: "/agency/$slug/trips/$id", params: { slug, id: newId } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao duplicar"),
  });

  // ─── Excluir viagem ────────────────────────────────────────────
  const delMut = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("trips")
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Viagem excluída.");
      qc.invalidateQueries({ queryKey: ["trips"] });
      navigate({ to: "/agency/$slug/trips", params: { slug } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao excluir"),
  });

  // ─── Alterar status rápido ─────────────────────────────────────
  const statusMut = useMutation({
    mutationFn: async (newStatus: string) => {
      const { error } = await supabase
        .from("trips")
        .update({ status: newStatus } as any)
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Status atualizado!");
      qc.invalidateQueries({ queryKey: ["trip", id] });
      qc.invalidateQueries({ queryKey: ["trips"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  if (tripQ.isLoading) return <div className="text-sm text-muted-foreground p-6">Carregando…</div>;

  if (tripQ.isError) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center m-6 rounded-[var(--radius-card)] border border-red-200 bg-red-50/50">
        <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center mb-4">
          <AlertCircle className="h-5 w-5 text-red-600" />
        </div>
        <h3 className="text-base font-bold text-red-800">Falha ao Carregar Viagem</h3>
        <p className="text-xs text-red-600 mt-1 max-w-md">
          {tripQ.error instanceof Error ? tripQ.error.message : "Erro desconhecido"}
        </p>
      </div>
    );
  }

  if (!tripQ.data)
    return <div className="text-sm text-muted-foreground p-6">Viagem não encontrada.</div>;

  const t = tripQ.data;

  const STATUS_TONE: Record<string, "neutral" | "success" | "warning" | "danger" | "info"> = {
    planning: "neutral",
    confirmed: "info",
    in_progress: "warning",
    completed: "success",
    cancelled: "danger",
  };

  const STATUS_LABEL: Record<string, string> = {
    planning: "Planejamento",
    confirmed: "Confirmada",
    in_progress: "Em Andamento",
    completed: "Concluída",
    cancelled: "Cancelada",
  };

  const ALL_STATUSES = ["planning", "confirmed", "in_progress", "completed", "cancelled"];

  const daysToTrip = getDaysToTrip(t.travel_start);
  const isFuture = daysToTrip !== null && daysToTrip > 0;
  const isToday = daysToTrip === 0;

  // ─── "Enviar para Cliente" via WhatsApp ────────────────────────
  function handleSendToClient() {
    const url = `${window.location.origin}/client/trips/${id}`;
    const text = `Olá! Aqui está a área exclusiva da sua viagem${t.destination ? ` para ${t.destination}` : ""}. Acesse todos os seus documentos, itinerário e informações: ${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <ConfirmDialog />

      {/* ── Trip Header ─────────────────────────────────── */}
      <div className="glass text-white bg-black/40 backdrop-blur-2xl-panel m-4 px-4 md:px-6 py-4 flex flex-col gap-3.5 rounded-[var(--radius-card)] shrink-0 z-10 relative">
        {/* Nav + Ações */}
        <div className="flex items-center justify-between">
          <Link
            to="/agency/$slug/trips"
            params={{ slug }}
            className="inline-flex h-8 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 text-xs font-bold text-white/90 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Voltar para {getModuleName("trips", agency)}</span>
            <span className="sm:hidden">Voltar</span>
          </Link>

          <div className="flex items-center gap-2">
            {/* Controle de Conexão GDS */}
            {linkQ.data ? (
              <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 h-8 rounded-full text-xs font-semibold text-emerald-600">
                <Wifi className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                <span>Localizador: {linkQ.data.external_id}</span>
                <button
                  onClick={() => syncGdsMut.mutate()}
                  disabled={syncBusy}
                  className="ml-1 text-emerald-600 hover:text-emerald-800 disabled:opacity-50 cursor-pointer p-0.5 rounded hover:bg-emerald-500/10 transition-colors"
                  title="Atualizar status da reserva agora"
                >
                  <RefreshCw className={cn("h-3 w-3", syncBusy && "animate-spin")} />
                </button>
              </div>
            ) : (
              isAgencyAdmin && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowEmitModal(true)}
                    disabled={bookingBusy || syncBusy}
                    title="Emitir viagem na operadora parceira"
                    className="flex h-8 items-center justify-center gap-1.5 rounded-full border border-brand bg-brand/5 px-2 sm:px-3 text-xs font-semibold text-brand hover:bg-brand/10 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {bookingBusy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Wifi className="h-3.5 w-3.5" />
                    )}
                    <span>Emitir na Operadora</span>
                  </button>

                  <button
                    onClick={() => setShowImportModal(true)}
                    disabled={bookingBusy || syncBusy}
                    title="Vincular viagem a um localizador de reserva existente"
                    className="flex h-8 items-center justify-center gap-1.5 rounded-full border-none glass-card border-none px-2 sm:px-3 text-xs font-medium text-muted-foreground hover:glass bg-white/5 border-white/10 hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span>Vincular Localizador</span>
                  </button>
                </div>
              )
            )}

            {/* Ver como Cliente */}
            <button
              onClick={() => window.open(`/client/trips/${id}`, "_blank")}
              title="Ver como cliente"
              className="flex h-8 items-center justify-center gap-1.5 rounded-full border-none glass-card border-none px-2 sm:px-3 text-xs font-medium text-muted-foreground hover:glass bg-white/5 border-white/10 hover:text-foreground transition-colors cursor-pointer"
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Ver como Cliente</span>
            </button>

            {/* Enviar para Cliente */}
            <button
              onClick={handleSendToClient}
              title="Enviar link da viagem ao cliente via WhatsApp"
              className="flex h-8 items-center justify-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/5 px-2 sm:px-3 text-xs font-medium text-emerald-600 hover:bg-emerald-500/10 transition-colors cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Enviar ao Cliente</span>
            </button>

            {/* Menu de ações */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-8 w-8 items-center justify-center rounded-full border-none glass-card border-none text-muted-foreground hover:glass bg-white/5 border-white/10 hover:text-foreground transition-colors">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Alterar Status
                </div>
                {ALL_STATUSES.map((s) => (
                  <DropdownMenuItem
                    key={s}
                    onClick={() => statusMut.mutate(s)}
                    disabled={t.status === s || statusMut.isPending}
                    className={cn(
                      "cursor-pointer text-xs capitalize",
                      t.status === s && "font-bold text-brand",
                    )}
                  >
                    <Pencil className="mr-2 h-3.5 w-3.5" />
                    {STATUS_LABEL[s]}
                    {t.status === s && " ✓"}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => dupMut.mutate()}
                  disabled={dupMut.isPending}
                  className="cursor-pointer"
                >
                  <Copy className="mr-2 h-4 w-4" /> Duplicar Viagem
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    confirm({
                      title: "Excluir Viagem?",
                      description: `Tem certeza de que deseja excluir a viagem "${t.title}"? Esta ação não pode ser desfeita e removerá todos os dados associados.`,
                      variant: "destructive",
                      onConfirm: () => delMut.mutate(),
                    });
                  }}
                  disabled={delMut.isPending}
                  className="cursor-pointer text-rose-600 focus:text-rose-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Excluir Viagem
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Header da Viagem */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-sm text-brand font-bold bg-brand/10 px-2 py-0.5 rounded">
                #{t.number}
              </span>
              <StatusBadge tone={STATUS_TONE[t.status] ?? "neutral"}>
                {STATUS_LABEL[t.status] ?? t.status}
              </StatusBadge>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{t.title}</h1>

            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              {t.destination && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> {t.destination}
                </div>
              )}
              {(t.travel_start || t.travel_end) && (
                <div className="flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" /> {fmtDate(t.travel_start)} →{" "}
                  {fmtDate(t.travel_end)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Countdown */}
        {t.status !== "cancelled" && daysToTrip !== null && (
          <div
            className={cn(
              "flex items-center gap-3 rounded-[var(--radius-card)] border px-4 py-2.5 text-xs",
              isToday
                ? "border-warning/30 bg-warning/5 text-warning-foreground"
                : isFuture
                  ? "border-brand/20 bg-brand/5 text-foreground"
                  : t.status === "completed"
                    ? "border-success/20 bg-success/5 text-success-foreground"
                    : "border-border glass bg-white/5 border-white/10/50 text-muted-foreground",
            )}
          >
            {isToday ? (
              <>
                <Plane className="h-3.5 w-3.5 text-warning animate-bounce" />
                <span className="font-bold text-warning">Embarque hoje!</span>
              </>
            ) : isFuture ? (
              <>
                <Clock className="h-3.5 w-3.5 text-brand" />
                <span className="font-semibold text-foreground">
                  Faltam <span className="text-brand font-bold">{daysToTrip} dias</span> para o
                  embarque
                </span>
              </>
            ) : t.status === "completed" ? (
              <>
                <Plane className="h-3.5 w-3.5 text-success" />
                <span className="font-semibold text-success">Viagem concluída com sucesso!</span>
              </>
            ) : (
              <>
                <Plane className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Viagem ocorreu há {Math.abs(daysToTrip)} dias
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Content Outlet ─────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex flex-col">
        <Outlet />
      </div>

      {/* Modal de Importação de Reserva GDS */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[var(--radius-card)] border-none glass-card border-none shadow-2xl p-6 flex flex-col space-y-4">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Download className="h-5 w-5 text-brand" /> Vincular Localizador de Reserva
              </h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Insira o código localizador da reserva da operadora parceira para vincular a esta
                viagem. As informações de passageiros e vouchers serão importadas de forma
                automática.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Localizador da Reserva
              </label>
              <input
                type="text"
                placeholder="Ex: 849372"
                value={importBookingId}
                onChange={(e) => setImportBookingId(e.target.value)}
                className="h-10 w-full rounded-[var(--radius-card)] border-none glass-card border-none px-3 text-sm outline-none focus:border-brand text-foreground font-mono font-bold"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportBookingId("");
                }}
                className="flex-1 h-10 rounded-[var(--radius-card)] border-none glass-card border-none text-xs font-bold text-muted-foreground hover:glass bg-white/5 border-white/10 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!importBookingId.trim() || importGdsMut.isPending}
                onClick={() => importGdsMut.mutate(importBookingId)}
                className="flex-1 h-10 rounded-[var(--radius-card)] bg-brand text-xs font-bold text-brand-foreground hover:bg-brand/90 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {importGdsMut.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Importar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Emissão na Operadora (Duas Etapas) */}
      {showEmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[var(--radius-card)] border-none glass-card border-none shadow-2xl p-6 flex flex-col space-y-4">
            {emitStep === 1 ? (
              <>
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Wifi className="h-5 w-5 text-brand" /> Etapa 1: Validação de Passageiros &
                    Tarifas
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Antes de solicitar a emissão, confirme se todos os passageiros da viagem estão
                    listados corretamente abaixo e se seus documentos estão preenchidos.
                  </p>
                </div>

                <div className="max-h-40 overflow-y-auto border-none rounded-[var(--radius-card)] p-3 glass bg-white/5 border-white/10 space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Passageiros Vinculados
                  </span>
                  {paxQ.isLoading ? (
                    <div className="text-xs text-muted-foreground py-2 flex items-center gap-1.5">
                      <Loader2 className="h-3 w-3 animate-spin" /> Carregando passageiros...
                    </div>
                  ) : paxQ.data && paxQ.data.length > 0 ? (
                    paxQ.data.map((p: any) => (
                      <div
                        key={p.id}
                        className="text-xs text-foreground flex justify-between items-center py-1 border-b border-border last:border-0"
                      >
                        <span className="font-semibold">{p.full_name}</span>
                        <span className="text-muted-foreground font-mono text-[10px]">
                          {p.document || "Sem Documento"}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-rose-500 py-2 font-semibold">
                      Atenção: Nenhum passageiro cadastrado para esta viagem!
                    </div>
                  )}
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-[var(--radius-card)] p-3 text-xs text-amber-700 leading-relaxed">
                  <strong>Aviso de Tarifas:</strong> Esta etapa fará a verificação em tempo real da
                  disponibilidade e tarifas vigentes junto à operadora parceira.
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmitModal(false);
                      setEmitStep(1);
                    }}
                    className="flex-1 h-10 rounded-[var(--radius-card)] border-none glass-card border-none text-xs font-bold text-muted-foreground hover:glass bg-white/5 border-white/10 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={!paxQ.data || paxQ.data.length === 0}
                    onClick={() => setEmitStep(2)}
                    className="flex-1 h-10 rounded-[var(--radius-card)] bg-brand text-xs font-bold text-brand-foreground hover:bg-brand/90 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    Validar e Avançar
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Etapa 2: Confirmar Emissão
                    Oficial
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Tarifas e disponibilidade confirmadas com sucesso junto à operadora parceira.
                    Deseja realizar a emissão oficial dos bilhetes/vouchers?
                  </p>
                </div>

                <div className="bg-rose-500/10 border border-rose-500/20 rounded-[var(--radius-card)] p-3 text-xs text-rose-700 leading-relaxed font-medium">
                  ⚠️ <strong>Atenção:</strong> A emissão gera cobranças reais e passará a constar no
                  faturamento junto à operadora parceira. Esta ação é definitiva e não poderá ser
                  desfeita pelo painel.
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEmitStep(1)}
                    className="flex-1 h-10 rounded-[var(--radius-card)] border-none glass-card border-none text-xs font-bold text-muted-foreground hover:glass bg-white/5 border-white/10 transition-colors cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    type="button"
                    disabled={bookGdsMut.isPending}
                    onClick={() => {
                      bookGdsMut.mutate();
                      setShowEmitModal(false);
                      setEmitStep(1);
                    }}
                    className="flex-1 h-10 rounded-[var(--radius-card)] bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {bookGdsMut.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wifi className="h-4 w-4" />
                    )}
                    Confirmar Emissão
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
