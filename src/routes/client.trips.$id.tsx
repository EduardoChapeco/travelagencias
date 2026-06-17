import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  Plane,
  Hotel,
  Users,
  Ticket,
  FileText,
  CreditCard,
  MapPin,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  ExternalLink,
  Phone,
  ShieldAlert,
  Compass,
  Camera,
  Image as ImageIcon,
  Map,
  Lightbulb,
  Ban,
  Square,
  CheckSquare,
  Loader2,
  AlertTriangle,
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
import { fmtDate, money, StatusBadge } from "@/components/ui/form";
import { MultiFileUploader } from "@/components/uploads/MultiFileUploader";

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
const INST_STATUS: Record<string, string> = {
  paid: "Pago",
  pending: "Pendente",
  late: "Atrasado",
  waived: "Isento",
};

function ClientTripDetail() {
  const { id } = useParams({ from: "/client/trips/$id" });
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<
    "resumo" | "explorar" | "financeiro" | "memorias" | "contatos"
  >("resumo");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [contactsAiLoaded, setContactsAiLoaded] = useState(false);
  const [contactsAiData, setContactsAiData] = useState<any[] | null>(null);
  const [contactsAiLoading, setContactsAiLoading] = useState(false);

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

  const boardingCardQ = useQuery({
    enabled: !!tripQ.data,
    queryKey: ["client-boarding-card", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_client_boarding_card", {
        p_trip_id: id,
      });
      if (error) throw error;
      return (data as any)?.[0] ?? null;
    },
  });

  const [localChecklist, setLocalChecklist] = useState<any[]>([]);

  useEffect(() => {
    if (boardingCardQ.data?.checklist) {
      setLocalChecklist(boardingCardQ.data.checklist);
    }
  }, [boardingCardQ.data]);

  const toggleBoardingItem = useMutation({
    mutationFn: async (payload: { cardId: string; nextChecklist: any[] }) => {
      const { error } = await (supabase as any).rpc("update_client_boarding_checklist", {
        p_boarding_card_id: payload.cardId,
        p_checklist: payload.nextChecklist,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-boarding-card", id] });
      toast.success("Progresso do embarque atualizado!");
    },
    onError: (err: any) => {
      toast.error("Erro ao atualizar progresso: " + err.message);
    },
  });

  const handleToggleChecklist = (index: number) => {
    if (!boardingCardQ.data) return;
    const updated = localChecklist.map((item, idx) =>
      idx === index ? { ...item, done: !item.done } : item,
    );
    setLocalChecklist(updated);
    toggleBoardingItem.mutate({
      cardId: boardingCardQ.data.id,
      nextChecklist: updated,
    });
  };

  const reqCancel = useMutation({
    mutationFn: async () => {
      try {
        await requestTripCancellation(id, trip.client_id, cancelReason);
        toast.success("Solicitação enviada. A agência entrará em contato em breve.");
        setCancelReason("");
        setShowCancelModal(false);
      } catch (e: any) {
        toast.error(e.message);
      }
    },
  });

  const uploadMemory = useMutation({
    mutationFn: async (urls: string[]) => {
      await addTripMemories(id, urls);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client-memories", id] }),
  });

  const lgpdQ = useQuery({
    enabled: !!tripQ.data,
    queryKey: ["client-lgpd-acceptance", tripQ.data?.client_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_acceptances" as any)
        .select("*")
        .eq("client_id", tripQ.data!.client_id)
        .eq("terms_type", "lgpd_memories")
        .maybeSingle();
      if (error) return null;
      return data;
    },
  });

  const acceptLgpd = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("legal_acceptances" as any).insert({
        client_id: tripQ.data!.client_id,
        agency_id: tripQ.data!.agency_id,
        terms_type: "lgpd_memories",
        user_agent: navigator.userAgent,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["client-lgpd-acceptance", tripQ.data!.client_id] });
      toast.success("Termos LGPD aceitos com sucesso!");
    },
    onError: (err: any) => {
      toast.error("Erro ao registrar consentimento: " + err.message);
    },
  });

  if (tripQ.isLoading)
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">Carregando Viagem...</div>
    );
  if (!tripQ.data)
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">Viagem não encontrada.</div>
    );

  const trip = tripQ.data as any;
  const voucher = (voucherQ.data as any)?.[0];
  const contract = (contractQ.data as any)?.[0];
  const installments = installmentsQ.data ?? [];
  const passengers = passengersQ.data ?? [];
  const memories = memoriesQ.data ?? [];
  const outstanding = (trip.total_sale ?? 0) - (trip.total_paid ?? 0);
  const isOperator = !!trip.operator; // CVC, etc

  const now = new Date();
  const start = trip.travel_start ? new Date(trip.travel_start) : null;
  const daysToTrip = start
    ? Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const coverImage = `https://source.unsplash.com/1600x900/?${encodeURIComponent(trip.destination || "travel,resort")}`;

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header Imersivo */}
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

      {/* Tabs */}
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

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* ABA: RESUMO */}
        {activeTab === "resumo" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
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
                {(trip.airline || trip.pnr || voucher?.flights?.length) && (
                  <AppWidget
                    title="Localizador e Voos"
                    icon={<Plane className="h-5 w-5 text-info" />}
                  >
                    <div className="rounded-2xl bg-surface p-5 border border-border">
                      {trip.pnr && (
                        <div className="mb-5 flex items-center justify-between">
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            Localizador
                          </span>
                          <span className="text-xl font-mono font-black text-foreground">
                            {trip.pnr}
                          </span>
                        </div>
                      )}
                      <div className="space-y-5">
                        {voucher?.flights.map((f: any, i: number) => (
                          <div key={i} className="relative pl-6">
                            <div className="absolute left-0 top-1.5 h-3 w-3 rounded-full border-2 border-info bg-surface" />
                            {i !== voucher.flights.length - 1 && (
                              <div className="absolute left-1.5 top-4 h-full w-px bg-border" />
                            )}

                            <div className="flex items-start justify-between">
                              <div>
                                <div className="font-bold text-foreground text-sm">
                                  {f.origin}{" "}
                                  <ArrowLeft className="inline h-3 w-3 rotate-180 text-muted-foreground mx-1" />{" "}
                                  {f.destination}
                                </div>
                                <div className="text-xs font-bold text-info mt-0.5">
                                  {f.airline} {f.flight_number}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-bold text-foreground">
                                  {fmtDate(f.date)}
                                </div>
                                <div className="text-[11px] font-bold text-muted-foreground mt-0.5">
                                  {f.departure_time} - {f.arrival_time}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </AppWidget>
                )}

                {voucher?.accommodation && voucher.accommodation.length > 0 && (
                  <AppWidget title="Hospedagem" icon={<Hotel className="h-5 w-5 text-info" />}>
                    <div className="space-y-4">
                      {voucher.accommodation.map((h: any, i: number) => (
                        <div
                          key={i}
                          className="rounded-2xl bg-surface border border-border overflow-hidden"
                        >
                          <div className="p-5">
                            <h4 className="font-bold text-foreground text-base">{h.name}</h4>
                            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mt-1">
                              <MapPin className="h-3 w-3" /> {h.city}
                            </p>
                            <div className="mt-5 flex items-center justify-between text-xs font-bold text-foreground bg-background rounded-xl p-3 border border-border">
                              <div className="text-center">
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                                  Check-in
                                </div>
                                <div>{fmtDate(h.checkin)}</div>
                              </div>
                              <ArrowLeft className="h-4 w-4 rotate-180 text-muted-foreground" />
                              <div className="text-center">
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                                  Check-out
                                </div>
                                <div>{fmtDate(h.checkout)}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AppWidget>
                )}
              </div>

              <div className="space-y-6">
                {boardingCardQ.data && (
                  <AppWidget
                    title="Preparação e Pré-embarque"
                    icon={<Plane className="h-5 w-5 text-brand" />}
                  >
                    <div className="space-y-4">
                      {/* Briefing Box */}
                      {(boardingCardQ.data.briefing_date || boardingCardQ.data.briefing_url) && (
                        <div className="rounded-2xl border border-brand/20 bg-brand/5 p-4 text-sm">
                          <div className="flex items-center gap-2 text-brand font-bold mb-1.5">
                            <Clock className="w-4 h-4" /> Briefing Operacional
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                            Acompanhe os detalhes da sua viagem na reunião de alinhamento com seu
                            consultor.
                          </p>
                          <div className="flex flex-wrap items-center gap-3">
                            {boardingCardQ.data.briefing_date && (
                              <span className="text-[11px] font-bold bg-surface border border-border px-2.5 py-1 rounded-full text-foreground whitespace-nowrap">
                                📅{" "}
                                {new Date(boardingCardQ.data.briefing_date).toLocaleString(
                                  "pt-BR",
                                  {
                                    dateStyle: "short",
                                    timeStyle: "short",
                                  },
                                )}
                              </span>
                            )}
                            {boardingCardQ.data.briefing_url && (
                              <a
                                href={boardingCardQ.data.briefing_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold bg-brand text-brand-foreground px-3 py-1 rounded-full hover:opacity-90 transition-opacity"
                              >
                                Acessar Reunião <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Alertas */}
                      {boardingCardQ.data.alerts && boardingCardQ.data.alerts.length > 0 && (
                        <div className="rounded-2xl border border-warning/20 bg-warning/5 p-4">
                          <div className="flex items-center gap-2 text-warning font-bold text-xs mb-2">
                            <AlertTriangle className="w-4 h-4" /> Alertas Operacionais
                          </div>
                          <ul className="space-y-1.5 text-[11px] text-muted-foreground font-medium pl-5 list-disc leading-relaxed">
                            {boardingCardQ.data.alerts.map((a: string, i: number) => (
                              <li key={i}>{a}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Checklist */}
                      {localChecklist.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                            Checklist de Embarque
                          </div>
                          <div className="rounded-2xl border border-border/60 bg-surface/50 overflow-hidden divide-y divide-border/40">
                            {localChecklist.map((it, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => handleToggleChecklist(idx)}
                                disabled={toggleBoardingItem.isPending}
                                className={`w-full flex items-center gap-3 p-3.5 text-left transition-colors hover:bg-surface-alt/40 active:bg-surface-alt${it.done ? "bg-surface-alt/10" : ""}`}
                              >
                                {it.done ? (
                                  <CheckSquare className="w-4 h-4 text-success shrink-0" />
                                ) : (
                                  <Square className="w-4 h-4 text-muted-foreground shrink-0" />
                                )}
                                <span
                                  className={`text-xs font-semibold${it.done ? "line-through text-muted-foreground" : "text-foreground"}`}
                                >
                                  {it.label}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </AppWidget>
                )}

                <AppWidget
                  title="Seus Documentos"
                  icon={<FileText className="h-5 w-5 text-brand" />}
                >
                  <div className="space-y-3">
                    {contract && (
                      <a
                        href={`/m/contract/${contract.public_token}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between rounded-2xl bg-surface p-4 border border-border hover:border-foreground transition-colors group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger-bg text-danger">
                            <FileText className="h-6 w-6" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-foreground">
                              Contrato de Viagem
                            </div>
                            <div className="text-xs font-medium text-muted-foreground mt-0.5">
                              {contract.status === "signed" ? "Assinado" : "Aguardando Assinatura"}
                            </div>
                          </div>
                        </div>
                        <ExternalLink className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </a>
                    )}
                    {voucher?.pdf_url && (
                      <a
                        href={voucher.pdf_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between rounded-2xl bg-surface p-4 border border-border hover:border-foreground transition-colors group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-info-bg text-info">
                            <Ticket className="h-6 w-6" />
                          </div>
                          <div>
                            <div className="text-sm font-bold text-foreground">Vouchers PDF</div>
                            <div className="text-xs font-medium text-muted-foreground mt-0.5">
                              Pronto para embarque
                            </div>
                          </div>
                        </div>
                        <Download className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </a>
                    )}
                  </div>
                </AppWidget>

                {/* Logistics */}
                {(trip.itinerary || trip.includes || trip.excludes || trip.insurance) && (
                  <AppWidget
                    title="Detalhes do Roteiro e Serviços"
                    icon={<Compass className="h-5 w-5 text-brand" />}
                  >
                    <div className="space-y-4">
                      {trip.itinerary &&
                        Array.isArray(trip.itinerary) &&
                        trip.itinerary.length > 0 && (
                          <div>
                            <h4 className="text-sm font-bold text-foreground mb-2">Roteiro</h4>
                            <div className="space-y-3">
                              {trip.itinerary.map((day: any, i: number) => (
                                <div key={i} className="flex gap-3 text-sm">
                                  <div className="font-bold text-brand min-w-[50px]">
                                    Dia {day.day}
                                  </div>
                                  <div className="text-muted-foreground">{day.description}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {trip.includes &&
                        Array.isArray(trip.includes) &&
                        trip.includes.length > 0 && (
                          <div>
                            <h4 className="text-sm font-bold text-success mb-2">
                              O que está incluído
                            </h4>
                            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                              {trip.includes.map((item: string, i: number) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                      {trip.excludes &&
                        Array.isArray(trip.excludes) &&
                        trip.excludes.length > 0 && (
                          <div>
                            <h4 className="text-sm font-bold text-danger mb-2">
                              O que NÃO está incluído
                            </h4>
                            <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                              {trip.excludes.map((item: string, i: number) => (
                                <li key={i}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                      {trip.insurance &&
                        typeof trip.insurance === "object" &&
                        Object.values(trip.insurance).some(
                          (v) => v !== null && v !== "" && v !== undefined,
                        ) && (
                          <div>
                            <h4 className="text-sm font-bold text-info mb-2">Seguro Viagem</h4>
                            <div className="text-sm text-muted-foreground space-y-1 rounded-xl bg-info/5 border border-info/20 p-3">
                              {(trip.insurance as any).provider && (
                                <div>
                                  <span className="font-semibold">Operadora:</span>{" "}
                                  {(trip.insurance as any).provider}
                                </div>
                              )}
                              {(trip.insurance as any).plan && (
                                <div>
                                  <span className="font-semibold">Plano:</span>{" "}
                                  {(trip.insurance as any).plan}
                                </div>
                              )}
                              {(trip.insurance as any).policy && (
                                <div>
                                  <span className="font-semibold">Apólice:</span>{" "}
                                  {(trip.insurance as any).policy}
                                </div>
                              )}
                              {(trip.insurance as any).coverage && (
                                <div>
                                  <span className="font-semibold">Cobertura:</span>{" "}
                                  {(trip.insurance as any).coverage}
                                </div>
                              )}
                              {!(trip.insurance as any).plan &&
                                !(trip.insurance as any).provider && (
                                  <div>Seguro viagem incluso neste pacote.</div>
                                )}
                            </div>
                          </div>
                        )}
                    </div>
                  </AppWidget>
                )}

                {passengers.length > 0 && (
                  <AppWidget
                    title="Passageiros e Participantes"
                    icon={<Users className="h-5 w-5 text-foreground" />}
                  >
                    <div className="space-y-3">
                      {passengers.map((p: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded-2xl bg-surface p-4 border border-border"
                        >
                          <div>
                            <div className="text-sm font-bold text-foreground">{p.full_name}</div>
                            {p.document && (
                              <div className="text-xs font-medium text-muted-foreground mt-0.5">
                                Doc: {p.document}
                              </div>
                            )}
                          </div>
                          {p.is_lead && (
                            <div className="text-[10px] font-bold text-brand bg-brand/10 px-2 py-1 rounded">
                              Titular
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </AppWidget>
                )}

                <div className="pt-6 border-t border-border flex justify-center">
                  <button
                    onClick={() => setShowCancelModal(true)}
                    className="text-xs font-bold text-muted-foreground hover:text-danger hover:underline flex items-center gap-1 transition-colors"
                  >
                    <Ban className="w-3 h-3" /> Solicitar Cancelamento da Viagem
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA: EXPLORAR (IA) */}
        {activeTab === "explorar" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-brand rounded-3xl p-8 text-brand-foreground relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
              <Compass className="w-10 h-10 mb-4 opacity-90" />
              <h2 className="text-3xl font-black tracking-tight mb-2">Seu Guia Inteligente</h2>
              <p className="text-white/80 font-medium max-w-lg leading-relaxed">
                Reunimos automaticamente as melhores dicas, alertas de segurança e mapas do seu
                destino para você aproveitar sem preocupações.
              </p>
            </div>

            {/* Voos da Viagem (Estilo Cia Aérea / Boarding Pass) */}
            {trip.flights && Array.isArray(trip.flights) && trip.flights.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-extrabold tracking-tight text-foreground flex items-center gap-2">
                    <Plane className="h-5 w-5 text-brand" /> Passagens e Detalhes dos Voos
                  </h3>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {trip.flights.length} voo(s) localizado(s)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {trip.flights.map((f: any, idx: number) => {
                    const originCode =
                      f.origin?.trim().length === 3
                        ? f.origin.toUpperCase()
                        : f.origin?.substring(0, 3).toUpperCase() || "SDU";
                    const destCode =
                      f.destination?.trim().length === 3
                        ? f.destination.toUpperCase()
                        : f.destination?.substring(0, 3).toUpperCase() || "GRU";
                    return (
                      <div
                        key={f.id || idx}
                        className="bg-surface border border-border/60 rounded-3xl transition-shadow overflow-hidden flex flex-col relative"
                      >
                        {/* Top banner / Airline info */}
                        <div className="bg-surface-alt/30 px-6 py-4 flex items-center justify-between border-b border-border/40">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-brand/10 text-brand flex items-center justify-center text-xs font-black">
                              ✈
                            </div>
                            <span className="text-xs font-bold text-foreground">
                              {f.airline || "Companhia Aérea"}
                            </span>
                            <span className="text-xs font-mono text-muted-foreground">
                              · Voo {f.flight_number || "—"}
                            </span>
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded-full">
                            Confirmado
                          </span>
                        </div>

                        {/* Ticket Main Section */}
                        <div className="px-6 py-5 flex items-center justify-between gap-4">
                          <div className="space-y-1">
                            <div className="text-3xl font-black text-foreground tracking-tight">
                              {originCode}
                            </div>
                            <div className="text-[11px] font-bold text-muted-foreground truncate max-w-[100px]">
                              {f.origin}
                            </div>
                            <div className="text-xs font-medium text-foreground mt-1">
                              {f.departure_time || "—"}
                            </div>
                          </div>

                          {/* Flight path line */}
                          <div className="flex-1 flex flex-col items-center justify-center px-2">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
                              {f.stops > 0 ? `${f.stops} parada(s)` : "Direto"}
                            </span>
                            <div className="w-full flex items-center relative">
                              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-border border-dashed"></div>
                              <Plane className="h-4 w-4 text-brand rotate-90 mx-auto relative z-10 bg-surface px-0.5" />
                            </div>
                            <span className="text-[9px] font-medium text-muted-foreground mt-1">
                              {f.date ? fmtDate(f.date) : "—"}
                            </span>
                          </div>

                          <div className="space-y-1 text-right">
                            <div className="text-3xl font-black text-foreground tracking-tight">
                              {destCode}
                            </div>
                            <div className="text-[11px] font-bold text-muted-foreground truncate max-w-[100px]">
                              {f.destination}
                            </div>
                            <div className="text-xs font-medium text-foreground mt-1">
                              {f.arrival_time || "—"}
                            </div>
                          </div>
                        </div>

                        {/* Dashed ticket tear line */}
                        <div className="relative h-px my-1">
                          <div className="absolute left-0 right-0 border-t border-dashed border-border/80"></div>
                          {/* Cutouts */}
                          <div className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-background border border-border rounded-full z-10"></div>
                          <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-background border border-border rounded-full z-10"></div>
                        </div>

                        {/* Bottom ticket details */}
                        <div className="px-6 py-4 bg-surface-alt/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                          <div>
                            <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                              Bagagem
                            </div>
                            <div className="font-semibold text-foreground mt-0.5 truncate">
                              {f.baggage_rules || "Incluso"}
                            </div>
                          </div>
                          <div>
                            <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                              Classe
                            </div>
                            <div className="font-semibold text-foreground mt-0.5">Econômica</div>
                          </div>
                          <div>
                            <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                              Assento
                            </div>
                            <div className="font-semibold text-brand mt-0.5">Sob Check-in</div>
                          </div>
                          <div>
                            <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                              Localizador
                            </div>
                            <div className="font-mono font-bold text-foreground mt-0.5">
                              {trip.pnr || "Pendente"}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <AppWidget
                  title="Dicas de Segurança e Leis Locais"
                  icon={<ShieldAlert className="w-5 h-5 text-warning" />}
                >
                  <div className="space-y-4">
                    <div className="bg-warning/10 p-4 rounded-2xl border border-warning/20">
                      <div className="text-sm font-bold text-warning mb-1">Atenção Especial</div>
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        Sempre ande com uma cópia do seu passaporte. Evite áreas não turísticas após
                        as 22h. Cuidado com pertences em multidões.
                      </div>
                    </div>
                    <div className="bg-surface p-4 rounded-2xl border border-border">
                      <div className="text-sm font-bold text-foreground mb-1">Leis Regionais</div>
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        É terminantemente proibido o consumo de bebidas alcoólicas nas ruas ou
                        transporte público neste destino.
                      </div>
                    </div>
                  </div>
                </AppWidget>

                <AppWidget title="Mapa Exploratório" icon={<Map className="w-5 h-5 text-info" />}>
                  <div className="rounded-2xl overflow-hidden border border-border h-64 bg-muted relative">
                    <iframe
                      title="mapa"
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      scrolling="no"
                      marginHeight={0}
                      marginWidth={0}
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(trip.destination || "Brazil")}&t=&z=13&ie=UTF8&iwloc=&output=embed`}
                    />
                  </div>
                </AppWidget>
              </div>

              <div className="space-y-6">
                <AppWidget
                  title="Curadoria Profissional"
                  icon={<Lightbulb className="w-5 h-5 text-brand" />}
                >
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="flex gap-3 items-start border-b border-border/50 pb-4 last:border-0 last:pb-0"
                      >
                        <div className="w-16 h-16 rounded-xl bg-muted shrink-0 overflow-hidden">
                          <img
                            src={`https://source.unsplash.com/200x200/?landmark,${trip.destination}&sig=${i}`}
                            alt="Local"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-foreground">
                            Ponto Turístico {i}
                          </div>
                          <div className="text-[10px] text-muted-foreground line-clamp-2 mt-1">
                            Um dos locais mais visitados da região, ideal para fotos ao pôr do sol.
                            Requer ingresso antecipado.
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </AppWidget>
              </div>
            </div>
          </div>
        )}

        {/* ABA: FINANCEIRO */}
        {activeTab === "financeiro" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {isOperator && (
              <div className="bg-warning/10 border border-warning/30 rounded-3xl p-6 flex gap-4 items-start">
                <AlertCircle className="w-6 h-6 text-warning shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-warning mb-1">
                    Viagem operada por matriz externa ({trip.operator})
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Os pagamentos desta viagem são processados diretamente pela operadora parceira.
                    Seus boletos ou links de pagamento serão enviados via WhatsApp e E-mail nas
                    proximidades do vencimento. Acompanhe a timeline abaixo para conferir o status.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <div className="bg-foreground rounded-3xl p-6 text-background">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-background/50 mb-2">
                    Valor do Pacote
                  </h3>
                  <div className="text-3xl font-black tracking-tight mb-6">
                    {money(trip.total_sale, trip.currency)}
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center bg-white/10 p-3 rounded-xl">
                      <span className="text-xs font-medium">Pago</span>
                      <span className="text-sm font-bold text-success">
                        {money(trip.total_paid ?? 0, trip.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center bg-white/10 p-3 rounded-xl border border-warning/30">
                      <span className="text-xs font-medium">Pendente</span>
                      <span className="text-sm font-black text-warning">
                        {money(outstanding, trip.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <AppWidget
                  title="Jornada de Pagamentos"
                  icon={<CreditCard className="w-5 h-5 text-success" />}
                >
                  <div className="space-y-3">
                    {installments.length === 0 ? (
                      <div className="text-sm text-muted-foreground py-4 text-center">
                        Nenhum plano de pagamento registrado.
                      </div>
                    ) : (
                      installments.map((inst: any) => (
                        <div
                          key={inst.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border border-border bg-surface p-4 gap-4"
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={`flex h-12 w-12 items-center justify-center rounded-full${inst.status === "paid" ? "bg-success-bg text-success" : inst.status === "late" ? "bg-danger-bg text-danger" : "bg-surface-alt text-muted-foreground"}`}
                            >
                              {inst.status === "paid" ? (
                                <CheckCircle className="h-6 w-6" />
                              ) : inst.status === "late" ? (
                                <AlertCircle className="h-6 w-6" />
                              ) : (
                                <Clock className="h-6 w-6" />
                              )}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-foreground">
                                Parcela {inst.number}
                              </div>
                              <div className="text-xs font-medium text-muted-foreground mt-0.5">
                                Vencimento: {fmtDate(inst.due_date)}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto border-t sm:border-0 border-border/50 pt-3 sm:pt-0">
                            <div className="text-left sm:text-right flex items-center sm:items-end justify-between sm:flex-col sm:justify-start w-full gap-2">
                              <div>
                                <div className="text-base font-black text-foreground">
                                  {money(inst.amount, trip.currency)}
                                </div>
                                <div
                                  className={`text-[10px] uppercase font-bold tracking-wider${inst.status === "paid" ? "text-success" : inst.status === "late" ? "text-danger" : "text-muted-foreground"}`}
                                >
                                  {INST_STATUS[inst.status] ?? inst.status}
                                </div>
                              </div>
                              {inst.status !== "paid" && (inst.boleto_url || inst.barcode) && (
                                <a
                                  href={inst.boleto_url || "#"}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => {
                                    if (!inst.boleto_url && inst.barcode) {
                                      e.preventDefault();
                                      navigator.clipboard.writeText(inst.barcode);
                                      toast.success("Código de barras copiado!");
                                    }
                                  }}
                                  className="h-8 rounded bg-foreground text-background text-xs font-bold px-3 py-1 flex items-center justify-center hover:opacity-90 transition-opacity"
                                >
                                  {inst.boleto_url ? "Ver Boleto" : "Copiar Linha Digitável"}
                                </a>
                              )}
                            </div>
                            {!isOperator &&
                              inst.status !== "paid" &&
                              !inst.boleto_url &&
                              !inst.barcode && (
                                <button
                                  onClick={() =>
                                    toast.info("Funcionalidade de gateway em desenvolvimento.")
                                  }
                                  className="px-4 py-2 rounded-xl bg-foreground text-background text-xs font-bold hover:opacity-90"
                                >
                                  Pagar Agora
                                </button>
                              )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </AppWidget>
              </div>
            </div>
          </div>
        )}

        {/* ABA: CONTATOS */}
        {activeTab === "contatos" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-danger/10 rounded-3xl p-8 relative overflow-hidden border border-danger/20">
              <Phone className="w-10 h-10 mb-4 opacity-90 text-danger" />
              <h2 className="text-3xl font-black tracking-tight mb-2 text-danger">
                Contatos e Emergência
              </h2>
              <p className="text-danger/80 font-medium max-w-lg leading-relaxed">
                Tenha sempre em mãos os contatos do seu agente e números úteis do seu destino.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <AppWidget
                  title="Agência e Suporte"
                  icon={<Phone className="h-5 w-5 text-brand" />}
                >
                  <div className="space-y-3">
                    <a
                      href={`tel:${trip.agency?.phone || ""}`}
                      className="flex items-center justify-between rounded-2xl bg-surface p-4 border border-border hover:border-brand/50 transition-colors"
                    >
                      <div>
                        <div className="text-sm font-bold text-foreground">Sua Agência</div>
                        <div className="text-xs font-medium text-muted-foreground">
                          {trip.agency?.name}
                        </div>
                      </div>
                      <div className="text-sm font-black text-brand tracking-wider">
                        {trip.agency?.phone || "Não informado"}
                      </div>
                    </a>
                  </div>
                </AppWidget>

                {voucher?.emergency_contacts && voucher.emergency_contacts.length > 0 && (
                  <AppWidget
                    title="Contatos Operacionais"
                    icon={<AlertCircle className="h-5 w-5 text-warning" />}
                  >
                    <div className="space-y-3">
                      {voucher.emergency_contacts.map((ec: any, i: number) => (
                        <a
                          key={i}
                          href={`tel:${ec.phone}`}
                          className="flex items-center justify-between rounded-2xl bg-warning/10 p-4 border border-warning/20 hover:bg-warning/20 transition-colors"
                        >
                          <div>
                            <div className="text-sm font-bold text-warning">{ec.role}</div>
                            <div className="text-xs font-medium text-warning/80">{ec.name}</div>
                          </div>
                          <div className="text-sm font-black text-warning tracking-wider">
                            {ec.phone}
                          </div>
                        </a>
                      ))}
                    </div>
                  </AppWidget>
                )}
              </div>

              <div className="space-y-6">
                <AppWidget
                  title="Números Úteis por Destino · IA"
                  icon={<Compass className="h-5 w-5 text-info" />}
                >
                  {!contactsAiLoaded && (
                    <div className="text-center py-4 space-y-3">
                      <button
                        onClick={async () => {
                          if (!trip.destination) return;
                          setContactsAiLoading(true);
                          setContactsAiLoaded(true);
                          try {
                            const destinations = [trip.destination];
                            if (trip.flights && Array.isArray(trip.flights)) {
                              trip.flights.forEach((f: any) => {
                                if (f.destination) destinations.push(f.destination);
                              });
                            }
                            const uniqueDests = [...new Set(destinations)].join(", ");
                            const { data, error } = await supabase.functions.invoke(
                              "ai-orchestrator",
                              {
                                body: {
                                  action: "completion",
                                  prompt: `Viajante brasileiro indo para: ${uniqueDests}. Retorne JSON array com dados de cada pais (incluindo conexoes): [{"country": "Nome", "flag": "Emoji", "emergency": "Numero", "police": "Numero", "ambulance": "Numero", "consulate": {"name": "Consulado Brasileiro", "phone": "+XX...", "address": "Endereco"}, "key_rules": ["Regra 1", "Regra 2"], "mandatory_taxes": ["Taxa 1"], "currency": "Moeda local", "voltage": "V", "timezone": "UTC+/-X"}]. Retorne APENAS JSON valido, sem markdown.`,
                                  systemPrompt:
                                    "Voce e especialista em viagens internacionais. Retorne APENAS JSON valido.",
                                  modelPreference: "smart",
                                },
                              },
                            );
                            if (error) throw error;
                            const text = data?.result || "";
                            const match = text.match(/\[[\s\S]*\]/);
                            setContactsAiData(match ? JSON.parse(match[0]) : []);
                          } catch {
                            setContactsAiData([]);
                          } finally {
                            setContactsAiLoading(false);
                          }
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-info/10 text-info text-xs font-bold border border-info/20 hover:bg-info/20 transition-colors"
                      >
                        <Lightbulb className="h-3.5 w-3.5" /> Carregar Informações do Destino
                      </button>
                      <p className="text-[10px] text-muted-foreground">
                        A IA analisa seu destino e rotas de conexão.
                      </p>
                    </div>
                  )}

                  {contactsAiLoading && (
                    <div className="flex flex-col items-center py-8 gap-3">
                      <Loader2 className="h-8 w-8 text-info animate-spin" />
                      <p className="text-sm text-muted-foreground">
                        Analisando países da sua rota...
                      </p>
                    </div>
                  )}

                  {contactsAiData && !contactsAiLoading && contactsAiData.length === 0 && (
                    <p className="text-xs text-muted-foreground py-2 text-center">
                      Não foi possível obter dados para este destino.
                    </p>
                  )}

                  {contactsAiData && !contactsAiLoading && contactsAiData.length > 0 && (
                    <div className="space-y-4">
                      {contactsAiData.map((country: any, i: number) => (
                        <div key={i} className="rounded-2xl border border-border overflow-hidden">
                          <div className="flex items-center gap-3 p-3 bg-surface-alt/30 border-b border-border/50">
                            <span className="text-2xl">{country.flag}</span>
                            <div className="flex-1 min-w-0">
                              <div className="font-bold text-sm text-foreground">
                                {country.country}
                              </div>
                              <div className="text-[10px] text-muted-foreground">
                                {country.currency} · {country.timezone} · {country.voltage}
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 divide-x divide-border/50 border-b border-border/50">
                            {country.emergency && (
                              <a
                                href={`tel:${country.emergency}`}
                                className="flex flex-col items-center py-3 hover:bg-danger/5 transition-colors"
                              >
                                <span className="text-xs font-black text-danger">
                                  {country.emergency}
                                </span>
                                <span className="text-[9px] text-muted-foreground uppercase tracking-wide">
                                  Emergência
                                </span>
                              </a>
                            )}
                            {country.police && (
                              <a
                                href={`tel:${country.police}`}
                                className="flex flex-col items-center py-3 hover:bg-warning/5 transition-colors"
                              >
                                <span className="text-xs font-black text-warning">
                                  {country.police}
                                </span>
                                <span className="text-[9px] text-muted-foreground uppercase tracking-wide">
                                  Polícia
                                </span>
                              </a>
                            )}
                            {country.ambulance && (
                              <a
                                href={`tel:${country.ambulance}`}
                                className="flex flex-col items-center py-3 hover:bg-info/5 transition-colors"
                              >
                                <span className="text-xs font-black text-info">
                                  {country.ambulance}
                                </span>
                                <span className="text-[9px] text-muted-foreground uppercase tracking-wide">
                                  Ambulância
                                </span>
                              </a>
                            )}
                          </div>
                          {country.consulate?.phone && (
                            <a
                              href={`tel:${country.consulate.phone}`}
                              className="flex items-center gap-3 px-3 py-3 border-b border-border/50 hover:bg-brand/5 transition-colors"
                            >
                              <div className="h-7 w-7 rounded-full bg-brand/10 flex items-center justify-center shrink-0 text-sm">
                                🇧🇷
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold text-foreground truncate">
                                  {country.consulate.name}
                                </div>
                                {country.consulate.address && (
                                  <div className="text-[9px] text-muted-foreground truncate">
                                    {country.consulate.address}
                                  </div>
                                )}
                              </div>
                              <div className="text-xs font-black text-brand shrink-0">
                                {country.consulate.phone}
                              </div>
                            </a>
                          )}
                          {country.key_rules && country.key_rules.length > 0 && (
                            <div className="px-3 py-2.5">
                              <div className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                                Regras Importantes
                              </div>
                              <ul className="space-y-0.5">
                                {country.key_rules.slice(0, 3).map((rule: string, ri: number) => (
                                  <li
                                    key={ri}
                                    className="flex items-start gap-1.5 text-[10px] text-muted-foreground"
                                  >
                                    <span className="text-warning mt-0.5 shrink-0">⚠</span> {rule}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </AppWidget>
              </div>
            </div>
          </div>
        )}

        {/* ABA: MEMÓRIAS */}
        {activeTab === "memorias" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {!lgpdQ.isLoading && !lgpdQ.data ? (
              <div className="rounded-3xl border border-warning/30 bg-warning/5 p-8 max-w-2xl mx-auto space-y-4 text-center">
                <ShieldAlert className="w-12 h-12 text-warning mx-auto" />
                <h3 className="text-base font-bold text-foreground">
                  Autorização de Uso de Imagem (LGPD)
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Para poder salvar fotos das suas viagens no portal, precisamos do seu
                  consentimento para armazenar estas mídias de forma segura. A agência poderá
                  visualizar as imagens e, com a sua permissão, utilizá-las em comunicações ou
                  divulgações institucionais de marketing.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => acceptLgpd.mutate()}
                    disabled={acceptLgpd.isPending}
                    className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity"
                  >
                    {acceptLgpd.isPending ? "Registrando..." : "Aceitar e Habilitar Galeria"}
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                      <ImageIcon className="w-5 h-5 text-brand" /> Galeria Privada
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Guarde aqui as fotos inesquecíveis da sua viagem.
                    </p>
                  </div>
                  <div>
                    {/* Uploader escondido por trás de um botão bonitinho */}
                    <div className="w-full md:w-auto">
                      <MultiFileUploader
                        bucket="trip-memories"
                        folder={`${id}`}
                        max={10}
                        values={[]}
                        onChange={(urls) => {
                          if (urls.length > 0) uploadMemory.mutate(urls);
                        }}
                      />
                    </div>
                  </div>
                </div>

                {memories.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-border p-12 text-center bg-surface">
                    <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <div className="text-lg font-bold text-foreground mb-1">
                      Nenhuma memória ainda
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Faça o upload da sua primeira foto.
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {memories.map((m: any) => (
                      <div
                        key={m.id}
                        className="aspect-square rounded-2xl overflow-hidden bg-muted group relative"
                      >
                        <img
                          src={m.image_url}
                          alt="Memória"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                          <span className="text-[10px] text-white font-medium">
                            {fmtDate(m.created_at)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Modal Cancelamento */}
      {showCancelModal && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-background/80 backdrop-blur-sm"
          onClick={() => setShowCancelModal(false)}
        >
          <div
            className="flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border bg-surface animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-danger p-6 text-center text-danger-foreground shrink-0">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-90" />
              <h3 className="text-xl font-black tracking-tight">Solicitação de Cancelamento</h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-danger/10 border border-danger/20 rounded-2xl p-4">
                <p className="text-xs text-danger font-medium leading-relaxed">
                  <strong>Atenção:</strong> O cancelamento da viagem está sujeito às políticas de
                  quebra de contrato, multas de fornecedores e da operadora. Ao prosseguir, um
                  ticket de nível de emergência será gerado para seu consultor, que entrará em
                  contato para apresentar as condições de reembolso.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Motivo do Cancelamento
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-background p-4 text-sm resize-none h-24 focus:ring-1 focus:ring-danger focus:border-danger outline-none"
                  placeholder="Por favor, explique o motivo..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelModal(false)}
                  className="flex-1 h-12 rounded-full border border-border font-bold text-sm hover:bg-muted transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={() => reqCancel.mutate()}
                  disabled={!cancelReason || reqCancel.isPending}
                  className="flex-1 h-12 rounded-full bg-danger text-danger-foreground font-bold text-sm hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {reqCancel.isPending ? "Enviando..." : "Solicitar Cancelamento"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 py-4 border-b-2 font-bold text-sm whitespace-nowrap transition-colors${active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
    >
      {icon} {label}
    </button>
  );
}

function AppWidget({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-surface p-6 border border-border">
      <div className="mb-5 flex items-center gap-3">
        {icon}
        <h3 className="text-sm font-black text-foreground tracking-tight">{title}</h3>
      </div>
      {children}
    </div>
  );
}
