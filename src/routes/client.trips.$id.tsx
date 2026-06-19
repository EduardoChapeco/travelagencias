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
import { TripFlightCard, DestinationIntelligenceBlock, DestinationFallbackBlock } from "@/components/portal/TripExplorarWidgets";
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

  // ── Queries ──────────────────────────────────────────────────────────────
  const tripQ = useQuery({ queryKey: ["client-trip", id], queryFn: () => fetchClientTripDetail(id) });
  const voucherQ = useQuery({ enabled: !!tripQ.data, queryKey: ["client-voucher", id], queryFn: () => fetchClientVouchers(id) });
  const contractQ = useQuery({ enabled: !!tripQ.data, queryKey: ["client-contract", id], queryFn: () => fetchClientContracts(id) });
  const installmentsQ = useQuery({ enabled: !!tripQ.data, queryKey: ["client-installments", id], queryFn: () => fetchClientPaymentPlans(id) });
  const passengersQ = useQuery({ enabled: !!tripQ.data, queryKey: ["client-passengers", id], queryFn: () => fetchClientTripPassengers(id) });
  const memoriesQ = useQuery({ enabled: !!tripQ.data, queryKey: ["client-memories", id], queryFn: () => fetchClientTripMemories(id) });

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
      const { data, error } = await supabase.from("trip_confirmation_items").select("*").eq("trip_id", id).order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const lgpdQ = useQuery({
    enabled: !!tripQ.data,
    queryKey: ["client-lgpd-acceptance", tripQ.data?.client_id],
    queryFn: async () => {
      const { data, error } = await supabase.from("legal_acceptances" as any).select("*").eq("client_id", tripQ.data!.client_id).eq("terms_type", "lgpd_memories").maybeSingle();
      if (error) return null;
      return data;
    },
  });

  useEffect(() => {
    if (boardingCardQ.data?.checklist) setLocalChecklist(boardingCardQ.data.checklist as unknown as any[]);
  }, [boardingCardQ.data]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const toggleBoardingItem = useMutation({
    mutationFn: async (payload: { cardId: string; nextChecklist: any[] }) => {
      const { error } = await supabase.rpc("update_client_boarding_checklist", {
        p_boarding_card_id: payload.cardId,
        p_checklist: payload.nextChecklist as unknown as import("@/integrations/supabase/types").Json,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["client-boarding-card", id] }); toast.success("Progresso do embarque atualizado!"); },
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
      const title = kind === "delay" ? `EMERGÊNCIA: Voo Atrasado (PNR: ${pnr || "Pendente"})` : `EMERGÊNCIA: Voo Cancelado (PNR: ${pnr || "Pendente"})`;
      const description = `Alerta gerado automaticamente pelo passageiro no portal de autoatendimento.\nRef: ${trip.title} — Relatou: ${kind === "delay" ? "Atraso no Voo" : "Voo Cancelado"}.`;
      const { data, error } = await supabase.from("support_tickets").insert({ agency_id: trip.agency_id!, trip_id: id, title, description, priority: "urgent", type: "trip", status: "open" }).select("*").single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, kind) => toast.success(kind === "delay" ? "Notificação de atraso enviada!" : "Notificação de cancelamento enviada!", { description: "Nossa equipe de suporte foi alertada em caráter de urgência." }),
    onError: (e: any) => toast.error(e.message || "Erro ao gerar alerta de emergência"),
  });

  const uploadMemory = useMutation({
    mutationFn: async (urls: string[]) => { await addTripMemories(id, urls); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client-memories", id] }),
  });

  const uploadReceipt = useMutation({
    mutationFn: async ({ instId, file }: { instId: string; file: File }) => {
      const fileExt = file.name.split(".").pop();
      const filePath = `receipts/${instId}_${Date.now()}.${fileExt}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from("payment-receipts").upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: publicUrlData } = supabase.storage.from("payment-receipts").getPublicUrl(uploadData.path);
      const { error } = await supabase.from("payment_installments").update({ receipt_url: publicUrlData.publicUrl, receipt_status: "pending", receipt_uploaded_at: new Date().toISOString() } as any).eq("id", instId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Comprovante enviado! Aguardando verificação da agência."); qc.invalidateQueries({ queryKey: ["client-installments", id] }); },
    onError: (err: any) => toast.error("Erro ao enviar comprovante: " + err.message),
  });

  const acceptLgpd = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("legal_acceptances" as any).insert({ client_id: tripQ.data!.client_id, agency_id: tripQ.data!.agency_id, terms_type: "lgpd_memories", user_agent: navigator.userAgent });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["client-lgpd-acceptance", tripQ.data!.client_id] }); toast.success("Termos LGPD aceitos com sucesso!"); },
    onError: (err: any) => toast.error("Erro ao registrar consentimento: " + err.message),
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleToggleChecklist = (index: number) => {
    if (!boardingCardQ.data) return;
    const updated = localChecklist.map((item, idx) => idx === index ? { ...item, done: !item.done } : item);
    setLocalChecklist(updated);
    toggleBoardingItem.mutate({ cardId: boardingCardQ.data.id, nextChecklist: updated });
  };

  // ── Early returns ─────────────────────────────────────────────────────────
  if (tripQ.isLoading) return <div className="py-20 text-center text-sm text-muted-foreground">Carregando Viagem...</div>;
  if (!tripQ.data) return <div className="py-20 text-center text-sm text-muted-foreground">Viagem não encontrada.</div>;

  const trip = tripQ.data as any;
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
  const daysToTrip = start ? Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const coverImage = `https://source.unsplash.com/1600x900/?${encodeURIComponent(trip.destination || "travel,resort")}`;

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* ── Immersive Header ────────────────────────────────────────────── */}
      <div className="relative h-[45vh] min-h-[350px] w-full bg-foreground">
        <img src={coverImage} alt="Destino" className="absolute inset-0 h-full w-full object-cover opacity-60 mix-blend-overlay" />
        <div className="absolute inset-0 bg-background/60" />
        <div className="absolute top-6 left-6">
          <Link to="/client/trips" className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md hover:bg-white/30 transition-all">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </div>
        <div className="absolute bottom-6 left-6 right-6 z-10">
          <div className="flex items-center gap-2 text-white/80 mb-2">
            <Plane className="h-4 w-4" />
            <span className="text-xs uppercase tracking-widest font-bold">{trip.code ?? "VIAGEM"}</span>
            <StatusBadge tone={trip.status === "confirmed" ? "success" : trip.status === "in_progress" ? "info" : trip.status === "cancelled" ? "danger" : "neutral"}>
              {TRIP_STATUS[trip.status] ?? trip.status}
            </StatusBadge>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight">{trip.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm font-semibold text-white/90">
            {trip.destination && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-brand-light" /> {trip.destination}</span>}
            {trip.travel_start && <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-brand-light" /> {fmtDate(trip.travel_start)} → {fmtDate(trip.travel_end)}</span>}
          </div>
        </div>
      </div>

      {/* ── Tab Bar ─────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-6">
        <div className="flex overflow-x-auto custom-scrollbar gap-8">
          <TabButton label="Resumo" icon={<FileText className="w-4 h-4" />} active={activeTab === "resumo"} onClick={() => setActiveTab("resumo")} />
          <TabButton label="Explorar (IA)" icon={<Compass className="w-4 h-4" />} active={activeTab === "explorar"} onClick={() => setActiveTab("explorar")} />
          <TabButton label="Financeiro" icon={<CreditCard className="w-4 h-4" />} active={activeTab === "financeiro"} onClick={() => setActiveTab("financeiro")} />
          <TabButton label="Contatos" icon={<Phone className="w-4 h-4" />} active={activeTab === "contatos"} onClick={() => setActiveTab("contatos")} />
          <TabButton label="Memórias" icon={<Camera className="w-4 h-4" />} active={activeTab === "memorias"} onClick={() => setActiveTab("memorias")} />
        </div>
      </div>

      {/* ── Tab Content ─────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* ── RESUMO ───────────────────────────────────────────────────── */}
        {activeTab === "resumo" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {daysToTrip !== null && daysToTrip > 0 && (
              <div className="bg-brand text-brand-foreground rounded-3xl p-6 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest opacity-80">Contagem Regressiva</div>
                  <div className="text-sm font-medium mt-1">Sua viagem se aproxima! Prepare as malas.</div>
                </div>
                <div className="text-4xl font-black tracking-tighter">{daysToTrip} <span className="text-lg font-bold opacity-80">Dias</span></div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <TripConfirmationItems items={confirmationItemsQ.data ?? []} />

                {(trip.airline || pnr || voucher?.flights?.length) && (
                  <div className="rounded-3xl bg-surface p-6 border border-border">
                    <div className="mb-5 flex items-center gap-3">
                      <Plane className="h-5 w-5 text-info" />
                      <h3 className="text-sm font-black text-foreground tracking-tight">Localizador e Voos</h3>
                    </div>
                    {voucher?.flights?.length > 0 && <TripVoucherFlights pnr={pnr} flights={voucher.flights} />}
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
                Reunimos automaticamente as melhores dicas, alertas de segurança e mapas do seu destino para você aproveitar sem preocupações.
              </p>
            </div>

            {trip.flights && Array.isArray(trip.flights) && trip.flights.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold tracking-tight text-foreground flex items-center gap-2">
                    <Plane className="h-5 w-5 text-brand" /> Passagens e Detalhes dos Voos
                  </h3>
                  <span className="text-xs font-semibold text-muted-foreground">{trip.flights.length} voo(s)</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {trip.flights.map((f: any, idx: number) => (
                    <TripFlightCard key={f.id || idx} flight={f} pnr={trip.pnr} />
                  ))}
                </div>
              </div>
            )}

            {destInfoQ.data && <DestinationIntelligenceBlock di={destInfoQ.data} destination={trip.destination} />}
            {!destInfoQ.data && !destInfoQ.isLoading && <DestinationFallbackBlock destination={trip.destination} />}
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
            lgpdAccepted={!!lgpdQ.data}
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
    </div>
  );
}
