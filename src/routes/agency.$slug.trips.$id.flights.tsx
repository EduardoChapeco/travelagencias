import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { StatusBadge, fmtDate } from "@/components/ui/form";
import {
  fetchFlightItineraries,
  createFlightItinerary,
  setItineraryActive,
  deleteFlightItinerary,
  compareItineraries,
  ITINERARY_TYPE_LABELS,
  ITINERARY_STATUS_LABELS,
} from "@/services/flight-reconciliation";
import type { FlightItinerary, FlightSegment } from "@/services/flight-reconciliation";
import {
  Plane,
  MapPin,
  Calendar,
  Hash,
  User,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus,
  Trash2,
  Check,
  X,
  GitCompare,
  Briefcase,
  Layers,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { logTripAudit } from "@/services/audit";

export const Route = createFileRoute("/agency/$slug/trips/$id/flights")({
  head: ({ context }: any) => ({ meta: [{ title: `Aéreos & Reconciliação · ${context?.brand?.platform_name || 'Turis'}` }] }),
  component: TripFlightsPage,
});

const BOARDING_STATUS_CONFIG: Record<
  string,
  { label: string; tone: "neutral" | "info" | "success" | "warning" | "danger" }
> = {
  pending: { label: "Pendente", tone: "warning" },
  confirmed: { label: "Confirmado", tone: "success" },
  issued: { label: "Emitido", tone: "info" },
  cancelled: { label: "Cancelado", tone: "danger" },
};

type NewSegmentForm = {
  airline_code: string;
  flight_number: string;
  origin_iata: string;
  destination_iata: string;
  departure_at: string;
  arrival_at: string;
  cabin: string;
  baggage: string;
  record_locator: string;
  airport_terminal: string;
};

const BLANK_SEGMENT: NewSegmentForm = {
  airline_code: "",
  flight_number: "",
  origin_iata: "",
  destination_iata: "",
  departure_at: "",
  arrival_at: "",
  cabin: "economy",
  baggage: "",
  record_locator: "",
  airport_terminal: "",
};

function TripFlightsPage() {
  const { id: tripId } = useParams({ from: "/agency/$slug/trips/$id/flights" });
  const { agency } = useAgency();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<"itineraries" | "boarding_cards">("itineraries");
  const [showAddForm, setShowAddForm] = useState(false);
  const [itineraryType, setItineraryType] = useState<
    "original" | "operator_suggestion" | "customer_selected" | "confirmed"
  >("original");
  const [itineraryStatus, setItineraryStatus] = useState<"draft" | "active">("draft");
  const [segments, setSegments] = useState<NewSegmentForm[]>([{ ...BLANK_SEGMENT }]);

  // Diff states
  const [compareAId, setCompareAId] = useState<string | null>(null);
  const [compareBId, setCompareBId] = useState<string | null>(null);
  const [showDiffModal, setShowDiffModal] = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────

  // 1. Fetch Boarding Cards (retrocompatibility)
  const boardingQ = useQuery({
    enabled: !!agency,
    queryKey: ["trip-boarding-cards", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boarding_cards")
        .select(
          `
          id, pnr, airline, status, departure_date, passengers_count,
          departure_airport, arrival_airport, flight_number, flight_date, flight_class,
          notes, tags, alerts
        `,
        )
        .eq("trip_id", tripId)
        .order("flight_date", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // 2. Fetch Boarding Tickets
  const ticketsQ = useQuery({
    enabled: !!boardingQ.data && boardingQ.data.length > 0,
    queryKey: ["trip-flight-tickets", tripId],
    queryFn: async () => {
      const cardIds = boardingQ.data!.map((c) => c.id);
      const { data, error } = await supabase
        .from("boarding_tickets")
        .select("id, card_id, passenger_name, ticket_code, date_time, venue, seat, status, notes")
        .in("card_id", cardIds)
        .eq("kind", "airline")
        .order("date_time", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // 3. Fetch flight itineraries (reconciliação)
  const itinerariesQ = useQuery({
    enabled: !!agency && !!tripId,
    queryKey: ["trip-flight-itineraries", tripId],
    queryFn: () => fetchFlightItineraries(tripId),
  });

  const cards = (boardingQ.data as any[]) ?? [];
  const tickets = (ticketsQ.data as any[]) ?? [];

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["trip-flight-itineraries", tripId] });
    qc.invalidateQueries({ queryKey: ["trip-boarding-cards", tripId] });
    qc.invalidateQueries({ queryKey: ["trip-flight-tickets", tripId] });
  };

  const isItinerarySynced = (it: FlightItinerary) => {
    if (it.status !== "active") return false;
    if (!it.segments || it.segments.length === 0) return false;
    const firstSeg = it.segments[0];

    const matchedCard = cards.find((c) => {
      const pnrMatch =
        (c.pnr || "").trim().toUpperCase() === (firstSeg.record_locator || "").trim().toUpperCase();
      const airlineMatch =
        (c.airline || "").trim().toUpperCase() ===
        (firstSeg.airline_code || "").trim().toUpperCase();
      const flightNumMatch =
        (c.flight_number || "").trim().toUpperCase() ===
        (firstSeg.flight_number || "").trim().toUpperCase();
      const originMatch =
        (c.departure_airport || "").trim().toUpperCase() ===
        (firstSeg.origin_iata || "").trim().toUpperCase();
      const destMatch =
        (c.arrival_airport || "").trim().toUpperCase() ===
        (firstSeg.destination_iata || "").trim().toUpperCase();

      return pnrMatch && airlineMatch && flightNumMatch && originMatch && destMatch;
    });

    return !!matchedCard;
  };

  // ── Mutations ────────────────────────────────────────────────────────

  const addItineraryMut = useMutation({
    mutationFn: async () => {
      // Validate
      if (
        segments.some(
          (s) =>
            !s.airline_code ||
            !s.flight_number ||
            !s.origin_iata ||
            !s.destination_iata ||
            !s.departure_at ||
            !s.arrival_at,
        )
      ) {
        throw new Error("Preencha todos os campos obrigatórios dos trechos de voo.");
      }

      const payloadSegments = segments.map((s, idx) => ({
        segment_order: idx + 1,
        airline_code: s.airline_code.trim().toUpperCase(),
        flight_number: s.flight_number.trim().toUpperCase(),
        origin_iata: s.origin_iata.trim().toUpperCase(),
        destination_iata: s.destination_iata.trim().toUpperCase(),
        departure_at: new Date(s.departure_at).toISOString(),
        arrival_at: new Date(s.arrival_at).toISOString(),
        cabin: s.cabin || null,
        baggage: s.baggage.trim() || null,
        record_locator: s.record_locator.trim().toUpperCase() || null,
        airport_terminal: s.airport_terminal.trim() || null,
        status: "scheduled" as const,
      }));

      return createFlightItinerary(
        {
          trip_id: tripId,
          agency_id: agency!.id,
          type: itineraryType,
          status: itineraryStatus,
          source: "manual",
          created_by: (await supabase.auth.getUser()).data.user?.id || null,
        },
        payloadSegments,
      );
    },
    onSuccess: (data) => {
      logTripAudit({
        agencyId: agency!.id,
        tripId: tripId,
        action: "criar_itinerario_voo",
        details: `Criado itinerário de voo Versão ${data.version} (${ITINERARY_TYPE_LABELS[data.type]})`,
      });
      toast.success("Novo itinerário registrado com sucesso!");
      setShowAddForm(false);
      setSegments([{ ...BLANK_SEGMENT }]);
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao cadastrar itinerário"),
  });

  const activateItineraryMut = useMutation({
    mutationFn: (itId: string) => setItineraryActive(itId, tripId),
    onSuccess: (_, itId) => {
      const it = itinerariesQ.data?.find((i) => i.id === itId);
      logTripAudit({
        agencyId: agency!.id,
        tripId: tripId,
        action: "ativar_itinerario_voo",
        details: `Ativado itinerário de voo Versão ${it?.version || ""}`,
      });
      toast.success("Itinerário definido como Ativo/Vigente!");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao ativar itinerário"),
  });

  const deleteItineraryMut = useMutation({
    mutationFn: (itId: string) => deleteFlightItinerary(itId),
    onSuccess: () => {
      toast.success("Itinerário removido!");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao remover"),
  });

  // ── Form segment operations ──────────────────────────────────────────

  const addSegmentField = () => {
    setSegments([...segments, { ...BLANK_SEGMENT }]);
  };

  const removeSegmentField = (idx: number) => {
    if (segments.length === 1) return;
    setSegments(segments.filter((_, i) => i !== idx));
  };

  const handleSegmentChange = (idx: number, field: keyof NewSegmentForm, val: string) => {
    const next = [...segments];
    next[idx] = { ...next[idx], [field]: val };
    setSegments(next);
  };

  // ── Diff calculations ────────────────────────────────────────────────

  const itineraryA = itinerariesQ.data?.find((i) => i.id === compareAId);
  const itineraryB = itinerariesQ.data?.find((i) => i.id === compareBId);
  const diffResult =
    itineraryA && itineraryB ? compareItineraries(itineraryA.segments, itineraryB.segments) : null;

  // ────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="rounded-[var(--radius-card)] border-none glass-card border-none p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <Plane className="h-4 w-4 text-brand mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold text-foreground">Aéreos & Reconciliação</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Versionamento e controle de itinerários de voo. Compare alterações e defina o
              itinerário vigente.
            </p>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex glass bg-white/5 border-white/10 p-0.5 rounded-[var(--radius-card)] border-none shrink-0 self-start sm:self-center">
          <button
            onClick={() => setActiveTab("itineraries")}
            className={`px-3 py-1 text-[11px] font-semibold rounded-full transition-colors cursor-pointer ${
              activeTab === "itineraries"
                ? "glass-card border-none text-foreground shadow-none"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Itinerários & Diff
          </button>
          <button
            onClick={() => setActiveTab("boarding_cards")}
            className={`px-3 py-1 text-[11px] font-semibold rounded-full transition-colors cursor-pointer ${
              activeTab === "boarding_cards"
                ? "glass-card border-none text-foreground shadow-none"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Bilhetes de Embarque
          </button>
        </div>
      </div>

      {activeTab === "itineraries" && (
        <>
          {/* Summary action buttons */}
          <div className="flex justify-between items-center gap-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1">
              <Layers className="h-3.5 w-3.5" /> Versões de Itinerários (
              {itinerariesQ.data?.length || 0})
            </h2>

            <div className="flex gap-2">
              {itinerariesQ.data && itinerariesQ.data.length >= 2 && (
                <button
                  onClick={() => {
                    // Set defaults for comparison
                    const activeIt =
                      itinerariesQ.data.find((i) => i.status === "active") || itinerariesQ.data[0];
                    const otherIt =
                      itinerariesQ.data.find((i) => i.id !== activeIt.id) || itinerariesQ.data[1];
                    setCompareAId(activeIt.id);
                    setCompareBId(otherIt.id);
                    setShowDiffModal(true);
                  }}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border-none glass-card border-none px-3 text-xs font-medium hover:glass bg-white/5 border-white/10 transition-colors cursor-pointer"
                >
                  <GitCompare className="h-3.5 w-3.5" />
                  <span>Comparar Versões</span>
                </button>
              )}

              {!showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full bg-brand text-brand-foreground px-3 text-xs font-medium hover:bg-brand/90 transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Nova Versão</span>
                </button>
              )}
            </div>
          </div>

          {/* Add form */}
          {showAddForm && (
            <div className="rounded-[var(--radius-card)] border-none glass-card border-none p-5 space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-xs font-bold uppercase tracking-widest text-foreground">
                  Registrar Nova Versão de Itinerário
                </h3>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">
                    Tipo de Versão
                  </label>
                  <select
                    value={itineraryType}
                    onChange={(e: any) => setItineraryType(e.target.value)}
                    className="w-full text-xs border-none rounded-full px-2 py-2 glass-card border-none focus:outline-none focus:ring-1 focus:ring-brand"
                  >
                    {Object.entries(ITINERARY_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-muted-foreground uppercase">
                    Status Inicial
                  </label>
                  <select
                    value={itineraryStatus}
                    onChange={(e: any) => setItineraryStatus(e.target.value)}
                    className="w-full text-xs border-none rounded-full px-2 py-2 glass-card border-none focus:outline-none focus:ring-1 focus:ring-brand"
                  >
                    <option value="draft">Rascunho</option>
                    <option value="active">Ativo / Vigente (Arquiva anteriores)</option>
                  </select>
                </div>
              </div>

              {/* Dynamic segment items */}
              <div className="space-y-4 pt-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Trechos de Voo ({segments.length})
                </h4>

                {segments.map((seg, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-[var(--radius-card)] border-none glass bg-white/5 border-white/10/40 space-y-3 relative"
                  >
                    {segments.length > 1 && (
                      <button
                        onClick={() => removeSegmentField(idx)}
                        className="absolute right-2 top-2 h-6 w-6 inline-flex items-center justify-center rounded-full text-rose-500 hover:bg-rose-50 cursor-pointer"
                        title="Remover Trecho"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}

                    <span className="font-mono text-xs font-bold text-muted-foreground block">
                      #{idx + 1}
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase">
                          Cia Aérea (Cód) *
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: LA, AD, G3"
                          value={seg.airline_code}
                          onChange={(e) => handleSegmentChange(idx, "airline_code", e.target.value)}
                          className="w-full text-xs border-none rounded p-1.5 glass-card border-none font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase">
                          Número do Voo *
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: 3412"
                          value={seg.flight_number}
                          onChange={(e) =>
                            handleSegmentChange(idx, "flight_number", e.target.value)
                          }
                          className="w-full text-xs border-none rounded p-1.5 glass-card border-none font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase">
                          Origem (IATA) *
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: GRU"
                          value={seg.origin_iata}
                          onChange={(e) => handleSegmentChange(idx, "origin_iata", e.target.value)}
                          className="w-full text-xs border-none rounded p-1.5 glass-card border-none font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase">
                          Destino (IATA) *
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: MIA"
                          value={seg.destination_iata}
                          onChange={(e) =>
                            handleSegmentChange(idx, "destination_iata", e.target.value)
                          }
                          className="w-full text-xs border-none rounded p-1.5 glass-card border-none font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase">
                          Partida *
                        </label>
                        <input
                          type="datetime-local"
                          value={seg.departure_at}
                          onChange={(e) => handleSegmentChange(idx, "departure_at", e.target.value)}
                          className="w-full text-xs border-none rounded p-1.5 glass-card border-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase">
                          Chegada *
                        </label>
                        <input
                          type="datetime-local"
                          value={seg.arrival_at}
                          onChange={(e) => handleSegmentChange(idx, "arrival_at", e.target.value)}
                          className="w-full text-xs border-none rounded p-1.5 glass-card border-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase">
                          Cabine
                        </label>
                        <select
                          value={seg.cabin}
                          onChange={(e) => handleSegmentChange(idx, "cabin", e.target.value)}
                          className="w-full text-xs border-none rounded p-1.5 glass-card border-none"
                        >
                          <option value="economy">Econômica</option>
                          <option value="premium_economy">Premium Economy</option>
                          <option value="business">Executiva</option>
                          <option value="first">Primeira Classe</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase">
                          Franquia Bagagem
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: 1x 23kg"
                          value={seg.baggage}
                          onChange={(e) => handleSegmentChange(idx, "baggage", e.target.value)}
                          className="w-full text-xs border-none rounded p-1.5 glass-card border-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase">
                          Localizador Trecho
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: PQLW12"
                          value={seg.record_locator}
                          onChange={(e) =>
                            handleSegmentChange(idx, "record_locator", e.target.value)
                          }
                          className="w-full text-xs border-none rounded p-1.5 glass-card border-none font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-muted-foreground uppercase">
                          Terminal
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: Terminal 3"
                          value={seg.airport_terminal}
                          onChange={(e) =>
                            handleSegmentChange(idx, "airport_terminal", e.target.value)
                          }
                          className="w-full text-xs border-none rounded p-1.5 glass-card border-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addSegmentField}
                  className="inline-flex h-8 items-center gap-1.5 border border-dashed border-border rounded-full px-3 text-xs font-semibold hover:glass bg-white/5 border-white/10 transition-colors cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Adicionar Trecho/Escala</span>
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-3 py-1.5 border-none text-xs rounded-full hover:glass bg-white/5 border-white/10 cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => addItineraryMut.mutate()}
                  disabled={addItineraryMut.isPending}
                  className="px-4 py-1.5 bg-brand text-brand-foreground text-xs rounded-full hover:bg-brand/90 cursor-pointer transition-colors disabled:opacity-50"
                >
                  {addItineraryMut.isPending ? "Salvando…" : "Salvar Versão"}
                </button>
              </div>
            </div>
          )}

          {/* List of itineraries */}
          {itinerariesQ.isLoading && (
            <div className="text-sm text-muted-foreground animate-pulse py-8 text-center">
              Carregando versões de itinerários…
            </div>
          )}

          {!itinerariesQ.isLoading && (!itinerariesQ.data || itinerariesQ.data.length === 0) && (
            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-[var(--radius-card)] text-center">
              <Layers className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-semibold text-muted-foreground">
                Nenhum itinerário versionado
              </p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                Registre o itinerário aéreo original ou sugestões de reacomodação clicando em "Nova
                Versão".
              </p>
            </div>
          )}

          {!itinerariesQ.isLoading && itinerariesQ.data && itinerariesQ.data.length > 0 && (
            <div className="space-y-4">
              {itinerariesQ.data.map((it) => (
                <div
                  key={it.id}
                  className={`rounded-[var(--radius-card)] border glass-card border-none overflow-hidden hover:shadow-none transition-all ${
                    it.status === "active" ? "border-brand ring-1 ring-brand/35" : "border-border"
                  }`}
                >
                  {/* Itinerary Header */}
                  <div className="p-4 border-b border-border/60 glass bg-white/5 border-white/10/10 flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold glass bg-white/5 border-white/10 border-none px-2 py-0.5 rounded text-foreground">
                        V{it.version}
                      </span>
                      <span className="text-xs font-bold text-foreground">
                        {ITINERARY_TYPE_LABELS[it.type] || it.type}
                      </span>
                      {it.status === "active" && (
                        <>
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                            <Check className="h-3 w-3" /> Vigente / Confirmado
                          </span>
                          {isItinerarySynced(it) ? (
                            <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                              <CheckCircle2 className="h-3 w-3 text-blue-500" /> Sincronizado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200 animate-pulse">
                              <AlertTriangle className="h-3 w-3 text-amber-500" /> Desatualizado
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {it.status !== "active" && (
                        <button
                          onClick={() => activateItineraryMut.mutate(it.id)}
                          className="h-7 px-3 inline-flex items-center justify-center border-none hover:bg-brand hover:text-brand-foreground hover:border-brand rounded text-xs font-semibold text-foreground cursor-pointer transition-colors"
                          title="Definir este itinerário como vigente"
                        >
                          Definir Vigente
                        </button>
                      )}

                      <button
                        onClick={() => {
                          if (confirm("Deseja realmente remover esta versão do itinerário?")) {
                            deleteItineraryMut.mutate(it.id);
                          }
                        }}
                        className="h-7 w-7 inline-flex items-center justify-center border-none text-rose-500 hover:bg-rose-50 rounded cursor-pointer transition-colors"
                        title="Remover"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Itinerary segments */}
                  <div className="p-4 space-y-3 glass-card border-none">
                    {it.segments.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">
                        Nenhum trecho de voo registrado nesta versão.
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {it.segments.map((seg, idx) => (
                          <div
                            key={seg.id}
                            className="flex items-start justify-between flex-wrap gap-4 text-xs"
                          >
                            <div className="flex items-start gap-3 min-w-0">
                              <div className="shrink-0 h-7 w-7 rounded glass bg-white/5 border-white/10 border-none flex items-center justify-center font-bold font-mono text-[10px] text-muted-foreground mt-0.5">
                                {idx + 1}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold bg-brand/10 text-brand px-1.5 py-0.5 rounded text-[10px]">
                                    {seg.airline_code} {seg.flight_number}
                                  </span>
                                  {seg.record_locator && (
                                    <span className="font-mono text-muted-foreground text-[10px] glass bg-white/5 border-white/10 px-1.5 py-0.5 rounded border-none">
                                      LOC: {seg.record_locator}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 text-sm font-semibold text-foreground mt-2">
                                  <span className="font-mono">{seg.origin_iata}</span>
                                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                                  <span className="font-mono">{seg.destination_iata}</span>
                                </div>

                                <div className="text-[11px] text-muted-foreground mt-1 flex gap-3 flex-wrap">
                                  {seg.cabin && (
                                    <span className="flex items-center gap-1">
                                      <Briefcase className="h-3 w-3" />{" "}
                                      {seg.cabin === "economy" ? "Econômica" : seg.cabin}
                                    </span>
                                  )}
                                  {seg.baggage && (
                                    <span className="flex items-center gap-1">
                                      <Briefcase className="h-3 w-3" /> Bagagem: {seg.baggage}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Departure / Arrival schedule */}
                            <div className="text-right shrink-0">
                              <div className="flex items-center gap-1 justify-end font-semibold text-foreground">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                <span>
                                  Partida: {new Date(seg.departure_at).toLocaleString("pt-BR")}
                                </span>
                              </div>
                              <div className="text-[11px] text-muted-foreground mt-1">
                                Chegada: {new Date(seg.arrival_at).toLocaleString("pt-BR")}
                              </div>
                              {seg.airport_terminal && (
                                <div className="text-[10px] text-muted-foreground mt-0.5 glass bg-white/5 border-white/10 px-1 rounded inline-block">
                                  {seg.airport_terminal}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === "boarding_cards" && (
        <>
          {boardingQ.isLoading && (
            <div className="text-sm text-muted-foreground animate-pulse py-8 text-center">
              Carregando cartões de embarque…
            </div>
          )}

          {!boardingQ.isLoading && cards.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-border rounded-[var(--radius-card)] text-center">
              <Plane className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-semibold text-muted-foreground">
                Nenhum cartão de embarque cadastrado
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Adicione voos no módulo{" "}
                <span className="text-brand font-medium">Check-in & Embarques</span>.
              </p>
            </div>
          )}

          {cards.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                Cartões de Embarque Cadastrados ({cards.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cards.map((card: any) => {
                  const st = BOARDING_STATUS_CONFIG[card.status] ?? {
                    label: card.status,
                    tone: "neutral" as const,
                  };
                  const cardTickets = tickets.filter((t: any) => t.card_id === card.id);
                  return (
                    <div
                      key={card.id}
                      className="rounded-[var(--radius-card)] border-none glass-card border-none p-4 space-y-3 hover:shadow-none transition-all"
                    >
                      {/* Header do cartão */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {card.airline && (
                            <span className="font-mono text-xs font-bold bg-brand/10 text-brand px-2 py-0.5 rounded">
                              {card.airline}
                            </span>
                          )}
                          {card.flight_number && (
                            <span className="text-xs text-muted-foreground font-mono">
                              {card.flight_number}
                            </span>
                          )}
                        </div>
                        <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
                      </div>

                      {/* Rota */}
                      {(card.departure_airport || card.arrival_airport) && (
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                          <span className="font-mono">{card.departure_airport || "—"}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="font-mono">{card.arrival_airport || "—"}</span>
                        </div>
                      )}

                      {/* Detalhes */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
                        {card.flight_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {fmtDate(card.flight_date)}
                          </span>
                        )}
                        {card.pnr && (
                          <span className="flex items-center gap-1 font-mono">
                            <Hash className="h-3 w-3" />
                            {card.pnr}
                          </span>
                        )}
                        {card.passengers_count != null && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {card.passengers_count} pax
                          </span>
                        )}
                        {card.flight_class && (
                          <span className="flex items-center gap-1">
                            <Plane className="h-3 w-3" />
                            {card.flight_class}
                          </span>
                        )}
                      </div>

                      {/* Alertas */}
                      {card.alerts && card.alerts.length > 0 && (
                        <div className="space-y-1">
                          {card.alerts.map((a: any, i: any) => (
                            <div
                              key={i}
                              className="flex items-center gap-1.5 text-[11px] text-warning"
                            >
                              <AlertCircle className="h-3 w-3 shrink-0" />
                              {a}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Bilhetes individuais */}
                      {cardTickets.length > 0 && (
                        <div className="border-t border-border pt-2 space-y-1.5">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            Bilhetes ({cardTickets.length})
                          </p>
                          {cardTickets.map((t: any) => {
                            const ts = BOARDING_STATUS_CONFIG[t.status] ?? {
                              label: t.status,
                              tone: "neutral" as const,
                            };
                            return (
                              <div
                                key={t.id}
                                className="flex items-center justify-between gap-2 text-[11px]"
                              >
                                <div className="flex items-center gap-2 text-foreground">
                                  <User className="h-3 w-3 text-muted-foreground" />
                                  <span className="font-medium">{t.passenger_name}</span>
                                  {t.ticket_code && (
                                    <span className="font-mono text-muted-foreground">
                                      {t.ticket_code}
                                    </span>
                                  )}
                                  {t.seat && (
                                    <span className="text-muted-foreground">
                                      · Assento {t.seat}
                                    </span>
                                  )}
                                </div>
                                <StatusBadge tone={ts.tone}>{ts.label}</StatusBadge>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}

      {/* ── Modal de Comparação (Diff) ── */}
      {showDiffModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card border-none rounded-[var(--radius-card)] border-none shadow-none max-w-4xl w-full max-h-[85vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitCompare className="h-5 w-5 text-brand" />
                <h3 className="text-sm font-bold text-foreground">
                  Comparação de Itinerários Aéreos
                </h3>
              </div>
              <button
                onClick={() => setShowDiffModal(false)}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Selects selector */}
            <div className="p-4 glass bg-white/5 border-white/10/20 border-b border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">
                  Itinerário A (Referência)
                </label>
                <select
                  value={compareAId || ""}
                  onChange={(e) => setCompareAId(e.target.value || null)}
                  className="w-full text-xs border-none rounded-full p-2 glass-card border-none"
                >
                  <option value="">Selecione...</option>
                  {itinerariesQ.data?.map((it) => (
                    <option key={it.id} value={it.id}>
                      V{it.version} - {ITINERARY_TYPE_LABELS[it.type]} (
                      {it.status === "active" ? "Vigente" : "Inativo"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase">
                  Itinerário B (Comparação)
                </label>
                <select
                  value={compareBId || ""}
                  onChange={(e) => setCompareBId(e.target.value || null)}
                  className="w-full text-xs border-none rounded-full p-2 glass-card border-none"
                >
                  <option value="">Selecione...</option>
                  {itinerariesQ.data?.map((it) => (
                    <option key={it.id} value={it.id}>
                      V{it.version} - {ITINERARY_TYPE_LABELS[it.type]} (
                      {it.status === "active" ? "Vigente" : "Inativo"})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Diff content */}
            <div className="p-5 overflow-y-auto flex-1 space-y-6">
              {!itineraryA || !itineraryB ? (
                <div className="text-center py-12 text-sm text-muted-foreground italic">
                  Selecione os dois itinerários acima para calcular as diferenças de voos
                  automaticamente.
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary of changes */}
                  <div className="p-4 rounded-[var(--radius-card)] border-none glass bg-white/5 border-white/10/40 flex items-center justify-between gap-4">
                    <div className="text-xs">
                      <p className="font-semibold text-foreground">
                        Diferenças calculadas deterministicamente
                      </p>
                      <p className="text-muted-foreground mt-0.5">
                        {diffResult?.has_changes
                          ? "Alterações detectadas na malha aérea."
                          : "Os dois itinerários são idênticos em trechos, datas e horários."}
                      </p>
                    </div>
                    <div>
                      {diffResult?.has_changes ? (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-1 text-xs font-bold text-amber-700 border border-amber-200">
                          <AlertTriangle className="h-3.5 w-3.5" /> Mudança Detectada
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Sem Diferenças
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Segment comparison */}
                  <div className="space-y-4">
                    {diffResult?.segmentsDiff.map((diff, index) => {
                      const origSeg = itineraryA.segments[index];
                      const compSeg = itineraryB.segments[index];

                      return (
                        <div
                          key={index}
                          className="rounded-[var(--radius-card)] border-none glass-card border-none overflow-hidden"
                        >
                          <div className="p-3 border-b border-border glass bg-white/5 border-white/10/20 flex items-center gap-2">
                            <span className="h-5 w-5 rounded glass bg-white/5 border-white/10 border-none flex items-center justify-center font-bold text-[10px] font-mono text-muted-foreground">
                              {diff.segment_order}
                            </span>
                            <span className="text-xs font-bold text-foreground">
                              Trecho {diff.segment_order}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                            {/* Original Segment A */}
                            <div className="p-4 space-y-3">
                              <span className="text-[9px] font-bold text-muted-foreground uppercase block">
                                Versão {itineraryA.version} (
                                {ITINERARY_TYPE_LABELS[itineraryA.type]})
                              </span>
                              {origSeg ? (
                                <div className="space-y-2 text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold glass bg-white/5 border-white/10 border-none px-1.5 py-0.5 rounded text-[10px]">
                                      {origSeg.airline_code} {origSeg.flight_number}
                                    </span>
                                  </div>
                                  <div className="font-bold text-foreground text-sm flex items-center gap-2">
                                    <span>{origSeg.origin_iata}</span>
                                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                    <span>{origSeg.destination_iata}</span>
                                  </div>
                                  <div className="text-muted-foreground space-y-0.5">
                                    <p>
                                      Partida:{" "}
                                      {new Date(origSeg.departure_at).toLocaleString("pt-BR")}
                                    </p>
                                    <p>
                                      Chegada:{" "}
                                      {new Date(origSeg.arrival_at).toLocaleString("pt-BR")}
                                    </p>
                                    <p className="text-[10px]">
                                      Bagagem: {origSeg.baggage || "Não informada"}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground italic">
                                  Este trecho não existia nesta versão.
                                </p>
                              )}
                            </div>

                            {/* Comparison Segment B */}
                            <div className="p-4 space-y-3 glass bg-white/5 border-white/10/10">
                              <span className="text-[9px] font-bold text-muted-foreground uppercase block">
                                Versão {itineraryB.version} (
                                {ITINERARY_TYPE_LABELS[itineraryB.type]})
                              </span>
                              {compSeg ? (
                                <div className="space-y-2 text-xs">
                                  {/* Compare and Highlight */}
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] ${
                                        diff.airline_changed || diff.flight_number_changed
                                          ? "bg-amber-100 text-amber-800 border border-amber-300"
                                          : "glass bg-white/5 border-white/10 border-none"
                                      }`}
                                    >
                                      {compSeg.airline_code} {compSeg.flight_number}
                                    </span>
                                    {(diff.airline_changed || diff.flight_number_changed) && (
                                      <span className="text-[9px] font-bold text-amber-600">
                                        Voo alterado
                                      </span>
                                    )}
                                  </div>

                                  <div className="font-bold text-foreground text-sm flex items-center gap-2">
                                    <span
                                      className={
                                        diff.origin_changed
                                          ? "text-amber-600 bg-amber-50 px-1 rounded"
                                          : ""
                                      }
                                    >
                                      {compSeg.origin_iata}
                                    </span>
                                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                    <span
                                      className={
                                        diff.destination_changed
                                          ? "text-amber-600 bg-amber-50 px-1 rounded"
                                          : ""
                                      }
                                    >
                                      {compSeg.destination_iata}
                                    </span>
                                    {(diff.origin_changed || diff.destination_changed) && (
                                      <span className="text-[9px] font-bold text-amber-600">
                                        Rota alterada
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-muted-foreground space-y-0.5">
                                    <p
                                      className={
                                        diff.departure_changed
                                          ? "text-amber-700 font-semibold bg-amber-50/50 p-0.5 rounded"
                                          : ""
                                      }
                                    >
                                      Partida:{" "}
                                      {new Date(compSeg.departure_at).toLocaleString("pt-BR")}
                                      {diff.departure_changed &&
                                        diff.departure_delta_minutes !== 0 && (
                                          <span className="text-[10px] font-bold text-amber-600 ml-1.5">
                                            ({diff.departure_delta_minutes > 0 ? "+" : ""}
                                            {diff.departure_delta_minutes} min)
                                          </span>
                                        )}
                                    </p>
                                    <p
                                      className={
                                        diff.arrival_changed
                                          ? "text-amber-700 font-semibold bg-amber-50/50 p-0.5 rounded"
                                          : ""
                                      }
                                    >
                                      Chegada:{" "}
                                      {new Date(compSeg.arrival_at).toLocaleString("pt-BR")}
                                      {diff.arrival_changed && diff.arrival_delta_minutes !== 0 && (
                                        <span className="text-[10px] font-bold text-amber-600 ml-1.5">
                                          ({diff.arrival_delta_minutes > 0 ? "+" : ""}
                                          {diff.arrival_delta_minutes} min)
                                        </span>
                                      )}
                                    </p>
                                    <p
                                      className={`text-[10px] ${diff.baggage_changed ? "text-amber-600 bg-amber-50 font-bold px-1 rounded inline-block" : ""}`}
                                    >
                                      Bagagem: {compSeg.baggage || "Não informada"}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-rose-600 font-semibold italic">
                                  Este trecho foi removido nesta versão.
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border/60 flex justify-end">
              <button
                onClick={() => setShowDiffModal(false)}
                className="px-4 py-2 bg-brand text-brand-foreground text-xs font-semibold rounded-full hover:bg-brand/90 cursor-pointer"
              >
                Concluir Visualização
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
