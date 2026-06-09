import { createFileRoute, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, UserPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAgency } from "@/lib/agency-context";
import { PageHeader } from "@/components/shell/PageHeader";
import { Field, Input, Select, PrimaryButton, GhostButton, Sheet, StatusBadge, fmtDate, money, Textarea } from "@/components/ui/form";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agency/$slug/group-tours/$id")({
  head: () => ({ meta: [{ title: "Excursão · TravelOS" }] }),
  component: TourDetailPage,
});

type ItineraryDay = { day_number: number; title: string; description_md?: string };
type SeatCell = { r: number; c: number; label: string; type: string };

function TourDetailPage() {
  const { id } = useParams({ from: "/agency/$slug/group-tours/$id" });
  const { agency } = useAgency();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const tourQ = useQuery({
    enabled: !!agency,
    queryKey: ["group-tour", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("group_tours").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const enrolQ = useQuery({
    enabled: !!agency,
    queryKey: ["group-enrollments", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_tour_enrollments")
        .select("id, passenger_name, passenger_cpf, status, seat_number, total_paid, created_at")
        .eq("group_tour_id", id)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const layoutsQ = useQuery({
    enabled: !!agency,
    queryKey: ["bus-layouts-list", agency?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("bus_layouts").select("id, name").eq("agency_id", agency!.id);
      if (error) throw error;
      return data || [];
    },
  });

  async function updateLayout(val: string) {
    const layoutId = val === "none" ? null : val;
    const { error } = await supabase.from("group_tours").update({ bus_layout_id: layoutId }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Layout de ônibus atualizado");
    qc.invalidateQueries({ queryKey: ["group-tour", id] });
  }

  async function updateStatus(s: string) {
    const { error } = await supabase.from("group_tours").update({ status: s }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["group-tour", id] });
  }

  async function togglePublic() {
    if (!tourQ.data) return;
    const { error } = await supabase.from("group_tours").update({ is_public: !tourQ.data.is_public }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["group-tour", id] });
  }

  if (!tourQ.data) return <div className="text-sm text-muted-foreground">Carregando…</div>;
  const t = tourQ.data;
  const itinerary: ItineraryDay[] = Array.isArray(t.itinerary) ? (t.itinerary as unknown as ItineraryDay[]) : [];

  return (
    <>
      <PageHeader
        title={t.title}
        description={t.destination ?? "Excursão em grupo"}
        actions={
          <div className="flex items-center gap-2">
            <Select value={t.status} onChange={(e) => updateStatus(e.target.value)} className="h-9 text-xs">
              <option value="draft">Rascunho</option>
              <option value="open">Aberta</option>
              <option value="published">Publicada</option>
              <option value="closed">Encerrada</option>
              <option value="cancelled">Cancelada</option>
            </Select>
            <GhostButton onClick={togglePublic} type="button">{t.is_public ? "Tornar privada" : "Publicar"}</GhostButton>
            <button onClick={() => setOpen(true)} className="flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground">
              <UserPlus className="h-3.5 w-3.5" /> Inscrever passageiro
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4 mb-6">
        <Stat label="Saída" value={fmtDate(t.departure_date)} />
        <Stat label="Retorno" value={fmtDate(t.return_date)} />
        <Stat label="Preço base" value={money(Number(t.base_price))} />
        <Stat label="Ocupação" value={`${t.reserved_seats}/${t.total_seats}`} />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="bg-surface border border-border">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="itinerary">Itinerário</TabsTrigger>
          <TabsTrigger value="passengers">Inscritos ({enrolQ.data?.length || 0})</TabsTrigger>
          {t.bus_layout_id && <TabsTrigger value="bus_seats">Mapa do Ônibus</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview">
          <div className="rounded-lg border border-border bg-surface p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Configurações Gerais</h3>
              <button onClick={() => setEditOpen(true)} className="text-xs font-semibold text-brand hover:underline">Editar Excursão</button>
            </div>
            <div className="space-y-4">
              <Field label="Descrição Pública (Importante)"><Textarea readOnly value={t.important_notes || ""} placeholder="Anotações visíveis ao cliente" className="bg-surface-alt" /></Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="URL da Imagem de Capa"><Input readOnly value={t.cover_image_url || ""} placeholder="https://..." className="bg-surface-alt" /></Field>
                <Field label="Link de Compartilhamento"><Input readOnly value={typeof window !== "undefined" ? `${window.location.origin}/g/${t.slug}` : `/g/${t.slug}`} className="bg-surface-alt" onClick={e => (e.target as HTMLInputElement).select()} /></Field>
              </div>
              <Field label="Layout de Assentos (Ônibus Virtual)">
                <Select value={t.bus_layout_id || "none"} onChange={e => updateLayout(e.target.value)}>
                  <option value="none">Nenhum (Sem escolha de lugares)</option>
                  {layoutsQ.data?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </Select>
              </Field>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="itinerary">
          <ItineraryEditor tourId={id} days={itinerary} onUpdate={() => qc.invalidateQueries({ queryKey: ["group-tour", id] })} />
        </TabsContent>

        <TabsContent value="passengers">
          {enrolQ.data?.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Sem inscrições ainda.</div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-surface-alt/40 text-left text-[11px] uppercase text-muted-foreground">
                  <tr><th className="px-3 py-2">Passageiro</th><th className="px-3 py-2">CPF</th><th className="px-3 py-2">Assento</th><th className="px-3 py-2 text-right">Pago</th><th className="px-3 py-2">Status</th></tr>
                </thead>
                <tbody>
                  {enrolQ.data?.map((e) => (
                    <tr key={e.id} className="border-t border-border">
                      <td className="px-3 py-2.5 font-medium">{e.passenger_name}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground">{e.passenger_cpf ?? "—"}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{e.seat_number ?? "—"}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs">{money(Number(e.total_paid))}</td>
                      <td className="px-3 py-2.5"><StatusBadge tone={e.status === "confirmed" ? "success" : e.status === "cancelled" ? "danger" : "warning"}>{e.status}</StatusBadge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {t.bus_layout_id && (
          <TabsContent value="bus_seats">
            <BusSeatManager tourId={id} layoutId={t.bus_layout_id} passengers={enrolQ.data || []} onChange={() => qc.invalidateQueries({ queryKey: ["group-enrollments", id] })} />
          </TabsContent>
        )}
      </Tabs>

      {open && agency && (
        <NewEnrol tourId={id} agencyId={agency.id} onClose={() => setOpen(false)} onCreated={() => { setOpen(false); qc.invalidateQueries({ queryKey: ["group-enrollments", id] }); qc.invalidateQueries({ queryKey: ["group-tour", id] }); }} />
      )}

      {editOpen && (
        <EditTour tour={t} onClose={() => setEditOpen(false)} onUpdated={() => { setEditOpen(false); qc.invalidateQueries({ queryKey: ["group-tour", id] }); }} />
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-base font-semibold">{value}</div>
    </div>
  );
}

function ItineraryEditor({ tourId, days, onUpdate }: { tourId: string; days: ItineraryDay[]; onUpdate: () => void }) {
  const [adding, setAdding] = useState(false);
  const [dayNum, setDayNum] = useState(days.length + 1);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");

  async function persist(next: ItineraryDay[]) {
    const { error } = await supabase.from("group_tours").update({ itinerary: next as unknown as never }).eq("id", tourId);
    if (error) return toast.error(error.message);
    onUpdate();
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const next = [...days, { day_number: dayNum, title, description_md: desc }].sort((a, b) => a.day_number - b.day_number);
    await persist(next);
    toast.success("Dia adicionado");
    setAdding(false); setTitle(""); setDesc(""); setDayNum(days.length + 2);
  }

  async function handleRemove(day_number: number) {
    if (!confirm("Remover este dia?")) return;
    await persist(days.filter((d) => d.day_number !== day_number));
  }

  return (
    <div className="space-y-4">
      {days.map((d) => (
        <div key={d.day_number} className="rounded-lg border border-border bg-surface p-4 flex items-start gap-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-surface-alt text-xs font-semibold">D{d.day_number}</div>
          <div className="flex-1">
            <div className="font-semibold">{d.title}</div>
            {d.description_md && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{d.description_md}</p>}
          </div>
          <button onClick={() => handleRemove(d.day_number)} className="text-muted-foreground hover:text-danger p-2"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}

      {!adding ? (
        <button onClick={() => setAdding(true)} className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border p-4 text-sm font-medium text-muted-foreground hover:bg-surface-alt">
          <Plus className="h-4 w-4" /> Adicionar Dia
        </button>
      ) : (
        <form onSubmit={handleAdd} className="rounded-lg border border-border bg-surface p-4 space-y-3">
          <div className="grid grid-cols-[80px_1fr] gap-3">
            <Field label="Dia"><Input type="number" value={dayNum} onChange={(e) => setDayNum(+e.target.value)} required /></Field>
            <Field label="Título"><Input value={title} onChange={(e) => setTitle(e.target.value)} required /></Field>
          </div>
          <Field label="Descrição"><Textarea value={desc} onChange={(e) => setDesc(e.target.value)} className="min-h-[80px]" /></Field>
          <div className="flex justify-end gap-2">
            <GhostButton type="button" onClick={() => setAdding(false)}>Cancelar</GhostButton>
            <PrimaryButton type="submit">Salvar Dia</PrimaryButton>
          </div>
        </form>
      )}
    </div>
  );
}

function NewEnrol({ tourId, agencyId, onClose, onCreated }: { tourId: string; agencyId: string; onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.from("group_tour_enrollments").insert({
      agency_id: agencyId, group_tour_id: tourId, passenger_name: name,
      passenger_cpf: cpf || null, total_paid: 0,
    });
    if (!error) {
      const { data: cur } = await supabase.from("group_tours").select("reserved_seats").eq("id", tourId).maybeSingle();
      if (cur) await supabase.from("group_tours").update({ reserved_seats: (cur.reserved_seats || 0) + 1 }).eq("id", tourId);
    }
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Passageiro inscrito");
    onCreated();
  }

  return (
    <Sheet onClose={onClose} title="Nova inscrição manual">
      <form onSubmit={submit} className="space-y-3">
        <Field label="Nome do passageiro *"><Input required value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="CPF"><Input value={cpf} onChange={(e) => setCpf(e.target.value)} /></Field>
        <div className="flex justify-end gap-2 pt-2">
          <GhostButton type="button" onClick={onClose}>Cancelar</GhostButton>
          <PrimaryButton type="submit" disabled={submitting}>{submitting ? "Salvando…" : "Inscrever"}</PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}

function BusSeatManager({ tourId, layoutId, passengers, onChange }: { tourId: string; layoutId: string; passengers: { id: string; passenger_name: string; seat_number: string | null }[]; onChange: () => void }) {
  const [selectedSeat, setSelectedSeat] = useState<SeatCell | null>(null);
  const [selectedPax, setSelectedPax] = useState("");

  const qMap = useQuery({
    queryKey: ["bus-layout", layoutId],
    queryFn: async () => {
      const { data } = await supabase.from("bus_layouts").select("*").eq("id", layoutId).maybeSingle();
      return data;
    },
  });

  async function assignSeat() {
    if (!selectedSeat || !selectedPax) return toast.error("Selecione o assento e o passageiro.");
    // free this seat from anyone else first
    await supabase.from("group_tour_enrollments").update({ seat_number: null }).eq("group_tour_id", tourId).eq("seat_number", selectedSeat.label);
    if (selectedPax !== "remove") {
      const { error } = await supabase.from("group_tour_enrollments").update({ seat_number: selectedSeat.label }).eq("id", selectedPax);
      if (error) return toast.error(error.message);
    }
    toast.success("Assento atualizado!");
    setSelectedSeat(null);
    setSelectedPax("");
    onChange();
  }

  if (qMap.isLoading) return <div className="text-sm text-muted-foreground p-8">Carregando mapa…</div>;
  if (!qMap.data) return <div className="text-sm text-muted-foreground p-8">Erro ao carregar layout do ônibus.</div>;

  const mapData = (qMap.data.seat_map as unknown as SeatCell[]) || [];
  const cols = qMap.data.cols;

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="flex-1 bg-surface border border-border rounded-xl p-8  overflow-x-auto">
        <div className="min-w-max mx-auto">
          <div className="h-10 mb-6 border-b-2 border-dashed border-border/50 rounded-t-[3rem] bg-surface-alt/20 flex items-end justify-center pb-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Motorista</div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: "8px" }}>
            {mapData.map((cell) => {
              const assigned = passengers.find((p) => p.seat_number === cell.label);
              const isOccupied = !!assigned;
              return (
                <div key={`${cell.r}-${cell.c}`} className="relative">
                  <button
                    type="button"
                    onClick={() => cell.type === "seat" && setSelectedSeat(cell)}
                    disabled={cell.type !== "seat"}
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-lg border-2 text-xs font-semibold transition-all",
                      cell.type === "seat" && !isOccupied && "border-border/60 bg-surface hover:border-brand hover:text-brand",
                      cell.type === "seat" && isOccupied && "border-brand bg-brand/10 text-brand",
                      cell.type === "aisle" && "border-dashed border-border/30 bg-transparent text-transparent",
                      cell.type === "wc" && "border-info/30 bg-info-bg text-info opacity-70",
                      cell.type === "door" && "border-warning/30 bg-warning-bg text-warning opacity-70",
                    )}
                  >
                    {cell.label}
                  </button>
                  {isOccupied && cell.type === "seat" && <div className="absolute -top-2 -right-2 h-4 w-4 bg-brand rounded-full border-2 border-surface" />}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="w-full md:w-80 space-y-4">
        {selectedSeat ? (
          <div className="bg-brand/5 border border-brand/20 rounded-xl p-5">
            <div className="text-[10px] font-bold uppercase tracking-widest text-brand mb-1">Poltrona {selectedSeat.label}</div>
            <h4 className="text-sm font-semibold mb-4">Gerenciar Assento</h4>
            <Field label="Passageiro">
              <Select value={selectedPax} onChange={(e) => setSelectedPax(e.target.value)}>
                <option value="">Selecione o passageiro...</option>
                <option value="remove">Livre (Remover reserva)</option>
                {passengers.map((p) => (
                  <option key={p.id} value={p.id}>{p.passenger_name}</option>
                ))}
              </Select>
            </Field>
            <div className="mt-4 flex gap-2">
              <GhostButton onClick={() => setSelectedSeat(null)} className="flex-1 text-xs">Cancelar</GhostButton>
              <PrimaryButton onClick={assignSeat} className="flex-1 text-xs">Confirmar</PrimaryButton>
            </div>
          </div>
        ) : (
          <div className="bg-surface border border-dashed border-border/60 rounded-xl p-6 text-center text-sm text-muted-foreground">
            Clique em uma poltrona no mapa ao lado para alocar os passageiros inscritos.
          </div>
        )}

        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Resumo de Ocupação</div>
          <div className="flex justify-between items-center text-sm mb-2">
            <span className="flex items-center gap-2"><div className="w-3 h-3 bg-brand/10 border border-brand rounded-sm" /> Vendidos</span>
            <span className="font-semibold">{passengers.filter((p) => p.seat_number).length}</span>
          </div>
          <div className="flex justify-between items-center text-sm">
            <span className="flex items-center gap-2"><div className="w-3 h-3 bg-surface border border-border/60 rounded-sm" /> Livres</span>
            <span className="font-semibold">{mapData.filter((c) => c.type === "seat").length - passengers.filter((p) => p.seat_number).length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function EditTour({ tour, onClose, onUpdated }: { tour: any; onClose: () => void; onUpdated: () => void }) {
  const [f, setF] = useState({
    title: tour.title,
    slug: tour.slug,
    departure_date: tour.departure_date ? String(tour.departure_date).substring(0, 10) : "",
    return_date: tour.return_date ? String(tour.return_date).substring(0, 10) : "",
    base_price: tour.base_price ?? 0,
    total_seats: tour.total_seats ?? 0,
    cover_image_url: tour.cover_image_url || "",
    important_notes: tour.important_notes || "",
  });
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.from("group_tours").update({
      title: f.title, slug: f.slug,
      departure_date: f.departure_date || null, return_date: f.return_date || null,
      base_price: Number(f.base_price), total_seats: Number(f.total_seats),
      cover_image_url: f.cover_image_url || null, important_notes: f.important_notes || null,
    }).eq("id", tour.id);
    setBusy(false);
    if (error) toast.error("Erro ao salvar: " + error.message);
    else { toast.success("Salvo com sucesso"); onUpdated(); }
  }

  return (
    <Sheet onClose={onClose} title="Editar Excursão">
      <form onSubmit={save} className="space-y-4">
        <Field label="Nome da Excursão"><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required /></Field>
        <Field label="Slug (URL Amigável)"><Input value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} required /></Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Partida"><Input type="date" value={f.departure_date} onChange={(e) => setF({ ...f, departure_date: e.target.value })} /></Field>
          <Field label="Retorno"><Input type="date" value={f.return_date} onChange={(e) => setF({ ...f, return_date: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Preço (R$)"><Input type="number" step="0.01" value={f.base_price} onChange={(e) => setF({ ...f, base_price: e.target.value })} required /></Field>
          <Field label="Vagas (Total)"><Input type="number" value={f.total_seats} onChange={(e) => setF({ ...f, total_seats: e.target.value })} required /></Field>
        </div>
        <Field label="URL Imagem Capa"><Input value={f.cover_image_url} onChange={(e) => setF({ ...f, cover_image_url: e.target.value })} /></Field>
        <Field label="Descrição Pública"><Textarea value={f.important_notes} onChange={(e) => setF({ ...f, important_notes: e.target.value })} /></Field>
        <div className="mt-6 flex justify-end gap-3">
          <GhostButton type="button" onClick={onClose}>Cancelar</GhostButton>
          <PrimaryButton disabled={busy}>{busy ? "Salvando..." : "Salvar Alterações"}</PrimaryButton>
        </div>
      </form>
    </Sheet>
  );
}
