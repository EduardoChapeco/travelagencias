import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { ArrowLeft, Plus, Trash2, Download, Link2, ChevronDown, ChevronRight, Copy, Sparkles, GripVertical } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext, PointerSensor, useSensor, useSensors, closestCenter, type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { money, fmtDate } from "@/components/ui/form";

export const Route = createFileRoute("/agency/$slug/proposals/$id")({
  head: () => ({ meta: [{ title: "Editor de Proposta · TravelOS" }] }),
  component: ProposalEditor,
});

// ===== Types =====
type Flight = { id: string; origin: string; destination: string; date: string; departure_time: string; arrival_time: string; airline: string; flight_number: string; stops: number; baggage_rules: string; price: number };
type HotelRoom = { type: string; qty: number };
type Hotel = { id: string; name: string; city: string; checkin: string; checkout: string; meal_plan: string; rooms: HotelRoom[]; images: string[]; price: number };
type Transfer = { id: string; description: string; date: string; type: "private" | "shared"; vehicle: string; price: number; notes: string };
type Tour = { id: string; description: string; date: string; price: number; image_url: string; notes: string };
type ItineraryDay = { id: string; day: string; title: string; description: string };

type Proposal = {
  id: string; number: number; title: string; status: string;
  destination: string | null; travel_start: string | null; travel_end: string | null;
  pax_adults: number; pax_seniors: number; pax_children: number; pax_infants: number;
  currency: string; subtotal: number; discount: number; total: number;
  valid_until: string | null; notes: string | null; terms: string | null;
  public_token: string; agency_id: string;
  flights: Flight[]; hotels: Hotel[]; transfers: Transfer[]; tours: Tour[];
  itinerary: ItineraryDay[]; includes: string[]; excludes: string[];
  pix_discount_percent: number; installments_card: number; installments_boleto: number;
  template: string;
};

const uid = () => Math.random().toString(36).slice(2, 11);

function ProposalEditor() {
  const { slug, id } = useParams({ from: "/agency/$slug/proposals/$id" });
  const { agency } = useAgency();
  const qc = useQueryClient();

  const propQ = useQuery({
    queryKey: ["proposal", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("proposals").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as unknown as Proposal | null;
    },
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

  const total = useMemo(() => {
    if (!draft) return 0;
    const sum = (arr: Array<{ price?: number }>) => arr.reduce((s, x) => s + (Number(x.price) || 0), 0);
    return sum(draft.flights) + sum(draft.hotels) + sum(draft.transfers) + sum(draft.tours);
  }, [draft]);

  const persist = useMutation({
    mutationFn: async (patch: Partial<Proposal>) => {
      const { error } = await supabase.from("proposals").update(patch as never).eq("id", id);
      if (error) throw error;
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["proposal", id] }),
  });

  const save = useCallback((patch: Partial<Proposal>) => {
    if (!draft) return;
    setDraft({ ...draft, ...patch });
    persist.mutate(patch);
  }, [draft, persist]);

  // Auto-recalculate total whenever items change
  useEffect(() => {
    if (!draft) return;
    if (Number(draft.total) !== Number(total) || Number(draft.subtotal) !== Number(total)) {
      const discountValue = total * (Number(draft.pix_discount_percent) / 100);
      const finalTotal = Math.max(0, total - discountValue);
      persist.mutate({ subtotal: total, discount: discountValue, total: finalTotal });
      setDraft((d) => d ? { ...d, subtotal: total, discount: discountValue, total: finalTotal } : d);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total, draft?.pix_discount_percent]);

  if (propQ.isLoading || !draft) return <div className="p-6 text-sm text-muted-foreground">Carregando proposta…</div>;
  if (!propQ.data) return <div className="p-6">Proposta não encontrada</div>;

  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/m/proposal/${draft.public_token}` : "";

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Toolbar */}
      <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-3">
        <div className="flex items-center gap-3">
          <Link to="/agency/$slug/proposals" params={{ slug }} className="text-muted-foreground hover:text-foreground">
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
          <OcrButton onExtracted={(data) => {
            const merged: Partial<Proposal> = {
              flights: [...(draft.flights ?? []), ...(data.flights ?? [])],
              hotels: [...(draft.hotels ?? []), ...(data.hotels ?? [])],
              transfers: [...(draft.transfers ?? []), ...(data.transfers ?? [])],
              tours: [...(draft.tours ?? []), ...(data.tours ?? [])],
            };
            save(merged);
            toast.success("Dados extraídos e mesclados");
          }} />
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Left CMS */}
        <aside className="w-[420px] shrink-0 overflow-y-auto border-r border-border bg-surface-alt/30 p-4">
          <Accordion title="Cliente & Passageiros" defaultOpen>
            <div className="grid grid-cols-2 gap-2">
              <NumField label="Adultos" value={draft.pax_adults} onSave={(v) => save({ pax_adults: v })} />
              <NumField label="Seniores" value={draft.pax_seniors} onSave={(v) => save({ pax_seniors: v })} />
              <NumField label="Crianças" value={draft.pax_children} onSave={(v) => save({ pax_children: v })} />
              <NumField label="Infantes" value={draft.pax_infants} onSave={(v) => save({ pax_infants: v })} />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <TextField label="Destino" value={draft.destination ?? ""} onSave={(v) => save({ destination: v })} />
              <TextField label="Válido até" type="date" value={draft.valid_until ?? ""} onSave={(v) => save({ valid_until: v || null })} />
              <TextField label="Início" type="date" value={draft.travel_start ?? ""} onSave={(v) => save({ travel_start: v || null })} />
              <TextField label="Fim" type="date" value={draft.travel_end ?? ""} onSave={(v) => save({ travel_end: v || null })} />
            </div>
          </Accordion>

          <Accordion title={`Voos (${draft.flights.length})`}>
            {draft.flights.map((f, i) => (
              <Card key={f.id} onRemove={() => save({ flights: draft.flights.filter((x) => x.id !== f.id) })}>
                <div className="grid grid-cols-2 gap-2">
                  <Inp ph="Origem (GRU)" value={f.origin} onChange={(v) => save({ flights: replaceAt(draft.flights, i, { ...f, origin: v }) })} />
                  <Inp ph="Destino (LIS)" value={f.destination} onChange={(v) => save({ flights: replaceAt(draft.flights, i, { ...f, destination: v }) })} />
                  <Inp type="date" value={f.date} onChange={(v) => save({ flights: replaceAt(draft.flights, i, { ...f, date: v }) })} />
                  <Inp ph="Cia" value={f.airline} onChange={(v) => save({ flights: replaceAt(draft.flights, i, { ...f, airline: v }) })} />
                  <Inp type="time" value={f.departure_time} onChange={(v) => save({ flights: replaceAt(draft.flights, i, { ...f, departure_time: v }) })} />
                  <Inp type="time" value={f.arrival_time} onChange={(v) => save({ flights: replaceAt(draft.flights, i, { ...f, arrival_time: v }) })} />
                  <Inp ph="Voo nº" value={f.flight_number} onChange={(v) => save({ flights: replaceAt(draft.flights, i, { ...f, flight_number: v }) })} />
                  <Inp type="number" ph="Conexões" value={String(f.stops)} onChange={(v) => save({ flights: replaceAt(draft.flights, i, { ...f, stops: parseInt(v) || 0 }) })} />
                  <Inp ph="Bagagem" value={f.baggage_rules} onChange={(v) => save({ flights: replaceAt(draft.flights, i, { ...f, baggage_rules: v }) })} />
                  <Inp type="number" ph="Preço" value={String(f.price || "")} onChange={(v) => save({ flights: replaceAt(draft.flights, i, { ...f, price: parseFloat(v) || 0 }) })} />
                </div>
              </Card>
            ))}
            <AddBtn onClick={() => save({ flights: [...draft.flights, { id: uid(), origin: "", destination: "", date: "", departure_time: "", arrival_time: "", airline: "", flight_number: "", stops: 0, baggage_rules: "", price: 0 }] })}>+ Adicionar voo</AddBtn>
          </Accordion>

          <Accordion title={`Hotéis (${draft.hotels.length})`}>
            {draft.hotels.map((h, i) => (
              <Card key={h.id} onRemove={() => save({ hotels: draft.hotels.filter((x) => x.id !== h.id) })}>
                <div className="grid grid-cols-2 gap-2">
                  <Inp ph="Nome do hotel" value={h.name} onChange={(v) => save({ hotels: replaceAt(draft.hotels, i, { ...h, name: v }) })} />
                  <Inp ph="Cidade" value={h.city} onChange={(v) => save({ hotels: replaceAt(draft.hotels, i, { ...h, city: v }) })} />
                  <Inp type="date" value={h.checkin} onChange={(v) => save({ hotels: replaceAt(draft.hotels, i, { ...h, checkin: v }) })} />
                  <Inp type="date" value={h.checkout} onChange={(v) => save({ hotels: replaceAt(draft.hotels, i, { ...h, checkout: v }) })} />
                  <Inp ph="Regime (café, all-inclusive…)" value={h.meal_plan} onChange={(v) => save({ hotels: replaceAt(draft.hotels, i, { ...h, meal_plan: v }) })} />
                  <Inp type="number" ph="Preço" value={String(h.price || "")} onChange={(v) => save({ hotels: replaceAt(draft.hotels, i, { ...h, price: parseFloat(v) || 0 }) })} />
                </div>
                <div className="mt-2">
                  <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">Quartos</div>
                  {h.rooms.map((r, ri) => (
                    <div key={ri} className="mb-1 flex gap-1">
                      <Inp ph="Tipo (duplo)" value={r.type} onChange={(v) => save({ hotels: replaceAt(draft.hotels, i, { ...h, rooms: replaceAt(h.rooms, ri, { ...r, type: v }) }) })} />
                      <Inp type="number" ph="Qtd" value={String(r.qty)} onChange={(v) => save({ hotels: replaceAt(draft.hotels, i, { ...h, rooms: replaceAt(h.rooms, ri, { ...r, qty: parseInt(v) || 1 }) }) })} />
                      <button onClick={() => save({ hotels: replaceAt(draft.hotels, i, { ...h, rooms: h.rooms.filter((_, x) => x !== ri) }) })} className="text-muted-foreground hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                  <button onClick={() => save({ hotels: replaceAt(draft.hotels, i, { ...h, rooms: [...h.rooms, { type: "", qty: 1 }] }) })} className="text-[11px] text-primary hover:underline">+ quarto</button>
                </div>
                <FileUploadList
                  agencyId={draft.agency_id}
                  images={h.images}
                  onChange={(imgs) => save({ hotels: replaceAt(draft.hotels, i, { ...h, images: imgs }) })}
                />
              </Card>
            ))}
            <AddBtn onClick={() => save({ hotels: [...draft.hotels, { id: uid(), name: "", city: "", checkin: "", checkout: "", meal_plan: "", rooms: [], images: [], price: 0 }] })}>+ Adicionar hotel</AddBtn>
          </Accordion>

          <Accordion title={`Transfers (${draft.transfers.length})`}>
            {draft.transfers.map((t, i) => (
              <Card key={t.id} onRemove={() => save({ transfers: draft.transfers.filter((x) => x.id !== t.id) })}>
                <div className="grid grid-cols-2 gap-2">
                  <Inp ph="Descrição" value={t.description} onChange={(v) => save({ transfers: replaceAt(draft.transfers, i, { ...t, description: v }) })} />
                  <Inp type="date" value={t.date} onChange={(v) => save({ transfers: replaceAt(draft.transfers, i, { ...t, date: v }) })} />
                  <Sel value={t.type} onChange={(v) => save({ transfers: replaceAt(draft.transfers, i, { ...t, type: v as "private" | "shared" }) })} options={[["private", "Privativo"], ["shared", "Compartilhado"]]} />
                  <Sel value={t.vehicle} onChange={(v) => save({ transfers: replaceAt(draft.transfers, i, { ...t, vehicle: v }) })} options={[["car", "Carro"], ["van", "Van"], ["bus", "Ônibus"], ["boat", "Barco"], ["helicopter", "Helicóptero"]]} />
                  <Inp type="number" ph="Preço" value={String(t.price || "")} onChange={(v) => save({ transfers: replaceAt(draft.transfers, i, { ...t, price: parseFloat(v) || 0 }) })} />
                  <Inp ph="Notas" value={t.notes} onChange={(v) => save({ transfers: replaceAt(draft.transfers, i, { ...t, notes: v }) })} />
                </div>
              </Card>
            ))}
            <AddBtn onClick={() => save({ transfers: [...draft.transfers, { id: uid(), description: "", date: "", type: "private", vehicle: "car", price: 0, notes: "" }] })}>+ Adicionar transfer</AddBtn>
          </Accordion>

          <Accordion title={`Passeios (${draft.tours.length})`}>
            {draft.tours.map((t, i) => (
              <Card key={t.id} onRemove={() => save({ tours: draft.tours.filter((x) => x.id !== t.id) })}>
                <div className="grid grid-cols-2 gap-2">
                  <Inp ph="Descrição" value={t.description} onChange={(v) => save({ tours: replaceAt(draft.tours, i, { ...t, description: v }) })} />
                  <Inp type="date" value={t.date} onChange={(v) => save({ tours: replaceAt(draft.tours, i, { ...t, date: v }) })} />
                  <Inp type="number" ph="Preço" value={String(t.price || "")} onChange={(v) => save({ tours: replaceAt(draft.tours, i, { ...t, price: parseFloat(v) || 0 }) })} />
                  <Inp ph="URL imagem" value={t.image_url} onChange={(v) => save({ tours: replaceAt(draft.tours, i, { ...t, image_url: v }) })} />
                  <Inp ph="Notas" value={t.notes} onChange={(v) => save({ tours: replaceAt(draft.tours, i, { ...t, notes: v }) })} />
                </div>
              </Card>
            ))}
            <AddBtn onClick={() => save({ tours: [...draft.tours, { id: uid(), description: "", date: "", price: 0, image_url: "", notes: "" }] })}>+ Adicionar passeio</AddBtn>
          </Accordion>

          <Accordion title={`Itinerário (${draft.itinerary.length} dias)`}>
            <ItineraryEditor items={draft.itinerary} onChange={(it) => save({ itinerary: it })} />
            <AddBtn onClick={() => save({ itinerary: [...draft.itinerary, { id: uid(), day: `Dia ${String(draft.itinerary.length + 1).padStart(2, "0")}`, title: "", description: "" }] })}>+ Adicionar dia</AddBtn>
          </Accordion>

          <Accordion title="O que inclui">
            <TagsEditor tags={draft.includes} onChange={(t) => save({ includes: t })} placeholder="Hotel, voo, café..." />
          </Accordion>

          <Accordion title="O que não inclui">
            <TagsEditor tags={draft.excludes} onChange={(t) => save({ excludes: t })} placeholder="Bebidas, gorjetas..." />
          </Accordion>

          <Accordion title="Financeiro" defaultOpen>
            <div className="space-y-3">
              <div className="rounded-md bg-surface p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-mono">{money(draft.subtotal, draft.currency)}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Desconto Pix</span>
                  <span className="font-mono">−{money(draft.discount, draft.currency)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm font-semibold">
                  <span>Total</span>
                  <span className="font-mono">{money(draft.total, draft.currency)}</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Desconto Pix: <strong>{draft.pix_discount_percent}%</strong></label>
                <input type="range" min={0} max={20} step={0.5} value={draft.pix_discount_percent} onChange={(e) => save({ pix_discount_percent: parseFloat(e.target.value) })} className="w-full" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <L label="Cartão (até x)">
                  <select className={SMALL_INPUT} value={draft.installments_card} onChange={(e) => save({ installments_card: parseInt(e.target.value) })}>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}x</option>)}
                  </select>
                </L>
                <L label="Boleto (até x)">
                  <select className={SMALL_INPUT} value={draft.installments_boleto} onChange={(e) => save({ installments_boleto: parseInt(e.target.value) })}>
                    {Array.from({ length: 6 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}x</option>)}
                  </select>
                </L>
              </div>
            </div>
          </Accordion>
        </aside>

        {/* Right canvas */}
        <main className="flex-1 overflow-auto bg-neutral-100 p-8">
          <ScalableCanvas>
            <ProposalTemplate proposal={draft} />
          </ScalableCanvas>
        </main>
      </div>

      <style>{`
        .i { width:100%; height:30px; padding:0 8px; border-radius:6px; border:1px solid var(--color-border); background:var(--color-surface); font-size:12px; outline:none; }
        .i:focus { border-color: var(--color-border-strong); }
      `}</style>
    </div>
  );
}

function replaceAt<T>(arr: T[], i: number, item: T): T[] {
  const c = arr.slice(); c[i] = item; return c;
}

function Accordion({ title, children, defaultOpen }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div className="mb-2 rounded-lg border border-border bg-surface">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide hover:bg-surface-alt">
        <span>{title}</span>
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
      </button>
      {open && <div className="border-t border-border p-3">{children}</div>}
    </div>
  );
}

function NumField({ label, value, onSave }: { label: string; value: number; onSave: (v: number) => void }) {
  const [v, setV] = useState(String(value));
  useEffect(() => setV(String(value)), [value]);
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <input type="number" min={0} className={SMALL_INPUT} value={v} onChange={(e) => setV(e.target.value)} onBlur={() => onSave(parseInt(v) || 0)} />
    </label>
  );
}
function TextField({ label, value, onSave, type = "text" }: { label: string; value: string; onSave: (v: string) => void; type?: string }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value ?? ""), [value]);
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <input type={type} className={SMALL_INPUT} value={v} onChange={(e) => setV(e.target.value)} onBlur={() => onSave(v)} />
    </label>
  );
}
function Inp({ value, onChange, ph, type = "text" }: { value: string; onChange: (v: string) => void; ph?: string; type?: string }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value ?? ""), [value]);
  return <input type={type} placeholder={ph} className={SMALL_INPUT} value={v} onChange={(e) => setV(e.target.value)} onBlur={() => onChange(v)} />;
}
function Sel({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: Array<[string, string]> }) {
  return <select className={SMALL_INPUT} value={value} onChange={(e) => onChange(e.target.value)}>{options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>;
}
function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">{label}</span>{children}</label>;
}
function Card({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <div className="relative mb-2 rounded-md border border-border bg-surface-alt/40 p-2">
      <button onClick={onRemove} className="absolute right-1 top-1 text-muted-foreground hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
      {children}
    </div>
  );
}
function AddBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className="mt-1 flex w-full items-center justify-center gap-1 rounded-md border border-dashed border-border py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-surface-alt"><Plus className="h-3 w-3" />{children}</button>;
}

function TagsEditor({ tags, onChange, placeholder }: { tags: string[]; onChange: (t: string[]) => void; placeholder?: string }) {
  const [v, setV] = useState("");
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1">
        {tags.map((t, i) => (
          <span key={i} className="flex items-center gap-1 rounded bg-surface-alt px-2 py-0.5 text-[11px]">
            {t}
            <button onClick={() => onChange(tags.filter((_, x) => x !== i))} className="text-muted-foreground hover:text-red-500">×</button>
          </span>
        ))}
      </div>
      <input
        className={SMALL_INPUT}
        placeholder={placeholder}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && v.trim()) {
            e.preventDefault();
            onChange([...tags, v.trim()]);
            setV("");
          }
        }}
      />
    </div>
  );
}

function ItineraryEditor({ items, onChange }: { items: ItineraryDay[]; onChange: (i: ItineraryDay[]) => void }) {
  const sensors = useSensors(useSensor(PointerSensor));
  function onEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    const oldIdx = items.findIndex((x) => x.id === e.active.id);
    const newIdx = items.findIndex((x) => x.id === e.over!.id);
    onChange(arrayMove(items, oldIdx, newIdx));
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        {items.map((it, i) => (
          <SortableItDay key={it.id} item={it}
            onChange={(d) => onChange(replaceAt(items, i, d))}
            onRemove={() => onChange(items.filter((_, x) => x !== i))}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}
function SortableItDay({ item, onChange, onRemove }: { item: ItineraryDay; onChange: (i: ItineraryDay) => void; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className="mb-2 flex gap-1 rounded-md border border-border bg-surface-alt/40 p-2">
      <button {...attributes} {...listeners} className="cursor-grab text-muted-foreground"><GripVertical className="h-4 w-4" /></button>
      <div className="flex-1 space-y-1">
        <div className="grid grid-cols-2 gap-1">
          <Inp ph="Dia" value={item.day} onChange={(v) => onChange({ ...item, day: v })} />
          <Inp ph="Título" value={item.title} onChange={(v) => onChange({ ...item, title: v })} />
        </div>
        <textarea
          className="min-h-[50px] w-full rounded-md border border-input bg-surface px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-border-strong"
          placeholder="Descrição"
          defaultValue={item.description}
          onBlur={(e) => onChange({ ...item, description: e.target.value })}
        />
      </div>
      <button onClick={onRemove} className="text-muted-foreground hover:text-red-500"><Trash2 className="h-3.5 w-3.5" /></button>
    </div>
  );
}

function FileUploadList({ agencyId, images, onChange }: { agencyId: string; images: string[]; onChange: (imgs: string[]) => void }) {
  const [uploading, setUploading] = useState(false);
  async function upload(files: FileList | null) {
    if (!files) return;
    setUploading(true);
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const path = `${agencyId}/${uid()}-${file.name}`;
      const { error } = await supabase.storage.from("proposal-attachments").upload(path, file);
      if (error) { toast.error(error.message); continue; }
      const { data: signed } = await supabase.storage.from("proposal-attachments").createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signed?.signedUrl) urls.push(signed.signedUrl);
    }
    onChange([...images, ...urls]);
    setUploading(false);
  }
  return (
    <div className="mt-2">
      <div className="mb-1 flex flex-wrap gap-1">
        {images.map((u, i) => (
          <div key={i} className="relative">
            <img src={u} alt="" className="h-12 w-12 rounded object-cover" />
            <button onClick={() => onChange(images.filter((_, x) => x !== i))} className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1 text-[10px] text-white">×</button>
          </div>
        ))}
      </div>
      <label className="text-[11px] text-primary hover:underline cursor-pointer">
        {uploading ? "Enviando…" : "+ adicionar imagens"}
        <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => upload(e.target.files)} />
      </label>
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
    <div id="proposal-canvas" className="bg-white text-neutral-900" style={{ width: 794, minHeight: 1123, padding: 48, fontFamily: "Inter, system-ui, sans-serif" }}>
      <div className="mb-6 border-b-2 border-neutral-900 pb-4">
        <div className="text-xs uppercase tracking-[0.2em] text-neutral-500">Proposta #{p.number}</div>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">{p.title || "Proposta de viagem"}</h1>
        <div className="mt-2 text-sm text-neutral-600">{p.destination ?? ""} · {fmtDate(p.travel_start)} → {fmtDate(p.travel_end)} · {p.pax_adults + p.pax_seniors + p.pax_children + p.pax_infants} pax</div>
      </div>

      {p.flights.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">Voos</h2>
          <table className="w-full text-xs">
            <thead><tr className="border-b border-neutral-200 text-left text-neutral-500"><th className="py-1">Trecho</th><th>Cia / Voo</th><th>Data</th><th>Horários</th><th>Bagagem</th></tr></thead>
            <tbody>
              {p.flights.map((f) => (
                <tr key={f.id} className="border-b border-neutral-100">
                  <td className="py-2 font-medium">{f.origin} → {f.destination} {f.stops > 0 && <span className="text-neutral-500">({f.stops} parada{f.stops > 1 ? "s" : ""})</span>}</td>
                  <td>{f.airline} {f.flight_number}</td>
                  <td>{fmtDate(f.date)}</td>
                  <td>{f.departure_time} – {f.arrival_time}</td>
                  <td>{f.baggage_rules}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {p.hotels.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">Hospedagem</h2>
          <div className="space-y-3">
            {p.hotels.map((h) => (
              <div key={h.id} className="overflow-hidden rounded-lg border border-neutral-200">
                {h.images[0] && <img src={h.images[0]} alt={h.name} className="h-40 w-full object-cover" />}
                <div className="p-3">
                  <div className="flex items-baseline justify-between">
                    <h3 className="font-semibold">{h.name}</h3>
                    <span className="text-xs text-neutral-500">{h.city}</span>
                  </div>
                  <div className="mt-1 text-xs text-neutral-600">{fmtDate(h.checkin)} → {fmtDate(h.checkout)} · {h.meal_plan}</div>
                  {h.rooms.length > 0 && <div className="mt-1 text-xs">{h.rooms.map((r, i) => <span key={i}>{r.qty}× {r.type}{i < h.rooms.length - 1 ? ", " : ""}</span>)}</div>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {p.transfers.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">Transfers</h2>
          <ul className="space-y-1 text-xs">
            {p.transfers.map((t) => <li key={t.id}>• <strong>{fmtDate(t.date)}</strong> — {t.description} ({t.type === "private" ? "Privativo" : "Compartilhado"}, {t.vehicle})</li>)}
          </ul>
        </section>
      )}

      {p.tours.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">Passeios</h2>
          <ul className="space-y-1 text-xs">{p.tours.map((t) => <li key={t.id}>• <strong>{fmtDate(t.date)}</strong> — {t.description}</li>)}</ul>
        </section>
      )}

      {p.itinerary.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">Itinerário</h2>
          <div className="space-y-2">{p.itinerary.map((d) => (
            <div key={d.id} className="border-l-2 border-neutral-900 pl-3">
              <div className="text-xs font-semibold">{d.day} — {d.title}</div>
              <div className="text-xs text-neutral-600 whitespace-pre-wrap">{d.description}</div>
            </div>
          ))}</div>
        </section>
      )}

      {(p.includes.length > 0 || p.excludes.length > 0) && (
        <section className="mb-6 grid grid-cols-2 gap-4">
          {p.includes.length > 0 && <div><h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">Inclui</h3><ul className="text-xs">{p.includes.map((i, x) => <li key={x}>✓ {i}</li>)}</ul></div>}
          {p.excludes.length > 0 && <div><h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-700">Não inclui</h3><ul className="text-xs">{p.excludes.map((i, x) => <li key={x}>✗ {i}</li>)}</ul></div>}
        </section>
      )}

      <section className="mt-8 rounded-lg bg-neutral-100 p-5">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-neutral-600">Total à vista (Pix)</span>
          <span className="text-2xl font-bold">{money(p.total, p.currency)}</span>
        </div>
        {p.installments_card > 1 && <div className="mt-1 text-xs text-neutral-600">ou em até {p.installments_card}x no cartão</div>}
        {p.installments_boleto > 1 && <div className="text-xs text-neutral-600">ou em até {p.installments_boleto}x no boleto</div>}
      </section>
    </div>
  );
}

function ExportPdfButton({ proposal }: { proposal: Proposal }) {
  const [busy, setBusy] = useState(false);
  async function exportPdf() {
    setBusy(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const { jsPDF } = await import("jspdf");
      const el = document.getElementById("proposal-canvas");
      if (!el) throw new Error("Canvas não encontrado");
      const canvas = await html2canvas(el, { scale: 3, useCORS: true, backgroundColor: "#ffffff" });
      const img = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pdfW = 210;
      const pdfH = (canvas.height * pdfW) / canvas.width;
      pdf.addImage(img, "JPEG", 0, 0, pdfW, pdfH);
      pdf.save(`proposta-${proposal.number}.pdf`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao exportar PDF");
    } finally {
      setBusy(false);
    }
  }
  return (
    <button onClick={exportPdf} disabled={busy} className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground disabled:opacity-60">
      <Download className="h-3.5 w-3.5" /> {busy ? "Gerando…" : "PDF"}
    </button>
  );
}

function OcrButton({ onExtracted }: { onExtracted: (data: { flights?: Flight[]; hotels?: Hotel[]; transfers?: Transfer[]; tours?: Tour[] }) => void }) {
  const [busy, setBusy] = useState(false);
  async function handle(files: FileList | null) {
    if (!files || !files[0]) return;
    setBusy(true);
    try {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const { data, error } = await supabase.functions.invoke("ocr-proposal", { body: { file_base64: base64, mime: file.type } });
        if (error) throw error;
        onExtracted(data ?? {});
      };
      reader.onerror = () => toast.error("Erro ao ler arquivo");
      reader.readAsDataURL(file);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro no OCR");
    } finally {
      setBusy(false);
    }
  }
  return (
    <label className="flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 text-xs font-medium hover:bg-surface-alt">
      <Sparkles className="h-3.5 w-3.5" /> {busy ? "Lendo…" : "OCR"}
      <input type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => handle(e.target.files)} />
    </label>
  );
}
