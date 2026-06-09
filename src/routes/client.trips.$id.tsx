import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Plane, Hotel, Bus, Ticket, FileText,
  CreditCard, Users, MapPin, Calendar, CheckCircle,
  Clock, AlertCircle, Download, ExternalLink, Phone
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fmtDate, money, StatusBadge } from "@/components/ui/form";

export const Route = createFileRoute("/client/trips/$id")({
  head: () => ({ meta: [{ title: "Minha Viagem · TravelOS" }] }),
  component: ClientTripDetail,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type Trip = {
  id: string;
  title: string;
  code: string | null;
  destination: string | null;
  travel_start: string | null;
  travel_end: string | null;
  status: string;
  total_sale: number;
  total_paid: number;
  currency: string;
  notes: string | null;
  airline: string | null;
  pnr: string | null;
  operator: string | null;
};

type Voucher = {
  id: string;
  destination: string | null;
  general_locator: string | null;
  template: string;
  pdf_url: string | null;
  flights: Array<{ airline: string; flight_number: string; origin: string; destination: string; date: string; departure_time: string; arrival_time: string; locator: string }>;
  accommodation: Array<{ name: string; city: string; checkin: string; checkout: string; room_type: string; phone: string }>;
  emergency_contacts: Array<{ name: string; phone: string; role: string }>;
};

type Contract = {
  id: string;
  status: string;
  signed_at: string | null;
  public_token: string;
  total_value: number;
  payment_terms: string | null;
};

type PaymentInstallment = {
  id: string;
  number: number;
  due_date: string;
  amount: number;
  status: string;
  paid_at: string | null;
};

// ─── Status helpers ───────────────────────────────────────────────────────────

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

// ─── Main component ───────────────────────────────────────────────────────────

function ClientTripDetail() {
  const { id } = useParams({ from: "/client/trips/$id" });

  const { data: clientIds } = useQuery({
    queryKey: ["client-ids"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [] as string[];
      const { data } = await supabase.from("clients").select("id").eq("user_id", u.user.id);
      return (data ?? []).map((c) => c.id) as string[];
    },
  });

  const tripQ = useQuery({
    enabled: !!clientIds,
    queryKey: ["client-trip", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("id, title, code, destination, travel_start, travel_end, status, total_sale, total_paid, currency, notes, airline, pnr, operator")
        .eq("id", id)
        .in("client_id", clientIds ?? [])
        .maybeSingle();
      if (error) throw error;
      return data as Trip | null;
    },
  });

  const voucherQ = useQuery({
    enabled: !!tripQ.data,
    queryKey: ["client-voucher", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("vouchers")
        .select("id, destination, general_locator, template, pdf_url, flights, accommodation, emergency_contacts")
        .eq("trip_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as Voucher | null;
    },
  });

  const contractQ = useQuery({
    enabled: !!tripQ.data,
    queryKey: ["client-contract", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("contracts")
        .select("id, status, signed_at, public_token, total_value, payment_terms")
        .eq("trip_id", id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data as Contract | null;
    },
  });

  const installmentsQ = useQuery({
    enabled: !!tripQ.data,
    queryKey: ["client-installments", id],
    queryFn: async () => {
      const { data: plans } = await supabase
        .from("payment_plans")
        .select("id")
        .eq("trip_id", id)
        .limit(1)
        .maybeSingle();
      if (!plans) return [] as PaymentInstallment[];
      const { data: insts } = await supabase
        .from("payment_installments")
        .select("id, number, due_date, amount, status, paid_at")
        .eq("payment_plan_id", plans.id)
        .order("number");
      return (insts ?? []) as PaymentInstallment[];
    },
  });

  const passengersQ = useQuery({
    enabled: !!tripQ.data,
    queryKey: ["client-passengers", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("trip_passengers")
        .select("id, full_name, document, cpf, data_complete, meal_preference, magic_link_token")
        .eq("trip_id", id);
      return data ?? [];
    },
  });

  // ─────────────────────────────────────────────────────────────────────────────

  if (tripQ.isLoading) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">Carregando viagem…</div>
    );
  }

  if (!tripQ.data) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-muted-foreground">Viagem não encontrada.</p>
        <Link to="/client/trips" className="mt-3 inline-block text-xs text-primary hover:underline">
          ← Voltar às viagens
        </Link>
      </div>
    );
  }

  const trip = tripQ.data;
  const voucher = voucherQ.data;
  const contract = contractQ.data;
  const installments = installmentsQ.data ?? [];
  const passengers = passengersQ.data ?? [];
  const outstanding = (trip.total_sale ?? 0) - (trip.total_paid ?? 0);

  const now = new Date();
  const start = trip.travel_start ? new Date(trip.travel_start) : null;
  const daysToTrip = start ? Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

  const coverImage = `https://source.unsplash.com/1600x900/?${encodeURIComponent(trip.destination || "travel,resort")}`;

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="relative h-[40vh] min-h-[300px] w-full bg-foreground">
         <img src={coverImage} alt="Destino" className="absolute inset-0 h-full w-full object-cover opacity-50 mix-blend-overlay" />
         <div className="absolute inset-0 bg-gradient-to-t from-foreground via-foreground/40 to-transparent" />
         
         <div className="absolute top-4 left-4">
            <Link to="/client/trips" className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md hover:bg-white/30 transition-all">
              <ArrowLeft className="h-5 w-5" />
            </Link>
         </div>

         <div className="absolute bottom-6 left-6 right-6">
            <div className="flex items-center gap-2 text-white/80 mb-2">
               <Plane className="h-4 w-4" />
               <span className="text-xs uppercase tracking-widest font-semibold">{trip.code ?? "VIAGEM"}</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight leading-tight">{trip.title}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm font-medium text-white/90">
               {trip.destination && (
                  <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-brand-light" /> {trip.destination}</span>
               )}
               {trip.travel_start && (
                  <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-brand-light" /> {fmtDate(trip.travel_start)} → {fmtDate(trip.travel_end)}</span>
               )}
            </div>
         </div>
      </div>

      <div className="relative z-10 mx-6 -mt-8 flex items-center justify-between rounded-2xl bg-surface/80 p-5 ring-1 ring-border/50 backdrop-blur-xl">
         <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Status da Jornada</div>
            <div className="mt-1 flex items-center gap-2">
               <StatusBadge tone={trip.status === "confirmed" ? "success" : trip.status === "in_progress" ? "info" : trip.status === "cancelled" ? "danger" : "neutral"}>
                  {TRIP_STATUS[trip.status] ?? trip.status}
               </StatusBadge>
            </div>
         </div>
         {daysToTrip !== null && daysToTrip > 0 && (
            <div className="text-right">
               <div className="text-[10px] font-bold uppercase tracking-widest text-brand">Contagem Regressiva</div>
               <div className="mt-1 text-2xl font-black text-foreground tracking-tighter">{daysToTrip} <span className="text-sm font-medium text-muted-foreground">Dias</span></div>
            </div>
         )}
      </div>

      <div className="mx-6 mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
        
        <div className="space-y-6">
          {(trip.airline || trip.pnr || voucher?.flights?.length) && (
             <AppWidget title="Localizador e Voos" icon={<Plane className="h-5 w-5 text-info" />}>
                <div className="rounded-xl bg-surface-alt p-4 border border-border">
                   {trip.pnr && (
                     <div className="mb-4 flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Código de Reserva</span>
                        <span className="text-lg font-mono font-black text-foreground rounded bg-surface px-3 py-1 ring-1 ring-border">{trip.pnr}</span>
                     </div>
                   )}
                   <div className="space-y-4">
                     {voucher?.flights.map((f, i) => (
                       <div key={i} className="relative pl-6">
                          <div className="absolute left-0 top-1.5 h-3 w-3 rounded-full border-2 border-info bg-surface" />
                          {i !== voucher.flights.length - 1 && <div className="absolute left-1.5 top-4 h-full w-px bg-border" />}
                          
                          <div className="flex items-start justify-between">
                             <div>
                                <div className="font-bold text-foreground text-sm">{f.origin} <ArrowLeft className="inline h-3 w-3 rotate-180 text-muted-foreground mx-1" /> {f.destination}</div>
                                <div className="text-xs font-medium text-muted-foreground mt-0.5">{f.airline} {f.flight_number}</div>
                             </div>
                             <div className="text-right">
                                <div className="text-xs font-bold text-foreground">{fmtDate(f.date)}</div>
                                <div className="text-[11px] font-medium text-muted-foreground mt-0.5">{f.departure_time} - {f.arrival_time}</div>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {voucher.accommodation.map((h, i) => (
                      <div key={i} className="group relative overflow-hidden rounded-2xl bg-surface border border-border transition-all">
                         <div className="h-24 bg-info-bg flex items-center justify-center border-b border-border">
                            <Hotel className="h-8 w-8 text-info" />
                         </div>
                         <div className="p-4">
                            <h4 className="font-bold text-foreground">{h.name}</h4>
                            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="h-3 w-3" /> {h.city}</p>
                            <div className="mt-4 flex items-center justify-between text-xs font-semibold text-foreground bg-surface-alt rounded-lg p-2">
                               <div className="text-center">
                                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Check-in</div>
                                  <div>{fmtDate(h.checkin)}</div>
                               </div>
                               <ArrowLeft className="h-3 w-3 rotate-180 text-muted-foreground" />
                               <div className="text-center">
                                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Check-out</div>
                                  <div>{fmtDate(h.checkout)}</div>
                               </div>
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
             </AppWidget>
          )}

          {passengers.length > 0 && (
             <AppWidget title="Equipe de Viagem" icon={<Users className="h-5 w-5 text-info" />}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                   {passengers.map((p) => (
                      <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3 ">
                         <div className="flex h-10 w-10 items-center justify-center rounded-full bg-info-bg text-info font-bold">
                            {p.full_name.charAt(0)}
                         </div>
                         <div className="flex-1 overflow-hidden">
                            <div className="truncate text-sm font-bold text-foreground">{p.full_name}</div>
                            <div className="text-[10px] uppercase font-medium text-muted-foreground mt-0.5">{p.document ?? p.cpf ?? "Sem Doc"}</div>
                         </div>
                         <div>
                            {p.data_complete ? (
                               <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success-bg text-success"><CheckCircle className="h-3 w-3" /></div>
                            ) : (
                               <a href={`${window.location.origin}/m/passenger/${p.magic_link_token}`} target="_blank" rel="noreferrer" className="flex h-8 items-center justify-center rounded-lg bg-warning-bg px-3 text-[10px] font-bold text-warning hover:bg-warning-bg/80 transition-colors">
                                  COMPLETAR
                               </a>
                            )}
                         </div>
                      </div>
                   ))}
                </div>
             </AppWidget>
          )}
        </div>

        <div className="space-y-6">
           
           <div className="rounded-3xl bg-foreground p-6 text-background relative overflow-hidden">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/5 blur-2xl" />
              <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-brand/20 blur-2xl" />
              
              <div className="relative z-10">
                 <h3 className="text-[10px] font-bold uppercase tracking-widest text-background/50 mb-1">Total da Viagem</h3>
                 <div className="text-3xl font-black tracking-tight">{money(trip.total_sale, trip.currency)}</div>
                 
                 <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between rounded-xl bg-white/10 p-3 backdrop-blur-md">
                       <span className="text-xs font-medium text-background/70">Total Pago</span>
                       <span className="text-sm font-bold text-success">{money(trip.total_paid ?? 0, trip.currency)}</span>
                    </div>
                    {outstanding > 0 && (
                       <div className="flex items-center justify-between rounded-xl bg-white/10 p-3 backdrop-blur-md border border-warning/30">
                          <span className="text-xs font-medium text-warning">A Pagar</span>
                          <span className="text-sm font-black text-warning">{money(outstanding, trip.currency)}</span>
                       </div>
                    )}
                 </div>
              </div>
           </div>

           {installments.length > 0 && (
              <AppWidget title="Suas Parcelas" icon={<CreditCard className="h-5 w-5 text-success" />}>
                 <div className="max-h-[300px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                    {installments.map((inst) => (
                       <div key={inst.id} className="flex items-center justify-between rounded-xl border border-border bg-surface p-3 transition-colors">
                          <div className="flex items-center gap-3">
                             <div className={`flex h-10 w-10 items-center justify-center rounded-full ${inst.status === "paid" ? "bg-success-bg text-success" : inst.status === "late" ? "bg-danger-bg text-danger" : "bg-surface-alt text-muted-foreground"}`}>
                                {inst.status === "paid" ? <CheckCircle className="h-5 w-5" /> : inst.status === "late" ? <AlertCircle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
                             </div>
                             <div>
                                <div className="text-xs font-bold text-foreground">Parcela {inst.number}</div>
                                <div className="text-[10px] font-medium text-muted-foreground">Vence em {fmtDate(inst.due_date)}</div>
                             </div>
                          </div>
                          <div className="text-right">
                             <div className="text-sm font-black text-foreground">{money(inst.amount, trip.currency)}</div>
                             <div className={`text-[9px] uppercase font-bold tracking-wider ${inst.status === "paid" ? "text-success" : inst.status === "late" ? "text-danger" : "text-muted-foreground"}`}>
                                {INST_STATUS[inst.status] ?? inst.status}
                             </div>
                          </div>
                       </div>
                    ))}
                 </div>
              </AppWidget>
           )}

           <AppWidget title="Seus Documentos" icon={<FileText className="h-5 w-5 text-brand" />}>
              <div className="space-y-3">
                 {contract && (
                    <a href={`/m/contract/${contract.public_token}`} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl bg-surface-alt p-3 border border-border hover:bg-muted transition-colors group">
                       <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger-bg text-danger group-hover:scale-105 transition-transform"><FileText className="h-5 w-5" /></div>
                          <div>
                             <div className="text-xs font-bold text-foreground">Contrato de Prestação</div>
                             <div className="text-[10px] font-medium text-muted-foreground">{contract.status === "signed" ? "Assinado Eletronicamente" : "Requer sua assinatura"}</div>
                          </div>
                       </div>
                       <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-brand transition-colors" />
                    </a>
                 )}

                 {voucher?.pdf_url && (
                    <a href={voucher.pdf_url} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl bg-surface-alt p-3 border border-border hover:bg-muted transition-colors group">
                       <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-info-bg text-info group-hover:scale-105 transition-transform"><Ticket className="h-5 w-5" /></div>
                          <div>
                             <div className="text-xs font-bold text-foreground">Voucher Oficial PDF</div>
                             <div className="text-[10px] font-medium text-muted-foreground">Pronto para embarque</div>
                          </div>
                       </div>
                       <Download className="h-4 w-4 text-muted-foreground group-hover:text-info transition-colors" />
                    </a>
                 )}
              </div>
           </AppWidget>
           
           {voucher?.emergency_contacts && voucher.emergency_contacts.length > 0 && (
              <a href={`tel:${voucher.emergency_contacts[0].phone}`} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-danger p-4 text-sm font-bold text-danger-foreground transition-colors">
                 <Phone className="h-5 w-5" />
                 LIGAR PARA EMERGÊNCIA
              </a>
           )}
           
        </div>
      </div>
    </div>
  );
}

function AppWidget({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-surface p-5 ring-1 ring-border">
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-black text-foreground tracking-tight">{title}</h3>
      </div>
      {children}
    </div>
  );
}
