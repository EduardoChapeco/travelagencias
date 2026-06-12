import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, Link2, Calendar, Users, MapPin, Clock, Plane, Hotel, Car, Compass, Check, X, CreditCard, FileText, Sparkles, Send, PlaneTakeoff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import { useAgency } from "@/lib/agency-context";
import { money, fmtDate } from "@/components/ui/form";
import {
  fetchProposal,
  updateProposal,
  type Proposal,
} from "@/services/proposals";

import {
  Accordion,
  NumField,
  TextField,
  TagsEditor,
  L,
  SMALL_INPUT,
} from "@/components/proposals/ProposalFormFields";
import { FlightSection } from "@/components/proposals/FlightSection";
import { HotelSection } from "@/components/proposals/HotelSection";
import { TransferSection } from "@/components/proposals/TransferSection";
import { TourSection } from "@/components/proposals/TourSection";
import { ItinerarySection } from "@/components/proposals/ItinerarySection";
import { OcrButton } from "@/components/proposals/OcrButton";
import { ExportPdfButton } from "@/components/proposals/ExportPdfButton";

export const Route = createFileRoute("/agency/$slug/proposals/$id")({
  head: () => ({ meta: [{ title: "Editor de Proposta · TravelOS" }] }),
  component: ProposalEditor,
});

function ProposalEditor() {
  const { slug, id } = useParams({ from: "/agency/$slug/proposals/$id" });
  const { agency } = useAgency();
  const qc = useQueryClient();

  const propQ = useQuery({
    queryKey: ["proposal", id],
    queryFn: () => fetchProposal(id),
  });

  const [draft, setDraft] = useState<Proposal | null>(null);

  useEffect(() => {
    if (propQ.data) {
      setDraft({
        ...propQ.data,
        flights: propQ.data.flights ?? [],
        hotels: propQ.data.hotels ?? [],
        transfers: propQ.data.transfers ?? [],
        tours: propQ.data.tours ?? [],
        itinerary: propQ.data.itinerary ?? [],
        includes: propQ.data.includes ?? [],
        excludes: propQ.data.excludes ?? [],
      });
    }
  }, [propQ.data]);

  const persist = useMutation({
    mutationFn: (patch: Partial<Proposal>) => updateProposal(id, patch),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposal", id] }),
  });

  const save = useCallback(
    (patch: Partial<Proposal>) => {
      if (!draft) return;
      setDraft({ ...draft, ...patch });
      persist.mutate(patch);
    },
    [draft, persist],
  );

  const navigate = useNavigate();

  const sendProposal = useMutation({
    mutationFn: async () => {
      if (!draft) return;
      await updateProposal(id, { status: "sent" });
    },
    onSuccess: () => {
      toast.success("Cotação marcada como enviada!");
      qc.invalidateQueries({ queryKey: ["proposal", id] });
      if (draft) setDraft({ ...draft, status: "sent" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao enviar"),
  });

  const convertToTrip = useMutation({
    mutationFn: async () => {
      if (!draft || !agency) return null;
      const { data: u } = await supabase.auth.getUser();
      const { data: tripData, error } = await supabase
        .from("trips")
        .insert({
          agency_id: agency.id,
          proposal_id: draft.id,
          client_id: (draft as any).client_id ?? null,
          title: draft.title,
          destination: draft.destination,
          travel_start: draft.travel_start,
          travel_end: draft.travel_end,
          currency: draft.currency,
          total_sale: draft.total,
          status: "planning",
          owner_id: u.user?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      // mark the proposal as converted
      await updateProposal(id, { status: "converted" });
      return tripData;
    },
    onSuccess: (data) => {
      if (!data) return;
      toast.success("Viagem criada a partir da cotação!");
      qc.invalidateQueries({ queryKey: ["trips", agency?.id] });
      navigate({ to: "/agency/$slug/trips/$id", params: { slug, id: data.id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao converter"),
  });

  if (propQ.isLoading || !draft)
    return <div className="p-6 text-sm text-muted-foreground">Carregando proposta…</div>;
  if (!propQ.data) return <div className="p-6">Proposta não encontrada</div>;

  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/m/proposal/${draft.public_token}`
      : "";

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Toolbar */}
      <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
        <div className="flex items-center gap-3">
          <Link
            to="/agency/$slug/proposals"
            params={{ slug }}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <div className="text-xs text-muted-foreground">Cotação #{draft.number}</div>
            <input
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              onBlur={(e) => save({ title: e.target.value })}
              className="bg-transparent text-base font-semibold outline-none"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              navigator.clipboard.writeText(publicUrl);
              toast.success("Link público copiado");
            }}
            className="flex h-9 items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium hover:bg-surface-alt"
          >
            <Link2 className="h-3.5 w-3.5" /> Copiar link
          </button>
          {draft.status === "draft" && (
            <button
              onClick={() => sendProposal.mutate()}
              disabled={sendProposal.isPending}
              className="flex h-9 items-center gap-1.5 rounded-md bg-brand/10 border border-brand/30 px-3 text-xs font-semibold text-brand hover:bg-brand/20 disabled:opacity-60"
            >
              <Send className="h-3.5 w-3.5" />
              {sendProposal.isPending ? "Enviando…" : "Enviar cotação"}
            </button>
          )}
          {(draft.status === "accepted") && (
            <button
              onClick={() => convertToTrip.mutate()}
              disabled={convertToTrip.isPending}
              className="flex h-9 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60 shadow-sm"
            >
              <PlaneTakeoff className="h-3.5 w-3.5" />
              {convertToTrip.isPending ? "Convertendo…" : "Converter em Viagem"}
            </button>
          )}
          <ExportPdfButton proposal={draft} />
          <OcrButton
            onExtracted={(data) => {
              const merged: Partial<Proposal> = {
                flights: [...(draft.flights ?? []), ...(data.flights ?? [])],
                hotels: [...(draft.hotels ?? []), ...(data.hotels ?? [])],
                transfers: [...(draft.transfers ?? []), ...(data.transfers ?? [])],
                tours: [...(draft.tours ?? []), ...(data.tours ?? [])],
              };
              save(merged);
              toast.success("Dados extraídos e mesclados");
            }}
          />
        </div>
      </header>

      <div className="flex min-h-0 flex-1 bg-surface-alt/30">
        {/* Left CMS */}
        <aside className="w-[420px] shrink-0 overflow-y-auto border-r border-border/50 p-5 no-scrollbar">
          <Accordion title="Cliente & Passageiros" defaultOpen>
            <div className="grid grid-cols-2 gap-2">
              <NumField
                label="Adultos"
                value={draft.pax_adults}
                onSave={(v) => save({ pax_adults: v })}
              />
              <NumField
                label="Seniores"
                value={draft.pax_seniors}
                onSave={(v) => save({ pax_seniors: v })}
              />
              <NumField
                label="Crianças"
                value={draft.pax_children}
                onSave={(v) => save({ pax_children: v })}
              />
              <NumField
                label="Infantes"
                value={draft.pax_infants}
                onSave={(v) => save({ pax_infants: v })}
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <TextField
                label="Destino"
                value={draft.destination ?? ""}
                onSave={(v) => save({ destination: v })}
              />
              <TextField
                label="Válido até"
                type="date"
                value={draft.valid_until ?? ""}
                onSave={(v) => save({ valid_until: v || null })}
              />
              <TextField
                label="Início"
                type="date"
                value={draft.travel_start ?? ""}
                onSave={(v) => save({ travel_start: v || null })}
              />
              <TextField
                label="Fim"
                type="date"
                value={draft.travel_end ?? ""}
                onSave={(v) => save({ travel_end: v || null })}
              />
            </div>
          </Accordion>

          <FlightSection draft={draft} save={save} />
          <HotelSection draft={draft} save={save} />
          <TransferSection draft={draft} save={save} />
          <TourSection draft={draft} save={save} />
          <ItinerarySection draft={draft} save={save} />

          <Accordion title="O que inclui">
            <TagsEditor
              tags={draft.includes}
              onChange={(t) => save({ includes: t })}
              placeholder="Hotel, voo, café..."
            />
          </Accordion>

          <Accordion title="O que não inclui">
            <TagsEditor
              tags={draft.excludes}
              onChange={(t) => save({ excludes: t })}
              placeholder="Bebidas, gorjetas..."
            />
          </Accordion>

          <Accordion title="Financeiro" defaultOpen>
            <div className="space-y-4">
              <div className="rounded-xl border border-border/50 bg-surface p-4 ">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-mono text-sm">{money(draft.subtotal, draft.currency)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Desconto Pix</span>
                  <span className="font-mono text-sm text-success">
                    −{money(draft.discount, draft.currency)}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3 text-sm font-bold">
                  <span>Total final</span>
                  <span className="font-mono text-lg">{money(draft.total, draft.currency)}</span>
                </div>
              </div>
              <div className="rounded-xl border border-border/50 bg-surface-alt/20 p-4">
                <label className="text-xs text-muted-foreground">
                  Desconto Pix: <strong>{draft.pix_discount_percent}%</strong>
                </label>
                <input
                  type="range"
                  min={0}
                  max={20}
                  step={0.5}
                  value={draft.pix_discount_percent}
                  onChange={(e) => save({ pix_discount_percent: parseFloat(e.target.value) })}
                  className="w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <L label="Cartão (até x)">
                  <select
                    className={SMALL_INPUT}
                    value={draft.installments_card}
                    onChange={(e) => save({ installments_card: parseInt(e.target.value) })}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n}x
                      </option>
                    ))}
                  </select>
                </L>
                <L label="Boleto (até x)">
                  <select
                    className={SMALL_INPUT}
                    value={draft.installments_boleto}
                    onChange={(e) => save({ installments_boleto: parseInt(e.target.value) })}
                  >
                    {Array.from({ length: 6 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n}x
                      </option>
                    ))}
                  </select>
                </L>
              </div>
            </div>
          </Accordion>
        </aside>

        {/* Right canvas */}
        <main className="flex-1 overflow-auto bg-surface-alt p-8">
          <ScalableCanvas>
            <ProposalTemplate proposal={draft} />
          </ScalableCanvas>
        </main>
      </div>
    </div>
  );
}

function ScalableCanvas({ children }: { children: React.ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    if (!wrap.current) return;
    const obs = new ResizeObserver(() => {
      if (!wrap.current) return;
      const available = wrap.current.clientWidth - 32;
      const A4_PX = 794; // 210mm @ 96dpi
      setScale(Math.min(1, available / A4_PX));
    });
    obs.observe(wrap.current);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={wrap} className="flex justify-center">
      <div style={{ transform: `scale(${scale})`, transformOrigin: "top center", width: 794 }}>
        {children}
      </div>
    </div>
  );
}

// ===== Editorial template (A4 portrait) =====
function ProposalTemplate({ proposal: p }: { proposal: Proposal }) {
  const { agency } = useAgency();
  const brand = agency?.brand_color ?? "#3b82f6";
  const brandFg = agency?.brand_color_fg ?? "#FFFFFF";
  const totalPax = (p.pax_adults || 0) + (p.pax_seniors || 0) + (p.pax_children || 0) + (p.pax_infants || 0);

  return (
    <div
      id="proposal-canvas"
      className="bg-surface text-foreground shadow-lg border border-border"
      style={{
        width: 794,
        minHeight: 1123,
        padding: 40,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      {/* Header Inside Canvas */}
      <div className="flex items-center justify-between border-b border-border/80 pb-4 mb-6">
        <div className="flex items-center gap-3">
          {agency?.logo_url ? (
            <img
              src={agency.logo_url}
              alt={agency.name}
              className="h-9 w-9 rounded-lg object-cover border border-border/40"
            />
          ) : (
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg font-bold text-sm"
              style={{ background: brand, color: brandFg }}
            >
              {agency?.name?.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="text-left">
            <div className="text-sm font-bold leading-tight">{agency?.name ?? "Agência"}</div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Proposta #{p.number}</div>
          </div>
        </div>
        <span
          className="rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider font-sans"
          style={{ background: `${brand}15`, color: brand }}
        >
          {p.status === "draft" ? "Rascunho" : p.status === "sent" ? "Enviada" : p.status === "viewed" ? "Visualizada" : p.status === "accepted" ? "Aceita" : p.status}
        </span>
      </div>

      {/* Hero Banner Section */}
      <section className="mb-6">
        <div className="relative overflow-hidden rounded-2xl bg-slate-900 text-white p-8 shadow-md border border-white/5">
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-transparent z-10" />
          <div
            className="absolute inset-0 opacity-20 bg-cover bg-center"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1200&q=80')`,
            }}
          />
          <div className="relative z-20 text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white backdrop-blur-sm mb-4">
              <Sparkles className="h-3 w-3 text-yellow-400" /> Proposta Exclusiva
            </span>
            <h1 className="text-2xl font-extrabold tracking-tight text-white leading-tight">
              {p.title || "Sua próxima experiência de viagem"}
            </h1>
            <p className="mt-2 text-xs text-slate-300 font-medium leading-relaxed">
              Descubra os detalhes cuidadosamente planejados para a sua jornada.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-12 gap-6 text-left">
        <div className="col-span-8 space-y-6">
          {/* Quick Details Card */}
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm grid grid-cols-3 gap-4 text-center">
            <div className="space-y-1">
              <MapPin className="mx-auto h-4 w-4 text-muted-foreground" />
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Destino</div>
              <div className="text-xs font-bold truncate">{p.destination ?? "—"}</div>
            </div>
            <div className="space-y-1 border-x border-border/80">
              <Calendar className="mx-auto h-4 w-4 text-muted-foreground" />
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Período</div>
              <div className="text-xs font-bold truncate">
                {p.travel_start ? `${new Date(p.travel_start).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}` : "—"}
              </div>
            </div>
            <div className="space-y-1">
              <Users className="mx-auto h-4 w-4 text-muted-foreground" />
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Passageiros</div>
              <div className="text-xs font-bold">{totalPax} pax</div>
            </div>
          </div>

          {/* Flights Section */}
          {p.flights && p.flights.length > 0 && (
            <div className="space-y-3 text-left">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
                <Plane className="h-4 w-4" style={{ color: brand }} /> Voos e Conexões
              </h2>
              <div className="space-y-3">
                {p.flights.map((f: any, idx: number) => (
                  <div key={idx} className="relative overflow-hidden rounded-xl border border-border bg-surface p-4 transition-all hover:border-brand/40 group">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-900 border border-border/40" style={{ color: brand }}>
                          <Plane className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <div className="font-bold text-xs">
                            {f.origin} &rarr; {f.destination}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {f.airline} &middot; {f.flight_number}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-[10px] text-right">
                        <div>
                          <span className="text-muted-foreground block uppercase tracking-wider text-[8px] font-bold">Data</span>
                          <span className="font-semibold">{fmtDate(f.date)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block uppercase tracking-wider text-[8px] font-bold">Horário</span>
                          <span className="font-semibold">{f.departure_time} - {f.arrival_time}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block uppercase tracking-wider text-[8px] font-bold">Bagagem</span>
                          <span className="font-semibold">{f.baggage_rules || "Não inclusa"}</span>
                        </div>
                      </div>
                    </div>
                    {f.stops > 0 && (
                      <span className="absolute top-2 right-2 rounded bg-amber-500/10 px-1 py-0.5 text-[8px] font-bold text-amber-600 uppercase tracking-wide">
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
            <div className="space-y-3 text-left">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
                <Hotel className="h-4 w-4" style={{ color: brand }} /> Hospedagem Selecionada
              </h2>
              <div className="space-y-4">
                {p.hotels.map((h: any, idx: number) => (
                  <div key={idx} className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm group">
                    {h.images && h.images[0] && (
                      <div className="h-32 w-full overflow-hidden relative">
                        <img src={h.images[0]} alt={h.name} className="h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <Hotel className="h-4 w-4" style={{ color: brand }} />
                            <h3 className="font-bold text-sm">{h.name}</h3>
                          </div>
                          <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {h.city}
                          </div>
                        </div>
                        <div className="text-right text-[10px]">
                          <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider" style={{ color: brand }}>
                            {h.meal_plan || "Somente hospedagem"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between gap-4 text-[10px]">
                        <div>
                          <span className="text-muted-foreground block uppercase tracking-wider text-[8px] font-bold">Período</span>
                          <span className="font-semibold">{fmtDate(h.checkin)} &rarr; {fmtDate(h.checkout)}</span>
                        </div>
                        {h.rooms && h.rooms.length > 0 && (
                          <div className="text-right">
                            <span className="text-muted-foreground block uppercase tracking-wider text-[8px] font-bold">Acomodação</span>
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
            <div className="space-y-3 text-left">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
                <Car className="h-4 w-4" style={{ color: brand }} /> Traslados e Conexões
              </h2>
              <div className="space-y-3">
                {p.transfers.map((t: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3 transition-all hover:border-brand/40">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-900 border border-border/40" style={{ color: brand }}>
                      <Car className="h-4.5 w-4.5" />
                    </div>
                    <div className="flex-1 min-w-0 text-[10px]">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-bold text-xs text-foreground">{t.description}</span>
                        <span className="text-muted-foreground font-mono">{fmtDate(t.date)}</span>
                      </div>
                      <div className="mt-0.5 text-muted-foreground">
                        Veículo: <strong className="text-foreground">{t.vehicle}</strong> &middot; Tipo: <strong className="text-foreground">{t.type === "private" ? "Privativo" : "Compartilhado"}</strong>
                      </div>
                      {t.notes && <p className="mt-1 text-muted-foreground italic bg-surface-alt/40 p-1.5 rounded text-[9px]">{t.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tours Section */}
          {p.tours && p.tours.length > 0 && (
            <div className="space-y-3 text-left">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
                <Compass className="h-4 w-4" style={{ color: brand }} /> Passeios e Experiências
              </h2>
              <div className="space-y-3">
                {p.tours.map((t: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3 transition-all hover:border-brand/40">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-900 border border-border/40" style={{ color: brand }}>
                      <Compass className="h-4.5 w-4.5" />
                    </div>
                    <div className="flex-1 min-w-0 text-[10px]">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="font-bold text-xs text-foreground">{t.description}</span>
                        <span className="text-muted-foreground font-mono">{fmtDate(t.date)}</span>
                      </div>
                      {t.notes && <p className="mt-1 text-muted-foreground italic bg-surface-alt/40 p-1.5 rounded text-[9px]">{t.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Itinerary Section */}
          {p.itinerary && p.itinerary.length > 0 && (
            <div className="space-y-3 text-left">
              <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-1">
                <Calendar className="h-4 w-4" style={{ color: brand }} /> Roteiro de Atividades
              </h2>
              <div className="relative border-l border-border/80 ml-3 pl-4 space-y-4">
                {p.itinerary.map((d: any, idx: number) => (
                  <div key={idx} className="relative">
                    {/* Circle Node */}
                    <div className="absolute -left-[23px] top-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-surface border-2" style={{ borderColor: brand }} />
                    <div className="text-[10px]">
                      <span className="rounded bg-brand/10 px-2 py-0.5 text-[8px] font-bold uppercase tracking-wider" style={{ color: brand }}>
                        {d.day || `Dia ${idx + 1}`}
                      </span>
                      <h3 className="font-bold text-xs mt-1">{d.title}</h3>
                      <p className="mt-1 text-muted-foreground leading-relaxed whitespace-pre-wrap">{d.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Columns: Financial & Decisions */}
        <div className="col-span-4 space-y-6">
          {/* Finance Premium Invoice */}
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1" style={{ background: brand }} />
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">Resumo Financeiro</h3>

            <div className="space-y-1.5 text-[10px] border-b border-border/60 pb-3">
              <div className="flex items-center justify-between text-muted-foreground">
                <span>Valor Base</span>
                <span className="font-mono">{money(Number(p.subtotal), p.currency)}</span>
              </div>
              {Number(p.discount) > 0 && (
                <div className="flex items-center justify-between text-emerald-600 font-medium">
                  <span>Desconto</span>
                  <span className="font-mono">- {money(Number(p.discount), p.currency)}</span>
                </div>
              )}
            </div>

            <div className="pt-3 space-y-3">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-[8px] text-muted-foreground uppercase tracking-wider font-semibold block">Total à Vista</span>
                  <span className="text-[8px] text-emerald-600 font-bold uppercase">Pix com {p.pix_discount_percent}% desc</span>
                </div>
                <span className="font-mono text-base font-extrabold text-foreground">
                  {money(Number(p.total), p.currency)}
                </span>
              </div>

              {/* Card Options */}
              {p.installments_card > 1 && (
                <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1.5 border-t border-border/30">
                  <span className="flex items-center gap-1">
                    <CreditCard className="h-3 w-3" /> Cartão de Crédito
                  </span>
                  <span>até {p.installments_card}x</span>
                </div>
              )}

              {/* Boleto Options */}
              {p.installments_boleto > 1 && (
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" /> Boleto Bancário
                  </span>
                  <span>até {p.installments_boleto}x</span>
                </div>
              )}

              {p.valid_until && (
                <div className="rounded-lg bg-slate-50 dark:bg-slate-900 border border-border/40 p-2 text-[9px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" style={{ color: brand }} />
                  <span>Válida até <strong>{fmtDate(p.valid_until)}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Inclusions & Exclusions Card */}
          {(p.includes?.length > 0 || p.excludes?.length > 0) && (
            <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm space-y-3 text-left">
              {p.includes?.length > 0 && (
                <div>
                  <h4 className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 mb-1.5 flex items-center gap-1">
                    <Check className="h-3 w-3" /> O que inclui
                  </h4>
                  <ul className="space-y-1 text-[10px] text-muted-foreground pl-0.5">
                    {p.includes.map((inc: string, idx: number) => (
                      <li key={idx} className="flex gap-1 items-start leading-tight">
                        <span className="text-emerald-600 select-none">•</span>
                        <span>{inc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {p.excludes?.length > 0 && (
                <div className="pt-2 border-t border-border/40">
                  <h4 className="text-[9px] font-bold uppercase tracking-wider text-rose-600 mb-1.5 flex items-center gap-1">
                    <X className="h-3 w-3" /> O que não inclui
                  </h4>
                  <ul className="space-y-1 text-[10px] text-muted-foreground pl-0.5">
                    {p.excludes.map((exc: string, idx: number) => (
                      <li key={idx} className="flex gap-1 items-start leading-tight">
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
            <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm space-y-1.5 text-left">
              <h4 className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Condições Gerais</h4>
              <p className="text-[10px] text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto no-scrollbar">{p.terms}</p>
            </div>
          )}

          {/* Decision Panel (Disabled/Preview Mode for the Editor) */}
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm text-center">
            <h3 className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Decisão do Cliente (Visualização)</h3>
            <div className="flex flex-col gap-1.5 opacity-80">
              <div
                className="h-8 w-full rounded-lg text-[10px] font-bold flex items-center justify-center shadow-sm"
                style={{ background: brand, color: brandFg }}
              >
                Aceitar proposta
              </div>
              <div className="h-8 w-full rounded-lg border border-border bg-surface text-[10px] font-medium text-muted-foreground flex items-center justify-center">
                Recusar proposta
              </div>
            </div>
            <p className="text-[8px] text-muted-foreground mt-2 leading-tight">
              Este painel estará interativo apenas para o cliente final.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
