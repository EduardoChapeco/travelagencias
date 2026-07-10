import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { StatusBadge } from "@/components/ui/badge";
import { fmtDate } from "@/lib/formatters";
import {
  fetchChangeCases,
  createChangeCase,
  createFlightAlternative,
  upsertDifferenceAnalysis,
  updateAlternativeSettings,
  updateChangeCaseStatus,
  createOperatorRequest,
  updateOperatorRequest,
  resolveChangeCase,
  analyzeFlightDifferences,
} from "@/services/reaccommodation";
import type { FullChangeCase } from "@/services/reaccommodation";
import { fetchFlightItineraries, createFlightItinerary } from "@/services/flight-reconciliation";
import type { FlightItinerary, FlightSegment } from "@/services/flight-reconciliation";
import {
  Plane,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Plus,
  Eye,
  Send,
  Check,
  X,
  FileSignature,
  Building,
  User,
  Shield,
  FileText,
  ChevronRight,
  ArrowRight,
  Info,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agency/$slug/trips/$id/reaccommodation")({
  head: ({ context }: any) => ({ meta: [{ title: `Reacomodação Aérea · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: TripReaccommodationPage,
});

function TripReaccommodationPage() {
  const { slug, id: tripId } = Route.useParams();
  const { agency } = useAgency();
  const qc = useQueryClient();

  const [isCreateCaseOpen, setIsCreateCaseOpen] = useState(false);
  const [isAddAlternativeOpen, setIsAddAlternativeOpen] = useState(false);
  const [isOperatorLogOpen, setIsOperatorLogOpen] = useState(false);

  // Form states for creating a case
  const [selectedItineraryId, setSelectedItineraryId] = useState("");
  const [changeReason, setChangeReason] = useState("schedule_change");
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");

  // Form states for adding alternative flight
  const [altSource, setAltSource] = useState<"manual" | "ai" | "operator">("manual");
  const [altSegments, setAltSegments] = useState<any[]>([
    {
      airline_code: "",
      flight_number: "",
      origin_iata: "",
      destination_iata: "",
      departure_at: "",
      arrival_at: "",
      cabin: "Economy",
      baggage: "1x 23kg",
      record_locator: "",
    },
  ]);

  // Selected case state for adding alternatives or logs
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);

  // Form states for operator log
  const [operatorId, setOperatorId] = useState("");
  const [operatorStatus, setOperatorStatus] = useState<
    "pending" | "notified" | "confirmed" | "rejected"
  >("notified");
  const [emailThreadId, setEmailThreadId] = useState("");

  // Queries
  const activeItinerariesQ = useQuery({
    enabled: !!agency,
    queryKey: ["flight-itineraries-active", tripId],
    queryFn: async () => {
      const itineraries = await fetchFlightItineraries(tripId);
      return itineraries.filter((it) => it.status === "active");
    },
  });

  const casesQ = useQuery({
    enabled: !!agency,
    queryKey: ["reaccommodation-cases", tripId],
    queryFn: () => fetchChangeCases(tripId),
  });

  const suppliersQ = useQuery({
    enabled: !!agency,
    queryKey: ["suppliers-airlines", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, name, kind")
        .eq("agency_id", agency!.id)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  // Mutations
  const createCaseMut = useMutation({
    mutationFn: async () => {
      if (!selectedItineraryId) throw new Error("Selecione o voo afetado");
      return createChangeCase({
        trip_id: tripId,
        agency_id: agency!.id,
        original_itinerary_id: selectedItineraryId,
        change_reason: changeReason,
        priority: priority,
        workflow_status: "change_detected",
      });
    },
    onSuccess: () => {
      toast.success("Caso de alteração registrado com sucesso!");
      setIsCreateCaseOpen(false);
      setSelectedItineraryId("");
      qc.invalidateQueries({ queryKey: ["reaccommodation-cases"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const addAlternativeMut = useMutation({
    mutationFn: async () => {
      if (!activeCaseId) throw new Error("Nenhum caso ativo");
      const activeCase = casesQ.data?.find((c) => c.id === activeCaseId);
      if (!activeCase || !activeCase.original_itinerary) {
        throw new Error("Caso original inválido ou sem itinerário de origem");
      }

      // 1. Create a new flight itinerary of type operator_suggestion
      const newItinerary = await createFlightItinerary(
        {
          trip_id: tripId,
          agency_id: agency!.id,
          type: "operator_suggestion",
          status: "draft",
          source: "manual",
        },
        altSegments.map((seg, idx) => ({
          ...seg,
          segment_order: idx + 1,
        })),
      );

      // 2. Add alternative record linking the case and the itinerary
      const alternative = await createFlightAlternative({
        change_case_id: activeCaseId,
        itinerary_id: newItinerary.id,
        source: altSource,
        ranking: (activeCase.alternatives?.length ?? 0) + 1,
        customer_visible: false,
        availability_status: "available",
      });

      // 3. Compute deterministic flight difference analysis
      const diffData = analyzeFlightDifferences(activeCase.original_itinerary, newItinerary);
      await upsertDifferenceAnalysis({
        ...diffData,
        original_itinerary_id: activeCase.original_itinerary.id,
        alternative_itinerary_id: newItinerary.id,
      });

      // 4. Update change case status to alternatives_added
      if (activeCase.workflow_status === "change_detected") {
        await updateChangeCaseStatus(activeCaseId, "alternatives_added");
      }

      return alternative;
    },
    onSuccess: () => {
      toast.success("Alternativa de voo adicionada e analisada com sucesso!");
      setIsAddAlternativeOpen(false);
      setAltSegments([
        {
          airline_code: "",
          flight_number: "",
          origin_iata: "",
          destination_iata: "",
          departure_at: "",
          arrival_at: "",
          cabin: "Economy",
          baggage: "1x 23kg",
          record_locator: "",
        },
      ]);
      qc.invalidateQueries({ queryKey: ["reaccommodation-cases"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const notifyClientMut = useMutation({
    mutationFn: async (caseId: string) => {
      // Updates case to client_notified
      return updateChangeCaseStatus(caseId, "client_notified");
    },
    onSuccess: () => {
      toast.success("Cliente notificado! Disponível no portal do autoatendimento.");
      qc.invalidateQueries({ queryKey: ["reaccommodation-cases"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleVisibilityMut = useMutation({
    mutationFn: async ({ altId, visible }: { altId: string; visible: boolean }) => {
      return updateAlternativeSettings(altId, { customer_visible: visible });
    },
    onSuccess: () => {
      toast.success("Visibilidade da alternativa atualizada!");
      qc.invalidateQueries({ queryKey: ["reaccommodation-cases"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const logOperatorRequestMut = useMutation({
    mutationFn: async () => {
      if (!activeCaseId) throw new Error("Nenhum caso ativo");
      const activeCase = casesQ.data?.find((c) => c.id === activeCaseId);
      if (!activeCase) throw new Error("Caso inválido");

      // Find client decision if any
      const latestDecision = activeCase.decisions?.[0];

      return createOperatorRequest({
        trip_id: tripId,
        change_case_id: activeCaseId,
        customer_decision_id: latestDecision?.id || null,
        operator_id: operatorId || null,
        status: operatorStatus,
        email_thread_id: emailThreadId || null,
      });
    },
    onSuccess: () => {
      toast.success("Comunicação com operadora registrada com sucesso!");
      setIsOperatorLogOpen(false);
      setOperatorId("");
      setEmailThreadId("");
      qc.invalidateQueries({ queryKey: ["reaccommodation-cases"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const confirmFinalReaccommodationMut = useMutation({
    mutationFn: async ({
      caseId,
      origItineraryId,
      confItineraryId,
    }: {
      caseId: string;
      origItineraryId: string | null;
      confItineraryId: string;
    }) => {
      return resolveChangeCase(caseId, origItineraryId, confItineraryId);
    },
    onSuccess: () => {
      toast.success("Reacomodação finalizada! Itinerários atualizados com sucesso no banco.");
      qc.invalidateQueries({ queryKey: ["reaccommodation-cases"] });
      qc.invalidateQueries({ queryKey: ["flight-itineraries-active"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const addSegmentRow = () => {
    setAltSegments([
      ...altSegments,
      {
        airline_code: "",
        flight_number: "",
        origin_iata: "",
        destination_iata: "",
        departure_at: "",
        arrival_at: "",
        cabin: "Economy",
        baggage: "1x 23kg",
        record_locator: "",
      },
    ]);
  };

  const removeSegmentRow = (index: number) => {
    if (altSegments.length === 1) return;
    setAltSegments(altSegments.filter((_, idx) => idx !== index));
  };

  const updateSegmentField = (index: number, field: string, value: string) => {
    const updated = [...altSegments];
    updated[index] = { ...updated[index], [field]: value };
    setAltSegments(updated);
  };

  // Status mapping to badge tones and labels
  const WORKFLOW_STATUS_CONFIG: Record<
    FullChangeCase["workflow_status"],
    { label: string; tone: "warning" | "info" | "success" | "danger" | "neutral" }
  > = {
    change_detected: { label: "Alteração Detectada", tone: "warning" },
    alternatives_added: { label: "Alternativas Propostas", tone: "info" },
    client_notified: { label: "Cliente Notificado", tone: "info" },
    client_accepted: { label: "Cliente Aceitou", tone: "success" },
    client_rejected: { label: "Cliente Rejeitou", tone: "danger" },
    operator_notified: { label: "Operadora Notificada", tone: "warning" },
    resolved: { label: "Resolvido & Atualizado", tone: "success" },
    cancelled: { label: "Cancelado", tone: "neutral" },
  };

  const PRIORITY_LABELS: Record<string, string> = {
    low: "Baixa",
    normal: "Normal",
    high: "Alta",
    urgent: "Urgente",
  };

  const CHANGE_REASON_LABELS: Record<string, string> = {
    schedule_change: "Alteração de Malha / Horário",
    cancellation: "Cancelamento de Voo",
    baggage_policy_change: "Mudança de Regra de Bagagem",
    other: "Outro Motivo Operacional",
  };

  return (
    <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            Gestão de Reacomodação Aérea
          </h2>
          <p className="text-sm text-muted-foreground">
            Gerencie alterações de malha aérea, cadastre alternativas, gere análises de impacto e
            colete assinaturas jurídicas do cliente.
          </p>
        </div>
        <Dialog open={isCreateCaseOpen} onOpenChange={setIsCreateCaseOpen}>
          <DialogTrigger asChild>
            <Button className="cursor-pointer">
              <Plus className="mr-2 h-4 w-4" /> Registrar Alteração de Voo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle>Registrar Alteração de Voo</DialogTitle>
              <DialogDescription>
                Abra um caso de reacomodação para iniciar o fluxo de alternativas e aceites com o
                cliente.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="itinerary">Selecione o Voo Afetado</Label>
                <Select value={selectedItineraryId} onValueChange={setSelectedItineraryId}>
                  <SelectTrigger id="itinerary">
                    <SelectValue placeholder="Selecione o itinerário ativo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {activeItinerariesQ.data?.map((it) => (
                      <SelectItem key={it.id} value={it.id}>
                        V{it.version} - {it.segments?.[0]?.origin_iata} →{" "}
                        {it.segments?.[it.segments.length - 1]?.destination_iata} (
                        {it.segments?.[0]?.flight_number})
                      </SelectItem>
                    ))}
                    {activeItinerariesQ.data?.length === 0 && (
                      <div className="p-2 text-xs text-muted-foreground text-center">
                        Nenhum voo ativo nesta viagem.
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="reason">Motivo da Alteração</Label>
                <Select value={changeReason} onValueChange={setChangeReason}>
                  <SelectTrigger id="reason">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="schedule_change">Alteração de Horário / Malha</SelectItem>
                    <SelectItem value="cancellation">Voo Cancelado</SelectItem>
                    <SelectItem value="baggage_policy_change">
                      Mudança na Franquia de Bagagem
                    </SelectItem>
                    <SelectItem value="other">Outro Motivo Operacional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="priority">Prioridade de Atendimento</Label>
                <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa (Mais de 30 dias para viagem)</SelectItem>
                    <SelectItem value="normal">Normal (Viagem em até 15 dias)</SelectItem>
                    <SelectItem value="high">Alta (Viagem em até 7 dias)</SelectItem>
                    <SelectItem value="urgent">Urgente (Viagem nas próximas 72h)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateCaseOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={() => createCaseMut.mutate()} disabled={createCaseMut.isPending}>
                {createCaseMut.isPending ? "Criando..." : "Criar Caso"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Cases List */}
      <div className="space-y-6">
        {casesQ.data?.map((c) => {
          const statusConfig = WORKFLOW_STATUS_CONFIG[
            c.workflow_status as FullChangeCase["workflow_status"]
          ] || { label: c.workflow_status, tone: "neutral" };
          const activeDecision = c.decisions?.[0]; // Get latest customer decision

          return (
            <Card key={c.id} className="border-none/60 overflow-hidden shadow-none">
              <CardHeader className="glass bg-white/5 border-white/10/20 border-b border-border/40 py-4 px-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 px-2.5 py-1 rounded">
                      Caso #{c.id.substring(0, 6)}
                    </span>
                    <h3 className="font-semibold text-foreground text-sm">
                      {CHANGE_REASON_LABELS[c.change_reason || ""] || c.change_reason}
                    </h3>
                    <StatusBadge tone={statusConfig.tone}>{statusConfig.label}</StatusBadge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div>
                      Prioridade:{" "}
                      <span className="font-semibold text-foreground">
                        {PRIORITY_LABELS[c.priority]}
                      </span>
                    </div>
                    <div>
                      Aberto em:{" "}
                      <span className="font-semibold text-foreground">
                        {fmtDate(c.detected_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* 1. Original Flight Info */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Plane className="h-3.5 w-3.5" /> Voo Original Afetado
                  </h4>
                  {c.original_itinerary ? (
                    <div className="py-4 border-b border-border/30 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                      <div>
                        <div className="text-xs text-muted-foreground">
                          Itinerário Atual (V{c.original_itinerary.version})
                        </div>
                        <div className="font-semibold text-foreground text-sm flex items-center gap-2 mt-1">
                          {c.original_itinerary.segments?.[0]?.origin_iata}{" "}
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />{" "}
                          {
                            c.original_itinerary.segments?.[
                              c.original_itinerary.segments.length - 1
                            ]?.destination_iata
                          }
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Partida Original</div>
                        <div className="font-semibold text-foreground text-sm mt-1">
                          {c.original_itinerary.segments?.[0]
                            ? `${fmtDate(c.original_itinerary.segments[0].departure_at)} às ${new Date(c.original_itinerary.segments[0].departure_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                            : "-"}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Localizador / Cia</div>
                        <div className="font-semibold text-foreground text-sm mt-1">
                          {c.original_itinerary.segments?.[0]?.record_locator || "N/A"} (
                          {c.original_itinerary.segments?.[0]?.airline_code})
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground italic">
                      Voo original não disponível ou deletado.
                    </div>
                  )}
                </div>

                {/* 2. Alternatives Proposed */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="h-3.5 w-3.5 text-brand" /> Alternativas Propostas e Análise
                    </h4>
                    {c.workflow_status !== "resolved" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="cursor-pointer text-xs h-8"
                        onClick={() => {
                          setActiveCaseId(c.id);
                          setIsAddAlternativeOpen(true);
                        }}
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" /> Adicionar Alternativa
                      </Button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {c.alternatives?.map((alt: any) => {
                      const analysis = alt.difference_analysis;
                      const riskColor =
                        (analysis?.risk_score ?? 0) > 60
                          ? "bg-rose-500/10 text-rose-600 border-rose-200"
                          : (analysis?.risk_score ?? 0) > 30
                            ? "bg-amber-500/10 text-amber-600 border-amber-200"
                            : "bg-emerald-500/10 text-emerald-600 border-emerald-200";

                      return (
                        <div
                          key={alt.id}
                          className="py-6 border-b border-border/30 last:border-0"
                        >
                          <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center border-b border-border/30">
                            {/* Route & Segments */}
                            <div className="lg:col-span-4 space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded glass bg-white/5 border-white/10 border-none/60">
                                  ALT {alt.ranking}
                                </span>
                                <span className="text-xs text-muted-foreground font-medium capitalize">
                                  Via {alt.source}
                                </span>
                              </div>
                              <div className="font-semibold text-foreground text-sm flex items-center gap-2">
                                {alt.itinerary?.segments?.[0]?.origin_iata}{" "}
                                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />{" "}
                                {
                                  alt.itinerary?.segments?.[alt.itinerary.segments.length - 1]
                                    ?.destination_iata
                                }
                              </div>
                              <div className="text-xs text-muted-foreground space-y-1">
                                {alt.itinerary?.segments?.map((seg: any, idx: number) => (
                                  <div key={seg.id} className="flex items-center gap-1.5">
                                    <span className="font-semibold text-foreground">
                                      {seg.airline_code}
                                      {seg.flight_number}
                                    </span>
                                    <span>
                                      ({seg.origin_iata} → {seg.destination_iata})
                                    </span>
                                    <span>
                                      {new Date(seg.departure_at).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Deterministic Diff Badges */}
                            <div className="lg:col-span-5 flex flex-wrap gap-2">
                              {analysis?.date_changed && (
                                <span className="text-[10px] font-medium bg-rose-50 text-rose-600 border border-rose-100 rounded-full px-2 py-0.5">
                                  Mudança de Data
                                </span>
                              )}
                              {analysis?.airport_changed && (
                                <span className="text-[10px] font-medium bg-rose-50 text-rose-600 border border-rose-100 rounded-full px-2 py-0.5">
                                  Troca de Aeroporto
                                </span>
                              )}
                              {analysis?.overnight_connection && (
                                <span className="text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-100 rounded-full px-2 py-0.5">
                                  Conexão Longa/Pernoite
                                </span>
                              )}
                              {analysis?.baggage_changed && (
                                <span className="text-[10px] font-medium bg-rose-50 text-rose-600 border border-rose-100 rounded-full px-2 py-0.5">
                                  Franquia Bagagem Alterada
                                </span>
                              )}
                              {analysis?.total_duration_delta_minutes !== 0 && (
                                <span className="text-[10px] font-medium bg-slate-50 text-slate-600 border border-slate-100 rounded-full px-2 py-0.5">
                                  Tempo:{" "}
                                  {analysis.total_duration_delta_minutes > 0
                                    ? `+${Math.round(analysis.total_duration_delta_minutes / 60)}h`
                                    : `${Math.round(analysis.total_duration_delta_minutes / 60)}h`}
                                </span>
                              )}
                              {analysis?.segment_count_delta !== 0 && (
                                <span className="text-[10px] font-medium bg-slate-50 text-slate-600 border border-slate-100 rounded-full px-2 py-0.5">
                                  Conexões:{" "}
                                  {analysis.segment_count_delta > 0
                                    ? `+${analysis.segment_count_delta}`
                                    : analysis.segment_count_delta}
                                </span>
                              )}
                            </div>

                            {/* Risk Score */}
                            <div className="lg:col-span-3 flex items-center justify-between lg:justify-end gap-4">
                              <div
                                className={cn(
                                  "text-xs font-semibold px-2.5 py-1 rounded-[var(--radius-card)] border",
                                  riskColor,
                                )}
                              >
                                Risco: {analysis?.risk_score}/100
                              </div>

                              {c.workflow_status !== "resolved" && (
                                <div className="flex items-center gap-2">
                                  <Label
                                    htmlFor={`visible-${alt.id}`}
                                    className="text-xs text-muted-foreground cursor-pointer"
                                  >
                                    Exibir ao cliente
                                  </Label>
                                  <Switch
                                    id={`visible-${alt.id}`}
                                    checked={alt.customer_visible}
                                    onCheckedChange={(checked) => {
                                      toggleVisibilityMut.mutate({
                                        altId: alt.id,
                                        visible: checked,
                                      });
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Warning summaries */}
                          {analysis?.warnings && analysis.warnings.length > 0 && (
                            <div className="bg-rose-500/5 px-4 py-2 text-[11px] text-rose-600 flex items-start gap-2 border-b border-border/20">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                              <div className="space-y-0.5">
                                <span className="font-bold">Pontos de atenção identificados: </span>
                                <span>{analysis.warnings.join(" | ")}</span>
                              </div>
                            </div>
                          )}

                          {/* AI & Deterministic details */}
                          <div className="p-3 glass bg-white/5 border-white/10/10 text-[11px] text-muted-foreground grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <span className="font-semibold text-foreground">
                                Diferença Determinística:
                              </span>{" "}
                              {analysis?.deterministic_summary || "Horários alterados sutilmente."}
                            </div>
                            <div>
                              <span className="font-semibold text-foreground">
                                Resumo de Impacto IA:
                              </span>{" "}
                              {analysis?.ai_summary || "Nenhuma análise gerada."}
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {c.alternatives?.length === 0 && (
                      <div className="rounded-[var(--radius-card)] border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground glass bg-white/5 border-white/10/5">
                        Nenhuma alternativa proposta ainda. Clique em "Adicionar Alternativa" para
                        cadastrar itinerários e rodar o comparador.
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. Actions / Notifications */}
                {c.workflow_status !== "resolved" &&
                  c.alternatives &&
                  c.alternatives.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border/40 pt-4 mt-6">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Info className="h-4 w-4 text-brand shrink-0" />
                        <span>
                          {c.workflow_status === "alternatives_added"
                            ? "Envie as propostas de voo para o passageiro avaliar no portal."
                            : c.workflow_status === "client_notified"
                              ? "Aguardando o cliente aceitar ou rejeitar a reacomodação."
                              : "As propostas estão prontas."}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        {c.workflow_status === "alternatives_added" && (
                          <Button
                            size="sm"
                            className="cursor-pointer text-xs"
                            onClick={() => notifyClientMut.mutate(c.id)}
                            disabled={notifyClientMut.isPending}
                          >
                            <Send className="mr-1.5 h-3.5 w-3.5" /> Enviar Notificação ao Passageiro
                          </Button>
                        )}

                        {c.workflow_status === "client_notified" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="cursor-pointer text-xs"
                            onClick={() => notifyClientMut.mutate(c.id)}
                            disabled={notifyClientMut.isPending}
                          >
                            <Send className="mr-1.5 h-3.5 w-3.5" /> Reenviar Notificação
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                {/* 4. Client Acceptance Audit Certificate */}
                {activeDecision && (
                  <div className="border border-emerald-200 bg-emerald-500/5 rounded-[var(--radius-card)] overflow-hidden shadow-none">
                    <div className="bg-emerald-500/10 border-b border-emerald-200 py-3 px-4 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wide">
                        <FileSignature className="h-4 w-4" /> Certificado de Aceite Digital
                        Auditável (Legenda Jurídica)
                      </div>
                      <div className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                        Status:{" "}
                        {activeDecision.decision_status === "accepted" ? "Aceito" : "Rejeitado"}
                      </div>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-2">
                        <div>
                          <span className="text-muted-foreground font-semibold">
                            Assinatura do Passageiro:
                          </span>{" "}
                          <span className="font-bold text-foreground font-serif italic text-sm underline">
                            {activeDecision.typed_name || "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground font-semibold">
                            Data/Hora de Registro:
                          </span>{" "}
                          <span className="font-medium text-foreground">
                            {fmtDate(activeDecision.accepted_at)}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground font-semibold">
                            IP do Dispositivo:
                          </span>{" "}
                          <span className="font-mono text-foreground glass-card border-none px-1.5 py-0.5 rounded border-none/40">
                            {activeDecision.ip_address || "N/A"}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <span className="text-muted-foreground font-semibold">
                            Assinatura de Integridade (SHA256):
                          </span>{" "}
                          <span className="font-mono text-[10px] text-foreground glass-card border-none px-1.5 py-0.5 rounded border-none/40 break-all">
                            {activeDecision.signature_hash || "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground font-semibold">User Agent:</span>{" "}
                          <span
                            className="text-foreground text-[11px] truncate block"
                            title={activeDecision.user_agent || ""}
                          >
                            {activeDecision.user_agent || "N/A"}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground font-semibold">
                            ID de Sessão do Portal:
                          </span>{" "}
                          <span className="font-mono text-foreground">
                            {activeDecision.portal_session_id || "N/A"}
                          </span>
                        </div>
                      </div>

                      <div className="col-span-1 md:col-span-2 pt-2 border-t border-emerald-200/40">
                        <span className="text-muted-foreground font-semibold">
                          Termos e Declarações de Ciência Aceitos:
                        </span>
                        <ul className="list-disc pl-4 mt-1 text-emerald-800/80 space-y-0.5">
                          {activeDecision.disclosures_snapshot?.map((term: string, i: number) => (
                            <li key={i}>{term}</li>
                          ))}
                          {(!activeDecision.disclosures_snapshot ||
                            activeDecision.disclosures_snapshot.length === 0) && (
                            <li>
                              Ciência e concordância expressa com as alterações de malha e
                              itinerários anexados.
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. Operator Confirmation logs */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Building className="h-3.5 w-3.5 text-muted-foreground" /> Comunicações e
                      Confirmações com a Operadora
                    </h4>
                    {c.workflow_status !== "resolved" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="cursor-pointer text-xs h-8"
                        onClick={() => {
                          setActiveCaseId(c.id);
                          setIsOperatorLogOpen(true);
                        }}
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" /> Registrar Log de Operação
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {c.operator_requests?.map((req: any) => (
                      <div
                        key={req.id}
                        className="rounded-[var(--radius-card)] border-none/40 p-3 text-xs glass bg-white/5 border-white/10/10 flex items-center justify-between"
                      >
                        <div>
                          <span className="font-semibold text-foreground">
                            {req.operator?.name || "Fornecedor / Cia Aérea"}
                          </span>
                          <span className="mx-2 text-muted-foreground">|</span>
                          <span className="text-muted-foreground">Thread ID: </span>
                          <span className="font-mono text-foreground">
                            {req.email_thread_id || "N/A"}
                          </span>
                          <span className="mx-2 text-muted-foreground">|</span>
                          <span className="text-muted-foreground">Enviado em: </span>
                          <span>{fmtDate(req.requested_at)}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold capitalize text-foreground glass-card border-none px-2 py-0.5 rounded border-none/40">
                            {req.status === "confirmed"
                              ? "Confirmado"
                              : req.status === "rejected"
                                ? "Rejeitado"
                                : "Notificado"}
                          </span>

                          {c.workflow_status === "client_accepted" &&
                            req.status !== "confirmed" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="cursor-pointer text-[10px] h-6 border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                                onClick={async () => {
                                  const latestDecision = c.decisions?.[0];
                                  const selectedAlt = c.alternatives?.find(
                                    (a: any) => a.id === latestDecision?.selected_alternative_id,
                                  );

                                  if (!selectedAlt) {
                                    toast.error("Nenhuma alternativa selecionada pelo cliente!");
                                    return;
                                  }

                                  // 1. Confirm operator request log
                                  await updateOperatorRequest(req.id, {
                                    status: "confirmed",
                                    confirmed_at: new Date().toISOString(),
                                    confirmed_itinerary_id: selectedAlt.itinerary_id,
                                  });

                                  // 2. Perform final resolution in DB
                                  confirmFinalReaccommodationMut.mutate({
                                    caseId: c.id,
                                    origItineraryId: c.original_itinerary_id,
                                    confItineraryId: selectedAlt.itinerary_id,
                                  });
                                }}
                              >
                                Confirmar & Aplicar Voos
                              </Button>
                            )}
                        </div>
                      </div>
                    ))}

                    {c.operator_requests?.length === 0 && (
                      <div className="text-xs text-muted-foreground italic glass-card border-none/50 p-4 rounded-[var(--radius-card)] border border-dashed border-border/60 text-center">
                        Nenhum envio ou contato com a operadora registrado para este caso.
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {casesQ.data?.length === 0 && (
          <div className="rounded-[var(--radius-card)] border border-dashed border-border/60 p-12 text-center space-y-4 glass bg-white/5 border-white/10/5">
            <Plane className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
            <div>
              <h3 className="font-semibold text-foreground text-sm">
                Nenhuma reacomodação aérea ativa
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Não há registros de alterações de malhas ou cancelamentos para esta viagem. Abra um
                novo caso se a companhia aérea alterou os voos.
              </p>
            </div>
            <Button className="cursor-pointer" onClick={() => setIsCreateCaseOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Registrar Alteração de Voo
            </Button>
          </div>
        )}
      </div>

      {/* Modal to Add Flight Alternative */}
      <Dialog open={isAddAlternativeOpen} onOpenChange={setIsAddAlternativeOpen}>
        <DialogContent className="sm:max-w-[720px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Itinerário Alternativo</DialogTitle>
            <DialogDescription>
              Insira os trechos do novo voo proposto pela companhia aérea ou operadora para rodar a
              análise determinística.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="source">Origem da Proposta</Label>
                <Select value={altSource} onValueChange={(v: any) => setAltSource(v)}>
                  <SelectTrigger id="source">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Manual (Agência digitou)</SelectItem>
                    <SelectItem value="operator">Operadora / Cia Aérea</SelectItem>
                    <SelectItem value="ai">Sugestão Inteligente IA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Trechos de Voo (Conexões)
                </Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addSegmentRow}
                  className="cursor-pointer text-[10px]"
                >
                  <Plus className="mr-1 h-3 w-3" /> Adicionar Trecho
                </Button>
              </div>

              {altSegments.map((seg, index) => (
                <div
                  key={index}
                  className="p-4 rounded-[var(--radius-card)] border-none/60 glass bg-white/5 border-white/10/20 space-y-4 relative"
                >
                  {altSegments.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                      onClick={() => removeSegmentRow(index)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <div className="text-xs font-bold text-foreground">Trecho #{index + 1}</div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Cia Aérea (IATA)</Label>
                      <Input
                        placeholder="Ex: LA, AD, G3"
                        value={seg.airline_code}
                        onChange={(e) =>
                          updateSegmentField(index, "airline_code", e.target.value.toUpperCase())
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Nº do Voo</Label>
                      <Input
                        placeholder="Ex: 3450"
                        value={seg.flight_number}
                        onChange={(e) => updateSegmentField(index, "flight_number", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Origem (IATA)</Label>
                      <Input
                        placeholder="Ex: GRU"
                        value={seg.origin_iata}
                        onChange={(e) =>
                          updateSegmentField(index, "origin_iata", e.target.value.toUpperCase())
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Destino (IATA)</Label>
                      <Input
                        placeholder="Ex: FLN"
                        value={seg.destination_iata}
                        onChange={(e) =>
                          updateSegmentField(
                            index,
                            "destination_iata",
                            e.target.value.toUpperCase(),
                          )
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">
                        Partida (Data e Hora)
                      </Label>
                      <Input
                        type="datetime-local"
                        value={seg.departure_at}
                        onChange={(e) => updateSegmentField(index, "departure_at", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">
                        Chegada (Data e Hora)
                      </Label>
                      <Input
                        type="datetime-local"
                        value={seg.arrival_at}
                        onChange={(e) => updateSegmentField(index, "arrival_at", e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Classe/Cabine</Label>
                      <Select
                        value={seg.cabin}
                        onValueChange={(v) => updateSegmentField(index, "cabin", v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Economy">Econômica</SelectItem>
                          <SelectItem value="PremiumEconomy">Econômica Premium</SelectItem>
                          <SelectItem value="Business">Executiva</SelectItem>
                          <SelectItem value="First">Primeira Classe</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Bagagem Franquia</Label>
                      <Input
                        placeholder="Ex: 1x 23kg, Só de mão"
                        value={seg.baggage}
                        onChange={(e) => updateSegmentField(index, "baggage", e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground">Localizador (PNR)</Label>
                      <Input
                        placeholder="Ex: XYZW12"
                        value={seg.record_locator}
                        onChange={(e) =>
                          updateSegmentField(index, "record_locator", e.target.value.toUpperCase())
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddAlternativeOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => addAlternativeMut.mutate()}
              disabled={addAlternativeMut.isPending}
            >
              {addAlternativeMut.isPending ? "Adicionando..." : "Adicionar Alternativa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal to Log Operator Request */}
      <Dialog open={isOperatorLogOpen} onOpenChange={setIsOperatorLogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Registrar Log de Comunicação Operadora</DialogTitle>
            <DialogDescription>
              Registre e-mails, ligações ou chats trocados com o fornecedor/operadora para aprovação
              da reacomodação.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <Label htmlFor="operator">Operadora / Fornecedor</Label>
              <Select value={operatorId} onValueChange={setOperatorId}>
                <SelectTrigger id="operator">
                  <SelectValue placeholder="Selecione o fornecedor..." />
                </SelectTrigger>
                <SelectContent>
                  {suppliersQ.data?.map((sup) => (
                    <SelectItem key={sup.id} value={sup.id}>
                      {sup.name} ({sup.kind})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="thread">ID da Conversa / E-mail Thread</Label>
              <Input
                id="thread"
                placeholder="Ex: thread_abc123 ou Ticket ID"
                value={emailThreadId}
                onChange={(e) => setEmailThreadId(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="opStatus">Status da Solicitação no Fornecedor</Label>
              <Select value={operatorStatus} onValueChange={(v: any) => setOperatorStatus(v)}>
                <SelectTrigger id="opStatus">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="notified">Notificado (Aguardando operadora)</SelectItem>
                  <SelectItem value="pending">Pendente (Em análise)</SelectItem>
                  <SelectItem value="confirmed">Confirmado / Reacomodado pela Cia</SelectItem>
                  <SelectItem value="rejected">Rejeitado pela Cia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOperatorLogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => logOperatorRequestMut.mutate()}
              disabled={logOperatorRequestMut.isPending}
            >
              {logOperatorRequestMut.isPending ? "Gravando..." : "Salvar Log"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
