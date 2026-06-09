import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft, Plus, Ticket, Download, Plane, Hotel,
  Bus, Umbrella, Phone, User, MapPin, ChevronDown,
  ChevronRight, Upload, Trash2, Edit2, Eye
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { StatusBadge, fmtDate, Field, Input, Select } from "@/components/ui/form";
import { processVoucherWithAI } from "@/lib/ocr-ai";

export const Route = createFileRoute("/agency/$slug/trips/$id/vouchers")({
  head: () => ({ meta: [{ title: "Vouchers · TravelOS" }] }),
  component: TripVouchers,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type VoucherFlight = {
  locator: string;
  airline: string;
  flight_number: string;
  origin: string;
  destination: string;
  date: string;
  departure_time: string;
  arrival_time: string;
  class: string;
  baggage: string;
};

type VoucherAccommodation = {
  name: string;
  city: string;
  address: string;
  phone: string;
  checkin: string;
  checkout: string;
  room_type: string;
  meal_plan: string;
  confirmation: string;
};

type VoucherTransfer = {
  type: string;
  date: string;
  origin: string;
  destination: string;
  vehicle: string;
  supplier: string;
  confirmation: string;
};

type VoucherPassenger = {
  name: string;
  document: string;
  seat?: string;
};

type Voucher = {
  id: string;
  trip_id: string;
  agency_id: string;
  source_type: "operator_pdf" | "manual";
  source_file_url: string | null;
  destination: string | null;
  general_locator: string | null;
  observations: string | null;
  cover_image_url: string | null;
  template: "navy" | "minimal" | "brand";
  passengers: VoucherPassenger[];
  flights: VoucherFlight[];
  accommodation: VoucherAccommodation[];
  transfers: VoucherTransfer[];
  tours: Array<{ name: string; date: string; duration: string; guide: string; meeting_point: string }>;
  insurance: { provider?: string; policy_number?: string; phone?: string; coverage?: string };
  emergency_contacts: Array<{ name: string; phone: string; role: string }>;
  pdf_url: string | null;
  generated_at: string | null;
  created_at: string;
};

type Trip = {
  id: string;
  title: string;
  destination: string | null;
  travel_start: string | null;
  travel_end: string | null;
  airline: string | null;
  pnr: string | null;
};

type Passenger = {
  id: string;
  full_name: string;
  document: string | null;
  cpf: string | null;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2, 9);

const TEMPLATE_LABELS = {
  navy: "Azul Marinho",
  minimal: "Minimalista",
  brand: "Cor da Agência",
};

// ─── Main component ───────────────────────────────────────────────────────────

function TripVouchers() {
  const { slug, id: tripId } = useParams({ from: "/agency/$slug/trips/$id/vouchers" });
  const { agency } = useAgency();
  const qc = useQueryClient();

  const [selected, setSelected] = useState<Voucher | null>(null);
  const [creating, setCreating] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>("flights");

  // ── Queries ──────────────────────────────────────────────────────────────────

  const tripQ = useQuery({
    enabled: !!agency,
    queryKey: ["trip", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trips")
        .select("id, title, destination, travel_start, travel_end, airline, pnr")
        .eq("id", tripId)
        .maybeSingle();
      if (error) throw error;
      return data as Trip | null;
    },
  });

  const vouchersQ = useQuery({
    enabled: !!agency,
    queryKey: ["vouchers_trip", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vouchers")
        .select("*")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Voucher[];
    },
  });

  const passengersQ = useQuery({
    enabled: !!agency,
    queryKey: ["passengers", tripId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_passengers")
        .select("id, full_name, document, cpf")
        .eq("trip_id", tripId);
      if (error) throw error;
      return (data ?? []) as Passenger[];
    },
  });

  // ── Draft state for new/editing voucher ──────────────────────────────────────

  const [draft, setDraft] = useState<Partial<Voucher>>({
    source_type: "manual",
    template: "navy",
    destination: "",
    general_locator: "",
    observations: "",
    flights: [],
    accommodation: [],
    transfers: [],
    tours: [],
    passengers: [],
    insurance: {},
    emergency_contacts: [],
  });

  function initNewVoucher(trip: Trip, pax: Passenger[]) {
    setDraft({
      source_type: "manual",
      template: "navy",
      destination: trip.destination ?? "",
      general_locator: trip.pnr ?? "",
      observations: "",
      flights: trip.airline
        ? [{
            locator: trip.pnr ?? "",
            airline: trip.airline,
            flight_number: "",
            origin: "",
            destination: trip.destination ?? "",
            date: trip.travel_start ?? "",
            departure_time: "",
            arrival_time: "",
            class: "Economy",
            baggage: "23kg",
          }]
        : [],
      accommodation: [],
      transfers: [],
      tours: [],
      passengers: pax.map((p) => ({
        name: p.full_name,
        document: p.document ?? p.cpf ?? "",
        seat: "",
      })),
      insurance: {},
      emergency_contacts: [],
    });
    setCreating(true);
    setSelected(null);
    setOpenSection("flights");
  }

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const saveVoucher = useMutation({
    mutationFn: async () => {
      if (!agency) throw new Error("Sem agência");
      const payload = {
        agency_id: agency.id,
        trip_id: tripId,
        source_type: draft.source_type ?? "manual",
        destination: draft.destination ?? null,
        general_locator: draft.general_locator ?? null,
        observations: draft.observations ?? null,
        template: draft.template ?? "navy",
        passengers: draft.passengers ?? [],
        flights: draft.flights ?? [],
        accommodation: draft.accommodation ?? [],
        transfers: draft.transfers ?? [],
        tours: draft.tours ?? [],
        insurance: draft.insurance ?? {},
        emergency_contacts: draft.emergency_contacts ?? [],
      };

      if (selected?.id) {
        const { error } = await supabase.from("vouchers").update(payload as never).eq("id", selected.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("vouchers").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(selected?.id ? "Voucher atualizado" : "Voucher criado");
      setCreating(false);
      setSelected(null);
      qc.invalidateQueries({ queryKey: ["vouchers_trip", tripId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao salvar"),
  });

  const deleteVoucher = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("vouchers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Voucher removido");
      if (selected?.id === deleteVoucher.variables) { setSelected(null); setCreating(false); }
      qc.invalidateQueries({ queryKey: ["vouchers_trip", tripId] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const uploadSourcePdf = useMutation({
    mutationFn: async (file: File) => {
      if (!agency) throw new Error("Sem agência");
      const path = `${agency.id}/${tripId}/${uid()}-${file.name}`;
      
      toast.loading("Enviando arquivo original…", { id: "ocr" });
      const { error: upErr } = await supabase.storage
        .from("voucher-sources")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;

      const { data: signed } = await supabase.storage
        .from("voucher-sources")
        .createSignedUrl(path, 60 * 60 * 24 * 365);

      if (!signed?.signedUrl) throw new Error("Erro ao gerar URL segura do arquivo.");

      // OCR Inteligente via PDF.js + AI Edge Function
      toast.loading("Inteligência Artificial Lendo PDF…", { id: "ocr" });
      
      try {
        const aiResult = await processVoucherWithAI(file);
        
        // Convertendo o resultado da IA em preenchimento inteligente de Voucher
        setDraft((d) => ({ 
          ...d, 
          destination: aiResult.title || d.destination,
          general_locator: aiResult.locator || d.general_locator,
          observations: "Extraído via IA OCR\n\nProvedor: " + (aiResult.provider || "") + "\n\nTexto Bruto:\n" + (aiResult.raw_extracted_text?.substring(0, 400) || ""),
          source_file_url: signed.signedUrl, 
          source_type: "operator_pdf" as const 
        }));
        
        toast.success("Dados estruturados pela IA com sucesso!", { id: "ocr" });
      } catch (err: any) {
        toast.warning(err.message || "A IA não conseguiu ler os dados exatos. O arquivo foi salvo, mas preencha manualmente.", { id: "ocr", duration: 5000 });
        setDraft((d) => ({ ...d, source_file_url: signed.signedUrl, source_type: "operator_pdf" as const }));
      }
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro crítico no upload.", { id: "ocr" }),
  });

  // ── Edit existing ─────────────────────────────────────────────────────────────

  function editVoucher(v: Voucher) {
    setDraft({ ...v });
    setSelected(v);
    setCreating(true);
    setOpenSection("flights");
  }

  // ─────────────────────────────────────────────────────────────────────────────

  const trip = tripQ.data;

  if (tripQ.isLoading) return <div className="p-4 text-sm text-muted-foreground">Carregando…</div>;

  // ── Editor mode ───────────────────────────────────────────────────────────────
  if (creating) {
    return (
      <VoucherEditor
        draft={draft}
        setDraft={setDraft}
        openSection={openSection}
        setOpenSection={setOpenSection}
        onSave={() => saveVoucher.mutate()}
        saving={saveVoucher.isPending}
        onCancel={() => { setCreating(false); setSelected(null); }}
        onUploadPdf={(file) => uploadSourcePdf.mutate(file)}
        slug={slug}
        tripId={tripId}
        isEdit={!!selected?.id}
      />
    );
  }

  // ── List mode ─────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Vouchers & Guias</h2>
        <button
          onClick={() => { if (trip) initNewVoucher(trip, passengersQ.data ?? []); }}
          className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-brand"
        >
          <Plus className="h-3.5 w-3.5" />
          Novo voucher
        </button>
      </div>

      {vouchersQ.isLoading && (
        <div className="text-sm text-muted-foreground">Carregando vouchers…</div>
      )}

      {vouchersQ.data?.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <Ticket className="mb-3 h-8 w-8 text-muted-foreground" />
          <div className="text-sm font-medium">Nenhum voucher emitido</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Crie um voucher manualmente ou importe um PDF da operadora.
          </div>
          <button
            onClick={() => { if (trip) initNewVoucher(trip, passengersQ.data ?? []); }}
            className="mt-4 flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            Criar voucher
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {(vouchersQ.data ?? []).map((v) => (
          <div
            key={v.id}
            className="group relative rounded-lg border border-border bg-surface p-4 transition hover:border-border-strong"
          >
            {/* Template badge */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-muted-foreground" />
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {TEMPLATE_LABELS[v.template] ?? v.template}
                </span>
              </div>
              <StatusBadge tone={v.source_type === "operator_pdf" ? "info" : "neutral"}>
                {v.source_type === "operator_pdf" ? "PDF op." : "Manual"}
              </StatusBadge>
            </div>

            {/* Destination */}
            <div className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              {v.destination ?? "Sem destino"}
            </div>

            {/* Locator */}
            {v.general_locator && (
              <div className="mb-2 font-mono text-xs text-muted-foreground">
                Localizador: {v.general_locator}
              </div>
            )}

            {/* Summary */}
            <div className="flex gap-3 text-[11px] text-muted-foreground">
              {v.passengers.length > 0 && (
                <span className="flex items-center gap-0.5">
                  <User className="h-3 w-3" />
                  {v.passengers.length} pax
                </span>
              )}
              {v.flights.length > 0 && (
                <span className="flex items-center gap-0.5">
                  <Plane className="h-3 w-3" />
                  {v.flights.length} voo{v.flights.length > 1 ? "s" : ""}
                </span>
              )}
              {v.accommodation.length > 0 && (
                <span className="flex items-center gap-0.5">
                  <Hotel className="h-3 w-3" />
                  {v.accommodation.length} hotel{v.accommodation.length > 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
              <button
                onClick={() => editVoucher(v)}
                className="flex h-7 flex-1 items-center justify-center gap-1 rounded-md border border-border text-xs hover:bg-surface-alt"
              >
                <Edit2 className="h-3.5 w-3.5" />
                Editar
              </button>
              {v.pdf_url && (
                <a
                  href={v.pdf_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs hover:bg-surface-alt"
                >
                  <Download className="h-3.5 w-3.5" />
                  PDF
                </a>
              )}
              <button
                onClick={() => {
                  if (confirm("Remover voucher?")) deleteVoucher.mutate(v.id);
                }}
                className="flex h-7 items-center justify-center rounded-md border border-border px-2 text-muted-foreground hover:bg-danger-bg hover:text-danger hover:border-danger"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Voucher Editor ───────────────────────────────────────────────────────────

function VoucherEditor({
  draft,
  setDraft,
  openSection,
  setOpenSection,
  onSave,
  saving,
  onCancel,
  onUploadPdf,
  slug,
  tripId,
  isEdit,
}: {
  draft: Partial<Voucher>;
  setDraft: React.Dispatch<React.SetStateAction<Partial<Voucher>>>;
  openSection: string | null;
  setOpenSection: (s: string | null) => void;
  onSave: () => void;
  saving: boolean;
  onCancel: () => void;
  onUploadPdf: (file: File) => void;
  slug: string;
  tripId: string;
  isEdit: boolean;
}) {
  function toggle(key: string) {
    setOpenSection(openSection === key ? null : key);
  }

  function Section({ id, label, icon, count, children }: { id: string; label: string; icon: React.ReactNode; count?: number; children: React.ReactNode }) {
    const open = openSection === id;
    return (
      <div className="rounded-lg border border-border bg-surface">
        <button
          onClick={() => toggle(id)}
          className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold hover:bg-surface-alt"
        >
          {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
          {icon}
          {label}
          {count !== undefined && (
            <span className="ml-1 rounded-full bg-surface-alt px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
              {count}
            </span>
          )}
        </button>
        {open && <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">{children}</div>}
      </div>
    );
  }

  const flights = draft.flights ?? [];
  const accommodation = draft.accommodation ?? [];
  const transfers = draft.transfers ?? [];
  const passengers = draft.passengers ?? [];

  return (
    <div className="bg-surface border border-border/60 rounded-xl p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
           <button onClick={onCancel} className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-surface-alt transition-colors"><ArrowLeft className="h-4 w-4" /></button>
           <h2 className="text-lg font-semibold">{isEdit ? "Editar Voucher" : "Novo Voucher"}</h2>
        </div>
        <div className="flex gap-2">
          {/* Upload PDF Inteligente */}
          <label className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border-2 border-dashed border-brand/50 bg-brand/5 px-4 text-xs font-bold uppercase tracking-widest text-brand transition-colors hover:bg-brand hover:text-brand-fg">
            <Upload className="h-4 w-4" />
            Extrair com IA (PDF)
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) onUploadPdf(e.target.files[0]); }}
            />
          </label>
          <button
            onClick={onCancel}
            className="h-8 rounded-md border border-border px-3 text-xs"
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="h-8 rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground disabled:opacity-60"
          >
            {saving ? "Salvando…" : isEdit ? "Salvar alterações" : "Criar voucher"}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {/* Header info */}
        <div className="rounded-lg border border-border bg-surface p-4 grid grid-cols-2 gap-3">
          <Field label="Destino">
            <Input
              value={draft.destination ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, destination: e.target.value }))}
              placeholder="Ex: Lisboa, Portugal"
            />
          </Field>
          <Field label="Localizador geral">
            <Input
              value={draft.general_locator ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, general_locator: e.target.value }))}
              placeholder="PNR / Código de reserva"
            />
          </Field>
          <Field label="Template">
            <Select
              value={draft.template ?? "navy"}
              onChange={(e) => setDraft((d) => ({ ...d, template: e.target.value as Voucher["template"] }))}
            >
              <option value="navy">Azul Marinho</option>
              <option value="minimal">Minimalista</option>
              <option value="brand">Cor da Agência</option>
            </Select>
          </Field>
          <Field label="Observações">
            <Input
              value={draft.observations ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, observations: e.target.value }))}
              placeholder="Informações adicionais"
            />
          </Field>
        </div>

        {/* Passengers */}
        <Section id="passengers" label="Passageiros" icon={<User className="h-3.5 w-3.5 text-muted-foreground" />} count={passengers.length}>
          {passengers.map((p, i) => (
            <div key={i} className="grid grid-cols-3 gap-2 rounded-md border border-border p-2">
              <Field label="Nome">
                <Input value={p.name} onChange={(e) => { const arr = [...passengers]; arr[i] = { ...p, name: e.target.value }; setDraft((d) => ({ ...d, passengers: arr })); }} />
              </Field>
              <Field label="Documento">
                <Input value={p.document ?? ""} onChange={(e) => { const arr = [...passengers]; arr[i] = { ...p, document: e.target.value }; setDraft((d) => ({ ...d, passengers: arr })); }} />
              </Field>
              <Field label="Assento">
                <Input value={p.seat ?? ""} onChange={(e) => { const arr = [...passengers]; arr[i] = { ...p, seat: e.target.value }; setDraft((d) => ({ ...d, passengers: arr })); }} placeholder="—" />
              </Field>
            </div>
          ))}
          <button
            onClick={() => setDraft((d) => ({ ...d, passengers: [...passengers, { name: "", document: "", seat: "" }] }))}
            className="mt-1 flex w-full items-center justify-center gap-1 rounded border border-dashed border-border py-1.5 text-xs text-muted-foreground hover:bg-surface-alt"
          >
            <Plus className="h-3.5 w-3.5" />+ Passageiro
          </button>
        </Section>

        {/* Flights */}
        <Section id="flights" label="Voos" icon={<Plane className="h-3.5 w-3.5 text-muted-foreground" />} count={flights.length}>
          {flights.map((f, i) => (
            <div key={i} className="rounded-md border border-border p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Cia aérea"><Input value={f.airline} onChange={(e) => { const arr = [...flights]; arr[i] = { ...f, airline: e.target.value }; setDraft((d) => ({ ...d, flights: arr })); }} /></Field>
                <Field label="Voo nº"><Input value={f.flight_number} onChange={(e) => { const arr = [...flights]; arr[i] = { ...f, flight_number: e.target.value }; setDraft((d) => ({ ...d, flights: arr })); }} /></Field>
                <Field label="Origem"><Input value={f.origin} onChange={(e) => { const arr = [...flights]; arr[i] = { ...f, origin: e.target.value }; setDraft((d) => ({ ...d, flights: arr })); }} placeholder="GRU" /></Field>
                <Field label="Destino"><Input value={f.destination} onChange={(e) => { const arr = [...flights]; arr[i] = { ...f, destination: e.target.value }; setDraft((d) => ({ ...d, flights: arr })); }} placeholder="LIS" /></Field>
                <Field label="Data"><Input type="date" value={f.date} onChange={(e) => { const arr = [...flights]; arr[i] = { ...f, date: e.target.value }; setDraft((d) => ({ ...d, flights: arr })); }} /></Field>
                <Field label="Localizador"><Input value={f.locator} onChange={(e) => { const arr = [...flights]; arr[i] = { ...f, locator: e.target.value }; setDraft((d) => ({ ...d, flights: arr })); }} /></Field>
                <Field label="Saída"><Input type="time" value={f.departure_time} onChange={(e) => { const arr = [...flights]; arr[i] = { ...f, departure_time: e.target.value }; setDraft((d) => ({ ...d, flights: arr })); }} /></Field>
                <Field label="Chegada"><Input type="time" value={f.arrival_time} onChange={(e) => { const arr = [...flights]; arr[i] = { ...f, arrival_time: e.target.value }; setDraft((d) => ({ ...d, flights: arr })); }} /></Field>
                <Field label="Classe"><Select value={f.class} onChange={(e) => { const arr = [...flights]; arr[i] = { ...f, class: e.target.value }; setDraft((d) => ({ ...d, flights: arr })); }}><option>Economy</option><option>Premium Economy</option><option>Business</option><option>First</option></Select></Field>
                <Field label="Bagagem"><Input value={f.baggage} onChange={(e) => { const arr = [...flights]; arr[i] = { ...f, baggage: e.target.value }; setDraft((d) => ({ ...d, flights: arr })); }} placeholder="23kg" /></Field>
              </div>
              <button onClick={() => setDraft((d) => ({ ...d, flights: flights.filter((_, x) => x !== i) }))} className="text-xs text-danger hover:underline flex items-center gap-1"><Trash2 className="h-3 w-3" />Remover voo</button>
            </div>
          ))}
          <button onClick={() => setDraft((d) => ({ ...d, flights: [...flights, { locator: "", airline: "", flight_number: "", origin: "", destination: "", date: "", departure_time: "", arrival_time: "", class: "Economy", baggage: "23kg" }] }))} className="flex w-full items-center justify-center gap-1 rounded border border-dashed border-border py-1.5 text-xs text-muted-foreground hover:bg-surface-alt"><Plus className="h-3.5 w-3.5" />+ Voo</button>
        </Section>

        {/* Accommodation */}
        <Section id="accommodation" label="Hospedagem" icon={<Hotel className="h-3.5 w-3.5 text-muted-foreground" />} count={accommodation.length}>
          {accommodation.map((h, i) => (
            <div key={i} className="rounded-md border border-border p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Field label="Hotel"><Input value={h.name} onChange={(e) => { const arr = [...accommodation]; arr[i] = { ...h, name: e.target.value }; setDraft((d) => ({ ...d, accommodation: arr })); }} /></Field>
                <Field label="Cidade"><Input value={h.city} onChange={(e) => { const arr = [...accommodation]; arr[i] = { ...h, city: e.target.value }; setDraft((d) => ({ ...d, accommodation: arr })); }} /></Field>
                <Field label="Check-in"><Input type="date" value={h.checkin} onChange={(e) => { const arr = [...accommodation]; arr[i] = { ...h, checkin: e.target.value }; setDraft((d) => ({ ...d, accommodation: arr })); }} /></Field>
                <Field label="Check-out"><Input type="date" value={h.checkout} onChange={(e) => { const arr = [...accommodation]; arr[i] = { ...h, checkout: e.target.value }; setDraft((d) => ({ ...d, accommodation: arr })); }} /></Field>
                <Field label="Tipo de quarto"><Input value={h.room_type} onChange={(e) => { const arr = [...accommodation]; arr[i] = { ...h, room_type: e.target.value }; setDraft((d) => ({ ...d, accommodation: arr })); }} placeholder="Duplo standard" /></Field>
                <Field label="Regime"><Input value={h.meal_plan} onChange={(e) => { const arr = [...accommodation]; arr[i] = { ...h, meal_plan: e.target.value }; setDraft((d) => ({ ...d, accommodation: arr })); }} placeholder="Café incluso" /></Field>
                <Field label="Confirmação"><Input value={h.confirmation} onChange={(e) => { const arr = [...accommodation]; arr[i] = { ...h, confirmation: e.target.value }; setDraft((d) => ({ ...d, accommodation: arr })); }} /></Field>
                <Field label="Telefone hotel"><Input value={h.phone} onChange={(e) => { const arr = [...accommodation]; arr[i] = { ...h, phone: e.target.value }; setDraft((d) => ({ ...d, accommodation: arr })); }} /></Field>
              </div>
              <button onClick={() => setDraft((d) => ({ ...d, accommodation: accommodation.filter((_, x) => x !== i) }))} className="text-xs text-danger hover:underline flex items-center gap-1"><Trash2 className="h-3 w-3" />Remover hotel</button>
            </div>
          ))}
          <button onClick={() => setDraft((d) => ({ ...d, accommodation: [...accommodation, { name: "", city: "", address: "", phone: "", checkin: "", checkout: "", room_type: "", meal_plan: "", confirmation: "" }] }))} className="flex w-full items-center justify-center gap-1 rounded border border-dashed border-border py-1.5 text-xs text-muted-foreground hover:bg-surface-alt"><Plus className="h-3.5 w-3.5" />+ Hotel</button>
        </Section>

        {/* Contacts de emergência */}
        <Section id="emergency" label="Contatos de Emergência" icon={<Phone className="h-3.5 w-3.5 text-muted-foreground" />} count={(draft.emergency_contacts ?? []).length}>
          {(draft.emergency_contacts ?? []).map((c, i) => (
            <div key={i} className="grid grid-cols-3 gap-2">
              <Field label="Nome"><Input value={c.name} onChange={(e) => { const arr = [...(draft.emergency_contacts ?? [])]; arr[i] = { ...c, name: e.target.value }; setDraft((d) => ({ ...d, emergency_contacts: arr })); }} /></Field>
              <Field label="Telefone"><Input value={c.phone} onChange={(e) => { const arr = [...(draft.emergency_contacts ?? [])]; arr[i] = { ...c, phone: e.target.value }; setDraft((d) => ({ ...d, emergency_contacts: arr })); }} /></Field>
              <Field label="Papel"><Input value={c.role} onChange={(e) => { const arr = [...(draft.emergency_contacts ?? [])]; arr[i] = { ...c, role: e.target.value }; setDraft((d) => ({ ...d, emergency_contacts: arr })); }} placeholder="Guia / Operadora / Seguradora" /></Field>
            </div>
          ))}
          <button onClick={() => setDraft((d) => ({ ...d, emergency_contacts: [...(d.emergency_contacts ?? []), { name: "", phone: "", role: "" }] }))} className="flex w-full items-center justify-center gap-1 rounded border border-dashed border-border py-1.5 text-xs text-muted-foreground hover:bg-surface-alt"><Plus className="h-3.5 w-3.5" />+ Contato</button>
        </Section>
      </div>
    </div>
  );
}
