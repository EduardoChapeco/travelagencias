import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft, Plane, Hotel, Users, Ticket, FileText,
  CreditCard, MapPin, Calendar, CheckCircle, Clock, 
  AlertCircle, Download, ExternalLink, Phone, ShieldAlert,
  Compass, Camera, Image as ImageIcon, Map, Lightbulb, Ban
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate, money, StatusBadge } from "@/components/ui/form";
import { MultiFileUploader } from "@/components/uploads/MultiFileUploader";

export const Route = createFileRoute("/client/trips/$id")({
  head: () => ({ meta: [{ title: "Minha Viagem · TravelOS" }] }),
  component: ClientTripDetail,
});

const TRIP_STATUS: Record<string, string> = {
  planning: "Em planejamento", confirmed: "Confirmada", in_progress: "Em andamento", completed: "Concluída", cancelled: "Cancelada",
};
const INST_STATUS: Record<string, string> = { paid: "Pago", pending: "Pendente", late: "Atrasado", waived: "Isento" };

function ClientTripDetail() {
  const { id } = useParams({ from: "/client/trips/$id" });
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<"resumo" | "explorar" | "financeiro" | "memorias">("resumo");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const { data: userClientInfo } = useQuery({
    queryKey: ["client-ids-trip", id],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Não autenticado");
      const { data: clients } = await supabase.from("clients").select("id, agency_id").eq("user_id", u.user.id);
      return { user_id: u.user.id, clients: clients ?? [] };
    },
  });

  const clientIds = userClientInfo?.clients.map(c => c.id) ?? [];

  const tripQ = useQuery({
    enabled: clientIds.length > 0,
    queryKey: ["client-trip", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("id, title, code, destination, travel_start, travel_end, status, total_sale, total_paid, currency, notes, airline, pnr, operator, agency_id")
        .eq("id", id)
        .in("client_id", clientIds)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const voucherQ = useQuery({
    enabled: !!tripQ.data,
    queryKey: ["client-voucher", id],
    queryFn: async () => {
      const { data } = await supabase.from("vouchers").select("*").eq("trip_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data as any;
    },
  });

  const contractQ = useQuery({
    enabled: !!tripQ.data,
    queryKey: ["client-contract", id],
    queryFn: async () => {
      const { data } = await supabase.from("contracts").select("*").eq("trip_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle();
      return data as any;
    },
  });

  const installmentsQ = useQuery({
    enabled: !!tripQ.data,
    queryKey: ["client-installments", id],
    queryFn: async () => {
      const { data: plans } = await supabase.from("payment_plans").select("id").eq("trip_id", id).limit(1).maybeSingle();
      if (!plans) return [];
      const { data: insts } = await supabase.from("payment_installments").select("*").eq("payment_plan_id", plans.id).order("number");
      return insts ?? [];
    },
  });

  const passengersQ = useQuery({
    enabled: !!tripQ.data,
    queryKey: ["client-passengers", id],
    queryFn: async () => {
      const { data } = await supabase.from("trip_passengers").select("*").eq("trip_id", id);
      return data ?? [];
    },
  });

  const memoriesQ = useQuery({
    enabled: !!tripQ.data,
    queryKey: ["client-memories", id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("trip_memories").select("id, image_url, created_at").eq("trip_id", id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const reqCancel = useMutation({
    mutationFn: async () => {
      if (!userClientInfo?.clients[0]) throw new Error("Cliente principal não detectado");
      const { error } = await (supabase as any).rpc("request_trip_cancellation", {
        p_trip_id: tripQ.data.id,
        p_client_id: userClientInfo.clients[0].id,
        p_reason: cancelReason
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Solicitação enviada. Um consultor entrará em contato.");
      setShowCancelModal(false);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const uploadMemory = useMutation({
    mutationFn: async (urls: string[]) => {
      if (!userClientInfo?.clients[0]) return;
      const inserts = urls.map(u => ({
        agency_id: tripQ.data.agency_id,
        trip_id: tripQ.data.id,
        client_id: userClientInfo.clients[0].id,
        image_url: u
      }));
      if (inserts.length === 0) return;
      const { error } = await (supabase as any).from("trip_memories").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client-memories", id] }),
  });

  if (tripQ.isLoading) return <div className="py-20 text-center text-sm text-muted-foreground">Carregando Viagem...</div>;
  if (!tripQ.data) return <div className="py-20 text-center text-sm text-muted-foreground">Viagem não encontrada.</div>;

  const trip = tripQ.data;
  const voucher = voucherQ.data;
  const contract = contractQ.data;
  const installments = installmentsQ.data ?? [];
  const passengers = passengersQ.data ?? [];
  const memories = memoriesQ.data ?? [];
  const outstanding = (trip.total_sale ?? 0) - (trip.total_paid ?? 0);
  const isOperator = !!trip.operator; // CVC, etc

  const now = new Date();
  const start = trip.travel_start ? new Date(trip.travel_start) : null;
  const daysToTrip = start ? Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

  const coverImage = `https://source.unsplash.com/1600x900/?${encodeURIComponent(trip.destination || "travel,resort")}`;

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header Imersivo */}
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
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-tight ">{trip.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm font-semibold text-white/90">
            {trip.destination && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-brand-light" /> {trip.destination}</span>}
            {trip.travel_start && <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-brand-light" /> {fmtDate(trip.travel_start)} → {fmtDate(trip.travel_end)}</span>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border px-6">
        <div className="flex overflow-x-auto custom-scrollbar gap-8">
          <TabButton label="Resumo" icon={<FileText className="w-4 h-4"/>} active={activeTab === "resumo"} onClick={() => setActiveTab("resumo")} />
          <TabButton label="Explorar (IA)" icon={<Compass className="w-4 h-4"/>} active={activeTab === "explorar"} onClick={() => setActiveTab("explorar")} />
          <TabButton label="Financeiro" icon={<CreditCard className="w-4 h-4"/>} active={activeTab === "financeiro"} onClick={() => setActiveTab("financeiro")} />
          <TabButton label="Memórias" icon={<Camera className="w-4 h-4"/>} active={activeTab === "memorias"} onClick={() => setActiveTab("memorias")} />
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        
        {/* ABA: RESUMO */}
        {activeTab === "resumo" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {daysToTrip !== null && daysToTrip > 0 && (
              <div className="bg-brand text-brand-foreground rounded-3xl p-6 flex items-center justify-between ">
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest opacity-80">Contagem Regressiva</div>
                  <div className="text-sm font-medium mt-1">Sua viagem se aproxima! Prepare as malas.</div>
                </div>
                <div className="text-4xl font-black tracking-tighter">{daysToTrip} <span className="text-lg font-bold opacity-80">Dias</span></div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                {(trip.airline || trip.pnr || voucher?.flights?.length) && (
                  <AppWidget title="Localizador e Voos" icon={<Plane className="h-5 w-5 text-info" />}>
                    <div className="rounded-2xl bg-surface p-5 border border-border">
                      {trip.pnr && (
                        <div className="mb-5 flex items-center justify-between">
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Localizador</span>
                          <span className="text-xl font-mono font-black text-foreground">{trip.pnr}</span>
                        </div>
                      )}
                      <div className="space-y-5">
                        {voucher?.flights.map((f: any, i: number) => (
                          <div key={i} className="relative pl-6">
                            <div className="absolute left-0 top-1.5 h-3 w-3 rounded-full border-2 border-info bg-surface" />
                            {i !== voucher.flights.length - 1 && <div className="absolute left-1.5 top-4 h-full w-px bg-border" />}
                            
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="font-bold text-foreground text-sm">{f.origin} <ArrowLeft className="inline h-3 w-3 rotate-180 text-muted-foreground mx-1" /> {f.destination}</div>
                                <div className="text-xs font-bold text-info mt-0.5">{f.airline} {f.flight_number}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-xs font-bold text-foreground">{fmtDate(f.date)}</div>
                                <div className="text-[11px] font-bold text-muted-foreground mt-0.5">{f.departure_time} - {f.arrival_time}</div>
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
                        <div key={i} className="rounded-2xl bg-surface border border-border overflow-hidden">
                          <div className="p-5">
                            <h4 className="font-bold text-foreground text-base">{h.name}</h4>
                            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="h-3 w-3" /> {h.city}</p>
                            <div className="mt-5 flex items-center justify-between text-xs font-bold text-foreground bg-background rounded-xl p-3 border border-border">
                              <div className="text-center">
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Check-in</div>
                                <div>{fmtDate(h.checkin)}</div>
                              </div>
                              <ArrowLeft className="h-4 w-4 rotate-180 text-muted-foreground" />
                              <div className="text-center">
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Check-out</div>
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
                <AppWidget title="Seus Documentos" icon={<FileText className="h-5 w-5 text-brand" />}>
                  <div className="space-y-3">
                    {contract && (
                      <a href={`/m/contract/${contract.public_token}`} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-2xl bg-surface p-4 border border-border hover:border-foreground transition-colors group">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger-bg text-danger"><FileText className="h-6 w-6" /></div>
                          <div>
                            <div className="text-sm font-bold text-foreground">Contrato de Viagem</div>
                            <div className="text-xs font-medium text-muted-foreground mt-0.5">{contract.status === "signed" ? "Assinado" : "Aguardando Assinatura"}</div>
                          </div>
                        </div>
                        <ExternalLink className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </a>
                    )}
                    {voucher?.pdf_url && (
                      <a href={voucher.pdf_url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-2xl bg-surface p-4 border border-border hover:border-foreground transition-colors group">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-info-bg text-info"><Ticket className="h-6 w-6" /></div>
                          <div>
                            <div className="text-sm font-bold text-foreground">Vouchers PDF</div>
                            <div className="text-xs font-medium text-muted-foreground mt-0.5">Pronto para embarque</div>
                          </div>
                        </div>
                        <Download className="h-5 w-5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </a>
                    )}
                  </div>
                </AppWidget>

                {voucher?.emergency_contacts && voucher.emergency_contacts.length > 0 && (
                  <AppWidget title="Assistência e Emergência" icon={<Phone className="h-5 w-5 text-danger" />}>
                    <div className="space-y-3">
                      {voucher.emergency_contacts.map((ec: any, i: number) => (
                        <a key={i} href={`tel:${ec.phone}`} className="flex items-center justify-between rounded-2xl bg-danger/10 p-4 border border-danger/20 hover:bg-danger/20 transition-colors">
                          <div>
                            <div className="text-sm font-bold text-danger">{ec.role}</div>
                            <div className="text-xs font-medium text-danger/80">{ec.name}</div>
                          </div>
                          <div className="text-sm font-black text-danger tracking-wider">{ec.phone}</div>
                        </a>
                      ))}
                    </div>
                  </AppWidget>
                )}

                <div className="pt-6 border-t border-border flex justify-center">
                  <button onClick={() => setShowCancelModal(true)} className="text-xs font-bold text-muted-foreground hover:text-danger hover:underline flex items-center gap-1 transition-colors">
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
                Reunimos automaticamente as melhores dicas, alertas de segurança e mapas do seu destino para você aproveitar sem preocupações.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <AppWidget title="Dicas de Segurança e Leis Locais" icon={<ShieldAlert className="w-5 h-5 text-warning" />}>
                  <div className="space-y-4">
                    <div className="bg-warning/10 p-4 rounded-2xl border border-warning/20">
                      <div className="text-sm font-bold text-warning mb-1">Atenção Especial</div>
                      <div className="text-xs text-muted-foreground leading-relaxed">Sempre ande com uma cópia do seu passaporte. Evite áreas não turísticas após as 22h. Cuidado com pertences em multidões.</div>
                    </div>
                    <div className="bg-surface p-4 rounded-2xl border border-border">
                      <div className="text-sm font-bold text-foreground mb-1">Leis Regionais (Simulado)</div>
                      <div className="text-xs text-muted-foreground leading-relaxed">É terminantemente proibido o consumo de bebidas alcoólicas nas ruas ou transporte público neste destino.</div>
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
                <AppWidget title="Curadoria Profissional" icon={<Lightbulb className="w-5 h-5 text-brand" />}>
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex gap-3 items-start border-b border-border/50 pb-4 last:border-0 last:pb-0">
                        <div className="w-16 h-16 rounded-xl bg-muted shrink-0 overflow-hidden">
                          <img src={`https://source.unsplash.com/200x200/?landmark,${trip.destination}\&sig=${i}`} alt="Local" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-foreground">Ponto Turístico {i}</div>
                          <div className="text-[10px] text-muted-foreground line-clamp-2 mt-1">Um dos locais mais visitados da região, ideal para fotos ao pôr do sol. Requer ingresso antecipado.</div>
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
                  <h4 className="text-sm font-bold text-warning mb-1">Viagem operada por matriz externa ({trip.operator})</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Os pagamentos desta viagem são processados diretamente pela operadora parceira. Seus boletos ou links de pagamento serão enviados via WhatsApp e E-mail nas proximidades do vencimento. Acompanhe a timeline abaixo para conferir o status.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <div className="bg-foreground rounded-3xl p-6 text-background ">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-background/50 mb-2">Valor do Pacote</h3>
                  <div className="text-3xl font-black tracking-tight mb-6">{money(trip.total_sale, trip.currency)}</div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center bg-white/10 p-3 rounded-xl">
                      <span className="text-xs font-medium">Pago</span>
                      <span className="text-sm font-bold text-success">{money(trip.total_paid ?? 0, trip.currency)}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white/10 p-3 rounded-xl border border-warning/30">
                      <span className="text-xs font-medium">Pendente</span>
                      <span className="text-sm font-black text-warning">{money(outstanding, trip.currency)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2">
                <AppWidget title="Jornada de Pagamentos" icon={<CreditCard className="w-5 h-5 text-success" />}>
                  <div className="space-y-3">
                    {installments.length === 0 ? (
                      <div className="text-sm text-muted-foreground py-4 text-center">Nenhum plano de pagamento registrado.</div>
                    ) : (
                      installments.map((inst: any) => (
                        <div key={inst.id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border border-border bg-surface p-4 gap-4">
                          <div className="flex items-center gap-4">
                            <div className={`flex h-12 w-12 items-center justify-center rounded-full ${inst.status === "paid" ? "bg-success-bg text-success" : inst.status === "late" ? "bg-danger-bg text-danger" : "bg-surface-alt text-muted-foreground"}`}>
                              {inst.status === "paid" ? <CheckCircle className="h-6 w-6" /> : inst.status === "late" ? <AlertCircle className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-foreground">Parcela {inst.number}</div>
                              <div className="text-xs font-medium text-muted-foreground mt-0.5">Vencimento: {fmtDate(inst.due_date)}</div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto w-full border-t sm:border-0 border-border/50 pt-3 sm:pt-0">
                            <div className="text-left sm:text-right">
                              <div className="text-base font-black text-foreground">{money(inst.amount, trip.currency)}</div>
                              <div className={`text-[10px] uppercase font-bold tracking-wider ${inst.status === "paid" ? "text-success" : inst.status === "late" ? "text-danger" : "text-muted-foreground"}`}>
                                {INST_STATUS[inst.status] ?? inst.status}
                              </div>
                            </div>
                            
                            {!isOperator && inst.status !== "paid" && (
                              <button onClick={() => toast.info("Funcionalidade de gateway em desenvolvimento.")} className="px-4 py-2 rounded-xl bg-foreground text-background text-xs font-bold hover:opacity-90">
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

        {/* ABA: MEMÓRIAS */}
        {activeTab === "memorias" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2"><ImageIcon className="w-5 h-5 text-brand" /> Galeria Privada</h2>
                <p className="text-sm text-muted-foreground mt-1">Guarde aqui as fotos inesquecíveis da sua viagem.</p>
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
                        if(urls.length > 0) uploadMemory.mutate(urls);
                      }} 
                   />
                </div>
              </div>
            </div>

            {memories.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-border p-12 text-center bg-surface">
                <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <div className="text-lg font-bold text-foreground mb-1">Nenhuma memória ainda</div>
                <div className="text-sm text-muted-foreground">Faça o upload da sua primeira foto.</div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {memories.map((m: any) => (
                  <div key={m.id} className="aspect-square rounded-2xl overflow-hidden bg-muted group relative">
                    <img src={m.image_url} alt="Memória" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                      <span className="text-[10px] text-white font-medium">{fmtDate(m.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Modal Cancelamento */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface rounded-3xl w-full max-w-lg border border-border overflow-hidden">
            <div className="bg-danger p-6 text-center text-danger-foreground">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-90" />
              <h3 className="text-xl font-black tracking-tight">Solicitação de Cancelamento</h3>
            </div>
            <div className="p-6 space-y-6">
              <div className="bg-danger/10 border border-danger/20 rounded-2xl p-4">
                <p className="text-xs text-danger font-medium leading-relaxed">
                  <strong>Atenção:</strong> O cancelamento da viagem está sujeito às políticas de quebra de contrato, multas de fornecedores e da operadora. Ao prosseguir, um ticket de nível de emergência será gerado para seu consultor, que entrará em contato para apresentar as condições de reembolso.
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Motivo do Cancelamento</label>
                <textarea 
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-background p-4 text-sm resize-none h-24 focus:ring-1 focus:ring-danger focus:border-danger outline-none"
                  placeholder="Por favor, explique o motivo..."
                />
              </div>

              <div className="flex gap-3">
                <button onClick={() => setShowCancelModal(false)} className="flex-1 h-12 rounded-full border border-border font-bold text-sm hover:bg-muted transition-colors">
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

function TabButton({ label, icon, active, onClick }: { label: string, icon: React.ReactNode, active: boolean, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex items-center gap-2 py-4 border-b-2 font-bold text-sm whitespace-nowrap transition-colors ${active ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
    >
      {icon} {label}
    </button>
  );
}

function AppWidget({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-surface p-6 border border-border ">
      <div className="mb-5 flex items-center gap-3">
        {icon}
        <h3 className="text-sm font-black text-foreground tracking-tight">{title}</h3>
      </div>
      {children}
    </div>
  );
}
