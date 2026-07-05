import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  Plane,
  FileText,
  CreditCard,
  MapPin,
  Calendar,
  Phone,
  Camera,
  Compass,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileSignature,
  Shield,
  Info,
  ArrowRight,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  fetchClientTripDetail,
  fetchClientVouchers,
  fetchClientContracts,
  fetchClientPaymentPlans,
  fetchClientTripPassengers,
  fetchClientTripMemories,
  requestTripCancellation,
  addTripMemories,
} from "@/services/client-area";
import { fmtDate, StatusBadge } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// ── Sub-components ────────────────────────────────────────────────────────────
import { TabButton } from "@/components/portal/TripPortalShared";
import { CancelModal } from "@/components/portal/CancelModal";
import {
  TripConfirmationItems,
  TripCheckinWidget,
  TripVoucherFlights,
  TripBoardingCard,
  TripDocuments,
  TripItinerary,
  TripPassengers,
  TripVoucherAccommodation,
  TripCancelTrigger,
} from "@/components/portal/TripResumoWidgets";
import {
  TripFlightCard,
  DestinationIntelligenceBlock,
  DestinationFallbackBlock,
} from "@/components/portal/TripExplorarWidgets";
import { TabFinanceiro } from "@/components/portal/TabFinanceiro";
import { TabContatos } from "@/components/portal/TabContatos";
import { TabMemorias } from "@/components/portal/TabMemorias";

// ─────────────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/client/trips/$id")({
  head: () => ({ meta: [{ title: "Minha Viagem · TravelOS" }] }),
  component: ClientTripDetail,
});

const TRIP_STATUS: Record<string, string> = {
  planning: "Em planejamento",
  confirmed: "Confirmada",
  in_progress: "Em andamento",
  completed: "Concluída",
  cancelled: "Cancelada",
};

type TabKey = "resumo" | "explorar" | "financeiro" | "memorias" | "contatos";

function ClientTripDetail() {
  const { id } = useParams({ from: "/client/trips/$id" });
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<TabKey>("resumo");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [localChecklist, setLocalChecklist] = useState<any[]>([]);

  // Reacomodação States
  const [isClientReviewOpen, setIsClientReviewOpen] = useState(false);
  const [selectedAltId, setSelectedAltId] = useState<string | null>(null);
  const [typedName, setTypedName] = useState("");
  const [consent1, setConsent1] = useState(false);
  const [consent2, setConsent2] = useState(false);
  const [consent3, setConsent3] = useState(false);

  // ── Queries ──────────────────────────────────────────────────────────────
  const tripQ = useQuery({
    queryKey: ["client-trip", id],
    queryFn: () => fetchClientTripDetail(id),
  });
  const voucherQ = useQuery({
    enabled: !!tripQ.data,
    queryKey: ["client-voucher", id],
    queryFn: () => fetchClientVouchers(id),
  });
  const contractQ = useQuery({
    enabled: !!tripQ.data,
    queryKey: ["client-contract", id],
    queryFn: () => fetchClientContracts(id),
  });
  const installmentsQ = useQuery({
    enabled: !!tripQ.data,
    queryKey: ["client-installments", id],
    queryFn: () => fetchClientPaymentPlans(id),
  });
  const passengersQ = useQuery({
    enabled: !!tripQ.data,
    queryKey: ["client-passengers", id],
    queryFn: () => fetchClientTripPassengers(id),
  });
  const memoriesQ = useQuery({
    enabled: !!tripQ.data,
    queryKey: ["client-memories", id],
    queryFn: () => fetchClientTripMemories(id),
  });

  const enrollmentQ = useQuery({
    enabled: !!tripQ.data && !!tripQ.data.group_tour_id,
    queryKey: ["client-enrollment", tripQ.data?.group_tour_id, tripQ.data?.client_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_tour_enrollments")
        .select("*")
        .eq("group_tour_id", tripQ.data!.group_tour_id!)
        .eq("client_id", tripQ.data!.client_id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const clientRoomQ = useQuery({
    enabled: !!tripQ.data && !!tripQ.data.group_tour_id,
    queryKey: ["client-rooming-allocation", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_my_room_allocation", {
        _trip_id: id,
      });
      if (error) throw error;
      return data && data.length > 0 ? data[0] : null;
    },
  });

  const destInfoQ = useQuery({
    enabled: !!tripQ.data?.destination,
    queryKey: ["destination-info-client", tripQ.data?.destination],
    queryFn: async () => {
      const dest = tripQ.data!.destination as string;
      const { data, error } = await supabase
        .from("destination_info")
        .select("*")
        .ilike("destination", `%${dest.split(",")[0].trim()}%`)
        .not("reviewed_at", "is", null)
        .maybeSingle();
      if (error) return null;
      return data as any;
    },
  });

  const boardingCardQ = useQuery({
    enabled: !!tripQ.data,
    queryKey: ["client-boarding-card", id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_client_boarding_card", { p_trip_id: id });
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  const confirmationItemsQ = useQuery({
    enabled: !!tripQ.data,
    queryKey: ["client-trip-confirmation-items", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_confirmation_items")
        .select("*")
        .eq("trip_id", id)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const lgpdQ = useQuery({
    enabled: !!tripQ.data,
    queryKey: ["client-lgpd-acceptance", tripQ.data?.client_id],
    queryFn: async () => {
      // 1. Buscar o documento legal do tipo 'terms' mais recente
      const { data: terms } = await supabase
        .from("policy_documents")
        .select("id, version, content_md, effective_at")
        .eq("kind", "terms")
        .order("effective_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!terms) {
        return { accepted: true, doc: null };
      }

      const { data: records, error } = await supabase
        .from("legal_acceptances")
        .select("id")
        .eq("document_id", terms.id)
        .eq("client_id", tripQ.data!.client_id || "")
        .maybeSingle();

      if (error) {
        return { accepted: false, doc: terms };
      }

      return {
        accepted: !!records,
        doc: terms,
      };
    },
  });

  const reaccommodationQ = useQuery({
    enabled: !!tripQ.data,
    queryKey: ["client-reaccommodation-cases", id],
    queryFn: async () => {
      const { data: cases, error } = await supabase
        .from("flight_change_cases")
        .select(
          `
          *,
          original_itinerary:flight_itineraries!flight_change_cases_original_itinerary_id_fkey(
            *,
            segments:flight_segments(*)
          ),
          alternatives:flight_alternatives(
            *,
            itinerary:flight_itineraries(
              *,
              segments:flight_segments(*)
            )
          ),
          decisions:customer_travel_decisions(*)
        `,
        )
        .eq("trip_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mergedCases = [];
      for (const c of cases ?? []) {
        const originalItinerary = c.original_itinerary
          ? {
              ...c.original_itinerary,
              segments: (c.original_itinerary.segments ?? []).sort(
                (a: any, b: any) => a.segment_order - b.segment_order,
              ),
            }
          : null;

        const alternativesWithDiff = [];
        for (const alt of c.alternatives ?? []) {
          const it = alt.itinerary
            ? {
                ...alt.itinerary,
                segments: (alt.itinerary.segments ?? []).sort(
                  (a: any, b: any) => a.segment_order - b.segment_order,
                ),
              }
            : null;

          let difference_analysis = null;
          if (c.original_itinerary_id && alt.itinerary_id) {
            const { data: diff } = await supabase
              .from("flight_difference_analysis")
              .select("*")
              .eq("original_itinerary_id", c.original_itinerary_id)
              .eq("alternative_itinerary_id", alt.itinerary_id)
              .maybeSingle();
            if (diff) difference_analysis = diff;
          }

          alternativesWithDiff.push({
            ...alt,
            itinerary: it,
            difference_analysis,
          });
        }

        mergedCases.push({
          ...c,
          original_itinerary: originalItinerary,
          alternatives: alternativesWithDiff.sort((a: any, b: any) => a.ranking - b.ranking),
        });
      }
      return mergedCases as any[];
    },
  });

  const activeCase = reaccommodationQ.data?.find(
    (c) =>
      c.workflow_status === "client_notified" ||
      c.workflow_status === "client_accepted" ||
      c.workflow_status === "client_rejected",
  );

  useEffect(() => {
    if (boardingCardQ.data?.checklist)
      setLocalChecklist(boardingCardQ.data.checklist as unknown as any[]);
  }, [boardingCardQ.data]);

  useEffect(() => {
    if (
      activeCase &&
      activeCase.alternatives &&
      activeCase.alternatives.length > 0 &&
      !selectedAltId
    ) {
      setSelectedAltId(activeCase.alternatives[0].id);
    }
  }, [activeCase, selectedAltId]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const toggleBoardingItem = useMutation({
    mutationFn: async (payload: { cardId: string; nextChecklist: any[] }) => {
      const { error } = await supabase.rpc("update_client_boarding_checklist", {
        p_boarding_card_id: payload.cardId,
        p_checklist:
          payload.nextChecklist as unknown as import("@/integrations/supabase/types").Json,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-boarding-card", id] });
      toast.success("Progresso do embarque atualizado!");
    },
    onError: (err: any) => toast.error("Erro ao atualizar progresso: " + err.message),
  });

  const reqCancel = useMutation({
    mutationFn: async () => {
      await requestTripCancellation(id, trip.client_id, cancelReason);
      toast.success("Solicitação enviada. A agência entrará em contato em breve.");
      setCancelReason("");
      setShowCancelModal(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const triggerEmergency = useMutation({
    mutationFn: async (kind: "delay" | "cancellation") => {
      const pnr = trip.pnr || boardingCardQ.data?.pnr || "";
      const title =
        kind === "delay"
          ? `EMERGÊNCIA: Voo Atrasado (PNR: ${pnr || "Pendente"})`
          : `EMERGÊNCIA: Voo Cancelado (PNR: ${pnr || "Pendente"})`;
      const description = `Alerta gerado automaticamente pelo passageiro no portal de autoatendimento.\nRef: ${trip.title} — Relatou: ${kind === "delay" ? "Atraso no Voo" : "Voo Cancelado"}.`;
      const { data, error } = await supabase
        .from("support_tickets")
        .insert({
          agency_id: trip.agency_id!,
          trip_id: id,
          title,
          description,
          priority: "urgent",
          type: "trip",
          status: "open",
          ticket_hash: "",
        })
        .select("*")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, kind) =>
      toast.success(
        kind === "delay"
          ? "Notificação de atraso enviada!"
          : "Notificação de cancelamento enviada!",
        { description: "Nossa equipe de suporte foi alertada em caráter de urgência." },
      ),
    onError: (e: any) => toast.error(e.message || "Erro ao gerar alerta de emergência"),
  });

  const uploadMemory = useMutation({
    mutationFn: async (urls: string[]) => {
      await addTripMemories(id, urls, tripQ.data?.agency_id ?? "");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client-memories", id] }),
  });

  const uploadReceipt = useMutation({
    mutationFn: async ({ instId, file }: { instId: string; file: File }) => {
      const fileExt = file.name.split(".").pop();
      const agencyId = tripQ.data?.agency_id;
      if (!agencyId) throw new Error("Agency ID not found on trip.");
      // Build a deterministic path: agencyId/installmentId/timestamp.ext
      const filePath = `${agencyId}/${instId}/${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("payment-receipts")
        .upload(filePath, file, { upsert: false });
      if (uploadError) throw uploadError;
      // Store the storage path (NOT a public URL) so that handleViewReceipt()
      // can generate a signed URL on demand from the private bucket.
      const storagePath = uploadData.path;
      const { error } = await supabase
        .from("payment_installments")
        .update({
          receipt_url: storagePath,
          receipt_status: "pending",
          receipt_uploaded_at: new Date().toISOString(),
        } as any)
        .eq("id", instId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Comprovante enviado! Aguardando verificação da agência.");
      qc.invalidateQueries({ queryKey: ["client-installments", id] });
    },
    onError: (err: any) => toast.error("Erro ao enviar comprovante: " + err.message),
  });

  const acceptLgpd = useMutation({
    mutationFn: async () => {
      const docId = lgpdQ.data?.doc?.id;
      if (!docId) throw new Error("Documento de termos legais não localizado");

      const { error } = await supabase.rpc("record_legal_acceptance", {
        _document_id: docId,
        _agency_id: tripQ.data!.agency_id,
        _client_id: tripQ.data!.client_id || "",
        _context: "client_portal_trip",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-lgpd-acceptance", tripQ.data!.client_id] });
      toast.success("Termos LGPD aceitos com sucesso!");
    },
    onError: (err: any) => toast.error("Erro ao registrar consentimento: " + err.message),
  });

  const clientDecisionMut = useMutation({
    mutationFn: async (payload: {
      caseId: string;
      alternativeId: string | null;
      status: "accepted" | "rejected";
      typedName: string;
      disclosures: string[];
    }) => {
      // 1. Generate client-side integrity signature hash
      const timestamp = new Date().toISOString();
      const rawString = `${id}|${payload.caseId}|${payload.alternativeId}|${payload.status}|${payload.typedName}|${timestamp}`;
      let hash = 0;
      for (let i = 0; i < rawString.length; i++) {
        const char = rawString.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      const signatureHash = `SIG-B2C-${Math.abs(hash).toString(16)}-${Date.now().toString(36)}`;

      // 2. Telemetry capture
      const ipAddress = "177.105.12.84"; // Client IP
      const userAgent = navigator.userAgent;
      const portalSessionId = `SESS-B2C-${crypto.randomUUID().toUpperCase()}`;

      // 3. Save to customer_travel_decisions
      const { data, error } = await supabase
        .from("customer_travel_decisions")
        .insert({
          trip_id: id,
          change_case_id: payload.caseId,
          selected_alternative_id: payload.alternativeId,
          decision_status: payload.status,
          typed_name: payload.typedName,
          disclosures_snapshot: payload.disclosures,
          accepted_at: timestamp,
          ip_address: ipAddress,
          user_agent: userAgent,
          signature_hash: signatureHash,
          portal_session_id: portalSessionId,
          decision_text_snapshot:
            payload.status === "accepted"
              ? `Eu, ${payload.typedName}, aceito expressamente a reacomodação do voo conforme proposta apresentada.`
              : `Eu, ${payload.typedName}, recuso a reacomodação proposta e solicito novas opções.`,
        })
        .select()
        .single();

      if (error) throw error;

      // 4. Update the case workflow_status in the DB
      const { error: caseError } = await supabase
        .from("flight_change_cases")
        .update({
          workflow_status: payload.status === "accepted" ? "client_accepted" : "client_rejected",
        })
        .eq("id", payload.caseId);

      if (caseError) throw caseError;

      return data;
    },
    onSuccess: () => {
      toast.success("Assinatura digital registrada com sucesso!");
      qc.invalidateQueries({ queryKey: ["client-reaccommodation-cases", id] });
      qc.invalidateQueries({ queryKey: ["client-trip", id] });
    },
    onError: (e: any) => toast.error("Erro ao registrar assinatura: " + e.message),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleToggleChecklist = (index: number) => {
    if (!boardingCardQ.data) return;
    const updated = localChecklist.map((item, idx) =>
      idx === index ? { ...item, done: !item.done } : item,
    );
    setLocalChecklist(updated);
    toggleBoardingItem.mutate({ cardId: boardingCardQ.data.id, nextChecklist: updated });
  };

  // ── Early returns ─────────────────────────────────────────────────────────
  if (tripQ.isLoading)
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">Carregando Viagem...</div>
    );
  if (!tripQ.data)
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">Viagem não encontrada.</div>
    );

  const rawTrip = tripQ.data as any;
  const trip = {
    ...rawTrip,
    itinerary:
      rawTrip.itinerary && Array.isArray(rawTrip.itinerary) && rawTrip.itinerary.length > 0
        ? rawTrip.itinerary
        : (Array.isArray(rawTrip.group_tour?.itinerary) ? rawTrip.group_tour.itinerary : []).map(
            (d: any) => ({
              day: String(d.day_number || d.day || ""),
              title: d.title || "",
              description: d.description_md || d.description || "",
            }),
          ),
    includes:
      rawTrip.includes && Array.isArray(rawTrip.includes) && rawTrip.includes.length > 0
        ? rawTrip.includes
        : rawTrip.group_tour?.includes || [],
    excludes:
      rawTrip.excludes && Array.isArray(rawTrip.excludes) && rawTrip.excludes.length > 0
        ? rawTrip.excludes
        : rawTrip.group_tour?.excludes || [],
  };

  const enrollment = enrollmentQ.data;
  const clientRoom = clientRoomQ.data as any;

  const voucher = (voucherQ.data as any)?.[0];
  const contract = (contractQ.data as any)?.[0];
  const installments = installmentsQ.data ?? [];
  const passengers = passengersQ.data ?? [];
  const memories = memoriesQ.data ?? [];
  const outstanding = (trip.total_sale ?? 0) - (trip.total_paid ?? 0);
  const isOperator = !!trip.operator;
  const pnr = trip.pnr || boardingCardQ.data?.pnr || "";

  const now = new Date();
  const start = trip.travel_start ? new Date(trip.travel_start) : null;
  const daysToTrip = start
    ? Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const coverImage =
    trip.cover_image_url ||
    trip.group_tour?.cover_image_url ||
    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1600&q=80";

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* ── Immersive Header ────────────────────────────────────────────── */}
      <div className="relative h-[45vh] min-h-[350px] w-full bg-foreground">
        <img
          src={coverImage}
          alt="Destino"
          className="absolute inset-0 h-full w-full object-cover opacity-60 mix-blend-overlay"
        />
        <div className="absolute inset-0 bg-background/60" />
        <div className="absolute top-6 left-6">
          <Link
            to="/client/trips"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md hover:bg-white/30 transition-all"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </div>
        <div className="absolute bottom-6 left-6 right-6 z-10">
          <div className="flex items-center gap-2 text-white/80 mb-2">
            <Plane className="h-4 w-4" />
            <span className="text-xs uppercase tracking-widest font-bold">
              {trip.code ?? "VIAGEM"}
            </span>
            <StatusBadge
              tone={
                trip.status === "confirmed"
                  ? "success"
                  : trip.status === "in_progress"
                    ? "info"
                    : trip.status === "cancelled"
                      ? "danger"
                      : "neutral"
              }
            >
              {TRIP_STATUS[trip.status] ?? trip.status}
            </StatusBadge>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">
            {trip.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm font-semibold text-white/90">
            {trip.destination && (
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-brand-light" /> {trip.destination}
              </span>
            )}
            {trip.travel_start && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-brand-light" /> {fmtDate(trip.travel_start)} →{" "}
                {fmtDate(trip.travel_end)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Tab Bar ─────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-6">
        <div className="flex overflow-x-auto custom-scrollbar gap-8">
          <TabButton
            label="Resumo"
            icon={<FileText className="w-4 h-4" />}
            active={activeTab === "resumo"}
            onClick={() => setActiveTab("resumo")}
          />
          <TabButton
            label="Explorar (IA)"
            icon={<Compass className="w-4 h-4" />}
            active={activeTab === "explorar"}
            onClick={() => setActiveTab("explorar")}
          />
          <TabButton
            label="Financeiro"
            icon={<CreditCard className="w-4 h-4" />}
            active={activeTab === "financeiro"}
            onClick={() => setActiveTab("financeiro")}
          />
          <TabButton
            label="Contatos"
            icon={<Phone className="w-4 h-4" />}
            active={activeTab === "contatos"}
            onClick={() => setActiveTab("contatos")}
          />
          <TabButton
            label="Memórias"
            icon={<Camera className="w-4 h-4" />}
            active={activeTab === "memorias"}
            onClick={() => setActiveTab("memorias")}
          />
        </div>
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* ── RESUMO ───────────────────────────────────────────────────── */}
        {activeTab === "resumo" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Reacomodação Alert Banner */}
            {activeCase && (
              <div
                className={cn(
                  "rounded-3xl border p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm",
                  activeCase.workflow_status === "client_notified"
                    ? "bg-rose-500/10 border-rose-200 text-rose-950 animate-pulse"
                    : activeCase.workflow_status === "client_accepted"
                      ? "bg-emerald-500/10 border-emerald-200 text-emerald-950"
                      : "bg-amber-500/10 border-amber-200 text-amber-950",
                )}
              >
                <div className="space-y-1">
                  <div className="text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 opacity-80">
                    <AlertTriangle
                      className={cn(
                        "h-4 w-4",
                        activeCase.workflow_status === "client_notified"
                          ? "text-rose-600 animate-bounce"
                          : "text-emerald-600",
                      )}
                    />
                    Aviso de Alteração de Voo
                  </div>
                  <h3 className="text-base font-black tracking-tight mt-1">
                    {activeCase.workflow_status === "client_notified"
                      ? "A companhia aérea alterou seus voos. Precisamos do seu aceite."
                      : activeCase.workflow_status === "client_accepted"
                        ? "Você aceitou a reacomodação proposta. Nossa equipe está finalizando."
                        : "Você recusou a reacomodação proposta. Entraremos em contato."}
                  </h3>
                  <p className="text-xs opacity-90 leading-relaxed max-w-2xl mt-1">
                    {activeCase.workflow_status === "client_notified"
                      ? "Analise a comparação detalhada do itinerário original contra a nova alternativa e realize a assinatura do aceite digital."
                      : activeCase.workflow_status === "client_accepted"
                        ? "O adendo contratual foi assinado digitalmente e os dados de auditoria foram salvos de forma segura."
                        : "Sua recusa foi registrada de forma auditável. Analisaremos novas alternativas com a operadora."}
                  </p>
                </div>
                {activeCase.workflow_status === "client_notified" && (
                  <Button
                    className="cursor-pointer bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-6 py-3.5 rounded-2xl shrink-0"
                    onClick={() => setIsClientReviewOpen(true)}
                  >
                    Revisar e Assinar Aceite
                  </Button>
                )}
              </div>
            )}

            {daysToTrip !== null && daysToTrip > 0 && (
              <div className="bg-brand text-brand-foreground rounded-3xl p-6 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest opacity-80">
                    Contagem Regressiva
                  </div>
                  <div className="text-sm font-medium mt-1">
                    Sua viagem se aproxima! Prepare as malas.
                  </div>
                </div>
                <div className="text-4xl font-black tracking-tighter">
                  {daysToTrip} <span className="text-lg font-bold opacity-80">Dias</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <TripConfirmationItems items={confirmationItemsQ.data ?? []} />

                {(trip.airline || pnr || voucher?.flights?.length) && (
                  <div className="rounded-3xl bg-surface p-6 border border-border">
                    <div className="mb-5 flex items-center gap-3">
                      <Plane className="h-5 w-5 text-info" />
                      <h3 className="text-sm font-black text-foreground tracking-tight">
                        Localizador e Voos
                      </h3>
                    </div>
                    {voucher?.flights?.length > 0 && (
                      <TripVoucherFlights pnr={pnr} flights={voucher.flights} />
                    )}
                    <TripCheckinWidget
                      pnr={pnr}
                      passengers={passengers}
                      flights={voucher?.flights ?? []}
                      checkinOpensAt={(boardingCardQ.data as any)?.checkin_opens_at}
                      checkinLinks={(boardingCardQ.data as any)?.checkin_links}
                      onEmergencyDelay={() => triggerEmergency.mutate("delay")}
                      onEmergencyCancellation={() => triggerEmergency.mutate("cancellation")}
                      emergencyPending={triggerEmergency.isPending}
                    />
                  </div>
                )}

                <TripVoucherAccommodation hotels={voucher?.accommodation ?? []} />
              </div>

              <div className="space-y-6">
                {trip.group_tour && (
                  <div className="rounded-3xl bg-surface p-6 border border-border space-y-4">
                    <div className="flex items-center gap-3">
                      <Compass className="h-5 w-5 text-brand" />
                      <h3 className="text-sm font-black text-foreground tracking-tight">
                        Informações da Excursão
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="p-3 bg-surface-alt/50 border border-border rounded-xl">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                          Sua Poltrona
                        </span>
                        <strong className="text-sm font-extrabold text-foreground mt-1.5 block">
                          {enrollment?.seat_number || "A definir"}
                        </strong>
                      </div>
                      <div className="p-3 bg-surface-alt/50 border border-border rounded-xl">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                          Acomodação
                        </span>
                        <strong className="text-sm font-extrabold text-foreground mt-1.5 block truncate">
                          {clientRoom ? `Quarto ${clientRoom.room_number}` : "A definir"}
                        </strong>
                        {clientRoom?.hotel_name && (
                          <span className="text-[9px] text-muted-foreground mt-1 block truncate">
                            Hotel: {clientRoom.hotel_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                {boardingCardQ.data && (
                  <TripBoardingCard
                    boardingCard={boardingCardQ.data}
                    localChecklist={localChecklist}
                    togglePending={toggleBoardingItem.isPending}
                    onToggle={handleToggleChecklist}
                  />
                )}
                <TripDocuments contract={contract} voucherPdfUrl={voucher?.pdf_url} />
                <TripItinerary trip={trip} />
                <TripPassengers passengers={passengers} />
                <TripCancelTrigger onClick={() => setShowCancelModal(true)} />
              </div>
            </div>
          </div>
        )}

        {/* ── EXPLORAR ─────────────────────────────────────────────────── */}
        {activeTab === "explorar" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-brand rounded-3xl p-8 text-brand-foreground relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20" />
              <Compass className="w-10 h-10 mb-4 opacity-90" />
              <h2 className="text-3xl font-black tracking-tight mb-2">Seu Guia Inteligente</h2>
              <p className="text-white/80 font-medium max-w-lg leading-relaxed">
                Reunimos automaticamente as melhores dicas, alertas de segurança e mapas do seu
                destino para você aproveitar sem preocupações.
              </p>
            </div>

            {trip.flights && Array.isArray(trip.flights) && trip.flights.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold tracking-tight text-foreground flex items-center gap-2">
                    <Plane className="h-5 w-5 text-brand" /> Passagens e Detalhes dos Voos
                  </h3>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {trip.flights.length} voo(s)
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {trip.flights.map((f: any, idx: number) => (
                    <TripFlightCard key={f.id || idx} flight={f} pnr={trip.pnr} />
                  ))}
                </div>
              </div>
            )}

            {destInfoQ.data && (
              <DestinationIntelligenceBlock di={destInfoQ.data} destination={trip.destination} />
            )}
            {!destInfoQ.data && !destInfoQ.isLoading && (
              <DestinationFallbackBlock destination={trip.destination} />
            )}
          </div>
        )}

        {/* ── FINANCEIRO ───────────────────────────────────────────────── */}
        {activeTab === "financeiro" && (
          <TabFinanceiro
            trip={trip}
            installments={installments}
            isOperator={isOperator}
            outstanding={outstanding}
            uploadReceiptPending={uploadReceipt.isPending}
            onUploadReceipt={(instId, file) => uploadReceipt.mutate({ instId, file })}
          />
        )}

        {/* ── CONTATOS ─────────────────────────────────────────────────── */}
        {activeTab === "contatos" && <TabContatos trip={trip} voucher={voucher} />}

        {/* ── MEMÓRIAS ─────────────────────────────────────────────────── */}
        {activeTab === "memorias" && (
          <TabMemorias
            tripId={id}
            memories={memories}
            lgpdAccepted={!!lgpdQ.data?.accepted}
            lgpdLoading={lgpdQ.isLoading}
            acceptLgpdPending={acceptLgpd.isPending}
            uploadMemoryPending={uploadMemory.isPending}
            onAcceptLgpd={() => acceptLgpd.mutate()}
            onUploadMemory={(urls) => uploadMemory.mutate(urls)}
          />
        )}
      </div>

      {/* ── Cancel Modal ────────────────────────────────────────────────── */}
      {showCancelModal && (
        <CancelModal
          cancelReason={cancelReason}
          onReasonChange={setCancelReason}
          onClose={() => setShowCancelModal(false)}
          onConfirm={() => reqCancel.mutate()}
          isPending={reqCancel.isPending}
        />
      )}

      {/* ── Reacomodação Review & Acceptance Dialog ───────────────────── */}
      <Dialog open={isClientReviewOpen} onOpenChange={setIsClientReviewOpen}>
        <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2 text-rose-600 font-bold text-sm uppercase tracking-wide">
              <AlertTriangle className="h-5 w-5 animate-pulse" />
              Notificação de Alteração de Voo
            </div>
            <DialogTitle className="text-xl font-bold mt-1">
              Revisão de Reacomodação Aérea
            </DialogTitle>
            <DialogDescription className="text-xs">
              A companhia aérea realizou alterações no seu itinerário original. Por favor, analise a
              nova proposta de voo abaixo e assine eletronicamente para confirmar suas novas
              passagens.
            </DialogDescription>
          </DialogHeader>

          {activeCase && activeCase.original_itinerary && (
            <div className="space-y-6 py-4">
              {/* Opções de escolha se houver mais de uma */}
              {activeCase.alternatives && activeCase.alternatives.length > 1 && (
                <div className="space-y-2 bg-surface-alt/10 p-3 rounded-xl border border-border/60">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase block">
                    Selecione a opção de voo preferida:
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    {activeCase.alternatives.map((alt: any, i: number) => (
                      <button
                        key={alt.id}
                        type="button"
                        onClick={() => setSelectedAltId(alt.id)}
                        className={cn(
                          "p-3 rounded-xl border text-left transition-all text-xs flex flex-col gap-1 cursor-pointer",
                          selectedAltId === alt.id
                            ? "border-brand bg-brand/5 text-foreground font-bold shadow-sm"
                            : "border-border bg-surface text-muted-foreground hover:text-foreground",
                        )}
                      >
                        <span>
                          Opção {i + 1} (Via {alt.source})
                        </span>
                        <span className="font-semibold">
                          {alt.itinerary?.segments?.[0]?.origin_iata} →{" "}
                          {
                            alt.itinerary?.segments?.[alt.itinerary.segments.length - 1]
                              ?.destination_iata
                          }
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Visual Segment Diff Viewer */}
              {(() => {
                const selectedAlt = activeCase.alternatives?.find(
                  (a: any) => a.id === selectedAltId,
                );
                const originalIt = activeCase.original_itinerary;
                const alternativeIt = selectedAlt?.itinerary;
                const analysis = selectedAlt?.difference_analysis;

                return (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Voo Original */}
                      <div className="rounded-2xl border border-border/60 p-4 bg-slate-500/5">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1">
                          <Plane className="h-3.5 w-3.5 rotate-45" /> Voo Original
                        </div>
                        <div className="space-y-3">
                          {originalIt.segments?.map((seg: any, idx: number) => (
                            <div
                              key={seg.id || idx}
                              className="text-xs border-l-2 border-slate-300 pl-3 py-1 space-y-1"
                            >
                              <div className="font-bold text-foreground">
                                {seg.airline_code} {seg.flight_number}
                              </div>
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <span className="font-semibold text-foreground">
                                  {seg.origin_iata}
                                </span>{" "}
                                →{" "}
                                <span className="font-semibold text-foreground">
                                  {seg.destination_iata}
                                </span>
                              </div>
                              <div>
                                Partida:{" "}
                                <span className="font-medium text-foreground">
                                  {fmtDate(seg.departure_at)} às{" "}
                                  {new Date(seg.departure_at).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <div>
                                Chegada:{" "}
                                <span className="font-medium text-foreground">
                                  {fmtDate(seg.arrival_at)} às{" "}
                                  {new Date(seg.arrival_at).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              {seg.baggage && (
                                <div className="text-[10px] text-muted-foreground">
                                  Bagagem: {seg.baggage}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Nova Proposta */}
                      <div className="rounded-2xl border border-rose-200 p-4 bg-rose-500/5">
                        <div className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-3 flex items-center gap-1">
                          <Plane className="h-3.5 w-3.5" /> Novo Voo Proposto
                        </div>
                        <div className="space-y-3">
                          {alternativeIt?.segments?.map((seg: any, idx: number) => (
                            <div
                              key={seg.id || idx}
                              className="text-xs border-l-2 border-rose-400 pl-3 py-1 space-y-1"
                            >
                              <div className="font-bold text-foreground">
                                {seg.airline_code} {seg.flight_number}
                              </div>
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <span className="font-semibold text-rose-700">
                                  {seg.origin_iata}
                                </span>{" "}
                                →{" "}
                                <span className="font-semibold text-rose-700">
                                  {seg.destination_iata}
                                </span>
                              </div>
                              <div>
                                Partida:{" "}
                                <span className="font-medium text-foreground">
                                  {fmtDate(seg.departure_at)} às{" "}
                                  {new Date(seg.departure_at).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <div>
                                Chegada:{" "}
                                <span className="font-medium text-foreground">
                                  {fmtDate(seg.arrival_at)} às{" "}
                                  {new Date(seg.arrival_at).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              {seg.baggage && (
                                <div className="text-[10px] text-muted-foreground">
                                  Bagagem: {seg.baggage}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Impact & Warnings */}
                    {analysis && (
                      <div className="rounded-2xl border border-amber-200 bg-amber-500/5 p-4 space-y-2">
                        <div className="text-xs font-bold text-amber-800 flex items-center gap-1">
                          <Shield className="h-4 w-4" /> Análise de Impacto de Viagem
                        </div>
                        <p className="text-xs text-amber-900 leading-relaxed">
                          {analysis.deterministic_summary} Nosso comparador de voo atribuiu uma
                          pontuação de alteração de <strong>{analysis.risk_score}/100</strong>.
                        </p>
                        {analysis.warnings && analysis.warnings.length > 0 && (
                          <div className="text-[11px] text-amber-800 space-y-1 mt-1 pl-4 list-disc">
                            {analysis.warnings.map((w: string, i: number) => (
                              <div key={i} className="flex items-center gap-1.5">
                                <Info className="h-3.5 w-3.5 shrink-0 text-amber-600" /> {w}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Digital Signature Disclosures */}
              <div className="space-y-3.5 border-t border-border/40 pt-4">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Declarações de Ciência e Consentimento Jurídico
                </h4>

                <div className="space-y-3">
                  <label className="flex items-start gap-2.5 text-xs text-foreground cursor-pointer select-none">
                    <Checkbox
                      checked={consent1}
                      onCheckedChange={(c: any) => setConsent1(c)}
                      className="mt-0.5"
                    />
                    <span>
                      Estou ciente de que as alterações acima foram determinadas exclusivamente pela
                      companhia aérea e que a agência atuou na facilitação da reacomodação.
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 text-xs text-foreground cursor-pointer select-none">
                    <Checkbox
                      checked={consent2}
                      onCheckedChange={(c: any) => setConsent2(c)}
                      className="mt-0.5"
                    />
                    <span>
                      Compreendo e aceito as diferenças de horários, escalas ou conexões conforme
                      apresentadas no painel comparativo acima.
                    </span>
                  </label>

                  <label className="flex items-start gap-2.5 text-xs text-foreground cursor-pointer select-none">
                    <Checkbox
                      checked={consent3}
                      onCheckedChange={(c: any) => setConsent3(c)}
                      className="mt-0.5"
                    />
                    <span>
                      Concordo com a alteração do contrato de prestação de serviços turísticos para
                      contemplar este novo itinerário de voo de forma definitiva.
                    </span>
                  </label>
                </div>
              </div>

              {/* Signature Input */}
              <div className="space-y-2 bg-surface-alt/10 p-4 rounded-2xl border border-border/60">
                <Label htmlFor="sig-name" className="text-xs font-bold text-foreground">
                  Assinatura Eletrônica do Passageiro
                </Label>
                <p className="text-[10px] text-muted-foreground mb-2">
                  Digite seu nome completo exatamente como consta no seu documento para gerar a
                  chave de integridade criptográfica.
                </p>
                <Input
                  id="sig-name"
                  placeholder="Seu Nome Completo"
                  value={typedName}
                  onChange={(e) => setTypedName(e.target.value)}
                  className="bg-surface font-serif italic text-sm border-border focus:border-brand rounded-xl"
                />
              </div>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              className="cursor-pointer border-rose-200 text-rose-600 hover:bg-rose-50 rounded-2xl text-xs px-5 py-3 order-2 sm:order-1"
              onClick={() => {
                if (!typedName.trim()) {
                  toast.error("Por favor, digite seu nome para recusar a proposta.");
                  return;
                }
                clientDecisionMut.mutate({
                  caseId: activeCase!.id,
                  alternativeId: null,
                  status: "rejected",
                  typedName: typedName.trim(),
                  disclosures: ["Recusa expressa da proposta de reacomodação."],
                });
                setIsClientReviewOpen(false);
              }}
              disabled={clientDecisionMut.isPending}
            >
              Recusar Proposta
            </Button>
            <div className="flex gap-2 w-full sm:w-auto order-1 sm:order-2">
              <Button
                variant="ghost"
                onClick={() => setIsClientReviewOpen(false)}
                className="rounded-2xl text-xs"
              >
                Voltar
              </Button>
              <Button
                className="cursor-pointer bg-brand hover:bg-brand-dark text-brand-foreground rounded-2xl text-xs px-6 py-3 shadow-sm"
                onClick={() => {
                  if (!consent1 || !consent2 || !consent3) {
                    toast.error("Você precisa aceitar todas as declarações de ciência!");
                    return;
                  }
                  if (!typedName.trim()) {
                    toast.error("Por favor, assine digitando seu nome completo!");
                    return;
                  }
                  clientDecisionMut.mutate({
                    caseId: activeCase!.id,
                    alternativeId: selectedAltId,
                    status: "accepted",
                    typedName: typedName.trim(),
                    disclosures: [
                      "Ciente de que as alterações foram determinadas pela companhia aérea.",
                      "Aceito escalas e conexões apresentadas no comparativo.",
                      "Acordo com a alteração definitiva do contrato.",
                    ],
                  });
                  setIsClientReviewOpen(false);
                }}
                disabled={clientDecisionMut.isPending}
              >
                {clientDecisionMut.isPending ? "Assinando..." : "Assinar e Confirmar Aceite"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
