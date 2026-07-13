import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createFileRoute, Link, Outlet, useNavigate, useParams, useLocation } from "@tanstack/react-router";
import { DetailShell, type DetailTab } from "@/components/shell/DetailShell";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Info, AlertCircle, RefreshCw, Wifi, Link2, Plus, Download, Mail, Plane, ArrowLeft, MapPin, CalendarDays, ReceiptText, Users, Ticket, FileSignature, MoreHorizontal, Copy, Trash2, Pencil, Eye, Send, Clock, Hotel, CheckCircle2, Navigation, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAgency, getModuleName } from "@/lib/agency-context";
import {
  infotravelCreateBooking,
  infotravelSyncBooking,
  infotravelImportToTrip,
} from "@/services/infotravel";
import { StatusBadge } from "@/components/ui/badge";
import { TRIP_STATUS_MAP } from "@/lib/constants/status";
import { fmtDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useConfirm } from "@/hooks/use-confirm";
import { PageHeader, ModuleActionButton } from "@/components/shell/PageHeader";
import { FormInput as Input } from "@/components/ui/input";
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
      "inline-flex items-center justify-center h-7 px-3 ds-meta font-semibold rounded-full transition-all gap-1.5 whitespace-nowrap cursor-pointer",
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
      return await infotravelCreateBooking(agency.id, id);
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
      return await infotravelSyncBooking(agency.id, id);
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
      return await infotravelImportToTrip(agency.id, bookingId, id);
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
      <div className="flex min-h-[400px] flex-col items-center justify-center p-8 text-center m-6 rounded-[var(--radius-card)] glass-error">
        <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center mb-4">
          <AlertCircle className="h-5 w-5 shrink-0" />
        </div>
        <h3 className="text-base font-bold">Falha ao Carregar Viagem</h3>
        <p className="text-xs opacity-80 mt-1 max-w-md">
          {tripQ.error instanceof Error ? tripQ.error.message : "Erro desconhecido"}
        </p>
      </div>
    );
  }

  if (!tripQ.data)
    return <div className="text-sm text-muted-foreground p-6">Viagem não encontrada.</div>;

  const t = tripQ.data;

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

  const tabs = [
    { id: "index", label: "Informações Gerais", to: "/agency/$slug/trips/$id", exact: true, icon: <Navigation className="h-3.5 w-3.5" /> },
    { id: "destination", label: "Destino & Dicas", to: "/agency/$slug/trips/$id/destination", icon: <MapPin className="h-3.5 w-3.5" /> },
    { id: "passengers", label: "Passageiros", to: "/agency/$slug/trips/$id/passengers", icon: <Users className="h-3.5 w-3.5" /> },
    { id: "flights", label: "Voos", to: "/agency/$slug/trips/$id/flights", icon: <Plane className="h-3.5 w-3.5" /> },
    { id: "lodging", label: "Hospedagem", to: "/agency/$slug/trips/$id/lodging", icon: <Hotel className="h-3.5 w-3.5" /> },
    { id: "vouchers", label: "Vouchers", to: "/agency/$slug/trips/$id/vouchers", icon: <Ticket className="h-3.5 w-3.5" /> },
    { id: "boarding", label: "e-Check-in & Timeline", to: "/agency/$slug/trips/$id/boarding", icon: <CheckCircle2 className="h-3.5 w-3.5" /> },
    { id: "contract", label: "Contratos & Docs", to: "/agency/$slug/trips/$id/contract", icon: <FileSignature className="h-3.5 w-3.5" /> },
    { id: "financial", label: "Financeiro & Faturas", to: "/agency/$slug/trips/$id/financial", icon: <ReceiptText className="h-3.5 w-3.5" /> },
    { id: "history", label: "Histórico & Logs", to: "/agency/$slug/trips/$id/history", icon: <Clock className="h-3.5 w-3.5" /> },
  ];
  const tripHeader = (
    <PageHeader 
      title={tripQ.data.title}
      actions={
        <>
          {/* Controle de Conexão GDS */}
          {linkQ.data ? (
            <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 h-8 rounded-full text-xs font-semibold text-emerald-600">
              <Wifi className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>Localizador: {linkQ.data.external_id}</span>
              <Button
                onClick={() => syncGdsMut.mutate()}
                disabled={syncBusy}
                className="ml-1 text-emerald-600 hover:text-emerald-800 disabled:opacity-50 cursor-pointer p-0.5 rounded hover:bg-emerald-500/10 transition-colors"
                title="Atualizar status da reserva agora"
              >
                <RefreshCw className={cn("h-3 w-3", syncBusy && "animate-spin")} />
              </Button>
            </div>
          ) : (
            isAgencyAdmin && (
              <div className="flex items-center gap-2">
                <Button
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
                </Button>

                <Button
                  onClick={() => setShowImportModal(true)}
                  disabled={bookingBusy || syncBusy}
                  title="Vincular viagem a um localizador de reserva existente"
                  className="flex h-8 items-center justify-center gap-1.5 rounded-full border-none glass-card border-none px-2 sm:px-3 text-xs font-medium text-muted-foreground hover:glass bg-white/5 border-white/10 hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>Vincular Localizador</span>
                </Button>
              </div>
            )
          )}

          {/* Ver como Cliente */}
          <Button
            onClick={() => window.open(`/client/trips/${id}`, "_blank")}
            title="Ver como cliente"
            className="flex h-8 items-center justify-center gap-1.5 rounded-full border-none glass-card border-none px-2 sm:px-3 text-xs font-medium text-muted-foreground hover:glass bg-white/5 border-white/10 hover:text-foreground transition-colors cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Ver como Cliente</span>
          </Button>

          {/* Enviar para Cliente */}
          <Button
            onClick={handleSendToClient}
            title="Enviar link da viagem ao cliente via WhatsApp"
            className="flex h-8 items-center justify-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/5 px-2 sm:px-3 text-xs font-medium text-emerald-600 hover:bg-emerald-500/10 transition-colors cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Enviar ao Cliente</span>
          </Button>

          {/* Menu de ações */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="flex h-8 w-8 items-center justify-center rounded-full border-none glass-card border-none text-muted-foreground hover:glass bg-white/5 border-white/10 hover:text-foreground transition-colors">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <div className="px-2 py-1.5 ds-label-caps text-muted-foreground">
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
                  {TRIP_STATUS_MAP[s]?.label ?? s}
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
        </>
      }
    />
  );



  return (
    <DetailShell
      tabs={tabs.map(t => ({ ...t, params: { slug, id } }))}
      header={tripHeader}
    >
      <Outlet />

      {/* Modal de Importação de Reserva GDS */}
      <Dialog open={showImportModal} onOpenChange={setShowImportModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-brand" /> Vincular Localizador de Reserva
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col space-y-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Insira o código localizador da reserva da operadora parceira para vincular a esta
              viagem. As informações de passageiros e vouchers serão importadas de forma
              automática.
            </p>

            <div className="space-y-1">
              <label className="ds-label-caps tracking-wider text-muted-foreground">
                Localizador da Reserva
              </label>
              <Input
                type="text"
                placeholder="Ex: 849372"
                value={importBookingId}
                onChange={(e) => setImportBookingId(e.target.value)}
                className="w-full font-mono font-bold"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportBookingId("");
                }}
                className="flex-1 h-10 border-none glass-card border-none text-xs font-bold text-muted-foreground hover:glass bg-white/5 transition-colors"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                disabled={!importBookingId.trim() || importGdsMut.isPending}
                onClick={() => importGdsMut.mutate(importBookingId)}
                className="flex-1 h-10 bg-brand text-xs font-bold text-brand-foreground hover:bg-brand/90 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {importGdsMut.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Importar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Emissão na Operadora (Duas Etapas) */}
      <Dialog open={showEmitModal} onOpenChange={setShowEmitModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {emitStep === 1 ? (
                <>
                  <Wifi className="h-5 w-5 text-brand" /> Etapa 1: Validação de Passageiros & Tarifas
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Etapa 2: Confirmar Emissão Oficial
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col space-y-4">
            {emitStep === 1 ? (
              <>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Antes de solicitar a emissão, confirme se todos os passageiros da viagem estão
                  listados corretamente abaixo e se seus documentos estão preenchidos.
                </p>

                <div className="max-h-40 overflow-y-auto border-none rounded-[var(--radius-card)] p-3 glass bg-white/5 border-white/10 space-y-2">
                  <span className="ds-label-caps tracking-wider text-muted-foreground block">
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
                        <span className="text-muted-foreground font-mono ds-meta">
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
                  <Button
                    type="button"
                    onClick={() => {
                      setShowEmitModal(false);
                      setEmitStep(1);
                    }}
                    className="flex-1 h-10 border-none glass-card border-none text-xs font-bold text-muted-foreground hover:glass bg-white/5 transition-colors"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    disabled={!paxQ.data || paxQ.data.length === 0}
                    onClick={() => setEmitStep(2)}
                    className="flex-1 h-10 bg-brand text-xs font-bold text-brand-foreground hover:bg-brand/90 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    Validar e Avançar
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tarifas e disponibilidade confirmadas com sucesso junto à operadora parceira.
                  Deseja realizar a emissão oficial dos bilhetes/vouchers?
                </p>

                <div className="bg-rose-500/10 border border-rose-500/20 rounded-[var(--radius-card)] p-3 text-xs text-rose-700 leading-relaxed font-medium">
                  ⚠️ <strong>Atenção:</strong> A emissão gera cobranças reais e passará a constar no
                  faturamento junto à operadora parceira. Esta ação é definitiva e não poderá ser
                  desfeita pelo painel.
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    onClick={() => setEmitStep(1)}
                    className="flex-1 h-10 border-none glass-card border-none text-xs font-bold text-muted-foreground hover:glass bg-white/5 transition-colors"
                  >
                    Voltar
                  </Button>
                  <Button
                    type="button"
                    disabled={bookGdsMut.isPending}
                    onClick={() => {
                      bookGdsMut.mutate();
                      setShowEmitModal(false);
                      setEmitStep(1);
                    }}
                    className="flex-1 h-10 bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {bookGdsMut.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wifi className="h-4 w-4" />
                    )}
                    Confirmar Emissão
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DetailShell>
  );
}
