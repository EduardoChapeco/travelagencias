import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { money, fmtDate, PrimaryButton, GhostButton } from "@/components/ui/form";
import {
  Calendar,
  Users,
  MapPin,
  Clock,
  Plane,
  Hotel,
  Car,
  Compass,
  Check,
  X,
  CreditCard,
  QrCode,
  AlertCircle,
  FileText,
  Sparkles,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";

export const Route = createFileRoute("/m/proposal/$token")({
  head: () => ({ meta: [{ title: "Proposta de Viagem · TravelOS" }] }),
  component: PublicProposalView,
});

type ProposalPublic = {
  id: string;
  number: number;
  title: string;
  destination: string | null;
  travel_start: string | null;
  travel_end: string | null;
  pax_adults: number;
  pax_children: number;
  pax_infants: number;
  pax_seniors: number;
  currency: string;
  subtotal: number;
  discount: number;
  total: number;
  status: string;
  terms: string | null;
  valid_until: string | null;
  decided_at: string | null;
  agency_id: string;
  flights: any[];
  hotels: any[];
  transfers: any[];
  tours: any[];
  itinerary: any[];
  includes: string[];
  excludes: string[];
  pix_discount_percent: number;
  installments_card: number;
  installments_boleto: number;
  template: string;
  notes: string | null;
  agency?: {
    name: string;
    logo_url: string | null;
    brand_color: string | null;
    brand_color_fg: string | null;
  };
};

function PublicProposalView() {
  const { token } = useParams({ from: "/m/proposal/$token" });
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["public-proposal", token],
    queryFn: async () => {
      const { data: p, error } = await supabase
        .from("proposals")
        .select(
          "id, number, title, destination, travel_start, travel_end, pax_adults, pax_children, pax_infants, pax_seniors, currency, subtotal, discount, total, status, terms, valid_until, decided_at, agency_id, flights, hotels, transfers, tours, itinerary, includes, excludes, pix_discount_percent, installments_card, installments_boleto, template, notes",
        )
        .eq("public_token", token)
        .maybeSingle();
      if (error) throw error;
      if (!p) return null;

      const { data: agency } = await (supabase as any)
        .rpc("get_public_agency_by_id", { _id: p.agency_id })
        .maybeSingle();

      // mark as viewed (fire-and-forget)
      if (!p.decided_at) {
        await supabase
          .from("proposals")
          .update({
            status: p.status === "draft" ? "draft" : "viewed",
            viewed_at: new Date().toISOString(),
          } as never)
          .eq("id", p.id);
      }
      return { ...p, agency: agency ?? undefined } as unknown as ProposalPublic;
    },
  });

  const decide = useMutation({
    onMutate: () => {
      toast.loading("Registrando sua decisão...", { id: "decide-proposal" });
    },
    mutationFn: async (status: "accepted" | "rejected") => {
      if (!q.data) return;
      const { error } = await supabase
        .from("proposals")
        .update({ status, decided_at: new Date().toISOString() } as never)
        .eq("id", q.data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Decisão registrada com sucesso! Obrigado.", { id: "decide-proposal" });
      qc.invalidateQueries({ queryKey: ["public-proposal", token] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro", { id: "decide-proposal" }),
  });

  if (q.isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-surface-alt/30 text-sm text-muted-foreground">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Carregando proposta premium…
      </div>
    );
  }
  if (!q.data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-alt/30 px-6 text-center">
        <div className="max-w-md rounded-2xl border border-border bg-surface p-8">
          <ShieldAlert className="mx-auto h-12 w-12 text-muted-foreground/60 mb-4" />
          <h1 className="text-xl font-bold tracking-tight">Proposta não encontrada</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            O link de acesso expirou, foi desativado ou é inválido. Por favor, solicite um novo link
            ao seu agente de viagens.
          </p>
        </div>
      </div>
    );
  }

  const p = q.data;
  const brand = p.agency?.brand_color ?? "#3b82f6";
  const brandFg = p.agency?.brand_color_fg ?? "#FFFFFF";
  const decided = !!p.decided_at;
  const totalPax =
    (p.pax_adults || 0) + (p.pax_seniors || 0) + (p.pax_children || 0) + (p.pax_infants || 0);

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0b0f19] text-foreground font-sans pb-20">
      {/* Header Sticky */}
      <header className="sticky top-0 z-40 border-b border-border bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-3.5">
          <div className="flex items-center gap-3">
            {p.agency?.logo_url ? (
              <img
                src={p.agency.logo_url}
                alt={p.agency.name}
                className="h-9 w-9 rounded-lg object-cover border border-border/40"
              />
            ) : (
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg font-bold text-sm"
                style={{ background: brand, color: brandFg }}
              >
                {p.agency?.name?.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="text-sm font-bold leading-tight">{p.agency?.name ?? "Agência"}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                Proposta #{p.number}
              </div>
            </div>
          </div>
          <span
            className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider"
            style={{ background: `${brand}15`, color: brand }}
          >
            {p.status === "draft"
              ? "Rascunho"
              : p.status === "sent"
                ? "Enviada"
                : p.status === "viewed"
                  ? "Visualizada"
                  : p.status === "accepted"
                    ? "Aceita"
                    : p.status}
          </span>
        </div>
      </header>

      {/* Hero Banner Section */}
      <section className="mx-auto max-w-4xl px-4 mt-6">
        <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-8 sm:p-12 border border-white/5">
          <div className="absolute inset-0 bg-black/50 z-10" />
          <div
            className="absolute inset-0 opacity-20 bg-cover bg-center"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80')`,
            }}
          />
          <div className="relative z-20 max-w-xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm mb-4">
              <Sparkles className="h-3 w-3 text-yellow-400" /> Proposta Exclusiva
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {p.title || "Sua próxima experiência de viagem"}
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-300 font-medium leading-relaxed">
              Descubra os detalhes cuidadosamente planejados para a sua jornada.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <main className="mx-auto max-w-4xl px-4 mt-6 grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8 space-y-6">
          {/* Quick Details Card */}
          <div className="rounded-2xl border border-border bg-surface p-5 grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <MapPin className="mx-auto h-4 w-4 text-muted-foreground" />
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                Destino
              </div>
              <div className="text-xs font-bold truncate">{p.destination ?? "—"}</div>
            </div>
            <div className="space-y-1 border-x border-border/80">
              <Calendar className="mx-auto h-4 w-4 text-muted-foreground" />
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                Período
              </div>
              <div className="text-xs font-bold truncate">
                {p.travel_start
                  ? `${new Date(p.travel_start).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}`
                  : "—"}
              </div>
            </div>
            <div className="space-y-1">
              <Users className="mx-auto h-4 w-4 text-muted-foreground" />
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                Passageiros
              </div>
              <div className="text-xs font-bold">{totalPax} pax</div>
            </div>
          </div>

          {/* Flights Section */}
          {p.flights && p.flights.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
                <Plane className="h-4 w-4 text-brand" /> Voos e Conexões
              </h2>
              <div className="space-y-3">
                {p.flights.map((f: any, idx: number) => (
                  <div
                    key={idx}
                    className="relative overflow-hidden rounded-2xl border border-border bg-surface p-5 transition-all hover:border-brand/40 group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900 border border-border/40 text-brand">
                          <Plane className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="font-bold text-sm">
                            {f.origin} &rarr; {f.destination}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {f.airline} &middot; {f.flight_number}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 sm:gap-6 text-xs flex-1 sm:flex-none">
                        <div>
                          <span className="text-muted-foreground block uppercase tracking-wider text-[8px] font-bold">
                            Data
                          </span>
                          <span className="font-semibold">{fmtDate(f.date)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block uppercase tracking-wider text-[8px] font-bold">
                            Horário
                          </span>
                          <span className="font-semibold">
                            {f.departure_time} - {f.arrival_time}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block uppercase tracking-wider text-[8px] font-bold">
                            Bagagem
                          </span>
                          <span className="font-semibold">{f.baggage_rules || "Não inclusa"}</span>
                        </div>
                      </div>
                    </div>
                    {f.stops > 0 && (
                      <span className="absolute top-3 right-3 rounded bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-bold text-amber-600 uppercase tracking-wide">
                        {f.stops} parada{f.stops > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hotels Section */}
          {p.hotels && p.hotels.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
                <Hotel className="h-4 w-4 text-brand" /> Hospedagem Selecionada
              </h2>
              <div className="space-y-4">
                {p.hotels.map((h: any, idx: number) => (
                  <div
                    key={idx}
                    className="overflow-hidden rounded-2xl border border-border bg-surface transition-all hover:border-brand/40 group"
                  >
                    {h.images && h.images[0] && (
                      <div className="h-48 w-full overflow-hidden relative">
                        <img
                          src={h.images[0]}
                          alt={h.name}
                          className="h-full w-full object-cover group-hover:scale-102 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-black/40" />
                      </div>
                    )}
                    <div className="p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <Hotel className="h-4.5 w-4.5 text-brand" />
                            <h3 className="font-bold text-base">{h.name}</h3>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" /> {h.city}
                          </div>
                        </div>
                        <div className="text-left sm:text-right text-xs">
                          <span className="rounded-full bg-brand/10 px-3 py-0.5 text-[9px] font-bold text-brand uppercase tracking-wider">
                            {h.meal_plan || "Somente hospedagem"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                        <div>
                          <span className="text-muted-foreground block uppercase tracking-wider text-[8px] font-bold">
                            Período
                          </span>
                          <span className="font-semibold">
                            {fmtDate(h.checkin)} &rarr; {fmtDate(h.checkout)}
                          </span>
                        </div>
                        {h.rooms && h.rooms.length > 0 && (
                          <div>
                            <span className="text-muted-foreground block uppercase tracking-wider text-[8px] font-bold">
                              Acomodação
                            </span>
                            <span className="font-semibold">
                              {h.rooms.map((r: any, rIdx: number) => (
                                <span key={rIdx}>
                                  {r.qty}x {r.type}
                                  {rIdx < h.rooms.length - 1 ? ", " : ""}
                                </span>
                              ))}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Transfers Section */}
          {p.transfers && p.transfers.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
                <Car className="h-4 w-4 text-brand" /> Traslados e Conexões
              </h2>
              <div className="space-y-3">
                {p.transfers.map((t: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-4 transition-all hover:border-brand/40"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900 border border-border/40 text-brand">
                      <Car className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0 text-xs">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-bold text-sm text-foreground">{t.description}</span>
                        <span className="text-muted-foreground whitespace-nowrap font-mono">
                          {fmtDate(t.date)}
                        </span>
                      </div>
                      <div className="mt-1 text-muted-foreground">
                        Veículo: <strong className="text-foreground">{t.vehicle}</strong> &middot;
                        Tipo:{" "}
                        <strong className="text-foreground">
                          {t.type === "private" ? "Privativo" : "Compartilhado"}
                        </strong>
                      </div>
                      {t.notes && (
                        <p className="mt-1.5 text-muted-foreground italic bg-surface-alt/40 p-2 rounded">
                          {t.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tours Section */}
          {p.tours && p.tours.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
                <Compass className="h-4 w-4 text-brand" /> Passeios e Experiências
              </h2>
              <div className="space-y-3">
                {p.tours.map((t: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-4 transition-all hover:border-brand/40"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-900 border border-border/40 text-brand">
                      <Compass className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0 text-xs">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-bold text-sm text-foreground">{t.description}</span>
                        <span className="text-muted-foreground whitespace-nowrap font-mono">
                          {fmtDate(t.date)}
                        </span>
                      </div>
                      {t.notes && (
                        <p className="mt-1 text-muted-foreground italic bg-surface-alt/40 p-2 rounded">
                          {t.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Itinerary Section */}
          {p.itinerary && p.itinerary.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
                <Calendar className="h-4 w-4 text-brand" /> Roteiro de Atividades
              </h2>
              <div className="relative border-l border-border/80 ml-4 pl-6 space-y-6">
                {p.itinerary.map((d: any, idx: number) => (
                  <div key={idx} className="relative">
                    {/* Circle Node */}
                    <div className="absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-surface border-2 border-brand" />
                    <div>
                      <span className="rounded bg-brand/10 px-2 py-0.5 text-[9px] font-bold text-brand uppercase tracking-wider">
                        {d.day || `Dia ${idx + 1}`}
                      </span>
                      <h3 className="font-bold text-sm mt-1">{d.title}</h3>
                      <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {d.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Columns: Financial & Decisions */}
        <div className="md:col-span-4 space-y-6">
          {/* Finance Premium Invoice */}
          <div className="rounded-2xl border border-border bg-surface p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1" style={{ background: brand }} />
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-4">
              Resumo Financeiro
            </h3>

            <div className="space-y-2 text-xs border-b border-border/60 pb-4">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Valor Base (Subtotal)</span>
                <span className="font-mono">{money(Number(p.subtotal), p.currency)}</span>
              </div>
              {Number(p.discount) > 0 && (
                <div className="flex items-center justify-between text-emerald-600 font-medium">
                  <span>Desconto Aplicado</span>
                  <span className="font-mono">- {money(Number(p.discount), p.currency)}</span>
                </div>
              )}
            </div>

            <div className="pt-4 space-y-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold block">
                    Total à Vista
                  </span>
                  <span className="text-[9px] text-emerald-600 font-bold uppercase">
                    Pix com {p.pix_discount_percent}% desc
                  </span>
                </div>
                <span className="font-mono text-xl font-extrabold text-foreground">
                  {money(Number(p.total), p.currency)}
                </span>
              </div>

              {/* Card Options */}
              {p.installments_card > 1 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1.5 border-t border-border/30">
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" /> Cartão de Crédito
                  </span>
                  <span>até {p.installments_card}x</span>
                </div>
              )}

              {/* Boleto Options */}
              {p.installments_boleto > 1 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> Boleto Bancário
                  </span>
                  <span>até {p.installments_boleto}x</span>
                </div>
              )}

              {p.valid_until && (
                <div className="rounded-lg bg-slate-50 dark:bg-slate-900 border border-border/40 p-2.5 text-[10px] text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-brand" />
                  <span>
                    Condições válidas até <strong>{fmtDate(p.valid_until)}</strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Inclusions & Exclusions Card */}
          {(p.includes?.length > 0 || p.excludes?.length > 0) && (
            <div className="rounded-2xl border border-border bg-surface p-5 space-y-4">
              {p.includes?.length > 0 && (
                <div>
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-2 flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5" /> O que está Incluso
                  </h4>
                  <ul className="space-y-1.5 text-xs text-muted-foreground pl-1">
                    {p.includes.map((inc: string, idx: number) => (
                      <li key={idx} className="flex gap-2 items-start leading-tight">
                        <span className="text-emerald-600 select-none">•</span>
                        <span>{inc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {p.excludes?.length > 0 && (
                <div className="pt-2 border-t border-border/40">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-rose-600 mb-2 flex items-center gap-1.5">
                    <X className="h-3.5 w-3.5" /> O que não está Incluso
                  </h4>
                  <ul className="space-y-1.5 text-xs text-muted-foreground pl-1">
                    {p.excludes.map((exc: string, idx: number) => (
                      <li key={idx} className="flex gap-2 items-start leading-tight">
                        <span className="text-rose-600 select-none">•</span>
                        <span>{exc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Terms Box */}
          {p.terms && (
            <div className="rounded-2xl border border-border bg-surface p-5 space-y-2">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Condições Gerais
              </h4>
              <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto no-scrollbar">
                {p.terms}
              </p>
            </div>
          )}

          {/* Decision Panel */}
          <div className="rounded-2xl border border-border bg-surface p-5">
            {decided ? (
              <div className="text-center text-xs space-y-2">
                {p.status === "accepted" && (
                  <div className="space-y-2">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <Check className="h-5 w-5" />
                    </div>
                    <div className="font-bold text-emerald-600 text-sm">Proposta Aceita!</div>
                    <p className="text-muted-foreground leading-normal">
                      Aprovada em {fmtDate(p.decided_at)}. Nosso agente de viagens entrará em
                      contato para os trâmites do contrato de viagem.
                    </p>
                  </div>
                )}
                {p.status === "rejected" && (
                  <div className="space-y-2">
                    <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                      <X className="h-5 w-5" />
                    </div>
                    <div className="font-bold text-rose-600 text-sm">Proposta Recusada</div>
                    <p className="text-muted-foreground leading-normal">
                      Recusada em {fmtDate(p.decided_at)}. Entraremos em contato para ajustar as
                      condições de acordo com suas preferências.
                    </p>
                  </div>
                )}
                {!["accepted", "rejected"].includes(p.status) && (
                  <div>Sua decisão foi registrada.</div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground text-center">
                  Decidir Proposta
                </h3>
                <DecideActions
                  onDecide={(s) => decide.mutate(s)}
                  pending={decide.isPending}
                  brand={brand}
                  brandFg={brandFg}
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function DecideActions({
  onDecide,
  pending,
  brand,
  brandFg,
}: {
  onDecide: (s: "accepted" | "rejected") => void;
  pending: boolean;
  brand: string;
  brandFg: string;
}) {
  const [confirm, setConfirm] = useState<null | "accepted" | "rejected">(null);
  if (confirm) {
    return (
      <div className="text-center space-y-3 p-2">
        <p className="text-xs font-semibold text-foreground leading-normal">
          {confirm === "accepted"
            ? "Confirmar aceite desta proposta de viagem?"
            : "Confirmar recusa desta proposta de viagem?"}
        </p>
        <div className="flex items-center justify-center gap-2">
          <GhostButton type="button" onClick={() => setConfirm(null)} className="h-8 text-[11px]">
            Voltar
          </GhostButton>
          <PrimaryButton
            type="button"
            onClick={() => onDecide(confirm)}
            disabled={pending}
            className="h-8 text-[11px] font-bold"
            style={{ background: brand, color: brandFg }}
          >
            {pending ? "Enviando…" : "Confirmar"}
          </PrimaryButton>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => setConfirm("accepted")}
        className="h-10 w-full rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer"
        style={{ background: brand, color: brandFg }}
      >
        Aceitar proposta
      </button>
      <button
        onClick={() => setConfirm("rejected")}
        className="h-10 w-full rounded-xl border border-border bg-surface text-xs font-medium text-muted-foreground hover:text-foreground transition-all hover:bg-slate-50 cursor-pointer"
      >
        Recusar proposta
      </button>
    </div>
  );
}
