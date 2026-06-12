import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, Link2 } from "lucide-react";
import { toast } from "sonner";

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
  return (
    <div
      id="proposal-canvas"
      className="bg-surface text-foreground"
      style={{
        width: 794,
        minHeight: 1123,
        padding: 48,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div className="mb-6 border-b-2 border-neutral-900 pb-4">
        <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Proposta #{p.number}
        </div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">
          {p.title || "Proposta de viagem"}
        </h1>
        <div className="mt-2 text-sm text-muted-foreground">
          {p.destination ?? ""} · {fmtDate(p.travel_start)} → {fmtDate(p.travel_end)} ·{" "}
          {p.pax_adults + p.pax_seniors + p.pax_children + p.pax_infants} pax
        </div>
      </div>

      {p.flights.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Voos
          </h2>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="py-1">Trecho</th>
                <th>Cia / Voo</th>
                <th>Data</th>
                <th>Horários</th>
                <th>Bagagem</th>
              </tr>
            </thead>
            <tbody>
              {p.flights.map((f) => (
                <tr key={f.id} className="border-b border-border/60">
                  <td className="py-2 font-medium">
                    {f.origin} → {f.destination}{" "}
                    {f.stops > 0 && (
                      <span className="text-muted-foreground">
                        ({f.stops} parada{f.stops > 1 ? "s" : ""})
                      </span>
                    )}
                  </td>
                  <td>
                    {f.airline} {f.flight_number}
                  </td>
                  <td>{fmtDate(f.date)}</td>
                  <td>
                    {f.departure_time} – {f.arrival_time}
                  </td>
                  <td>{f.baggage_rules}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {p.hotels.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Hospedagem
          </h2>
          <div className="space-y-3">
            {p.hotels.map((h) => (
              <div key={h.id} className="overflow-hidden rounded-lg border border-border">
                {h.images[0] && (
                  <img src={h.images[0]} alt={h.name} className="h-40 w-full object-cover" />
                )}
                <div className="p-3">
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-semibold">{h.name}</h3>
                    <span className="text-xs text-muted-foreground">{h.city}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {fmtDate(h.checkin)} → {fmtDate(h.checkout)} · {h.meal_plan}
                  </div>
                  {h.rooms.length > 0 && (
                    <div className="mt-1 text-xs">
                      {h.rooms.map((r, i) => (
                        <span key={i}>
                          {r.qty}× {r.type}
                          {i < h.rooms.length - 1 ? ", " : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {p.transfers.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Transfers
          </h2>
          <ul className="space-y-1 text-xs">
            {p.transfers.map((t) => (
              <li key={t.id}>
                • <strong>{fmtDate(t.date)}</strong> — {t.description} (
                {t.type === "private" ? "Privativo" : "Compartilhado"}, {t.vehicle})
              </li>
            ))}
          </ul>
        </section>
      )}

      {p.tours.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Passeios
          </h2>
          <ul className="space-y-1 text-xs">
            {p.tours.map((t) => (
              <li key={t.id}>
                • <strong>{fmtDate(t.date)}</strong> — {t.description}
              </li>
            ))}
          </ul>
        </section>
      )}

      {p.itinerary.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Itinerário
          </h2>
          <div className="space-y-2">
            {p.itinerary.map((d) => (
              <div key={d.id} className="border-l-2 border-neutral-900 pl-3">
                <div className="text-xs font-semibold">
                  {d.day} — {d.title}
                </div>
                <div className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {d.description}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {(p.includes.length > 0 || p.excludes.length > 0) && (
        <section className="mb-6 grid grid-cols-2 gap-4">
          {p.includes.length > 0 && (
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-success">
                Inclui
              </h3>
              <ul className="text-xs">
                {p.includes.map((i, x) => (
                  <li key={x}>✓ {i}</li>
                ))}
              </ul>
            </div>
          )}
          {p.excludes.length > 0 && (
            <div>
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-danger">
                Não inclui
              </h3>
              <ul className="text-xs">
                {p.excludes.map((i, x) => (
                  <li key={x}>✗ {i}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="mt-8 rounded-lg bg-surface-alt p-5">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">Total à vista (Pix)</span>
          <span className="text-2xl font-bold">{money(p.total, p.currency)}</span>
        </div>
        {p.installments_card > 1 && (
          <div className="mt-1 text-xs text-muted-foreground">
            ou em até {p.installments_card}x no cartão
          </div>
        )}
        {p.installments_boleto > 1 && (
          <div className="text-xs text-muted-foreground">
            ou em até {p.installments_boleto}x no boleto
          </div>
        )}
      </section>
    </div>
  );
}
