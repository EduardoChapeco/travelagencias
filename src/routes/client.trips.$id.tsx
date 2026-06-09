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

  // Get authenticated user's client records
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
      const { data } = await supabase
        .from("payment_installments")
        .select("id, number, due_date, amount, status, paid_at")
        .eq("agency_id", tripQ.data!.id) // via payment_plans join — query via trip
        .order("number");
      // Note: proper query via payment_plans
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
  const paidCount = installments.filter((i) => i.status === "paid").length;

  return (
    <>
      <Link to="/client/trips" className="mb-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar às viagens
      </Link>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Plane className="h-3.5 w-3.5" />
              {trip.code ?? "—"}
            </div>
            <h1 className="mt-1 text-xl font-semibold tracking-tight">{trip.title}</h1>
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              {trip.destination && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {trip.destination}
                </span>
              )}
              {trip.travel_start && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {fmtDate(trip.travel_start)} → {fmtDate(trip.travel_end)}
                </span>
              )}
            </div>
          </div>
          <StatusBadge tone={trip.status === "confirmed" ? "success" : trip.status === "in_progress" ? "info" : trip.status === "cancelled" ? "danger" : "neutral"}>
            {TRIP_STATUS[trip.status] ?? trip.status}
          </StatusBadge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
        {/* ── Left column ────────────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Flight & Locator */}
          {(trip.airline || trip.pnr || voucher?.flights.length) && (
            <Card title="Informações de voo" icon={<Plane className="h-4 w-4" />}>
              {trip.pnr && (
                <InfoRow label="Localizador">
                  <span className="font-mono font-semibold tracking-wider">{trip.pnr}</span>
                </InfoRow>
              )}
              {trip.airline && <InfoRow label="Companhia">{trip.airline}</InfoRow>}
              {trip.operator && <InfoRow label="Operadora">{trip.operator}</InfoRow>}

              {voucher?.flights.map((f, i) => (
                <div key={i} className="mt-3 rounded-md border border-border p-3 text-xs">
                  <div className="flex items-center justify-between font-semibold">
                    <span>{f.origin} → {f.destination}</span>
                    <span className="text-muted-foreground">{fmtDate(f.date)}</span>
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    {f.airline} {f.flight_number}
                    {f.departure_time && <> · {f.departure_time} – {f.arrival_time}</>}
                    {f.locator && <> · LOC: <span className="font-mono">{f.locator}</span></>}
                  </div>
                </div>
              ))}
            </Card>
          )}

          {/* Hotels */}
          {voucher?.accommodation && voucher.accommodation.length > 0 && (
            <Card title="Hospedagem" icon={<Hotel className="h-4 w-4" />}>
              {voucher.accommodation.map((h, i) => (
                <div key={i} className="mb-3 rounded-md border border-border p-3 text-xs">
                  <div className="font-semibold">{h.name}</div>
                  <div className="text-muted-foreground">{h.city}</div>
                  <div className="mt-1 text-muted-foreground">
                    Check-in: {fmtDate(h.checkin)} · Check-out: {fmtDate(h.checkout)}
                  </div>
                  {h.room_type && <div className="text-muted-foreground">Quarto: {h.room_type}</div>}
                  {h.phone && (
                    <div className="mt-1 flex items-center gap-1 text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {h.phone}
                    </div>
                  )}
                </div>
              ))}
            </Card>
          )}

          {/* Passengers */}
          {passengers.length > 0 && (
            <Card title={`Passageiros (${passengers.length})`} icon={<Users className="h-4 w-4" />}>
              <div className="space-y-2">
                {passengers.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded-md border border-border p-2.5 text-xs">
                    <div>
                      <div className="font-medium">{p.full_name}</div>
                      {(p.document || p.cpf) && (
                        <div className="text-muted-foreground">{p.document ?? p.cpf}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {p.data_complete ? (
                        <StatusBadge tone="success">Dados OK</StatusBadge>
                      ) : (
                        <a
                          href={`${window.location.origin}/m/passenger/${p.magic_link_token}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 text-[11px] font-medium text-warning hover:underline"
                        >
                          <AlertCircle className="h-3 w-3" />
                          Preencher dados
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Emergency contacts */}
          {voucher?.emergency_contacts && voucher.emergency_contacts.length > 0 && (
            <Card title="Contatos de emergência" icon={<Phone className="h-4 w-4" />}>
              <div className="space-y-2">
                {voucher.emergency_contacts.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <div>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-muted-foreground">{c.role}</div>
                    </div>
                    <a
                      href={`tel:${c.phone}`}
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <Phone className="h-3.5 w-3.5" />
                      {c.phone}
                    </a>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Notes */}
          {trip.notes && (
            <Card title="Observações" icon={<FileText className="h-4 w-4" />}>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap">{trip.notes}</p>
            </Card>
          )}
        </div>

        {/* ── Right column ────────────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Financial summary */}
          <div className="rounded-lg border border-border bg-surface p-4">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Financeiro
            </h3>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor total</span>
                <span className="font-mono font-semibold">{money(trip.total_sale, trip.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pago</span>
                <span className="font-mono text-success">{money(trip.total_paid ?? 0, trip.currency)}</span>
              </div>
              {outstanding > 0 && (
                <div className="flex justify-between border-t border-border pt-1.5 font-semibold">
                  <span>A pagar</span>
                  <span className="font-mono text-warning">{money(outstanding, trip.currency)}</span>
                </div>
              )}
            </div>

            {/* Installments */}
            {installments.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Parcelas</span>
                  <span>{paidCount}/{installments.length} pagas</span>
                </div>
                <div className="space-y-1.5">
                  {installments.map((inst) => (
                    <div key={inst.id} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        {inst.status === "paid" ? (
                          <CheckCircle className="h-3.5 w-3.5 text-success" />
                        ) : inst.status === "late" ? (
                          <AlertCircle className="h-3.5 w-3.5 text-danger" />
                        ) : (
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        <span className="text-muted-foreground">
                          Parcela {inst.number} · {fmtDate(inst.due_date)}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-mono">{money(inst.amount, trip.currency)}</div>
                        <div className={`text-[10px] ${inst.status === "paid" ? "text-success" : inst.status === "late" ? "text-danger" : "text-muted-foreground"}`}>
                          {INST_STATUS[inst.status] ?? inst.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Contract */}
          {contract && (
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Contrato
              </h3>
              <div className="flex items-center justify-between text-xs">
                <StatusBadge tone={contract.status === "signed" ? "success" : "warning"}>
                  {contract.status === "signed" ? "Assinado" : "Aguardando assinatura"}
                </StatusBadge>
                {contract.signed_at && (
                  <span className="text-muted-foreground">{fmtDate(contract.signed_at)}</span>
                )}
              </div>
              {contract.payment_terms && (
                <p className="mt-2 text-xs text-muted-foreground">{contract.payment_terms}</p>
              )}
              <a
                href={`/m/contract/${contract.public_token}`}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {contract.status === "signed" ? "Ver contrato assinado" : "Assinar contrato"}
              </a>
            </div>
          )}

          {/* Voucher */}
          {voucher && (
            <div className="rounded-lg border border-border bg-surface p-4">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Voucher
              </h3>
              <div className="flex items-center gap-2 text-xs">
                <Ticket className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{voucher.destination ?? "—"}</span>
                {voucher.general_locator && (
                  <span className="font-mono text-muted-foreground">{voucher.general_locator}</span>
                )}
              </div>
              {voucher.pdf_url && (
                <a
                  href={voucher.pdf_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <Download className="h-3.5 w-3.5" />
                  Baixar voucher PDF
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-muted-foreground">{icon}</span>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span>{children}</span>
    </div>
  );
}
